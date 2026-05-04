const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("node:crypto");
const Database = require("better-sqlite3");
const mammoth = require("mammoth");
const { PDFParse } = require("pdf-parse");
const dotenv = require("dotenv");
const OpenAI = require("openai");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { createServerHelpers } = require("./serverHelpers");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "simplifylegal-dev-secret";
const DEFAULT_JWT_SECRET = "simplifylegal-dev-secret";
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const DOCUMENT_ENCRYPTION_KEY = process.env.DOCUMENT_ENCRYPTION_KEY || "";
const FRONTEND_DIST_DIR = path.join(__dirname, "..", "frontend", "dist");
const FRONTEND_DIR = fs.existsSync(FRONTEND_DIST_DIR)
  ? FRONTEND_DIST_DIR
  : path.join(__dirname, "..", "frontend");
const UPLOAD_DIR = path.join(__dirname, "uploads");
const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "simplifylegal.db");
const SUPPORTED_FILE_TYPES = [".txt", ".md", ".text", ".doc", ".docx", ".pdf"];
const SUPPORTED_LANGUAGES = ["english", "hindi", "marathi", "gujarati"];

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const loginAttemptStore = new Map();
const contactTransport =
  process.env.SMTP_HOST &&
  process.env.SMTP_PORT &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    : null;

if (process.env.NODE_ENV === "production" && JWT_SECRET === DEFAULT_JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in production.");
}

if (JWT_SECRET === DEFAULT_JWT_SECRET) {
  console.warn("SimplifyLegal is using the default JWT secret. Set JWT_SECRET in backend/.env for stronger security.");
}

if (DOCUMENT_ENCRYPTION_KEY && DOCUMENT_ENCRYPTION_KEY.length < 32) {
  throw new Error("DOCUMENT_ENCRYPTION_KEY must be at least 32 characters long.");
}

db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    source TEXT NOT NULL,
    filename TEXT,
    language TEXT NOT NULL DEFAULT 'English',
    original_text TEXT NOT NULL,
    summary_json TEXT NOT NULL,
    verification_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS clauses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    public_clause_id TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    importance TEXT NOT NULL,
    original_text TEXT NOT NULL,
    simplified_text TEXT NOT NULL,
    translations_json TEXT NOT NULL,
    suggestions_json TEXT NOT NULL,
    risk_flags_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    document_id TEXT NOT NULL,
    clause_id TEXT,
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS verification_chain (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_public_id TEXT NOT NULL UNIQUE,
    block_hash TEXT NOT NULL,
    previous_block_hash TEXT,
    smart_contract_ref TEXT NOT NULL,
    anchored_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contact_queries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((entry) => entry.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

ensureColumn("documents", "user_id", "INTEGER REFERENCES users(id)");

const insertUserStmt = db.prepare(`
  INSERT INTO users (public_id, name, email, password_hash, created_at)
  VALUES (@publicId, @name, @email, @passwordHash, @createdAt)
`);

const selectUserByEmailStmt = db.prepare(`
  SELECT id, public_id, name, email, password_hash, created_at
  FROM users
  WHERE lower(email) = lower(?)
`);

const selectUserByIdStmt = db.prepare(`
  SELECT id, public_id, name, email, created_at
  FROM users
  WHERE id = ?
`);

const insertDocumentStmt = db.prepare(`
  INSERT INTO documents (
    public_id, user_id, title, source, filename, language, original_text, summary_json, verification_json, created_at
  ) VALUES (
    @publicId, @userId, @title, @source, @filename, @language, @originalText, @summaryJson, @verificationJson, @createdAt
  )
`);

const insertClauseStmt = db.prepare(`
  INSERT INTO clauses (
    document_id, public_clause_id, title, type, importance, original_text, simplified_text,
    translations_json, suggestions_json, risk_flags_json, created_at
  ) VALUES (
    @documentId, @publicClauseId, @title, @type, @importance, @originalText, @simplifiedText,
    @translationsJson, @suggestionsJson, @riskFlagsJson, @createdAt
  )
`);

const selectDocumentsForUserStmt = db.prepare(`
  SELECT id, public_id, user_id, title, source, filename, language, original_text, summary_json, verification_json, created_at
  FROM documents
  WHERE user_id = ?
  ORDER BY datetime(created_at) DESC, id DESC
`);

const selectDocumentByPublicIdStmt = db.prepare(`
  SELECT id, public_id, user_id, title, source, filename, language, original_text, summary_json, verification_json, created_at
  FROM documents
  WHERE public_id = ? AND user_id = ?
`);

const selectClausesForDocumentStmt = db.prepare(`
  SELECT public_clause_id, title, type, importance, original_text, simplified_text,
         translations_json, suggestions_json, risk_flags_json, created_at
  FROM clauses
  WHERE document_id = ?
  ORDER BY id ASC
`);

const insertFeedbackStmt = db.prepare(`
  INSERT INTO feedback (user_id, document_id, clause_id, rating, comment, created_at)
  VALUES (@userId, @documentId, @clauseId, @rating, @comment, @createdAt)
`);

const selectFeedbackForDocumentStmt = db.prepare(`
  SELECT id, user_id, document_id, clause_id, rating, comment, created_at
  FROM feedback
  WHERE document_id = ?
`);

const selectAllFeedbackForUserStmt = db.prepare(`
  SELECT id, user_id, document_id, clause_id, rating, comment, created_at
  FROM feedback
  WHERE user_id = ?
`);

const selectLatestChainStmt = db.prepare(`
  SELECT block_hash
  FROM verification_chain
  ORDER BY id DESC
  LIMIT 1
`);

const insertVerificationChainStmt = db.prepare(`
  INSERT INTO verification_chain (document_public_id, block_hash, previous_block_hash, smart_contract_ref, anchored_at)
  VALUES (@documentPublicId, @blockHash, @previousBlockHash, @smartContractRef, @anchoredAt)
`);

const selectVerificationChainForDocumentStmt = db.prepare(`
  SELECT block_hash, previous_block_hash, smart_contract_ref, anchored_at
  FROM verification_chain
  WHERE document_public_id = ?
`);

const insertContactQueryStmt = db.prepare(`
  INSERT INTO contact_queries (name, email, subject, message, created_at)
  VALUES (@name, @email, @subject, @message, @createdAt)
`);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
});

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "microphone=(), camera=(), geolocation=()");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  next();
});
app.use(
  cors((req, callback) => {
    const requestHost = req.headers.host;

    callback(null, {
      origin(origin, originCallback) {
        const requestOriginHost = origin ? new URL(origin).host : "";
        const isSameOrigin = requestOriginHost && requestOriginHost === requestHost;

        if (!origin || isSameOrigin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
          return originCallback(null, true);
        }
        return originCallback(new Error("Origin not allowed by CORS."));
      },
      credentials: false,
    });
  })
);
app.use(express.json({ limit: "4mb" }));
app.use(express.static(FRONTEND_DIR));

