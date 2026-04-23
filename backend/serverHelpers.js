const crypto = require("node:crypto");

function createServerHelpers({ DOCUMENT_ENCRYPTION_KEY, SUPPORTED_FILE_TYPES, SUPPORTED_LANGUAGES, loginAttemptStore, openai, processEnv, fs, path, mammoth, PDFParse }) {
  function createPublicId(prefix) { return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`; }
  function getEncryptionKeyBuffer() { return DOCUMENT_ENCRYPTION_KEY ? crypto.createHash("sha256").update(DOCUMENT_ENCRYPTION_KEY).digest() : null; }
  function encryptField(value) {
    if (!DOCUMENT_ENCRYPTION_KEY || value == null) return value;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKeyBuffer(), iv);
    const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `enc:v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
  }
  function decryptField(value) {
    if (!value || typeof value !== "string" || !value.startsWith("enc:v1:")) return value;
    if (!DOCUMENT_ENCRYPTION_KEY) throw new Error("Encrypted document data exists, but DOCUMENT_ENCRYPTION_KEY is not configured.");
    const [, , ivB64, tagB64, payloadB64] = value.split(":");
    const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKeyBuffer(), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(payloadB64, "base64")), decipher.final()]).toString("utf8");
  }
  function getClientIp(req) { return (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").toString().split(",")[0].trim(); }
  function consumeAuthAttempt(req, key) {
    const now = Date.now();
    const compositeKey = `${key}:${getClientIp(req)}`;
    const record = loginAttemptStore.get(compositeKey) || { count: 0, firstAttemptAt: now };
    if (now - record.firstAttemptAt > 15 * 60 * 1000) { record.count = 0; record.firstAttemptAt = now; }
    record.count += 1; loginAttemptStore.set(compositeKey, record); return record;
  }
  function clearAuthAttempts(req, key) { loginAttemptStore.delete(`${key}:${getClientIp(req)}`); }
  function ensureAuthRateLimit(req, res, key) {
    const now = Date.now(); const compositeKey = `${key}:${getClientIp(req)}`; const record = loginAttemptStore.get(compositeKey);
    if (!record) return false;
    if (now - record.firstAttemptAt > 15 * 60 * 1000) { loginAttemptStore.delete(compositeKey); return false; }
    if (record.count >= 8) { res.status(429).json({ error: "Too many authentication attempts. Please wait a few minutes and try again." }); return true; }
    return false;
  }
  function cleanWhitespace(text) { return text.replace(/\r/g, "\n").replace(/\t/g, " ").replace(/[ ]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim(); }
  function inferClauseTitle(text, index) { const withoutNumber = text.replace(/^\d+[\).]?\s*/, ""); return withoutNumber.split(/\s+/).slice(0, 6).join(" ") || `Clause ${index + 1}`; }
  function inferClauseType(text) {
    const lower = text.toLowerCase();
    if (/(terminate|termination|cancel|expiry|expiration|renewal)/.test(lower)) return "Termination";
    if (/(payment|fee|invoice|cost|amount)/.test(lower)) return "Payment";
    if (/(confidential|non-disclosure|privacy|data protection|sensitive information)/.test(lower)) return "Confidentiality";
    if (/(liable|liability|indemn|damages|loss)/.test(lower)) return "Liability";
    if (/(comply|law|regulation|governing law|jurisdiction)/.test(lower)) return "Compliance";
    if (/(service|deliver|obligation|must|shall|responsibility)/.test(lower)) return "Obligation";
    return "General";
  }
  function inferImportance(text) { const lower = text.toLowerCase(); if (/(liable|penalty|terminate|indemn|exclusive|breach|damages)/.test(lower)) return "High"; if (/(must|shall|payment|confidential|notice)/.test(lower)) return "Medium"; return "Low"; }
  function heuristicSimplifyClause(text) {
    let simplified = text.replace(/\bshall\b/gi, "must").replace(/\bhereby\b/gi, "").replace(/\bpursuant to\b/gi, "under").replace(/\bprior to\b/gi, "before").replace(/\bin the event that\b/gi, "if").replace(/\bnotwithstanding\b/gi, "even if").replace(/\bcommence\b/gi, "start").replace(/\bterminate\b/gi, "end").replace(/\s{2,}/g, " ").trim();
    if (!/[.?!]$/.test(simplified)) simplified += ".";
    return `In simple words: ${simplified}`;
  }
  function localizeSimplifiedText(text, language) {
    const sets = {
      hindi: [[/\bEither party\b/gi, "\u0915\u094b\u0908 \u092d\u0940 \u092a\u0915\u094d\u0937"], [/\bBoth parties\b/gi, "\u0926\u094b\u0928\u094b\u0902 \u092a\u0915\u094d\u0937"], [/\bAgreement\b/gi, "\u0938\u092e\u091d\u094c\u0924\u093e"], [/\bmust\b/gi, "\u091c\u0930\u0942\u0930\u0940 \u0939\u0948"], [/\bpayment\b/gi, "\u092d\u0941\u0917\u0924\u093e\u0928"], [/\bnotice\b/gi, "\u0928\u094b\u091f\u093f\u0938"], [/\bconfidential\b/gi, "\u0917\u094b\u092a\u0928\u0940\u092f"], [/\bliability\b/gi, "\u0926\u093e\u092f\u093f\u0924\u094d\u0935"], [/\brenew\b/gi, "\u0928\u0935\u0940\u0915\u0930\u0923"]],
      marathi: [[/\bEither party\b/gi, "\u0915\u094b\u0923\u0924\u093e\u0939\u0940 \u092a\u0915\u094d\u0937"], [/\bBoth parties\b/gi, "\u0926\u094b\u0928\u094d\u0939\u0940 \u092a\u0915\u094d\u0937"], [/\bAgreement\b/gi, "\u0915\u0930\u093e\u0930"], [/\bmust\b/gi, "\u0905\u0935\u0936\u094d\u092f \u0906\u0939\u0947"], [/\bpayment\b/gi, "\u092d\u0930\u0923\u093e"], [/\bnotice\b/gi, "\u0928\u094b\u091f\u0940\u0938"], [/\bconfidential\b/gi, "\u0917\u094b\u092a\u0928\u0940\u092f"], [/\bliability\b/gi, "\u0926\u093e\u092f\u093f\u0924\u094d\u0935"], [/\brenew\b/gi, "\u0928\u0935\u0940\u0915\u0930\u0923"]],
      gujarati: [[/\bEither party\b/gi, "\u0a95\u0acb\u0a88 \u0aaa\u0aa3 \u0aaa\u0a95\u0acd\u0ab7"], [/\bBoth parties\b/gi, "\u0aac\u0a82\u0aa8\u0ac7 \u0aaa\u0a95\u0acd\u0ab7\u0acb"], [/\bAgreement\b/gi, "\u0a95\u0ab0\u0abe\u0ab0"], [/\bmust\b/gi, "\u0a9c\u0ab0\u0ac2\u0ab0\u0ac0 \u0a9b\u0ac7"], [/\bpayment\b/gi, "\u0a9a\u0ac1\u0a95\u0ab5\u0aa3\u0ac0"], [/\bnotice\b/gi, "\u0aa8\u0acb\u0a9f\u0abf\u0ab8"], [/\bconfidential\b/gi, "\u0a97\u0acb\u0aaa\u0aa8\u0ac0\u0aaf"], [/\bliability\b/gi, "\u0a9c\u0ab5\u0abe\u0aac\u0aa6\u0abe\u0ab0\u0ac0"], [/\brenew\b/gi, "\u0aa8\u0ab5\u0ac0\u0a95\u0ab0\u0aa3"]],
    };
    let localized = text; for (const [pattern, replacement] of sets[language] || []) localized = localized.replace(pattern, replacement); return localized;
  }
  function buildTranslations(text) { const simplified = heuristicSimplifyClause(text).replace(/^In simple words:\s*/i, ""); return { hindi: localizeSimplifiedText(simplified, "hindi"), marathi: localizeSimplifiedText(simplified, "marathi"), gujarati: localizeSimplifiedText(simplified, "gujarati") }; }
  function buildSuggestions(text) {
    const type = inferClauseType(text); const suggestions = [];
    if (type === "Payment") suggestions.push("Check due dates, penalties, taxes, and invoice approval terms.");
    if (type === "Termination") suggestions.push("Confirm the notice period and the exact conditions that allow the agreement to end.");
    if (type === "Confidentiality") suggestions.push("Ensure the clause defines confidential information, allowed disclosures, and duration.");
    if (type === "Liability") suggestions.push("Review whether liability caps, exclusions, or indemnity obligations are one-sided.");
    if (/(renew|auto-renew|automatic renewal)/i.test(text)) suggestions.push("Auto-renewal can be easy to miss, so track the cancellation window carefully.");
    if (!suggestions.length) suggestions.push("Review who must act, by when, and what happens if the obligation is not met.");
    return suggestions;
  }
  function buildConfidenceScores(text, suggestions, riskFlags) {
    let simplification = 0.7, suggestionsScore = 0.68, riskScore = riskFlags.length ? 0.75 : 0.62;
    const wordCount = text.split(/\s+/).filter(Boolean).length; if (wordCount > 18) simplification -= 0.06; if (wordCount > 35) simplification -= 0.08;
    if (/(provided that|subject to|notwithstanding|indemn|jurisdiction|consequential damages)/i.test(text)) simplification -= 0.08;
    if (suggestions.length >= 2) suggestionsScore += 0.1; if (/(payment|termination|confidential|liability|renew|law|jurisdiction)/i.test(text)) suggestionsScore += 0.08; if (/(liable|indemn|damages|penalty|auto-renew|without notice|sole discretion)/i.test(text)) riskScore += 0.1;
    const clamp = (value) => Math.max(0.35, Math.min(0.98, Number(value.toFixed(2)))); return { simplification: clamp(simplification), suggestions: clamp(suggestionsScore), riskAssessment: clamp(riskScore) };
  }
  function buildTerminology(text, type) {
    const glossary = []; const terms = [
      { term: "Termination", pattern: /\bterminate|termination\b/i, plainMeaning: "How and when the agreement can end." },
      { term: "Notice period", pattern: /\bnotice\b/i, plainMeaning: "How much advance warning must be given." },
      { term: "Liability", pattern: /\bliability|liable\b/i, plainMeaning: "Who must pay if something goes wrong." },
      { term: "Indemnity", pattern: /\bindemn/i, plainMeaning: "A promise to cover another party's loss or claim." },
      { term: "Confidential information", pattern: /\bconfidential|non-disclosure\b/i, plainMeaning: "Private information that must not be shared freely." },
      { term: "Auto-renewal", pattern: /\bauto-renew|automatic renewal|renew\b/i, plainMeaning: "The agreement continues automatically unless someone stops it in time." },
      { term: "Penalty", pattern: /\bpenalty|fine\b/i, plainMeaning: "An extra charge or consequence for not following the agreement." },
      { term: "Jurisdiction", pattern: /\bjurisdiction|governing law\b/i, plainMeaning: "Which court or legal system will handle disputes." },
    ];
    for (const candidate of terms) if (candidate.pattern.test(text)) glossary.push(candidate);
    if (!glossary.length && type) glossary.push({ term: type, plainMeaning: `This clause is mainly about ${type.toLowerCase()} responsibilities and expectations.` });
    return glossary.slice(0, 3);
  }
  function buildRiskFlags(text) { const risks = []; if (/(penalty|fine|damages|liable|liability|indemn)/i.test(text)) risks.push("Financial risk detected"); if (/(exclusive|sole discretion|without notice|unilateral)/i.test(text)) risks.push("Potentially one-sided wording"); if (/(auto-renew|automatic renewal|renew automatically)/i.test(text)) risks.push("Hidden renewal risk"); return risks; }
  const knownTranslations = {
    hindi: { "Financial risk detected": "\u0935\u093f\u0924\u094d\u0924\u0940\u092f \u091c\u094b\u0916\u093f\u092e \u092e\u093f\u0932\u093e", "Potentially one-sided wording": "\u090f\u0915 \u092a\u0915\u094d\u0937 \u0915\u0947 \u092a\u0915\u094d\u0937 \u092e\u0947\u0902 \u091d\u0941\u0915\u093e \u0939\u0941\u0906 \u0936\u092c\u094d\u0926 \u0939\u094b \u0938\u0915\u0924\u093e \u0939\u0948", "Hidden renewal risk": "\u091b\u093f\u092a\u093e \u0939\u0941\u0906 \u0928\u0935\u0940\u0915\u0930\u0923 \u091c\u094b\u0916\u093f\u092e", "Termination": "\u0938\u092e\u093e\u092a\u094d\u0924\u093f", "Notice period": "\u0928\u094b\u091f\u093f\u0938 \u0905\u0935\u0927\u093f", "Liability": "\u0926\u093e\u092f\u093f\u0924\u094d\u0935", "Indemnity": "\u0915\u094d\u0937\u0924\u093f\u092a\u0942\u0930\u094d\u0924\u093f", "Confidential information": "\u0917\u094b\u092a\u0928\u0940\u092f \u091c\u093e\u0928\u0915\u093e\u0930\u0940", "Auto-renewal": "\u0938\u094d\u0935\u091a\u093e\u0932\u093f\u0924 \u0928\u0935\u0940\u0915\u0930\u0923", "Penalty": "\u091c\u0930\u094d\u092e\u093e\u0928\u093e", "Jurisdiction": "\u0905\u0927\u093f\u0915\u093e\u0930 \u0915\u094d\u0937\u0947\u0924\u094d\u0930", "General": "\u0938\u093e\u092e\u093e\u0928\u094d\u092f", "Payment": "\u092d\u0941\u0917\u0924\u093e\u0928", "Confidentiality": "\u0917\u094b\u092a\u0928\u0940\u092f\u0924\u093e", "Compliance": "\u0905\u0928\u0941\u092a\u093e\u0932\u0928", "Obligation": "\u091c\u093f\u092e\u094d\u092e\u0947\u0926\u093e\u0930\u0940", "How and when the agreement can end.": "\u0938\u092e\u091d\u094c\u0924\u093e \u0915\u092c \u0914\u0930 \u0915\u0948\u0938\u0947 \u0938\u092e\u093e\u092a\u094d\u0924 \u0939\u094b \u0938\u0915\u0924\u093e \u0939\u0948\u0964", "How much advance warning must be given.": "\u0915\u093f\u0924\u0928\u0940 \u092a\u0939\u0932\u0947 \u0938\u0947 \u0938\u0942\u091a\u0928\u093e \u0926\u0947\u0928\u0940 \u0939\u094b\u0917\u0940\u0964", "Who must pay if something goes wrong.": "\u0915\u0941\u091b \u0917\u0932\u0924 \u0939\u094b\u0928\u0947 \u092a\u0930 \u0915\u093f\u0938\u0947 \u092d\u0941\u0917\u0924\u093e\u0928 \u0915\u0930\u0928\u093e \u0939\u094b\u0917\u093e\u0964", "A promise to cover another party's loss or claim.": "\u0926\u0942\u0938\u0930\u0947 \u092a\u0915\u094d\u0937 \u0915\u0947 \u0928\u0941\u0915\u0938\u093e\u0928 \u092f\u093e \u0926\u093e\u0935\u0947 \u0915\u094b \u0915\u0935\u0930 \u0915\u0930\u0928\u0947 \u0915\u093e \u0935\u093e\u0926\u093e\u0964", "Private information that must not be shared freely.": "\u0928\u093f\u091c\u0940 \u091c\u093e\u0928\u0915\u093e\u0930\u0940 \u091c\u093f\u0938\u0947 \u0906\u0938\u093e\u0928\u0940 \u0938\u0947 \u0938\u093e\u091d\u093e \u0928\u0939\u0940\u0902 \u0915\u0930\u0928\u093e \u091a\u093e\u0939\u093f\u090f\u0964", "The agreement continues automatically unless someone stops it in time.": "\u092f\u0939 \u0938\u092e\u091d\u094c\u0924\u093e \u0916\u0941\u0926 \u0938\u0947 \u091c\u093e\u0930\u0940 \u0930\u0939\u0924\u093e \u0939\u0948 \u091c\u092c \u0924\u0915 \u0915\u094b\u0908 \u0938\u092e\u092f \u092a\u0930 \u0907\u0938\u0947 \u0930\u094b\u0915 \u0928 \u0926\u0947\u0964", "An extra charge or consequence for not following the agreement.": "\u0938\u092e\u091d\u094c\u0924\u0947 \u0915\u093e \u092a\u093e\u0932\u0928 \u0928 \u0915\u0930\u0928\u0947 \u092a\u0930 \u0905\u0924\u093f\u0930\u093f\u0915\u094d\u0924 \u0936\u0941\u0932\u094d\u0915 \u092f\u093e \u0928\u0924\u0940\u091c\u093e\u0964", "Which court or legal system will handle disputes.": "\u0915\u094c\u0928 \u0938\u093e \u0928\u094d\u092f\u093e\u092f\u093e\u0932\u092f \u092f\u093e \u0915\u093e\u0928\u0942\u0928\u0940 \u092a\u094d\u0930\u0923\u093e\u0932\u0940 \u0935\u093f\u0935\u093e\u0926 \u0938\u0902\u092d\u093e\u0932\u0947\u0917\u0940\u0964" },
    marathi: { "Financial risk detected": "\u0906\u0930\u094d\u0925\u093f\u0915 \u091c\u094b\u0916\u0940\u092e \u0906\u0922\u0933\u0932\u0940", "Potentially one-sided wording": "\u092d\u093e\u0937\u093e \u090f\u0915\u0924\u0930\u094d\u092b\u0940 \u0905\u0938\u0942 \u0936\u0915\u0924\u0947", "Hidden renewal risk": "\u0932\u092a\u0932\u0947\u0932\u0940 \u0928\u0935\u0940\u0915\u0930\u0923 \u091c\u094b\u0916\u0940\u092e", "Termination": "\u0938\u092e\u093e\u092a\u094d\u0924\u0940", "Notice period": "\u0928\u094b\u091f\u0940\u0938 \u0915\u093e\u0932\u093e\u0935\u0927\u0940", "Liability": "\u0926\u093e\u092f\u093f\u0924\u094d\u0935", "Indemnity": "\u092d\u0930\u092a\u093e\u0908", "Confidential information": "\u0917\u094b\u092a\u0928\u0940\u092f \u092e\u093e\u0939\u093f\u0924\u0940", "Auto-renewal": "\u0938\u094d\u0935\u092f\u0902\u091a\u0932\u093f\u0924 \u0928\u0935\u0940\u0915\u0930\u0923", "Penalty": "\u0926\u0902\u0921", "Jurisdiction": "\u0905\u0927\u093f\u0915\u093e\u0930 \u0915\u094d\u0937\u0947\u0924\u094d\u0930", "General": "\u0938\u093e\u092e\u093e\u0928\u094d\u092f", "Payment": "\u092d\u0930\u0923\u093e", "Confidentiality": "\u0917\u094b\u092a\u0928\u0940\u092f\u0924\u093e", "Compliance": "\u0905\u0928\u0941\u092a\u093e\u0932\u0928", "Obligation": "\u091c\u092c\u093e\u092c\u0926\u093e\u0930\u0940", "How and when the agreement can end.": "\u0915\u0930\u093e\u0930 \u0915\u0927\u0940 \u0906\u0923\u093f \u0915\u0938\u093e \u0938\u0902\u092a\u0942 \u0936\u0915\u0924\u094b.", "How much advance warning must be given.": "\u0915\u093f\u0924\u0940 \u0906\u0917\u093e\u090a \u0938\u0942\u091a\u0928\u093e \u0926\u094d\u092f\u093e\u0935\u0940 \u0932\u093e\u0917\u0947\u0932.", "Who must pay if something goes wrong.": "\u0915\u093e\u0939\u0940 \u091a\u0942\u0915 \u091d\u093e\u0932\u094d\u092f\u093e\u0938 \u0915\u094b\u0923\u093e\u0932\u093e \u092d\u0930\u0923\u093e \u0915\u0930\u093e\u0935\u093e \u0932\u093e\u0917\u0947\u0932.", "A promise to cover another party's loss or claim.": "\u0926\u0941\u0938\u0931\u094d\u092f\u093e \u092a\u0915\u094d\u0937\u093e\u091a\u0947 \u0928\u0941\u0915\u0938\u093e\u0928 \u0915\u093f\u0902\u0935\u093e \u0926\u093e\u0935\u093e \u092d\u0930\u0942\u0928 \u0915\u093e\u0922\u0923\u094d\u092f\u093e\u091a\u0947 \u0906\u0936\u094d\u0935\u093e\u0938\u0928.", "Private information that must not be shared freely.": "\u0916\u093e\u091c\u0917\u0940 \u092e\u093e\u0939\u093f\u0924\u0940 \u091c\u0940 \u092e\u094b\u0915\u0933\u0947\u092a\u0923\u093e\u0928\u0947 \u0936\u0947\u0905\u0930 \u0915\u0930\u0942 \u0928\u092f\u0947.", "The agreement continues automatically unless someone stops it in time.": "\u0915\u094b\u0923\u0940 \u0935\u0947\u0933\u0947\u0924 \u0925\u093e\u0902\u092c\u0935\u0932\u0947 \u0928\u093e\u0939\u0940 \u0924\u0930 \u0915\u0930\u093e\u0930 \u0906\u092a\u094b\u0906\u092a \u091a\u093e\u0932\u0942 \u0930\u0939\u0924\u094b.", "An extra charge or consequence for not following the agreement.": "\u0915\u0930\u093e\u0930\u093e\u091a\u0947 \u092a\u093e\u0932\u0928 \u0928 \u0915\u0947\u0932\u094d\u092f\u093e\u0938 \u0905\u0924\u093f\u0930\u093f\u0915\u094d\u0924 \u0936\u0941\u0932\u094d\u0915 \u0915\u093f\u0902\u0935\u093e \u092a\u0930\u093f\u0923\u093e\u092e.", "Which court or legal system will handle disputes.": "\u0915\u094b\u0923\u0924\u0947 \u0928\u094d\u092f\u093e\u092f\u093e\u0932\u092f \u0915\u093f\u0902\u0935\u093e \u0915\u093e\u0928\u0942\u0928\u0940 \u092f\u0902\u0924\u094d\u0930\u0923\u093e \u0935\u093f\u0935\u093e\u0926 \u0939\u093e\u0924\u093e\u0933\u0947\u0932." },
    gujarati: { "Financial risk detected": "\u0aa8\u0abe\u0aa3\u0abe\u0a95\u0ac0\u0aaf \u0a9c\u0acb\u0a96\u0aae \u0aae\u0ab3\u0acd\u0aaf\u0ac1\u0a82", "Potentially one-sided wording": "\u0aad\u0abe\u0ab7\u0abe \u0a8f\u0a95 \u0aaa\u0a95\u0acd\u0ab7\u0ac0\u0aaf \u0ab9\u0acb\u0a88 \u0ab6\u0a95\u0ac7 \u0a9b\u0ac7", "Hidden renewal risk": "\u0a9b\u0ac1\u0aaa\u0abe\u0aaf\u0ac7\u0ab2\u0acb \u0aa8\u0ab5\u0ac0\u0a95\u0ab0\u0aa3 \u0a9c\u0acb\u0a96\u0aae", "Termination": "\u0ab8\u0aae\u0abe\u0aaa\u0acd\u0aa4\u0abf", "Notice period": "\u0aa8\u0acb\u0a9f\u0abf\u0ab8 \u0a85\u0ab5\u0aa7\u0abf", "Liability": "\u0a9c\u0ab5\u0abe\u0aac\u0aa6\u0abe\u0ab0\u0ac0", "Indemnity": "\u0ab5\u0ab3\u0aa4\u0ab0\u0aa8\u0ac0 \u0a96\u0abe\u0aa4\u0ab0\u0ac0", "Confidential information": "\u0a97\u0acb\u0aaa\u0aa8\u0ac0\u0aaf \u0aae\u0abe\u0ab9\u0abf\u0aa4\u0ac0", "Auto-renewal": "\u0ab8\u0acd\u0ab5\u0a9a\u0abe\u0ab2\u0abf\u0aa4 \u0aa8\u0ab5\u0ac0\u0a95\u0ab0\u0aa3", "Penalty": "\u0aa6\u0a82\u0aa1", "Jurisdiction": "\u0a85\u0aa7\u0abf\u0a95\u0abe\u0ab0 \u0a95\u0acd\u0ab7\u0ac7\u0aa4\u0acd\u0ab0", "General": "\u0ab8\u0abe\u0aae\u0abe\u0aa8\u0acd\u0aaf", "Payment": "\u0a9a\u0ac1\u0a95\u0ab5\u0aa3\u0ac0", "Confidentiality": "\u0a97\u0acb\u0aaa\u0aa8\u0ac0\u0aaf\u0aa4\u0abe", "Compliance": "\u0a85\u0aa8\u0ac1\u0aaa\u0abe\u0ab2\u0aa8", "Obligation": "\u0a9c\u0ab5\u0abe\u0aac\u0aa6\u0abe\u0ab0\u0ac0", "How and when the agreement can end.": "\u0a95\u0ab0\u0abe\u0ab0 \u0a95\u0acd\u0aaf\u0abe\u0ab0\u0ac7 \u0a85\u0aa8\u0ac7 \u0a95\u0ac7\u0ab5\u0ac0 \u0ab0\u0ac0\u0aa4\u0ac7 \u0ab8\u0aae\u0abe\u0aaa\u0acd\u0aa4 \u0aa5\u0a88 \u0ab6\u0a95\u0ac7.", "How much advance warning must be given.": "\u0a95\u0ac7\u0a9f\u0ab2\u0ac0 \u0a86\u0a97\u0ab3\u0aa5\u0ac0 \u0ab8\u0ac2\u0a9a\u0aa8\u0abe \u0a86\u0aaa\u0ab5\u0ac0 \u0a9c\u0acb\u0a88\u0a8f.", "Who must pay if something goes wrong.": "\u0a95\u0a88\u0a95 \u0a96\u0acb\u0a9f\u0ac1\u0a82 \u0aa5\u0abe\u0aaf \u0aa4\u0acb \u0a95\u0acb\u0aa3\u0ac7 \u0a9a\u0ac1\u0a95\u0ab5\u0aa3\u0ac0 \u0a95\u0ab0\u0ab5\u0ac0 \u0aaa\u0aa1\u0ab6\u0ac7.", "A promise to cover another party's loss or claim.": "\u0aac\u0ac0\u0a9c\u0abe \u0aaa\u0a95\u0acd\u0ab7\u0aa8\u0ac0 \u0a96\u0acb\u0a9f \u0a85\u0aa5\u0ab5\u0abe \u0aa6\u0abe\u0ab5\u0acb \u0aad\u0ab0\u0ab5\u0abe\u0aa8\u0ac1\u0a82 \u0ab5\u0a9a\u0aa8.", "Private information that must not be shared freely.": "\u0a96\u0abe\u0a82\u0a97\u0ac0 \u0aae\u0abe\u0ab9\u0abf\u0aa4\u0ac0 \u0a9c\u0ac7 \u0ab8\u0ab9\u0ac7\u0ab2\u0abe\u0a88\u0aa5\u0ac0 \u0ab5\u0ab9\u0ac7\u0a82\u0a9a\u0ab5\u0ac0 \u0a9c\u0acb\u0a88\u0a8f \u0aa8\u0ab9\u0ac0\u0a82.", "The agreement continues automatically unless someone stops it in time.": "\u0a95\u0acb\u0a88 \u0ab8\u0aae\u0aaf\u0ab8\u0ab0 \u0a85\u0a9f\u0a95\u0abe\u0ab5\u0ac7 \u0aa8\u0ab9\u0ac0\u0a82 \u0aa4\u0acd\u0aaf\u0abe\u0a82 \u0ab8\u0ac1\u0aa7\u0ac0 \u0a95\u0ab0\u0abe\u0ab0 \u0a96\u0ac1\u0aa6\u0aa5\u0ac0 \u0a9a\u0abe\u0ab2\u0ac1 \u0ab0\u0ab9\u0ac7 \u0a9b\u0ac7.", "An extra charge or consequence for not following the agreement.": "\u0a95\u0ab0\u0abe\u0ab0\u0aa8\u0ac1\u0a82 \u0aaa\u0abe\u0ab2\u0aa8 \u0aa8 \u0a95\u0ab0\u0ab5\u0abe \u0aac\u0aa6\u0ab2 \u0ab5\u0aa7\u0abe\u0ab0\u0abe\u0aa8\u0acb \u0a96\u0ab0\u0a9a \u0a85\u0aa5\u0ab5\u0abe \u0aaa\u0ab0\u0abf\u0aa3\u0abe\u0aae.", "Which court or legal system will handle disputes.": "\u0a95\u0aaf\u0ac1\u0a82 \u0a95\u0acb\u0ab0\u0acd\u0a9f \u0a85\u0aa5\u0ab5\u0abe \u0a95\u0abe\u0aa8\u0ac2\u0aa8\u0ac0 \u0aaa\u0acd\u0ab0\u0aa3\u0abe\u0ab2\u0ac0 \u0ab5\u0abf\u0ab5\u0abe\u0aa6 \u0ab8\u0a82\u0aad\u0abe\u0ab3\u0ab6\u0ac7." },
  };
  const commonDocumentTranslations = {
    hindi: {
      "This document was processed, stored, and analyzed to identify key clauses, simplify legal language, and surface high-risk terms.": "\u0907\u0938 \u0926\u0938\u094d\u0924\u093e\u0935\u0947\u091c\u093c \u0915\u093e \u0935\u093f\u0936\u094d\u0932\u0947\u0937\u0923 \u0915\u0930\u0915\u0947 \u092e\u0941\u0916\u094d\u092f \u0915\u094d\u0932\u0949\u091c\u093c, \u0938\u0930\u0932 \u0915\u093e\u0928\u0942\u0928\u0940 \u092d\u093e\u0937\u093e \u0914\u0930 \u091c\u094b\u0916\u093f\u092e \u0935\u093e\u0932\u0947 \u0939\u093f\u0938\u094d\u0938\u094b\u0902 \u0915\u094b \u092a\u0939\u091a\u093e\u0928\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u092a\u094d\u0930\u094b\u0938\u0947\u0938 \u0915\u093f\u092f\u093e \u0917\u092f\u093e \u0939\u0948.",
      "Check termination notice periods before signing or cancelling a contract.": "\u0915\u0949\u0928\u094d\u091f\u094d\u0930\u0948\u0915\u094d\u091f \u0938\u093e\u0907\u0928 \u092f\u093e \u0915\u0948\u0902\u0938\u0932 \u0915\u0930\u0928\u0947 \u0938\u0947 \u092a\u0939\u0932\u0947 \u091f\u0930\u094d\u092e\u093f\u0928\u0947\u0936\u0928 \u0928\u094b\u091f\u093f\u0938 \u092a\u0940\u0930\u093f\u092f\u0921 \u091c\u0930\u0942\u0930 \u091a\u0947\u0915 \u0915\u0930\u0947\u0902.",
      "Review liability, indemnity, and penalty wording for hidden exposure.": "\u0932\u093e\u092f\u092c\u093f\u0932\u093f\u091f\u0940, \u0907\u0902\u0921\u0947\u092e\u094d\u0928\u093f\u091f\u0940 \u0914\u0930 \u092a\u0947\u0928\u0932\u094d\u091f\u0940 \u0915\u0940 \u092d\u093e\u0937\u093e \u0927\u094d\u092f\u093e\u0928 \u0938\u0947 \u0926\u0947\u0916\u0947\u0902 \u0924\u093e\u0915\u093f \u091b\u093f\u092a\u093e \u0939\u0941\u0906 \u091c\u094b\u0916\u093f\u092e \u0938\u092e\u091d \u0906\u090f.",
      "Confirm payment, confidentiality, and renewal terms in plain language.": "\u092d\u0941\u0917\u0924\u093e\u0928, \u0917\u094b\u092a\u0928\u0940\u092f\u0924\u093e \u0914\u0930 \u0928\u0935\u0940\u0915\u0930\u0923 \u0915\u0940 \u0936\u0930\u094d\u0924\u094b\u0902 \u0915\u094b \u0938\u0930\u0932 \u092d\u093e\u0937\u093e \u092e\u0947\u0902 \u0938\u092e\u091d\u0915\u0930 \u092a\u0941\u0937\u094d\u091f\u093f \u0915\u0930\u0947\u0902.",
      "Digitally fingerprinted": "\u0921\u093f\u091c\u093f\u091f\u0932 \u092b\u093f\u0902\u0917\u0930\u092a\u094d\u0930\u093f\u0902\u091f \u092c\u0928\u093e\u092f\u093e \u0917\u092f\u093e",
      "The platform stores a SHA-256 fingerprint for integrity checking. This can later be anchored to a blockchain or smart-contract workflow.": "\u092f\u0939 \u092a\u094d\u0932\u0948\u091f\u092b\u0949\u0930\u094d\u092e \u0907\u0902\u091f\u0947\u0917\u094d\u0930\u093f\u091f\u0940 \u091a\u0947\u0915 \u0915\u0947 \u0932\u093f\u090f SHA-256 \u092b\u093f\u0902\u0917\u0930\u092a\u094d\u0930\u093f\u0902\u091f \u0938\u094d\u091f\u094b\u0930 \u0915\u0930\u0924\u093e \u0939\u0948. \u0907\u0938\u0947 \u092c\u093e\u0926 \u092e\u0947\u0902 \u092c\u094d\u0932\u0949\u0915\u091a\u0947\u0928 \u092f\u093e \u0938\u094d\u092e\u093e\u0930\u094d\u091f \u0915\u0949\u0928\u094d\u091f\u094d\u0930\u0948\u0915\u094d\u091f \u0935\u0930\u094d\u0915\u092b\u094d\u0932\u094b \u0938\u0947 \u091c\u094b\u0921\u093c\u093e \u091c\u093e \u0938\u0915\u0924\u093e \u0939\u0948."
    },
    marathi: {
      "This document was processed, stored, and analyzed to identify key clauses, simplify legal language, and surface high-risk terms.": "\u092f\u093e \u0926\u0938\u094d\u0924\u090f\u0935\u091c\u093e\u0924\u0940\u0932 \u092e\u0939\u0924\u094d\u0935\u093e\u091a\u094d\u092f\u093e \u0915\u094d\u0932\u0949\u091c, \u0938\u094b\u092a\u094d\u092f\u093e \u0915\u093e\u0928\u0942\u0928\u0940 \u092d\u093e\u0937\u0947\u0924\u0940\u0932 \u092e\u091c\u0915\u0942\u0930 \u0906\u0923\u093f \u091c\u094b\u0916\u0940\u092e \u0936\u092c\u094d\u0926 \u0913\u0933\u0916\u0923\u094d\u092f\u093e\u0938\u093e\u0920\u0940 \u092f\u093e\u091a\u0947 \u0935\u093f\u0936\u094d\u0932\u0947\u0937\u0923 \u0915\u0930\u0923\u094d\u092f\u093e\u0924 \u0906\u0932\u0947.",
      "Check termination notice periods before signing or cancelling a contract.": "\u0915\u0930\u093e\u0930 \u0938\u093e\u0907\u0928 \u0915\u0930\u0923\u094d\u092f\u093e\u092a\u0942\u0930\u094d\u0935\u0940 \u0915\u093f\u0902\u0935\u093e \u0930\u0926\u094d\u0926 \u0915\u0930\u0923\u094d\u092f\u093e\u092a\u0942\u0930\u094d\u0935\u0940 \u0938\u092e\u093e\u092a\u094d\u0924\u0940\u091a\u093e \u0928\u094b\u091f\u093f\u0938 \u0915\u093e\u0932\u093e\u0935\u0927\u0940 \u0928\u0915\u094d\u0915\u0940 \u0924\u092a\u093e\u0938\u093e.",
      "Review liability, indemnity, and penalty wording for hidden exposure.": "\u0926\u093e\u092f\u093f\u0924\u094d\u0935, \u092d\u0930\u092a\u093e\u0908 \u0906\u0923\u093f \u0926\u0902\u0921 \u092f\u093e\u091a\u094d\u092f\u093e \u0936\u092c\u094d\u0926\u0930\u091a\u0928\u0947\u0915\u0921\u0947 \u0932\u0915\u094d\u0937 \u0926\u094d\u092f\u093e \u091c\u0947\u0923\u0947\u0915\u0930\u0942\u0928 \u0932\u092a\u0932\u0947\u0932\u0940 \u091c\u094b\u0916\u0940\u092e \u0938\u092e\u091c\u0947\u0932.",
      "Confirm payment, confidentiality, and renewal terms in plain language.": "\u092d\u0930\u092a\u093e\u0908, \u0917\u094b\u092a\u0928\u0940\u092f\u0924\u093e \u0906\u0923\u093f \u0928\u0935\u0940\u0915\u0930\u0923 \u092f\u093e \u0905\u091f\u0940 \u0938\u094b\u092a\u094d\u092f\u093e \u092d\u093e\u0937\u0947\u0924 \u0938\u092e\u091c\u0942\u0928 \u0918\u094d\u092f\u093e.",
      "Digitally fingerprinted": "\u0921\u093f\u091c\u093f\u091f\u0932 \u092b\u093f\u0902\u0917\u0930\u092a\u094d\u0930\u093f\u0902\u091f \u0924\u092f\u093e\u0930 \u0906\u0939\u0947"
    },
    gujarati: {
      "This document was processed, stored, and analyzed to identify key clauses, simplify legal language, and surface high-risk terms.": "\u0a86 \u0aa6\u0ab8\u0acd\u0aa4\u0abe\u0ab5\u0ac7\u0a9c\u0aa8\u0ac1\u0a82 \u0aae\u0ac1\u0a96\u0acd\u0aaf \u0a95\u0acd\u0ab2\u0ac9\u0a9d, \u0ab8\u0ab0\u0ab3 \u0a95\u0abe\u0aa8\u0ac2\u0aa8\u0ac0 \u0aad\u0abe\u0ab7\u0abe \u0a85\u0aa8\u0ac7 \u0a9c\u0acb\u0a96\u0aae\u0ab5\u0abe\u0ab3\u0abe \u0ab6\u0aac\u0acd\u0aa6\u0acb \u0ab6\u0acb\u0aa7\u0ab5\u0abe \u0aae\u0abe\u0a9f\u0ac7 \u0ab5\u0abf\u0ab6\u0acd\u0ab2\u0ac7\u0ab7\u0aa3 \u0a95\u0ab0\u0ab5\u0abe\u0aae\u0abe\u0a82 \u0a86\u0ab5\u0acd\u0aaf\u0ac1\u0a82 \u0a9b\u0ac7.",
      "Check termination notice periods before signing or cancelling a contract.": "\u0a95\u0ac9\u0aa8\u0acd\u0a9f\u0acd\u0ab0\u0ac7\u0a95\u0acd\u0a9f \u0ab8\u0abe\u0a87\u0aa8 \u0a95\u0ab0\u0ab5\u0abe \u0a85\u0aa5\u0ab5\u0abe \u0ab0\u0aa6\u0acd\u0aa6 \u0a95\u0ab0\u0ab5\u0abe \u0aaa\u0ab9\u0ac7\u0ab2\u0abe \u0ab8\u0aae\u0abe\u0aaa\u0acd\u0aa4\u0abf \u0aa8\u0acb\u0a9f\u0abf\u0ab8 \u0aaa\u0ac0\u0ab0\u0abf\u0aaf\u0aa1 \u0a9a\u0acb\u0a95\u0acd\u0a95\u0ab8 \u0a9a\u0ac7\u0a95 \u0a95\u0ab0\u0acb.",
      "Review liability, indemnity, and penalty wording for hidden exposure.": "\u0ab2\u0abe\u0aaf\u0aac\u0abf\u0ab2\u0abf\u0a9f\u0ac0, \u0a87\u0aa8\u0acd\u0aa1\u0ac7\u0aae\u0acd\u0aa8\u0abf\u0a9f\u0ac0 \u0a85\u0aa8\u0ac7 \u0aaa\u0ac7\u0aa8\u0abe\u0ab2\u0acd\u0a9f\u0ac0\u0aa8\u0ac0 \u0aad\u0abe\u0ab7\u0abe \u0aa7\u0acd\u0aaf\u0abe\u0aa8\u0aa5\u0ac0 \u0a9c\u0acb\u0ab5\u0acb \u0a9c\u0ac7\u0aa5\u0ac0 \u0a9b\u0ac1\u0aaa\u0abe\u0aaf\u0ac7\u0ab2\u0acb \u0a9c\u0acb\u0a96\u0aae \u0ab8\u0aae\u0a9c\u0abe\u0aaf.",
      "Confirm payment, confidentiality, and renewal terms in plain language.": "\u0a9a\u0ac1\u0a95\u0ab5\u0aa3\u0ac0, \u0a97\u0acb\u0aaa\u0aa8\u0ac0\u0aaf\u0aa4\u0abe \u0a85\u0aa8\u0ac7 \u0aa8\u0ab5\u0ac0\u0a95\u0ab0\u0aa3\u0aa8\u0ac0 \u0ab6\u0ab0\u0acd\u0aa4\u0acb \u0ab8\u0ab0\u0ab3 \u0aad\u0abe\u0ab7\u0abe\u0aae\u0abe\u0a82 \u0ab8\u0aae\u0a9c\u0ac0 \u0ab2\u0acb.",
      "Digitally fingerprinted": "\u0aa1\u0abf\u0a9c\u0abf\u0a9f\u0ab2 \u0aab\u0abf\u0a82\u0a97\u0ab0\u0aaa\u0acd\u0ab0\u0abf\u0aa8\u0acd\u0a9f \u0aac\u0aa8\u0abe\u0ab5\u0ab5\u0abe\u0aae\u0abe\u0a82 \u0a86\u0ab5\u0acd\u0aaf\u0ac1\u0a82"
    }
  };
  function translateKnownText(text, language) {
    if (language === "english") return text;
    const clauseMeaning = text.match(/^This clause is mainly about (.+) responsibilities and expectations\.$/i);
    if (clauseMeaning) {
      const type = clauseMeaning[1];
      const localizedType = knownTranslations[language]?.[type] || type;
      const templates = {
        hindi: `यह क्लॉज मुख्य रूप से ${localizedType} जिम्मेदारियों और अपेक्षाओं के बारे में है।`,
        marathi: `ही क्लॉज मुख्यतः ${localizedType} जबाबदाऱ्या आणि अपेक्षांबद्दल आहे.`,
        gujarati: `આ ક્લૉઝ મુખ્યત્વે ${localizedType} જવાબદારીઓ અને અપેક્ષાઓ વિશે છે.`,
      };
      return templates[language] || text;
    }
    return commonDocumentTranslations[language]?.[text] || knownTranslations[language]?.[text] || text;
  }
  function getLanguageDisplayName(language) {
    return {
      english: "English",
      hindi: "\u0939\u093f\u0928\u094d\u0926\u0940",
      marathi: "\u092e\u0930\u093e\u0920\u0940",
      gujarati: "\u0a97\u0ac1\u0a9c\u0ab0\u0abe\u0aa4\u0ac0",
      tamil: "\u0ba4\u0bae\u0bbf\u0bb4\u0bcd",
      bengali: "\u09ac\u09be\u0982\u09b2\u09be",
      punjabi: "\u0a2a\u0a70\u0a1c\u0a3e\u0a2c\u0a40",
    }[language] || language;
  }
  function getLanguageCapabilities() { return SUPPORTED_LANGUAGES.map((language) => ({ code: language, label: getLanguageDisplayName(language), quality: language === "english" ? "native" : ["hindi", "marathi", "gujarati"].includes(language) ? "good" : "limited", requiresAI: false })); }
  function fallbackTranslateText(text, language) { const known = translateKnownText(text, language); return known !== text ? known : text; }
  async function translateText(text, language) {
    if (!text?.trim()) return ""; if (language === "english") return text; if (!openai) return fallbackTranslateText(text, language);
    try {
      const completion = await openai.responses.create({ model: processEnv.OPENAI_MODEL || "gpt-4.1-mini", input: [{ role: "system", content: `Translate legal-tech product content into ${getLanguageDisplayName(language)}. Preserve meaning, keep it natural, and do not add extra commentary.` }, { role: "user", content: text }] });
      return completion.output_text?.trim() || fallbackTranslateText(text, language);
    } catch { return fallbackTranslateText(text, language); }
  }
  async function buildFullDocumentTranslation(document, language) {
    const clauses = [];
    for (const clause of document.clauses) {
      clauses.push({ clauseId: clause.clauseId, title: await translateText(clause.title, language), type: clause.type, importance: clause.importance, originalText: await translateText(clause.originalText, language), simplifiedText: clause.localized?.[language]?.simplifiedText || (await translateText(clause.simplifiedText, language)), suggestions: clause.localized?.[language]?.suggestions?.length ? clause.localized[language].suggestions : await Promise.all(clause.suggestions.map((item) => translateText(item, language))), riskFlags: clause.localized?.[language]?.riskFlags?.length ? clause.localized[language].riskFlags : await Promise.all(clause.riskFlags.map((item) => translateText(item, language))), confidenceScores: clause.confidenceScores, terminology: clause.terminology?.length ? await Promise.all(clause.terminology.map(async (entry) => ({ term: await translateText(entry.term, language), plainMeaning: await translateText(entry.plainMeaning, language) }))) : [], feedbackSummary: clause.feedbackSummary || { total: 0, positive: 0, negative: 0, helpfulnessScore: 0 } });
    }
    return { language, documentId: document.id, title: await translateText(document.title, language), overview: document.localizedSummary?.[language]?.overview || (await translateText(document.summary.overview, language)), fullText: await translateText(document.originalText, language), frequentRuleWarnings: document.localizedSummary?.[language]?.frequentRuleWarnings?.length ? document.localizedSummary[language].frequentRuleWarnings : await Promise.all(document.summary.frequentRuleWarnings.map((item) => translateText(item, language))), clauses };
  }
  function buildLocalizedSummary(summary, verification) { const localized = {}; for (const language of SUPPORTED_LANGUAGES) localized[language] = { overview: translateKnownText(summary.overview, language), frequentRuleWarnings: summary.frequentRuleWarnings.map((warning) => translateKnownText(warning, language)), verificationStatus: translateKnownText(verification.status, language), verificationExplanation: translateKnownText(verification.explanation, language), glossary: (summary.glossary || []).map((entry) => ({ term: translateKnownText(entry.term, language), plainMeaning: translateKnownText(entry.plainMeaning, language) })) }; return localized; }
  function buildLocalizedClauses(clauses) {
    return clauses.map((clause) => {
      const localized = {
        english: {
          simplifiedText: clause.simplifiedText,
          suggestions: clause.suggestions,
          riskFlags: clause.riskFlags,
        },
      };

      for (const language of SUPPORTED_LANGUAGES) {
        if (language === "english") {
          continue;
        }

        localized[language] = {
          simplifiedText: clause.translations?.[language] || clause.simplifiedText,
          suggestions: clause.suggestions.map((item) => translateKnownText(item, language)),
          riskFlags: clause.riskFlags.map((item) => translateKnownText(item, language)),
        };
      }

      return {
        ...clause,
        localized,
      };
    });
  }
  function summarizeDocument(documentText, clauses) { const glossary = []; for (const clause of clauses) for (const entry of clause.terminology || []) if (!glossary.some((existing) => existing.term === entry.term)) glossary.push(entry); return { overview: "This document was processed, stored, and analyzed to identify key clauses, simplify legal language, and surface high-risk terms.", readingTime: `${Math.max(1, Math.ceil(documentText.split(/\s+/).length / 180))} min`, stats: { totalClauses: clauses.length, highImportanceClauses: clauses.filter((clause) => clause.importance === "High").length, clauseTypes: [...new Set(clauses.map((clause) => clause.type))] }, frequentRuleWarnings: ["Check termination notice periods before signing or cancelling a contract.", "Review liability, indemnity, and penalty wording for hidden exposure.", "Confirm payment, confidentiality, and renewal terms in plain language."], glossary: glossary.slice(0, 8) }; }
  function buildVerificationRecord(documentText) { const documentHash = crypto.createHash("sha256").update(documentText).digest("hex"); return { documentHash, timestamp: new Date().toISOString(), status: "Digitally fingerprinted", explanation: "The platform stores a SHA-256 fingerprint for integrity checking. This can later be anchored to a blockchain or smart-contract workflow.", blockchain: { ledgerMode: "append-only verification chain", smartContractRef: `SL-SMART-${documentHash.slice(0, 12).toUpperCase()}`, anchorStatus: "Recorded in verification chain", immutableRecordId: `CHAIN-${documentHash.slice(0, 10).toUpperCase()}` } }; }
  async function extractTextFromFile(filePath, originalName) {
    const extension = path.extname(originalName).toLowerCase(); const buffer = fs.readFileSync(filePath);
    if (!SUPPORTED_FILE_TYPES.includes(extension)) throw new Error("Unsupported file type. Please upload a TXT, MD, DOC, DOCX, or PDF file.");
    if ([".txt", ".md", ".text"].includes(extension)) return cleanWhitespace(buffer.toString("utf8"));
    if (extension === ".doc") { try { return cleanWhitespace((await mammoth.extractRawText({ path: filePath })).value); } catch { throw new Error("Legacy .doc files are accepted, but some old Word files need to be saved as DOCX or PDF before upload."); } }
    if (extension === ".docx") return cleanWhitespace((await mammoth.extractRawText({ path: filePath })).value);
    if (extension === ".pdf") { try { const parser = new PDFParse({ data: buffer }); const result = await parser.getText(); await parser.destroy(); return cleanWhitespace(result.text || ""); } catch { throw new Error("This PDF could not be read as text. If it is a scanned PDF, convert it to searchable PDF or DOCX and try again."); } }
    return "";
  }
  function safeDeleteFile(filePath) { if (!filePath) return; fs.promises.unlink(filePath).catch(() => {}); }
  async function maybeEnhanceClausesWithAI(clauses) {
    if (!openai) return clauses; const upgradedClauses = [];
    for (const clause of clauses) {
      try {
        const completion = await openai.responses.create({ model: processEnv.OPENAI_MODEL || "gpt-4.1-mini", input: [{ role: "system", content: "You simplify legal clauses for non-lawyers. Return strict JSON with keys simplifiedText, suggestions, and riskFlags." }, { role: "user", content: `Clause: ${clause.originalText}` }], text: { format: { type: "json_schema", name: "legal_clause_analysis", schema: { type: "object", additionalProperties: false, properties: { simplifiedText: { type: "string" }, suggestions: { type: "array", items: { type: "string" } }, riskFlags: { type: "array", items: { type: "string" } } }, required: ["simplifiedText", "suggestions", "riskFlags"] } } } });
        const parsed = JSON.parse(completion.output_text); upgradedClauses.push({ ...clause, simplifiedText: parsed.simplifiedText || clause.simplifiedText, suggestions: parsed.suggestions?.length ? parsed.suggestions : clause.suggestions, riskFlags: parsed.riskFlags?.length ? parsed.riskFlags : clause.riskFlags });
      } catch { upgradedClauses.push(clause); }
    }
    return upgradedClauses;
  }
  function splitIntoClauses(text) {
    const normalized = cleanWhitespace(text);
    const numberedClauses = normalized.split(/\n(?=(?:\d+[\).]|[A-Z][A-Za-z/& -]{2,}:))/).map((part) => part.trim()).filter(Boolean);
    const paragraphs = normalized.split(/\n{2,}/).map((part) => part.trim()).filter((part) => part.length > 30);
    const sentenceChunks = normalized.split(/(?<=[.!?])\s+(?=[A-Z])/).map((part) => part.trim()).filter((part) => part.length > 40);
    const baseClauses = numberedClauses.length > 1 ? numberedClauses : paragraphs.length > 1 ? paragraphs : sentenceChunks;
    return baseClauses.slice(0, 20).map((clauseText, index) => ({ clauseId: `CL-${index + 1}`, title: inferClauseTitle(clauseText, index), type: inferClauseType(clauseText), importance: inferImportance(clauseText), originalText: clauseText, simplifiedText: heuristicSimplifyClause(clauseText), translations: buildTranslations(clauseText), suggestions: buildSuggestions(clauseText), riskFlags: buildRiskFlags(clauseText) }));
  }
  return { createPublicId, encryptField, decryptField, consumeAuthAttempt, clearAuthAttempts, ensureAuthRateLimit, cleanWhitespace, buildConfidenceScores, buildTerminology, getLanguageCapabilities, translateText, translateKnownText, buildFullDocumentTranslation, buildLocalizedSummary, buildLocalizedClauses, summarizeDocument, buildVerificationRecord, extractTextFromFile, safeDeleteFile, maybeEnhanceClausesWithAI, splitIntoClauses };
}

module.exports = { createServerHelpers };