const {
  createPublicId,
  encryptField,
  decryptField,
  consumeAuthAttempt,
  clearAuthAttempts,
  ensureAuthRateLimit,
  cleanWhitespace,
  buildConfidenceScores,
  buildTerminology,
  getLanguageCapabilities,
  translateText,
  translateKnownText,
  buildFullDocumentTranslation,
  buildLocalizedSummary,
  buildLocalizedClauses,
  summarizeDocument,
  buildVerificationRecord,
  extractTextFromFile,
  safeDeleteFile,
  maybeEnhanceClausesWithAI,
  splitIntoClauses,
} = createServerHelpers({
  DOCUMENT_ENCRYPTION_KEY,
  SUPPORTED_FILE_TYPES,
  SUPPORTED_LANGUAGES,
  loginAttemptStore,
  openai,
  processEnv: process.env,
  fs,
  path,
  mammoth,
  PDFParse,
});
function getFeedbackSummaryForDocument(documentPublicId) {
  const feedbackEntries = selectFeedbackForDocumentStmt.all(documentPublicId);
  const byClause = {};
  const documentLevel = { total: 0, positive: 0, negative: 0, helpfulnessScore: 0 };

  for (const entry of feedbackEntries) {
    const positive = Number(entry.rating) > 0 ? 1 : 0;
    const negative = positive ? 0 : 1;

    if (!entry.clause_id) {
      documentLevel.total += 1;
      documentLevel.positive += positive;
      documentLevel.negative += negative;
      continue;
    }

    byClause[entry.clause_id] ||= { total: 0, positive: 0, negative: 0, helpfulnessScore: 0, latestComment: null };
    byClause[entry.clause_id].total += 1;
    byClause[entry.clause_id].positive += positive;
    byClause[entry.clause_id].negative += negative;
    if (entry.comment) {
      byClause[entry.clause_id].latestComment = entry.comment;
    }
  }

  const finalize = (summary) => ({
    ...summary,
    helpfulnessScore: summary.total ? Number((summary.positive / summary.total).toFixed(2)) : 0,
  });

  return {
    byClause: Object.fromEntries(Object.entries(byClause).map(([key, value]) => [key, finalize(value)])),
    documentLevel: finalize(documentLevel),
  };
}

function applyFeedbackSignals(clause, feedbackSummary) {
  const summary = feedbackSummary?.byClause?.[clause.clauseId] || {
    total: 0,
    positive: 0,
    negative: 0,
    helpfulnessScore: 0,
    latestComment: null,
  };

  const suggestions = [...clause.suggestions];
  if (summary.negative >= 2) {
    suggestions.unshift("Users marked this clause as confusing. Review this clause slowly and compare responsibilities for both parties.");
  }
  if (summary.latestComment) {
    suggestions.push(`Recent user feedback: ${summary.latestComment}`);
  }

  return {
    ...clause,
    suggestions,
    feedbackSummary: summary,
  };
}

function buildRiskPreventionAnswer(document) {
  const riskyClauses = document.clauses.filter((clause) => clause.riskFlags.length > 0);

  if (!riskyClauses.length) {
    return {
      answer:
        "To reduce risk, review payment dates, termination notice, liability limits, renewal terms, and confidentiality duties before signing. Make sure deadlines, penalties, and responsibilities are clearly written.",
      citedClause: null,
    };
  }

  const preventionSteps = riskyClauses.map((clause) => {
    if (clause.type === "Liability") {
      return `${clause.clauseId}: cap liability, remove unlimited damages, and make the clause balanced for both parties.`;
    }
    if (clause.type === "Termination") {
      return `${clause.clauseId}: add a clear notice period, list the exact termination events, and avoid one-sided exit rights.`;
    }
    if (clause.type === "Payment") {
      return `${clause.clauseId}: confirm due dates, late fees, taxes, and invoice approval steps in writing.`;
    }
    if (clause.type === "Confidentiality") {
      return `${clause.clauseId}: define what is confidential, who may access it, and when the duty ends.`;
    }
    return `${clause.clauseId}: ${clause.suggestions[0]}`;
  });

  return {
    answer: `To prevent risk in this document: ${preventionSteps.join(" ")} Also review every high-importance clause before signing.`,
    citedClause: riskyClauses[0].clauseId,
  };
}

function buildRiskExplanationAnswer(document) {
  const riskyClauses = document.clauses.filter((clause) => clause.riskFlags.length > 0);

  if (!riskyClauses.length) {
    return {
      answer: [
        "Here is the risk summary for this document.",
        "",
        "I do not see a major high-risk clause flagged by the current analysis.",
        "",
        "What you should still review:",
        "1. Payment deadlines and penalties",
        "2. Termination notice period",
        "3. Liability and indemnity wording",
        "4. Renewal and cancellation conditions",
      ].join("\n"),
      translations: {
        english: [
          "Here is the risk summary for this document.",
          "",
          "I do not see a major high-risk clause flagged by the current analysis.",
          "",
          "What you should still review:",
          "1. Payment deadlines and penalties",
          "2. Termination notice period",
          "3. Liability and indemnity wording",
          "4. Renewal and cancellation conditions",
        ].join("\n"),
        hindi: [
          "Yah document ka risk summary hai.",
          "",
          "Current analysis ke hisaab se koi major high-risk clause flag nahin hua hai.",
          "",
          "Phir bhi aapko in cheezon ko dekhna chahiye:",
          "1. Payment deadlines aur penalties",
          "2. Termination notice period",
          "3. Liability aur indemnity wording",
          "4. Renewal aur cancellation conditions",
        ].join("\n"),
        marathi: [
          "Ya document cha risk summary khalilpramane aahe.",
          "",
          "Current analysis nusar motha high-risk clause flag jhala nahi.",
          "",
          "Tari hi he points tapasa:",
          "1. Payment deadlines ani penalties",
          "2. Termination notice period",
          "3. Liability ani indemnity wording",
          "4. Renewal ani cancellation conditions",
        ].join("\n"),
        gujarati: [
          "Aa document nu risk summary aa chhe.",
          "",
          "Current analysis pramane koi moto high-risk clause flag thayo nathi.",
          "",
          "Tathaapi tame aa muddao jarur check karo:",
          "1. Payment deadlines ane penalties",
          "2. Termination notice period",
          "3. Liability ane indemnity wording",
          "4. Renewal ane cancellation conditions",
        ].join("\n"),
      },
      citedClause: null,
    };
  }

  const lines = [
    "Here is the risk summary for this document.",
    "",
    `I found ${riskyClauses.length} clause(s) that need attention: ${riskyClauses.map((clause) => clause.clauseId).join(", ")}.`,
    "",
    "Why these clauses are risky:",
  ];

  riskyClauses.forEach((clause) => {
    let explanation = clause.suggestions[0];

    if (clause.type === "Liability") {
      explanation =
        "This clause can create financial exposure. If liability is too broad or unlimited, one side may have to pay large damages.";
    } else if (clause.type === "Termination") {
      explanation =
        "This clause affects how the agreement can end. Unclear notice periods or one-sided exit rights can cause disputes.";
    } else if (clause.type === "Payment") {
      explanation =
        "This clause can create financial and compliance issues if due dates, penalties, or taxes are not clearly written.";
    } else if (clause.type === "Confidentiality") {
      explanation =
        "This clause can create legal risk if confidential information is not clearly defined or the duration is unclear.";
    }

    lines.push(`- ${clause.clauseId} (${clause.type}): ${explanation}`);
  });

  lines.push("");
  lines.push("What you should do:");
  riskyClauses.forEach((clause) => {
    lines.push(`- ${clause.clauseId}: ${clause.suggestions[0]}`);
  });
  lines.push("");
  lines.push("Simple advice:");
  lines.push("Read the risky clauses carefully before signing and make sure obligations, penalties, notice periods, and renewal terms are clearly written.");

  return {
    answer: lines.join("\n"),
    translations: {
      english: lines.join("\n"),
      hindi: [
        "Yah document ka risk summary hai.",
        "",
        `Maine ${riskyClauses.length} clause(s) identify kiye hain jin par dhyan dena chahiye: ${riskyClauses.map((clause) => clause.clauseId).join(", ")}.`,
        "",
        "Yeh clauses risky kyon hain:",
        ...riskyClauses.map((clause) => `- ${clause.clauseId}: ${translateKnownText(clause.suggestions[0], "hindi")}`),
        "",
        "Aapko kya karna chahiye:",
        ...riskyClauses.map((clause) => `- ${clause.clauseId}: ${translateKnownText(clause.suggestions[0], "hindi")}`),
      ].join("\n"),
      marathi: [
        "Ya document cha risk summary khalilpramane aahe.",
        "",
        `Mala ${riskyClauses.length} clause(s) disle jyanna laksh dene garjeche aahe: ${riskyClauses.map((clause) => clause.clauseId).join(", ")}.`,
        "",
        "He clauses risky ka aahet:",
        ...riskyClauses.map((clause) => `- ${clause.clauseId}: ${translateKnownText(clause.suggestions[0], "marathi")}`),
        "",
        "Tumhi kay karave:",
        ...riskyClauses.map((clause) => `- ${clause.clauseId}: ${translateKnownText(clause.suggestions[0], "marathi")}`),
      ].join("\n"),
      gujarati: [
        "Aa document nu risk summary aa chhe.",
        "",
        `Mane ${riskyClauses.length} clause(s) malya chhe jem par dhyan aapvu joie: ${riskyClauses.map((clause) => clause.clauseId).join(", ")}.`,
        "",
        "Aa clauses risky kem chhe:",
        ...riskyClauses.map((clause) => `- ${clause.clauseId}: ${translateKnownText(clause.suggestions[0], "gujarati")}`),
        "",
        "Tamare shu karvu joie:",
        ...riskyClauses.map((clause) => `- ${clause.clauseId}: ${translateKnownText(clause.suggestions[0], "gujarati")}`),
      ].join("\n"),
    },
    citedClause: riskyClauses[0].clauseId,
  };
}

function buildStructuredAssistantPayload({ summary, explanation = [], actions = [], followUp, citedClause = null }) {
  const textParts = [summary];

  if (explanation.length) {
    textParts.push("", "Why it matters:");
    explanation.forEach((item) => textParts.push(`- ${item}`));
  }

  if (actions.length) {
    textParts.push("", "What you can do next:");
    actions.forEach((item) => textParts.push(`- ${item}`));
  }

  if (followUp) {
    textParts.push("", `Next step: ${followUp}`);
  }

  return {
    answer: textParts.join("\n"),
    sections: {
      summary,
      explanation,
      actions,
      followUp: followUp || "",
    },
    citedClause,
  };
}

async function localizeStructuredPayload(payload) {
  const translations = {};

  for (const language of SUPPORTED_LANGUAGES) {
    if (language === "english") {
      translations[language] = {
        answer: payload.answer,
        sections: payload.sections,
      };
      continue;
    }

    const translatedSummary = await translateText(payload.sections.summary, language);
    const translatedExplanation = await Promise.all(
      payload.sections.explanation.map((item) => translateText(item, language))
    );
    const translatedActions = await Promise.all(
      payload.sections.actions.map((item) => translateText(item, language))
    );
    const translatedFollowUp = payload.sections.followUp
      ? await translateText(payload.sections.followUp, language)
      : "";

    const answerLines = [translatedSummary];
    if (translatedExplanation.length) {
      answerLines.push("", await translateText("Why it matters:", language));
      translatedExplanation.forEach((item) => answerLines.push(`- ${item}`));
    }
    if (translatedActions.length) {
      answerLines.push("", await translateText("What you can do next:", language));
      translatedActions.forEach((item) => answerLines.push(`- ${item}`));
    }
    if (translatedFollowUp) {
      answerLines.push("", `${await translateText("Next step:", language)} ${translatedFollowUp}`);
    }

    translations[language] = {
      answer: answerLines.join("\n"),
      sections: {
        summary: translatedSummary,
        explanation: translatedExplanation,
        actions: translatedActions,
        followUp: translatedFollowUp,
      },
    };
  }

  return translations;
}

function hydrateDocument(row) {
  if (!row) {
    return null;
  }

  const feedbackSummary = getFeedbackSummaryForDocument(row.public_id);
  const clauses = selectClausesForDocumentStmt.all(row.id).map((clause) => {
    const suggestions = JSON.parse(decryptField(clause.suggestions_json));
    const riskFlags = JSON.parse(decryptField(clause.risk_flags_json));
    const baseClause = {
      clauseId: clause.public_clause_id,
      title: clause.title,
      type: clause.type,
      importance: clause.importance,
      originalText: decryptField(clause.original_text),
      simplifiedText: decryptField(clause.simplified_text),
      translations: JSON.parse(decryptField(clause.translations_json)),
      suggestions,
      riskFlags,
      confidenceScores: buildConfidenceScores(decryptField(clause.original_text), suggestions, riskFlags),
      terminology: buildTerminology(decryptField(clause.original_text), clause.type),
      createdAt: clause.created_at,
    };
    return applyFeedbackSignals(baseClause, feedbackSummary);
  });
  const verification = JSON.parse(decryptField(row.verification_json));
  const chain = selectVerificationChainForDocumentStmt.get(row.public_id);
  if (chain) {
    verification.blockchain = {
      ...(verification.blockchain || {}),
      blockHash: chain.block_hash,
      previousBlockHash: chain.previous_block_hash,
      smartContractRef: chain.smart_contract_ref,
      anchoredAt: chain.anchored_at,
    };
  }
  const summary = JSON.parse(decryptField(row.summary_json));

  return {
    id: row.public_id,
    title: row.title,
    source: row.source,
    filename: row.filename,
    language: row.language,
    createdAt: row.created_at,
    originalText: decryptField(row.original_text),
    summary,
    clauses: buildLocalizedClauses(clauses),
    verification,
    localizedSummary: buildLocalizedSummary(summary, verification),
    feedbackSummary: feedbackSummary.documentLevel,
  };
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      publicId: user.public_id,
      email: user.email,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = selectUserByIdStmt.get(payload.sub);
    if (!user) {
      return res.status(401).json({ error: "User not found." });
    }
    req.user = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ error: "Invalid or expired session." });
  }
}

function createVerificationChainEntry(document) {
  const previous = selectLatestChainStmt.get();
  const previousBlockHash = previous?.block_hash || null;
  const anchoredAt = document.verification.timestamp;
  const smartContractRef = document.verification.blockchain?.smartContractRef || `SL-SMART-${document.id}`;
  const blockHash = crypto
    .createHash("sha256")
    .update(`${document.id}:${document.verification.documentHash}:${previousBlockHash || "GENESIS"}:${anchoredAt}`)
    .digest("hex");

  return {
    documentPublicId: document.id,
    blockHash,
    previousBlockHash,
    smartContractRef,
    anchoredAt,
  };
}

const persistDocument = db.transaction((document, userId) => {
  const documentResult = insertDocumentStmt.run({
    publicId: document.id,
    userId,
    title: document.title,
    source: document.source,
    filename: document.filename || null,
    language: document.language || "English",
    originalText: encryptField(document.originalText),
    summaryJson: encryptField(JSON.stringify(document.summary)),
    verificationJson: encryptField(JSON.stringify(document.verification)),
    createdAt: document.createdAt,
  });

  for (const clause of document.clauses) {
    insertClauseStmt.run({
      documentId: documentResult.lastInsertRowid,
      publicClauseId: clause.clauseId,
      title: clause.title,
      type: clause.type,
      importance: clause.importance,
      originalText: encryptField(clause.originalText),
      simplifiedText: encryptField(clause.simplifiedText),
      translationsJson: encryptField(JSON.stringify(clause.translations)),
      suggestionsJson: encryptField(JSON.stringify(clause.suggestions)),
      riskFlagsJson: encryptField(JSON.stringify(clause.riskFlags)),
      createdAt: document.createdAt,
    });
  }

  insertVerificationChainStmt.run(createVerificationChainEntry(document));
});

async function analyzeDocument({ title, text, source, filename, userId }) {
  let clauses = splitIntoClauses(text);
  if (openai) {
    clauses = await maybeEnhanceClausesWithAI(clauses);
  }
  clauses = clauses.map((clause) => ({
    ...clause,
    confidenceScores: buildConfidenceScores(clause.originalText, clause.suggestions, clause.riskFlags),
    terminology: buildTerminology(clause.originalText, clause.type),
    feedbackSummary: { total: 0, positive: 0, negative: 0, helpfulnessScore: 0 },
  }));

  const document = {
    id: createPublicId("DOC"),
    title,
    source,
    filename: filename || null,
    language: "English",
    createdAt: new Date().toISOString(),
    originalText: text,
    summary: summarizeDocument(text, clauses),
    clauses,
    verification: buildVerificationRecord(text),
  };

  persistDocument(document, userId);
  return {
    ...document,
    clauses: buildLocalizedClauses(document.clauses),
    localizedSummary: buildLocalizedSummary(document.summary, document.verification),
    feedbackSummary: { total: 0, positive: 0, negative: 0, helpfulnessScore: 0 },
  };
}

function getAllDocuments(userId) {
  return selectDocumentsForUserStmt.all(userId).map(hydrateDocument);
}

function getDocumentByPublicId(publicId, userId) {
  return hydrateDocument(selectDocumentByPublicIdStmt.get(publicId, userId));
}

function buildDocumentReport(document) {
  const riskyClauses = document.clauses.filter((clause) => clause.riskFlags.length > 0);
  return {
    generatedAt: new Date().toISOString(),
    documentId: document.id,
    title: document.title,
    source: document.source,
    language: document.language,
    summary: document.summary.overview,
    stats: document.summary.stats,
    complianceChecks: document.summary.frequentRuleWarnings,
    highRiskClauses: riskyClauses.map((clause) => ({
      clauseId: clause.clauseId,
      title: clause.title,
      importance: clause.importance,
      riskFlags: clause.riskFlags,
      suggestions: clause.suggestions,
    })),
    verification: document.verification,
    feedback: document.feedbackSummary,
    blockchainVerification: document.verification.blockchain || null,
  };
}

function formatDocumentReportText(document) {
  const report = buildDocumentReport(document);
  const lines = [
    "SIMPLIFYLEGAL REPORT",
    "",
    `Document: ${report.title}`,
    `Document ID: ${report.documentId}`,
    `Generated At: ${report.generatedAt}`,
    `Source: ${report.source}`,
    `Language: ${report.language}`,
    "",
    "SUMMARY",
    report.summary,
    "",
    "DOCUMENT STATS",
    `Total Clauses: ${report.stats.totalClauses}`,
    `High Importance Clauses: ${report.stats.highImportanceClauses}`,
    `Reading Time: ${report.stats.readingTime}`,
    "",
    "COMPLIANCE CHECKS",
    ...report.complianceChecks.map((item) => `- ${item}`),
    "",
    "HIGH RISK CLAUSES",
    ...(report.highRiskClauses.length
      ? report.highRiskClauses.flatMap((clause) => [
          `${clause.clauseId} - ${clause.title}`,
          `Importance: ${clause.importance}`,
          `Risks: ${clause.riskFlags.join(", ") || "None"}`,
          `Suggestions: ${clause.suggestions.join(" | ") || "None"}`,
          "",
        ])
      : ["No high-risk clauses found.", ""]),
    "VERIFICATION",
    `Status: ${report.verification.status}`,
    `Timestamp: ${report.verification.timestamp}`,
    `Document Hash: ${report.verification.documentHash}`,
    `Chain Block: ${report.blockchainVerification?.blockHash || "Not available"}`,
    `Previous Block: ${report.blockchainVerification?.previousBlockHash || "GENESIS"}`,
    `Smart Contract Ref: ${report.blockchainVerification?.smartContractRef || "Not available"}`,
    "",
    "FEEDBACK",
    `Helpful Feedback Score: ${Math.round((report.feedback.helpfulnessScore || 0) * 100)}%`,
  ];

  return lines.join("\n");
}

async function sendContactEmail({ name, email, subject, message }) {
  if (!contactTransport || !process.env.CONTACT_RECEIVER_EMAIL) {
    return {
      delivered: false,
      mode: "stored_only",
      note: "Email delivery is not configured yet.",
    };
  }

  await contactTransport.sendMail({
    from: process.env.CONTACT_FROM_EMAIL || process.env.SMTP_USER,
    to: process.env.CONTACT_RECEIVER_EMAIL,
    replyTo: email,
    subject: `SimplifyLegal Query: ${subject}`,
    text: [
      `Name: ${name}`,
      `Email: ${email}`,
      `Subject: ${subject}`,
      "",
      "Message:",
      message,
    ].join("\n"),
  });

  return {
    delivered: true,
    mode: "email_and_store",
  };
}

async function createAssistantAnswer(question, document) {
  if (openai && document) {
    try {
      const completion = await openai.responses.create({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "You are a legal document explainer for students and non-lawyers. Do not claim to be a lawyer. Give concise, plain-language guidance based only on the supplied document.",
          },
          {
            role: "user",
            content: `Document title: ${document.title}\nQuestion: ${question}\nDocument summary: ${JSON.stringify(
              document.summary
            )}\nClauses: ${JSON.stringify(
              document.clauses.map((clause) => ({
                clauseId: clause.clauseId,
                type: clause.type,
                title: clause.title,
                originalText: clause.originalText,
                simplifiedText: clause.simplifiedText,
                suggestions: clause.suggestions,
                riskFlags: clause.riskFlags,
              }))
            )}`,
          },
        ],
      });

      const answer = completion.output_text?.trim();
      if (answer) {
        const payload = buildStructuredAssistantPayload({
          summary: answer,
          explanation: [],
          actions: [],
          followUp: "Ask about any clause if you want a more specific explanation.",
          citedClause: null,
        });
        const translations = await localizeStructuredPayload(payload);
        return {
          answer: payload.answer,
          sections: payload.sections,
          translations,
          citedClause: null,
        };
      }
    } catch (_error) {
    }
  }

  const lower = question.toLowerCase();
  const preventionIntent =
    /(prevent|prevention|avoid|minimi[sz]e|reduce|protect|safe|safer)/.test(lower) ||
    /what\s+.*(can|should).*(take|do)/.test(lower);
  const riskIntent = /risk|danger|problem|issue|loss|penalty|liability|renewal/.test(lower);

  if (document && /^(risk|risks)$/.test(lower.trim())) {
    const payload = buildStructuredAssistantPayload({
      summary: "I checked the document and found clauses that may create risk.",
      explanation: document.clauses
        .filter((clause) => clause.riskFlags.length > 0)
        .map((clause) => `${clause.clauseId} (${clause.type}): ${clause.suggestions[0]}`),
      actions: document.clauses
        .filter((clause) => clause.riskFlags.length > 0)
        .map((clause) => `Review ${clause.clauseId} carefully before signing.`),
      followUp: "Ask me which clause is most dangerous or how to reduce the risk.",
      citedClause: document.clauses.find((clause) => clause.riskFlags.length > 0)?.clauseId || null,
    });
    return {
      ...payload,
      translations: await localizeStructuredPayload(payload),
    };
  }

  if (document && /(explain|tell|show|what is|what are)/.test(lower) && riskIntent) {
    const payload = buildStructuredAssistantPayload({
      summary: "Here is the risk explanation for your document.",
      explanation: document.clauses
        .filter((clause) => clause.riskFlags.length > 0)
        .map((clause) => `${clause.clauseId} (${clause.type}): ${clause.suggestions[0]}`),
      actions: document.clauses
        .filter((clause) => clause.riskFlags.length > 0)
        .map((clause) => `For ${clause.clauseId}, make the wording clearer and more balanced.`),
      followUp: "Ask me how to prevent risk if you want specific prevention steps.",
      citedClause: document.clauses.find((clause) => clause.riskFlags.length > 0)?.clauseId || null,
    });
    return {
      ...payload,
      translations: await localizeStructuredPayload(payload),
    };
  }

  if (document && (preventionIntent && riskIntent)) {
    const riskyClauses = document.clauses.filter((clause) => clause.riskFlags.length > 0);
    const payload = buildStructuredAssistantPayload({
      summary: "Here are the best steps you can take to reduce risk in this document.",
      explanation: riskyClauses.map((clause) => `${clause.clauseId} (${clause.type}) needs attention because ${clause.suggestions[0].toLowerCase()}`),
      actions: riskyClauses.map((clause) => `${clause.clauseId}: ${clause.suggestions[0]}`),
      followUp: "Ask me to rewrite a risky clause in simpler and safer language.",
      citedClause: riskyClauses[0]?.clauseId || null,
    });
    return {
      ...payload,
      translations: await localizeStructuredPayload(payload),
    };
  }

  if (document && preventionIntent) {
    const riskyClauses = document.clauses.filter((clause) => clause.riskFlags.length > 0);
    const payload = buildStructuredAssistantPayload({
      summary: "You can lower risk by reviewing the clauses that have unclear penalties, liability, notice, or renewal wording.",
      explanation: riskyClauses.length
        ? riskyClauses.map((clause) => `${clause.clauseId} is important because ${clause.suggestions[0].toLowerCase()}`)
        : ["I do not see a major flagged risk, but important legal clauses should still be reviewed carefully."],
      actions: riskyClauses.length
        ? riskyClauses.map((clause) => `${clause.clauseId}: ${clause.suggestions[0]}`)
        : ["Check payment terms, liability wording, and termination rights before signing."],
      followUp: "Ask me to explain one clause at a time if you want a deeper answer.",
      citedClause: riskyClauses[0]?.clauseId || null,
    });
    return {
      ...payload,
      translations: await localizeStructuredPayload(payload),
    };
  }

  const matchingClause =
    document?.clauses.find((clause) => lower.includes(clause.type.toLowerCase())) ||
    document?.clauses.find((clause) =>
      clause.originalText.toLowerCase().split(/\s+/).some((word) => word.length > 5 && lower.includes(word))
    );

  if (matchingClause) {
    const payload = buildStructuredAssistantPayload({
      summary: matchingClause.simplifiedText,
      explanation: [`This answer is based on ${matchingClause.clauseId} (${matchingClause.type}).`],
      actions: matchingClause.suggestions,
      followUp: "Ask me if you want this clause rewritten in even simpler language.",
      citedClause: matchingClause.clauseId,
    });
    return {
      ...payload,
      translations: await localizeStructuredPayload(payload),
    };
  }

  if (/risk|danger|problem|issue/.test(lower) && document) {
    const risky = document.clauses.filter((clause) => clause.riskFlags.length > 0);
    const payload = buildStructuredAssistantPayload({
      summary: risky.length
        ? `I found possible risks in ${risky.map((clause) => clause.clauseId).join(", ")}.`
        : "I do not see a major red flag, but some important clauses should still be reviewed.",
      explanation: risky.length
        ? risky.map((clause) => `${clause.clauseId} (${clause.type}): ${clause.suggestions[0]}`)
        : ["Payment, liability, and termination clauses should still be checked before signing."],
      actions: risky.length
        ? risky.map((clause) => `Review ${clause.clauseId} and make sure the wording is fair and clear.`)
        : ["Check deadlines, liability wording, and exit conditions."],
      followUp: "Ask me to explain the riskiest clause if you want more detail.",
      citedClause: risky[0]?.clauseId || null,
    });
    return {
      ...payload,
      translations: await localizeStructuredPayload(payload),
    };
  }

  const payload = buildStructuredAssistantPayload({
    summary: "I can help explain this document in plain language.",
    explanation: [
      "I can summarize risky clauses.",
      "I can explain payment, liability, termination, and confidentiality terms.",
      "I can suggest what to review before signing.",
    ],
    actions: [
      "Ask: What is the main risk?",
      "Ask: Explain clause CL-1.",
      "Ask: How can I reduce risk?",
    ],
    followUp: "Ask me a specific question about your uploaded document.",
    citedClause: null,
  });
  return {
    ...payload,
    translations: await localizeStructuredPayload(payload),
  };
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    apiVersion: "v1",
    aiProvider: openai ? "openai" : "local",
    database: DB_PATH,
    languages: getLanguageCapabilities(),
    integrationReady: true,
    contactEmailConfigured: Boolean(contactTransport && process.env.CONTACT_RECEIVER_EMAIL),
  });
});

app.post("/api/contact", async (req, res) => {
  const { name, email, subject, message } = req.body || {};

  if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
    return res.status(400).json({ error: "Name, email, subject, and message are required." });
  }

  const payload = {
    name: name.trim(),
    email: email.trim(),
    subject: subject.trim(),
    message: message.trim(),
    createdAt: new Date().toISOString(),
  };

  insertContactQueryStmt.run(payload);

  try {
    const result = await sendContactEmail(payload);
    return res.status(201).json({
      success: true,
      delivery: result,
    });
  } catch (_error) {
    return res.status(201).json({
      success: true,
      delivery: {
        delivered: false,
        mode: "stored_only",
        note: "Your query was saved, but email delivery could not be completed.",
      },
    });
  }
});

app.post("/api/auth/register", async (req, res) => {
  if (ensureAuthRateLimit(req, res, "register")) {
    return;
  }
  const { name, email, password } = req.body || {};

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }

  if (password.trim().length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const existing = selectUserByEmailStmt.get(email.trim());
  if (existing) {
    consumeAuthAttempt(req, "register");
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  const passwordHash = await bcrypt.hash(password.trim(), 10);
  const publicId = createPublicId("USR");
  const createdAt = new Date().toISOString();

  insertUserStmt.run({
    publicId,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    createdAt,
  });

  const user = selectUserByEmailStmt.get(email.trim().toLowerCase());
  const token = signToken(user);
  clearAuthAttempts(req, "register");

  return res.status(201).json({
    token,
    user: {
      id: user.public_id,
      name: user.name,
      email: user.email,
      createdAt: user.created_at,
    },
  });
});

app.post("/api/auth/login", async (req, res) => {
  if (ensureAuthRateLimit(req, res, "login")) {
    return;
  }
  const { email, password } = req.body || {};

  if (!email?.trim() || !password?.trim()) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = selectUserByEmailStmt.get(email.trim().toLowerCase());
  if (!user) {
    consumeAuthAttempt(req, "login");
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const validPassword = await bcrypt.compare(password.trim(), user.password_hash);
  if (!validPassword) {
    consumeAuthAttempt(req, "login");
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = signToken(user);
  clearAuthAttempts(req, "login");
  return res.json({
    token,
    user: {
      id: user.public_id,
      name: user.name,
      email: user.email,
      createdAt: user.created_at,
    },
  });
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  res.json({
    user: {
      id: req.user.public_id,
      name: req.user.name,
      email: req.user.email,
      createdAt: req.user.created_at,
    },
  });
});

app.get("/api/documents", authMiddleware, (req, res) => {
  res.json(getAllDocuments(req.user.id));
});

app.get("/api/documents/:documentId", authMiddleware, (req, res) => {
  const document = getDocumentByPublicId(req.params.documentId, req.user.id);
  if (!document) {
    return res.status(404).json({ error: "Document not found." });
  }
  return res.json(document);
});

app.get("/api/documents/:documentId/report", authMiddleware, (req, res) => {
  const document = getDocumentByPublicId(req.params.documentId, req.user.id);
  if (!document) {
    return res.status(404).json({ error: "Document not found." });
  }

  const format = String(req.query.format || "json").toLowerCase();
  if (format === "text") {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${document.title.replace(/[^a-z0-9_-]/gi, "_")}-report.txt"`
    );
    return res.send(formatDocumentReportText(document));
  }

  return res.json(buildDocumentReport(document));
});

app.get("/api/documents/:documentId/translate/:language", authMiddleware, async (req, res) => {
  const language = String(req.params.language || "").toLowerCase();
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    return res.status(400).json({ error: "Unsupported language." });
  }

  const document = getDocumentByPublicId(req.params.documentId, req.user.id);
  if (!document) {
    return res.status(404).json({ error: "Document not found." });
  }

  const translation = await buildFullDocumentTranslation(document, language);
  return res.json(translation);
});

app.post("/api/analyze-text", authMiddleware, async (req, res) => {
  const { title, text } = req.body || {};

  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Document text is required." });
  }

  const document = await analyzeDocument({
    title: title?.trim() || "Untitled Legal Document",
    text: cleanWhitespace(text),
    source: "pasted-text",
    userId: req.user.id,
  });

  return res.status(201).json(document);
});

app.post("/api/upload", authMiddleware, upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Please upload a file." });
    }

    const text = await extractTextFromFile(req.file.path, req.file.originalname);
    if (!text) {
      return res.status(400).json({ error: "The uploaded file could not be parsed into readable text." });
    }

    const document = await analyzeDocument({
      title: path.parse(req.file.originalname).name,
      text,
      source: "file-upload",
      filename: req.file.originalname,
      userId: req.user.id,
    });

    return res.status(201).json(document);
  } catch (error) {
    return res.status(400).json({ error: error.message || "Upload failed." });
  } finally {
    if (req.file?.path) {
      safeDeleteFile(req.file.path);
    }
  }
});

app.post("/api/assistant", authMiddleware, async (req, res) => {
  const { question, documentId } = req.body || {};

  if (!question || !question.trim()) {
    return res.status(400).json({ error: "Question is required." });
  }

  const documents = getAllDocuments(req.user.id);
  const document = documentId ? getDocumentByPublicId(documentId, req.user.id) : documents[0];
  const response = await createAssistantAnswer(question.trim(), document);
  return res.json(response);
});

app.post("/api/feedback", authMiddleware, (req, res) => {
  const { documentId, clauseId, rating, comment } = req.body || {};

  if (!documentId || rating === undefined) {
    return res.status(400).json({ error: "Document ID and rating are required." });
  }

  insertFeedbackStmt.run({
    userId: req.user.id,
    documentId,
    clauseId: clauseId || null,
    rating,
    comment: comment?.trim() || null,
    createdAt: new Date().toISOString(),
  });

  return res.status(201).json({ success: true });
});

app.get("/api/analytics", authMiddleware, (req, res) => {
  const documents = selectDocumentsForUserStmt.all(req.user.id);
  const feedback = selectAllFeedbackForUserStmt.all(req.user.id);
  
  const rulesBrokenCount = {};
  const riskTypesCount = {};
  let totalHighRisk = 0;

  for (const doc of documents) {
    const clauses = selectClausesForDocumentStmt.all(doc.id);
    for (const clause of clauses) {
      if (clause.importance === "High") {
        totalHighRisk++;
      }

      const riskFlags = JSON.parse(decryptField(clause.risk_flags_json) || "[]");
      for (const flag of riskFlags) {
        rulesBrokenCount[flag] = (rulesBrokenCount[flag] || 0) + 1;
        riskTypesCount[clause.type] = (riskTypesCount[clause.type] || 0) + 1;
      }
    }
  }

  const topBrokenRules = Object.entries(rulesBrokenCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([rule, count]) => ({ rule, count }));

  const topRiskyTypes = Object.entries(riskTypesCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));

  const averageHelpfulness =
    feedback.length > 0
      ? Number(
          (
            feedback.reduce((total, entry) => total + (Number(entry.rating) > 0 ? 1 : 0), 0) / feedback.length
          ).toFixed(2)
        )
      : 0;

  return res.json({
    totalDocuments: documents.length,
    totalFeedback: feedback.length,
    totalHighRiskClauses: totalHighRisk,
    topBrokenRules,
    topRiskyTypes,
    averageHelpfulness,
    performance: {
      processingProfile: "single-node academic deployment",
      scalableDesign: "API-first modules with persistent document store",
      supportedLanguages: SUPPORTED_LANGUAGES.length,
    },
    recentFeedback: feedback.slice(-5).map(f => ({
       rating: f.rating,
       comment: f.comment,
       clauseId: f.clause_id,
       date: f.created_at
    }))
  });
});

app.get("/api/integrations", authMiddleware, (_req, res) => {
  res.json({
    apiVersion: "v1",
    ready: true,
    supportedFlows: [
      "document upload",
      "text analysis",
      "document retrieval",
      "translation retrieval",
      "report export",
      "analytics access",
      "assistant guidance",
    ],
    endpoints: [
      { method: "POST", path: "/api/analyze-text", purpose: "Analyze pasted legal text" },
      { method: "POST", path: "/api/upload", purpose: "Analyze uploaded legal files" },
      { method: "GET", path: "/api/documents", purpose: "List processed document history" },
      { method: "GET", path: "/api/documents/:documentId", purpose: "Fetch a processed document" },
      { method: "GET", path: "/api/documents/:documentId/translate/:language", purpose: "Fetch translated insights" },
      { method: "GET", path: "/api/documents/:documentId/report", purpose: "Export a compliance and verification report" },
      { method: "GET", path: "/api/analytics", purpose: "Retrieve user analytics and feedback stats" },
      { method: "POST", path: "/api/assistant", purpose: "Query the legal assistant" },
    ],
    compatibility: [
      "document management systems",
      "business tools",
      "law-firm workflows",
      "educational platforms",
    ],
  });
});

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`SimplifyLegal server running on http://localhost:${PORT}`);
});

