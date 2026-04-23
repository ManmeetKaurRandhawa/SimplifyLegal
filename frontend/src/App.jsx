import { useEffect, useState } from "react";
import LogoMark from "./LogoMark";
import {
  demoText,
  languageOptionFallback,
  learningChallenges,
  localTermMaps,
  publicDemoReport,
  uiText,
} from "./appContent";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function buildApiUrl(path) {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

function shuffleArray(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function buildLearningRounds(challenges) {
  return challenges.map((challenge) => ({
    ...challenge,
    options: shuffleArray(
      challenge.options.map((option, index) => ({
        text: option,
        isCorrect: index === challenge.correctIndex,
      }))
    ),
  }));
}

const publicText = {
  english: {
    nav: { home: "Home", features: "Features", about: "About", contact: "Contact", login: "Login" },
    heroTitle: "Simplifying Legal Documents for Everyone",
    heroLead: "Upload your legal documents and get instant simplifications, translations, and suggestions.",
    getStarted: "Get Started",
    exploreDemo: "Explore Demo",
    featuresEyebrow: "Features",
    featuresTitle: "Core capabilities built for real users",
    aboutEyebrow: "About",
    aboutTitle: "Why SimplifyLegal exists",
    aboutBody1: "SimplifyLegal is a student-focused legal-tech platform that helps people understand contracts, agreements, and legal policies without needing expert-level legal knowledge.",
    aboutBody2: "The project combines document simplification, multilingual access, audio explanations, AI guidance, reporting, feedback, and verification records in one beginner-friendly interface.",
    aboutBody3: "It is designed for public awareness, education, and safer decision-making before signing important documents.",
    demoEyebrow: "Demo",
    demoTitle: "See a sample legal analysis before login",
    keyFindings: "Key findings",
    loginDemo: "Login To Open Full Demo",
    demoInsight: "Demo insight",
    needsReview: "Needs review",
    simplified: "Simplified",
    contactEyebrow: "Contact",
    contactTitle: "Send a query",
    name: "Name",
    email: "Email",
    subject: "Subject",
    message: "Message",
    sendQuery: "Send Query",
  },
  hindi: {
    nav: { home: "\u0939\u094b\u092e", features: "\u0938\u0941\u0935\u093f\u0927\u093e\u090f\u0901", about: "\u0905\u092c\u093e\u0909\u091f", contact: "\u0938\u0902\u092a\u0930\u094d\u0915", login: "\u0932\u0949\u0917\u093f\u0928" },
    heroTitle: "\u0938\u092d\u0940 \u0915\u0947 \u0932\u093f\u090f \u0915\u093e\u0928\u0942\u0928\u0940 \u0926\u0938\u094d\u0924\u093e\u0935\u0947\u091c\u093c\u094b\u0902 \u0915\u094b \u0906\u0938\u093e\u0928 \u092c\u0928\u093e\u0928\u093e",
    heroLead: "\u0905\u092a\u0928\u0947 \u0915\u093e\u0928\u0942\u0928\u0940 \u0926\u0938\u094d\u0924\u093e\u0935\u0947\u091c\u093c \u0905\u092a\u0932\u094b\u0921 \u0915\u0930\u0947\u0902 \u0914\u0930 \u0924\u0941\u0930\u0902\u0924 \u0938\u0930\u0932 \u0935\u094d\u092f\u093e\u0916\u094d\u092f\u093e, \u0905\u0928\u0941\u0935\u093e\u0926 \u0914\u0930 \u0938\u0941\u091d\u093e\u0935 \u092a\u093e\u090f\u0902\u0964",
    getStarted: "\u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902",
    exploreDemo: "\u0921\u0947\u092e\u094b \u0926\u0947\u0916\u0947\u0902",
    featuresEyebrow: "\u0938\u0941\u0935\u093f\u0927\u093e\u090f\u0901",
    featuresTitle: "\u0935\u093e\u0938\u094d\u0924\u0935\u093f\u0915 \u092f\u0942\u091c\u0930\u094d\u0938 \u0915\u0947 \u0932\u093f\u090f \u0924\u0948\u092f\u093e\u0930 \u092e\u0941\u0916\u094d\u092f \u0915\u094d\u0937\u092e\u0924\u093e\u090f\u0901",
    aboutEyebrow: "\u0905\u092c\u093e\u0909\u091f",
    aboutTitle: "SimplifyLegal \u0915\u094d\u092f\u094b\u0902 \u092c\u0928\u093e",
    aboutBody1: "SimplifyLegal \u090f\u0915 \u0938\u094d\u091f\u0942\u0921\u0947\u0902\u091f-\u092b\u094b\u0915\u0938\u094d\u0921 \u0932\u0940\u0917\u0932-\u091f\u0947\u0915 \u092a\u094d\u0932\u0948\u091f\u092b\u0949\u0930\u094d\u092e \u0939\u0948 \u091c\u094b \u0932\u094b\u0917\u094b\u0902 \u0915\u094b \u0915\u0949\u0928\u094d\u091f\u094d\u0930\u0948\u0915\u094d\u091f, \u090f\u0917\u094d\u0930\u0940\u092e\u0947\u0902\u091f \u0914\u0930 \u092a\u0949\u0932\u093f\u0938\u0940 \u0938\u092e\u091d\u0928\u0947 \u092e\u0947\u0902 \u092e\u0926\u0926 \u0915\u0930\u0924\u093e \u0939\u0948\u0964",
    aboutBody2: "\u092f\u0939 \u092a\u094d\u0932\u0948\u091f\u092b\u0949\u0930\u094d\u092e \u0921\u0949\u0915\u094d\u092f\u0941\u092e\u0947\u0902\u091f \u0938\u093f\u092e\u094d\u092a\u094d\u0932\u093f\u092b\u093f\u0915\u0947\u0936\u0928, \u092e\u0932\u094d\u091f\u0940\u0932\u093f\u0902\u0917\u094d\u0935\u0932 \u090f\u0915\u094d\u0938\u0947\u0938, \u0911\u0921\u093f\u092f\u094b \u090f\u0915\u094d\u0938\u092a\u094d\u0932\u0948\u0928\u0947\u0936\u0928, AI \u0917\u093e\u0907\u0921\u0947\u0902\u0938, \u0930\u093f\u092a\u094b\u0930\u094d\u091f\u093f\u0902\u0917, \u092b\u0940\u0921\u092c\u0948\u0915 \u0914\u0930 \u0935\u0947\u0930\u093f\u092b\u093f\u0915\u0947\u0936\u0928 \u0915\u094b \u090f\u0915 \u091c\u0917\u0939 \u0932\u093e\u0924\u093e \u0939\u0948\u0964",
    aboutBody3: "\u092f\u0939 \u091c\u0928-\u091c\u093e\u0917\u0930\u0942\u0915\u0924\u093e, \u0936\u093f\u0915\u094d\u0937\u093e \u0914\u0930 \u092e\u0939\u0924\u094d\u0935\u092a\u0942\u0930\u094d\u0923 \u0926\u0938\u094d\u0924\u093e\u0935\u0947\u091c\u093c \u0938\u093e\u0907\u0928 \u0915\u0930\u0928\u0947 \u0938\u0947 \u092a\u0939\u0932\u0947 \u0938\u0941\u0930\u0915\u094d\u0937\u093f\u0924 \u0928\u093f\u0930\u094d\u0923\u092f \u0915\u0947 \u0932\u093f\u090f \u0924\u0948\u092f\u093e\u0930 \u0915\u093f\u092f\u093e \u0917\u092f\u093e \u0939\u0948\u0964",
    demoEyebrow: "\u0921\u0947\u092e\u094b",
    demoTitle: "\u0932\u0949\u0917\u093f\u0928 \u0938\u0947 \u092a\u0939\u0932\u0947 \u0938\u0948\u092e\u094d\u092a\u0932 \u0932\u0940\u0917\u0932 \u090f\u0928\u093e\u0932\u093f\u0938\u093f\u0938 \u0926\u0947\u0916\u0947\u0902",
    keyFindings: "\u092e\u0941\u0916\u094d\u092f \u0928\u093f\u0937\u094d\u0915\u0930\u094d\u0937",
    loginDemo: "\u092a\u0942\u0930\u093e \u0921\u0947\u092e\u094b \u0916\u094b\u0932\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u0932\u0949\u0917\u093f\u0928 \u0915\u0930\u0947\u0902",
    demoInsight: "\u0921\u0947\u092e\u094b \u0907\u0902\u0938\u093e\u0907\u091f",
    needsReview: "\u0938\u092e\u0940\u0915\u094d\u0937\u093e \u091c\u0930\u0942\u0930\u0940",
    simplified: "\u0938\u0930\u0932 \u0930\u0942\u092a",
    contactEyebrow: "\u0938\u0902\u092a\u0930\u094d\u0915",
    contactTitle: "\u0905\u092a\u0928\u0940 \u0915\u094d\u0935\u0947\u0930\u0940 \u092d\u0947\u091c\u0947\u0902",
    name: "\u0928\u093e\u092e",
    email: "\u0908\u092e\u0947\u0932",
    subject: "\u0935\u093f\u0937\u092f",
    message: "\u0938\u0902\u0926\u0947\u0936",
    sendQuery: "\u0915\u094d\u0935\u0947\u0930\u0940 \u092d\u0947\u091c\u0947\u0902",
  },
  marathi: {
    nav: { home: "\u0939\u094b\u092e", features: "\u0938\u0941\u0935\u093f\u0927\u093e", about: "\u092e\u093e\u0939\u093f\u0924\u0940", contact: "\u0938\u0902\u092a\u0930\u094d\u0915", login: "\u0932\u0949\u0917\u093f\u0928" },
    heroTitle: "\u0938\u0930\u094d\u0935\u093e\u0902\u0938\u093e\u0920\u0940 \u0915\u093e\u092f\u0926\u0947\u0936\u0940\u0930 \u0926\u0938\u094d\u0924\u090f\u0935\u091c \u0938\u094b\u092a\u0947 \u0915\u0930\u0923\u0947",
    heroLead: "\u0924\u0941\u092e\u091a\u0947 \u0915\u093e\u092f\u0926\u0947\u0936\u0940\u0930 \u0926\u0938\u094d\u0924\u090f\u0935\u091c \u0905\u092a\u0932\u094b\u0921 \u0915\u0930\u093e \u0906\u0923\u093f \u0924\u093e\u0924\u094d\u0915\u093e\u0933 \u0938\u094b\u092a\u0947 \u0938\u094d\u092a\u0937\u094d\u091f\u0940\u0915\u0930\u0923, \u092d\u093e\u0937\u093e\u0902\u0924\u0930\u0947 \u0906\u0923\u093f \u0938\u0942\u091a\u0928\u093e \u092e\u093f\u0933\u0935\u093e.",
    getStarted: "\u0938\u0941\u0930\u0941 \u0915\u0930\u093e",
    exploreDemo: "\u0921\u0947\u092e\u094b \u092a\u0939\u093e",
    featuresEyebrow: "\u0938\u0941\u0935\u093f\u0927\u093e",
    featuresTitle: "\u0935\u093e\u0938\u094d\u0924\u0935\u093f\u0915 \u0935\u093e\u092a\u0930\u0915\u0930\u094d\u0924\u094d\u092f\u093e\u0902\u0938\u093e\u0920\u0940 \u0924\u0948\u092f\u093e\u0930 \u092e\u0941\u0916\u094d\u092f \u0915\u094d\u0937\u092e\u0924\u093e",
    aboutEyebrow: "\u092e\u093e\u0939\u093f\u0924\u0940",
    aboutTitle: "SimplifyLegal \u0915\u093e \u0905\u0938\u094d\u0924\u093f\u0924\u094d\u0935\u093e\u0924 \u0906\u0932\u0947",
    aboutBody1: "SimplifyLegal \u0939\u0947 \u0935\u093f\u0926\u094d\u092f\u093e\u0930\u094d\u0925\u0940-\u0915\u0947\u0902\u0926\u094d\u0930\u093f\u0924 \u0932\u0940\u0917\u0932-\u091f\u0947\u0915 \u092a\u094d\u0932\u0945\u091f\u092b\u0949\u0930\u094d\u092e \u0906\u0939\u0947 \u091c\u0947 \u0932\u094b\u0915\u093e\u0902\u0928\u093e \u0915\u0930\u093e\u0930, \u0938\u092e\u091d\u094c\u0924\u0947 \u0906\u0923\u093f \u0915\u093e\u092f\u0926\u0947\u0936\u0940\u0930 \u0927\u094b\u0930\u0923\u0947 \u0938\u092e\u091c\u0923\u094d\u092f\u093e\u0938 \u092e\u0926\u0924 \u0915\u0930\u0924\u0947.",
    aboutBody2: "\u092f\u093e \u092a\u094d\u0932\u0945\u091f\u092b\u0949\u0930\u094d\u092e\u092e\u0927\u094d\u092f\u0947 \u0921\u0949\u0915\u094d\u092f\u0941\u092e\u0947\u0902\u091f \u0938\u0941\u0932\u092d\u0940\u0915\u0930\u0923, \u092c\u0939\u0941\u092d\u093e\u0937\u093f\u0915 \u092a\u094d\u0930\u0935\u0947\u0936, \u0911\u0921\u093f\u0913 \u0938\u094d\u092a\u0937\u094d\u091f\u0940\u0915\u0930\u0923, AI \u092e\u093e\u0930\u094d\u0917\u0926\u0930\u094d\u0936\u0928, \u0930\u093f\u092a\u094b\u0930\u094d\u091f\u093f\u0902\u0917, \u092b\u0940\u0921\u092c\u0945\u0915 \u0906\u0923\u093f \u092a\u0921\u0924\u093e\u0933\u0923\u0940 \u0928\u094b\u0902\u0926\u0940 \u090f\u0915\u093e\u091a \u0920\u093f\u0915\u093e\u0923\u0940 \u0906\u0939\u0947\u0924.",
    aboutBody3: "\u0939\u0947 \u0932\u094b\u0915\u091c\u093e\u0917\u0943\u0924\u0940, \u0936\u093f\u0915\u094d\u0937\u0923 \u0906\u0923\u093f \u092e\u0939\u0924\u094d\u0935\u093e\u091a\u0947 \u0926\u0938\u094d\u0924\u090f\u0935\u091c \u0938\u093e\u0907\u0928 \u0915\u0930\u0923\u094d\u092f\u093e\u092a\u0942\u0930\u094d\u0935\u0940 \u0938\u0941\u0930\u0915\u094d\u0937\u093f\u0924 \u0928\u093f\u0930\u094d\u0923\u092f \u0918\u0947\u0923\u094d\u092f\u093e\u0938\u093e\u0920\u0940 \u0921\u093f\u091d\u093e\u0907\u0928 \u0915\u0947\u0932\u0947 \u0906\u0939\u0947.",
    demoEyebrow: "\u0921\u0947\u092e\u094b",
    demoTitle: "\u0932\u0949\u0917\u093f\u0928\u091a\u094d\u092f\u093e \u0906\u0927\u0940 \u0928\u092e\u0941\u0928\u093e \u0915\u093e\u092f\u0926\u0947\u0936\u0940\u0930 \u0935\u093f\u0936\u094d\u0932\u0947\u0937\u0923 \u092a\u0939\u093e",
    keyFindings: "\u092e\u0941\u0916\u094d\u092f \u0928\u093f\u0937\u094d\u0915\u0930\u094d\u0937",
    loginDemo: "\u092a\u0942\u0930\u094d\u0923 \u0921\u0947\u092e\u094b \u0909\u0918\u0921\u0923\u094d\u092f\u093e\u0938\u093e\u0920\u0940 \u0932\u0949\u0917\u093f\u0928 \u0915\u0930\u093e",
    demoInsight: "\u0921\u0947\u092e\u094b \u0907\u0928\u094d\u0938\u093e\u0907\u091f",
    needsReview: "\u092a\u0941\u0928\u0930\u093e\u0935\u0932\u094b\u0915\u0928 \u091c\u0930\u0942\u0930\u0940",
    simplified: "\u0938\u094b\u092a\u0947 \u0930\u0942\u092a",
    contactEyebrow: "\u0938\u0902\u092a\u0930\u094d\u0915",
    contactTitle: "\u092a\u094d\u0930\u0936\u094d\u0928 \u092a\u093e\u0920\u0935\u093e",
    name: "\u0928\u093e\u0935",
    email: "\u0908\u092e\u0947\u0932",
    subject: "\u0935\u093f\u0937\u092f",
    message: "\u0938\u0902\u0926\u0947\u0936",
    sendQuery: "\u092a\u094d\u0930\u0936\u094d\u0928 \u092a\u093e\u0920\u0935\u093e",
  },
  gujarati: {
    nav: { home: "\u0ab9\u0acb\u0aae", features: "\u0ab8\u0ac1\u0ab5\u0abf\u0aa7\u0abe\u0a93", about: "\u0ab5\u0abf\u0ab6\u0ac7", contact: "\u0ab8\u0a82\u0aaa\u0ab0\u0acd\u0a95", login: "\u0ab2\u0acb\u0a97\u0abf\u0aa8" },
    heroTitle: "\u0aac\u0aa7\u0abe \u0aae\u0abe\u0a9f\u0ac7 \u0a95\u0abe\u0aa8\u0ac2\u0aa8\u0ac0 \u0aa6\u0ab8\u0acd\u0aa4\u0abe\u0ab5\u0ac7\u0a9c\u0acb \u0ab8\u0ab0\u0ab3 \u0aac\u0aa8\u0abe\u0ab5\u0acb",
    heroLead: "\u0aa4\u0aae\u0abe\u0ab0\u0abe \u0a95\u0abe\u0aa8\u0ac2\u0aa8\u0ac0 \u0aa6\u0ab8\u0acd\u0aa4\u0abe\u0ab5\u0ac7\u0a9c \u0a85\u0aaa\u0ab2\u0acb\u0aa1 \u0a95\u0ab0\u0acb \u0a85\u0aa8\u0ac7 \u0aa4\u0ab0\u0aa4 \u0ab8\u0ab0\u0ab3 \u0ab8\u0aae\u0a9c\u0ac2\u0aa4\u0ac0, \u0a85\u0aa8\u0ac1\u0ab5\u0abe\u0aa6 \u0a85\u0aa8\u0ac7 \u0ab8\u0ac2\u0a9a\u0aa8\u0acb \u0aae\u0ac7\u0ab3\u0ab5\u0acb.",
    getStarted: "\u0ab6\u0ab0\u0ac2 \u0a95\u0ab0\u0acb",
    exploreDemo: "\u0aa1\u0ac7\u0aae\u0acb \u0a9c\u0ac1\u0a93",
    featuresEyebrow: "\u0ab8\u0ac1\u0ab5\u0abf\u0aa7\u0abe\u0a93",
    featuresTitle: "\u0ab5\u0abe\u0ab8\u0acd\u0aa4\u0ab5\u0abf\u0a95 \u0ab5\u0aaa\u0ab0\u0abe\u0ab6\u0a95\u0ab0\u0acd\u0aa4\u0abe\u0a93 \u0aae\u0abe\u0a9f\u0ac7 \u0aa4\u0ac8\u0aaf\u0abe\u0ab0 \u0aae\u0ac1\u0a96\u0acd\u0aaf \u0a95\u0acd\u0ab7\u0aae\u0aa4\u0abe\u0a93",
    aboutEyebrow: "\u0ab5\u0abf\u0ab6\u0ac7",
    aboutTitle: "SimplifyLegal \u0ab6\u0abe \u0aae\u0abe\u0a9f\u0ac7 \u0a9b\u0ac7",
    aboutBody1: "SimplifyLegal \u0a8f\u0a95 \u0ab5\u0abf\u0aa6\u0acd\u0aaf\u0abe\u0ab0\u0acd\u0aa5\u0ac0-\u0a95\u0ac7\u0aa8\u0acd\u0aa6\u0acd\u0ab0\u0abf\u0aa4 \u0ab2\u0ac0\u0a97\u0ab2-\u0a9f\u0ac7\u0a95 \u0aaa\u0acd\u0ab2\u0ac7\u0a9f\u0aab\u0ac9\u0ab0\u0acd\u0aae \u0a9b\u0ac7 \u0a9c\u0ac7 \u0ab2\u0acb\u0a95\u0acb\u0aa8\u0ac7 \u0a95\u0ab0\u0abe\u0ab0, \u0a8f\u0a97\u0acd\u0ab0\u0ac0\u0aae\u0ac7\u0aa8\u0acd\u0a9f \u0a85\u0aa8\u0ac7 \u0a95\u0abe\u0aa8\u0ac2\u0aa8\u0ac0 \u0aaa\u0ac9\u0ab2\u0abf\u0ab8\u0ac0 \u0ab8\u0aae\u0a9c\u0ab5\u0abe\u0aae\u0abe\u0a82 \u0aae\u0aa6\u0aa6 \u0a95\u0ab0\u0ac7 \u0a9b\u0ac7.",
    aboutBody2: "\u0a86 \u0aaa\u0acd\u0ab2\u0ac7\u0a9f\u0aab\u0ac9\u0ab0\u0acd\u0aae \u0aa1\u0ac9\u0a95\u0acd\u0aaf\u0ac1\u0aae\u0ac7\u0aa8\u0acd\u0a9f \u0ab8\u0abf\u0aae\u0acd\u0aaa\u0acd\u0ab2\u0abf\u0aab\u0abf\u0a95\u0ac7\u0ab6\u0aa8, \u0aae\u0ab2\u0acd\u0a9f\u0ac0\u0ab2\u0abf\u0a82\u0a97\u0acd\u0ab5\u0ab2 \u0a8f\u0a95\u0acd\u0ab8\u0ac7\u0ab8, \u0a91\u0aa1\u0abf\u0aaf\u0acb \u0a8f\u0a95\u0acd\u0ab8\u0aaa\u0acd\u0ab2\u0ac7\u0aa8\u0ac7\u0ab6\u0aa8, AI \u0a97\u0abe\u0a87\u0aa1\u0aa8\u0acd\u0ab8, \u0ab0\u0abf\u0aaa\u0acb\u0ab0\u0acd\u0a9f\u0abf\u0a82\u0a97, \u0aab\u0ac0\u0aa1\u0aac\u0ac7\u0a95 \u0a85\u0aa8\u0ac7 \u0ab5\u0ac7\u0ab0\u0abf\u0aab\u0abf\u0a95\u0ac7\u0ab6\u0aa8 \u0ab0\u0ac7\u0a95\u0ac9\u0ab0\u0acd\u0aa1 \u0a8f\u0a95 \u0a9c \u0a87\u0aa8\u0acd\u0a9f\u0ab0\u0aab\u0ac7\u0ab8\u0aae\u0abe\u0a82 \u0ab2\u0abe\u0ab5\u0ac7 \u0a9b\u0ac7.",
    aboutBody3: "\u0a86 \u0aaa\u0acd\u0ab2\u0ac7\u0a9f\u0aab\u0ac9\u0ab0\u0acd\u0aae \u0a9c\u0aa8\u0a9c\u0abe\u0a97\u0ac3\u0aa4\u0abf, \u0ab6\u0abf\u0a95\u0acd\u0ab7\u0aa3 \u0a85\u0aa8\u0ac7 \u0aae\u0ab9\u0aa4\u0acd\u0ab5\u0aa8\u0abe \u0aa6\u0ab8\u0acd\u0aa4\u0abe\u0ab5\u0ac7\u0a9c \u0ab8\u0abe\u0a87\u0aa8 \u0a95\u0ab0\u0ab5\u0abe \u0aaa\u0ab9\u0ac7\u0ab2\u0abe \u0ab8\u0ab2\u0abe\u0aae\u0aa4 \u0aa8\u0abf\u0ab0\u0acd\u0aa3\u0aaf \u0aae\u0abe\u0a9f\u0ac7 \u0aa1\u0abf\u0a9d\u0abe\u0a87\u0aa8 \u0a95\u0ab0\u0ab5\u0abe\u0aae\u0abe\u0a82 \u0a86\u0ab5\u0acd\u0aaf\u0ac1\u0a82 \u0a9b\u0ac7.",
    demoEyebrow: "\u0aa1\u0ac7\u0aae\u0acb",
    demoTitle: "\u0ab2\u0acb\u0a97\u0abf\u0aa8 \u0aaa\u0ab9\u0ac7\u0ab2\u0abe \u0aa8\u0aae\u0ac2\u0aa8\u0abe \u0ab2\u0ac0\u0a97\u0ab2 \u0ab5\u0abf\u0ab6\u0acd\u0ab2\u0ac7\u0ab7\u0aa3 \u0a9c\u0ac1\u0a93",
    keyFindings: "\u0aae\u0ac1\u0a96\u0acd\u0aaf \u0aa8\u0abf\u0ab7\u0acd\u0a95\u0ab0\u0acd\u0ab7",
    loginDemo: "\u0aaa\u0ac2\u0ab0\u0ac1\u0a82 \u0aa1\u0ac7\u0aae\u0acb \u0a96\u0acb\u0ab2\u0ab5\u0abe \u0ab2\u0acb\u0a97\u0abf\u0aa8 \u0a95\u0ab0\u0acb",
    demoInsight: "\u0aa1\u0ac7\u0aae\u0acb \u0a87\u0aa8\u0ab8\u0abe\u0a88\u0a9f",
    needsReview: "\u0ab8\u0aae\u0ac0\u0a95\u0acd\u0ab7\u0abe \u0a9c\u0ab0\u0ac2\u0ab0\u0ac0",
    simplified: "\u0ab8\u0ab0\u0ab3 \u0ab0\u0ac2\u0aaa",
    contactEyebrow: "\u0ab8\u0a82\u0aaa\u0ab0\u0acd\u0a95",
    contactTitle: "\u0aaa\u0acd\u0ab0\u0ab6\u0acd\u0aa8 \u0aae\u0acb\u0a95\u0ab2\u0acb",
    name: "\u0aa8\u0abe\u0aae",
    email: "\u0a88\u0aae\u0ac7\u0ab2",
    subject: "\u0ab5\u0abf\u0ab7\u0aaf",
    message: "\u0ab8\u0a82\u0aa6\u0ac7\u0ab6",
    sendQuery: "\u0aaa\u0acd\u0ab0\u0ab6\u0acd\u0aa8 \u0aae\u0acb\u0a95\u0ab2\u0acb",
  },
};

function App() {
  const [selectedLanguage, setSelectedLanguage] = useState("english");
  const [showSplash, setShowSplash] = useState(true);
  const [activePage, setActivePage] = useState("home");
  const [translatedDocument, setTranslatedDocument] = useState(null);
  const [languageCapabilities, setLanguageCapabilities] = useState([]);
  const [authMode, setAuthMode] = useState("login");
  const [publicView, setPublicView] = useState("landing");
  const [selectedPublicFeature, setSelectedPublicFeature] = useState("Document Simplification");
  const [pendingDemoLoad, setPendingDemoLoad] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [contactStatus, setContactStatus] = useState("");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [token, setToken] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [title, setTitle] = useState("");
  const [documentText, setDocumentText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeDocument, setActiveDocument] = useState(null);
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantMessage, setAssistantMessage] = useState("Sign in and analyze a document to use the legal assistant.");
  const [assistantTranslations, setAssistantTranslations] = useState({ english: "Sign in and analyze a document to use the legal assistant." });
  const [assistantSections, setAssistantSections] = useState({
    summary: "Sign in and analyze a document to use the legal assistant.",
    explanation: [],
    actions: [],
    followUp: "",
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [integrationInfo, setIntegrationInfo] = useState(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState({});
  const [currentChallenge, setCurrentChallenge] = useState(0);
  const [selectedChallengeAnswer, setSelectedChallengeAnswer] = useState(null);
  const [learningScore, setLearningScore] = useState(0);
  const [challengeResult, setChallengeResult] = useState(null);
  const [learningRounds] = useState(() => buildLearningRounds(learningChallenges));
  const [availableVoices, setAvailableVoices] = useState([]);

  useEffect(() => {
    loadHealth();
    localStorage.removeItem("simplifylegal_token");
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 1800);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!window.speechSynthesis) {
      return undefined;
    }

    const loadVoices = () => {
      setAvailableVoices(window.speechSynthesis.getVoices());
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  useEffect(() => {
    if (token) {
      loadCurrentUser(token);
      loadDocuments(token);
      loadAnalytics(token);
      loadIntegrations(token);
    } else {
      setCurrentUser(null);
      setDocuments([]);
      setActiveDocument(null);
    }
  }, [token]);

  useEffect(() => {
    if (currentUser && activeDocument) {
      loadTranslatedDocument(activeDocument.id, selectedLanguage);
    } else {
      setTranslatedDocument(null);
    }
  }, [currentUser, activeDocument?.id, selectedLanguage]);

  useEffect(() => {
    if (currentUser && token && pendingDemoLoad) {
      runDemoAnalysis(token);
    }
  }, [currentUser, token, pendingDemoLoad]);

  async function apiFetch(url, options = {}, activeToken = token) {
    const headers = new Headers(options.headers || {});
    if (activeToken) {
      headers.set("Authorization", `Bearer ${activeToken}`);
    }

    const response = await fetch(buildApiUrl(url), { ...options, headers });
    const data = await response.json().catch(() => ({}));

    if (response.status === 401 && activeToken) {
      handleLogout();
      throw new Error("Your session expired. Please sign in again.");
    }

    if (!response.ok) {
      throw new Error(data.error || "Request failed.");
    }

    return data;
  }

  async function loadHealth() {
    try {
      const response = await fetch(buildApiUrl("/api/health"));
      const data = await response.json();
      if (response.ok) {
        setLanguageCapabilities(data.languages || []);
      }
    } catch (_error) {
      setLanguageCapabilities([]);
    }
  }

  async function loadCurrentUser(activeToken = token) {
    try {
      const data = await apiFetch("/api/auth/me", {}, activeToken);
      setCurrentUser(data.user);
      setAssistantMessage("Signed in. You can upload a document, analyze text, and chat about your clauses.");
      setAssistantTranslations({ english: "Signed in. You can upload a document, analyze text, and chat about your clauses." });
      setAssistantSections({
        summary: "Signed in. You can upload a document, analyze text, and chat about your clauses.",
        explanation: [],
        actions: [],
        followUp: "",
      });
    } catch (error) {
      setAssistantMessage(error.message);
      setAssistantTranslations({ english: error.message });
    }
  }

  async function loadDocuments(activeToken = token) {
    try {
      const data = await apiFetch("/api/documents", {}, activeToken);
      setDocuments(data);
      setActiveDocument(null);
      setTranslatedDocument(null);
    } catch (_error) {
      setDocuments([]);
      setActiveDocument(null);
      setTranslatedDocument(null);
    }
  }

  async function loadAnalytics(activeToken = token) {
    try {
      const data = await apiFetch("/api/analytics", {}, activeToken);
      setAnalytics(data);
    } catch (_error) {
    }
  }

  async function loadIntegrations(activeToken = token) {
    try {
      const data = await apiFetch("/api/integrations", {}, activeToken);
      setIntegrationInfo(data);
    } catch (_error) {
      setIntegrationInfo(null);
    }
  }

  async function submitFeedback(documentId, clauseId, rating, comment = "") {
    try {
      await apiFetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, clauseId, rating, comment }),
      });
      setFeedbackSubmitted((prev) => ({ ...prev, [clauseId || `${documentId}-doc`]: true }));
      loadAnalytics();
    } catch (error) {
      console.error("Feedback failed:", error);
    }
  }

  async function submitAuth(event) {
    event.preventDefault();
    setIsAuthenticating(true);

    try {
      const endpoint = authMode === "register" ? "/api/auth/register" : "/api/auth/login";
      const body =
        authMode === "register"
          ? authForm
          : { email: authForm.email, password: authForm.password };

      const data = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }, "");

      setToken(data.token);
      setCurrentUser(data.user);
      setPublicView("landing");
      setActiveDocument(null);
      setTranslatedDocument(null);
      setFeedbackSubmitted({});
      setAuthForm({ name: "", email: "", password: "" });
    } catch (error) {
      setAssistantMessage(error.message);
    } finally {
      setIsAuthenticating(false);
    }
  }

  function handleLogout() {
    setToken("");
    setCurrentUser(null);
    setPublicView("login");
    setDocuments([]);
    setActiveDocument(null);
    setTranslatedDocument(null);
    setFeedbackSubmitted({});
    setAssistantQuestion("");
    setAssistantMessage("You have been signed out.");
    setAssistantTranslations({ english: "You have been signed out." });
    setAssistantSections({
      summary: "You have been signed out.",
      explanation: [],
      actions: [],
      followUp: "",
    });
  }

  async function analyzeText(event) {
    event.preventDefault();
    if (!documentText.trim()) {
      setAssistantMessage("Paste some legal text first so I can analyze it.");
      return;
    }

    await submitAnalysis("/api/analyze-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, text: documentText }),
    });
  }

  async function uploadFile(event) {
    event.preventDefault();
    if (!selectedFile) {
      setAssistantMessage("Choose a legal file before uploading.");
      return;
    }

    const formData = new FormData();
    formData.append("document", selectedFile);

    await submitAnalysis("/api/upload", {
      method: "POST",
      body: formData,
    });
  }

  async function submitAnalysis(url, options) {
    setIsAnalyzing(true);
    setAssistantMessage("Analyzing the document...");

    try {
      const data = await apiFetch(url, options);
      setActiveDocument(data);
      setTranslatedDocument(null);
      setFeedbackSubmitted({});
      setDocuments((current) => [data, ...current.filter((document) => document.id !== data.id)]);
      setAssistantMessage("Analysis complete. Ask about risks, payment terms, confidentiality, or termination.");
      setAssistantTranslations({ english: "Analysis complete. Ask about risks, payment terms, confidentiality, or termination." });
      setAssistantSections({
        summary: "Analysis complete. Ask about risks, payment terms, confidentiality, or termination.",
        explanation: [],
        actions: [],
        followUp: "",
      });
    } catch (error) {
      setAssistantMessage(error.message);
      setAssistantTranslations({ english: error.message });
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function runDemoAnalysis(activeToken) {
    setPendingDemoLoad(false);
    setActivePage("workspace");
    setTitle("Sample Service Agreement");
    setDocumentText(demoText);
    setIsAnalyzing(true);
    setAssistantMessage("Loading the demo analysis...");

    try {
      const data = await apiFetch(
        "/api/analyze-text",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Sample Service Agreement", text: demoText }),
        },
        activeToken
      );
      setActiveDocument(data);
      setTranslatedDocument(null);
      setFeedbackSubmitted({});
      setDocuments((current) => [data, ...current.filter((document) => document.id !== data.id)]);
      setAssistantMessage("Demo analysis loaded. You can now review the document insights.");
      setAssistantTranslations({ english: "Demo analysis loaded. You can now review the document insights." });
      setAssistantSections({
        summary: "Demo analysis loaded. You can now review the document insights.",
        explanation: [],
        actions: [],
        followUp: "",
      });
    } catch (error) {
      setAssistantMessage(error.message);
      setAssistantTranslations({ english: error.message });
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function askAssistant(event) {
    event.preventDefault();
    if (!assistantQuestion.trim()) {
      setAssistantMessage("Type a question for the legal assistant.");
      return;
    }
    if (!activeDocument) {
      setAssistantMessage("Analyze a document first, then ask your question.");
      return;
    }

    setAssistantMessage("Reviewing the document...");

    try {
      const data = await apiFetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: assistantQuestion,
          documentId: activeDocument.id,
        }),
      });

      const cited = data.citedClause ? `\n\nReferenced clause: ${data.citedClause}.` : "";
      const translations = data.translations || { english: data.answer };
      const mergedTranslations = Object.fromEntries(
        Object.entries(translations).map(([key, value]) => [
          key,
          `${typeof value === "string" ? value : value.answer || ""}${cited}`,
        ])
      );
      const selectedStructured = data.translations?.[selectedLanguage]?.sections || data.sections || {
        summary: data.answer,
        explanation: [],
        actions: [],
        followUp: "",
      };
      setAssistantSections(selectedStructured);
      setAssistantTranslations(mergedTranslations);
      setAssistantMessage(mergedTranslations.english || `${data.answer}${cited}`);
    } catch (error) {
      setAssistantMessage(error.message);
      setAssistantTranslations({ english: error.message });
      setAssistantSections({
        summary: error.message,
        explanation: [],
        actions: [],
        followUp: "",
      });
    }
  }

  async function openDocument(documentId) {
    try {
      const data = await apiFetch(`/api/documents/${documentId}`);
      setActiveDocument(data);
      setTranslatedDocument(null);
      setFeedbackSubmitted({});
      setAssistantMessage("Loaded a saved document. You can continue reviewing it or ask the assistant.");
      setAssistantTranslations({ english: "Loaded a saved document. You can continue reviewing it or ask the assistant." });
      setAssistantSections({
        summary: "Loaded a saved document. You can continue reviewing it or ask the assistant.",
        explanation: [],
        actions: [],
        followUp: "",
      });
    } catch (error) {
      setAssistantMessage(error.message);
      setAssistantTranslations({ english: error.message });
    }
  }

  async function downloadReport(documentId) {
    try {
      const reportUrl = buildApiUrl(`/api/documents/${documentId}/report?format=text`);
      const response = await fetch(reportUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error("Could not generate report.");
      }

      const reportText = await response.text();
      const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${(activeDocument?.title || "simplifylegal-report").replace(/[^a-z0-9_-]/gi, "_")}-report.txt`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      setAssistantMessage(error.message);
    }
  }

  async function loadTranslatedDocument(documentId, language) {
    if (!documentId) {
      setTranslatedDocument(null);
      return;
    }

    if (language === "english") {
      setTranslatedDocument(null);
      return;
    }

    try {
      const data = await apiFetch(`/api/documents/${documentId}/translate/${language}`);
      setTranslatedDocument(data);
    } catch (_error) {
      setTranslatedDocument(null);
    }
  }

  function getVoiceLanguageCode() {
    const codes = {
      english: "en-US",
      hindi: "hi-IN",
      marathi: "mr-IN",
      gujarati: "gu-IN",
      tamil: "ta-IN",
      bengali: "bn-IN",
      punjabi: "pa-IN",
    };
    return codes[selectedLanguage] || "en-US";
  }

  function getBestVoiceMatch() {
    const languageCode = getVoiceLanguageCode().toLowerCase();
    const baseLanguage = languageCode.split("-")[0];
    const fallbackChains = {
      "mr-in": ["hi-in", "en-in", "en-us"],
      "gu-in": ["hi-in", "en-in", "en-us"],
    };
    const fallbackCodes = fallbackChains[languageCode] || [];
    const directMatch =
      availableVoices.find((voice) => voice.lang?.toLowerCase() === languageCode) ||
      availableVoices.find((voice) => voice.lang?.toLowerCase().startsWith(`${baseLanguage}-`)) ||
      availableVoices.find((voice) => voice.lang?.toLowerCase() === baseLanguage);

    if (directMatch) {
      return directMatch;
    }

    for (const fallbackCode of fallbackCodes) {
      const fallbackBase = fallbackCode.split("-")[0];
      const fallbackVoice =
        availableVoices.find((voice) => voice.lang?.toLowerCase() === fallbackCode) ||
        availableVoices.find((voice) => voice.lang?.toLowerCase().startsWith(`${fallbackBase}-`)) ||
        availableVoices.find((voice) => voice.lang?.toLowerCase() === fallbackBase);
      if (fallbackVoice) {
        return fallbackVoice;
      }
    }

    return (
      availableVoices.find((voice) => voice.default) ||
      null
    );
  }

  function speakText(text) {
    if (!window.speechSynthesis || !text?.trim()) {
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getVoiceLanguageCode();
    const preferredVoice = getBestVoiceMatch();
    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang || utterance.lang;
    }
    utterance.rate = 0.94;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeech() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  function buildInsightSpeechText() {
    if (!activeDocument) {
      return "";
    }

    const overview = localizedSummary?.overview || activeDocument.summary.overview;
    const warnings = (localizedSummary?.frequentRuleWarnings || activeDocument.summary.frequentRuleWarnings || [])
      .slice(0, 2)
      .join(". ");
    const clauseCount = activeDocument.summary.stats.totalClauses;

    const intros = {
      english: `Here is a simple summary of this document. It has ${clauseCount} clauses and ${riskCount} risk flags.`,
      hindi: `यह इस दस्तावेज़ का आसान सारांश है। इसमें ${clauseCount} क्लॉज हैं और ${riskCount} जोखिम संकेत मिले हैं।`,
      marathi: `हा या दस्तऐवजाचा सोपा सारांश आहे. यात ${clauseCount} क्लॉज आहेत आणि ${riskCount} जोखीम संकेत आढळले आहेत.`,
      gujarati: `આ આ દસ્તાવેજનો સરળ સારાંશ છે. તેમાં ${clauseCount} કલોઝ છે અને ${riskCount} જોખમ સંકેતો મળ્યા છે.`,
      tamil: `இது இந்த ஆவணத்தின் எளிய சுருக்கம். இதில் ${clauseCount} கிளாஸ்கள் உள்ளன மற்றும் ${riskCount} அபாய குறிப்புகள் உள்ளன.`,
      bengali: `এটি এই নথির সহজ সারাংশ। এতে ${clauseCount}টি ধারা আছে এবং ${riskCount}টি ঝুঁকির সংকেত পাওয়া গেছে।`,
      punjabi: `ਇਹ ਇਸ ਦਸਤਾਵੇਜ਼ ਦਾ ਸੌਖਾ ਸਾਰ ਹੈ। ਇਸ ਵਿੱਚ ${clauseCount} ਕਲੌਜ਼ ਹਨ ਅਤੇ ${riskCount} ਜੋਖਮ ਸੰਕੇਤ ਮਿਲੇ ਹਨ।`,
    };

    const warningPrefixes = {
      english: "Please pay attention to these points:",
      hindi: "इन बातों पर ध्यान दें:",
      marathi: "या मुद्द्यांकडे लक्ष द्या:",
      gujarati: "આ મુદ્દાઓ પર ખાસ ધ્યાન આપો:",
      tamil: "இந்த அம்சங்களுக்கு கவனம் செலுத்துங்கள்:",
      bengali: "এই বিষয়গুলোর দিকে খেয়াল রাখুন:",
      punjabi: "ਇਨ੍ਹਾਂ ਗੱਲਾਂ ਉੱਤੇ ਧਿਆਨ ਦਿਓ:",
    };

    const intro = intros[selectedLanguage] || intros.english;
    const warningPrefix = warningPrefixes[selectedLanguage] || warningPrefixes.english;

    return `${intro} ${overview}${warnings ? ` ${warningPrefix} ${warnings}` : ""}`.trim();
  }

  function localizeVisibleLabel(text) {
    if (selectedLanguage === "english") {
      return text;
    }
    return localTermMaps[selectedLanguage]?.[text] || text;
  }

  function getVisibleClauseText(clause, fallbackClause) {
    if (selectedLanguage === "english") {
      return clause?.originalText || fallbackClause?.originalText || "";
    }

    const translated = clause?.originalText;
    const source = fallbackClause?.originalText || "";
    if (translated && translated !== source) {
      return translated;
    }

    return (
      clause?.localized?.[selectedLanguage]?.simplifiedText ||
      clause?.simplifiedText ||
      fallbackClause?.localized?.[selectedLanguage]?.simplifiedText ||
      fallbackClause?.simplifiedText ||
      source
    );
  }

  const localizedSummary = activeDocument?.localizedSummary?.[selectedLanguage] || activeDocument?.localizedSummary?.english;
  const visibleAssistantMessage = assistantTranslations[selectedLanguage] || assistantTranslations.english || assistantMessage;
  const visibleAssistantSections = dataSafeSections(selectedLanguage, assistantSections, assistantTranslations);
  const selectedLanguageMeta =
    languageCapabilities.find((language) => language.code === selectedLanguage) || null;
  const t = uiText[selectedLanguage] || uiText.english;
  const selectedLanguageLabel =
    (languageCapabilities.find((language) => language.code === selectedLanguage)?.label ||
      languageOptionFallback.find((language) => language.code === selectedLanguage)?.label ||
      selectedLanguage);
  const visibleDocumentText =
    selectedLanguage === "english"
      ? activeDocument?.originalText || ""
      : translatedDocument?.fullText || activeDocument?.originalText || "";
  const visibleClauses =
    selectedLanguage === "english"
      ? activeDocument?.clauses || []
      : translatedDocument?.clauses?.length
        ? translatedDocument.clauses
        : activeDocument?.clauses || [];
  const visibleGlossary =
    localizedSummary?.glossary?.length
      ? localizedSummary.glossary
      : activeDocument?.summary?.glossary || [];
  const showTranslatedDocumentText =
    selectedLanguage === "english" ||
    (translatedDocument?.fullText && translatedDocument.fullText !== activeDocument?.originalText);
  const riskCount = activeDocument
    ? activeDocument.clauses.reduce((count, clause) => count + clause.riskFlags.length, 0)
    : 0;
  const insightSpeechText = buildInsightSpeechText();
  const assistantSpeechText = [
    visibleAssistantSections.summary || visibleAssistantMessage,
    visibleAssistantSections.explanation?.length
      ? `${t.whyItMatters} ${visibleAssistantSections.explanation.join(". ")}`
      : "",
    visibleAssistantSections.actions?.length
      ? `${t.whatYouCanDo} ${visibleAssistantSections.actions.join(". ")}`
      : "",
    visibleAssistantSections.followUp ? `${t.nextStep} ${visibleAssistantSections.followUp}` : "",
  ]
    .filter(Boolean)
    .join(". ");
  const landingFeatures = [
    {
      title: "Document Simplification",
      copy: "Upload contracts and get plain-language explanations that are easier to understand.",
      details: [
        "Upload contracts, agreements, and policies.",
        "The system extracts clauses and separates important sections.",
        "Complex legal language is simplified without losing the main meaning.",
      ],
    },
    {
      title: "Multi-Language Translation",
      copy: "Let users hear and review legal insights in the language they are most comfortable with.",
      details: [
        "Simplified legal insights are available in supported regional languages.",
        "Audio playback reads summaries and assistant explanations aloud.",
        "The design focuses on accessibility for less-confident readers.",
      ],
    },
    {
      title: "Smart Suggestions",
      copy: "Highlight risky wording, action points, and helpful next steps before signing.",
      details: [
        "The app flags risks, hidden obligations, and one-sided wording.",
        "Users get rule reminders, guidance, and clause-level suggestions.",
        "Feedback and analytics help improve awareness and reporting.",
      ],
    },
  ];
  const sidebarSections = [
    { id: "home", label: "Home", icon: "⌂" },
    { id: "workspace", label: "Workspace", icon: "↑" },
    { id: "documents", label: "History", icon: "▣" },
    { id: "analytics", label: "Analytics", icon: "◔" },
    { id: "assistant", label: "Assistant", icon: "✦" },
    { id: "learn", label: "Learn", icon: "★" },
  ];
  const publicT = publicText[selectedLanguage] || publicText.english;
  const publicNavItems = [
    { id: "home", label: publicT.nav.home },
    { id: "features", label: publicT.nav.features },
    { id: "about", label: publicT.nav.about },
    { id: "contact", label: publicT.nav.contact },
    { id: "login", label: publicT.nav.login },
  ];

  function submitChallengeAnswer(answerIndex) {
    if (challengeResult) {
      return;
    }
    setSelectedChallengeAnswer(answerIndex);
    const challenge = learningRounds[currentChallenge];
    const correct = Boolean(challenge.options[answerIndex]?.isCorrect);
    if (correct) {
      setLearningScore((current) => current + 1);
    }
    setChallengeResult(correct ? "correct" : "wrong");
  }

  function goToNextChallenge() {
    setCurrentChallenge((current) => (current + 1) % learningRounds.length);
    setSelectedChallengeAnswer(null);
    setChallengeResult(null);
  }

  function openPublicSection(sectionId) {
    if (sectionId === "login") {
      setPublicView("login");
      return;
    }

    setPublicView("landing");
    window.setTimeout(() => {
      const targetId = sectionId === "home" ? "landing-home" : `landing-${sectionId}`;
      const element = document.getElementById(targetId);
      element?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  }

  async function submitContactForm(event) {
    event.preventDefault();
    setContactStatus("Sending your query...");

    try {
      const data = await apiFetch(
        "/api/contact",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contactForm),
        },
        ""
      );

      if (data.delivery?.delivered) {
        setContactStatus("Your query was sent to the project email successfully.");
      } else {
        setContactStatus("Your query has been submitted successfully. Our team will contact you soon.");
      }
      setContactForm({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      setContactStatus(error.message);
    }
  }

  if (showSplash) {
    return (
      <div className="splash-screen">
        <div className="splash-glow"></div>
        <LogoMark />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="page-shell page-shell-auth">
        <div className="landing-shell">
          <header className="landing-nav">
            <div className="landing-brand">
              <div className="brand-chip" aria-hidden="true">
                <LogoMark compact withWordmark={false} />
              </div>
              <div>
                <div className="landing-brand-name">SIMPLIFYLEGAL</div>
                <div className="landing-brand-tag">EASY AND ACCESSIBLE</div>
              </div>
            </div>
            <nav className="landing-nav-links">
              <select
                className="language-select landing-language-select"
                value={selectedLanguage}
                onChange={(event) => setSelectedLanguage(event.target.value)}
                aria-label="Select landing page language"
              >
                {(languageCapabilities.length ? languageCapabilities : languageOptionFallback).map((language) => (
                  <option key={`landing-${language.code}`} value={language.code}>
                    {language.label}
                  </option>
                ))}
              </select>
              {publicNavItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="landing-nav-link"
                  onClick={() => openPublicSection(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </header>

          {publicView === "landing" ? (
            <>
              <section className="landing-hero-card" id="landing-home">
                <div className="landing-hero-inner">
                  <h1>{publicT.heroTitle}</h1>
                  <p>{publicT.heroLead}</p>
                  <div className="landing-actions">
                    <button className="primary-btn landing-primary" type="button" onClick={() => setPublicView("login")}>
                      {publicT.getStarted}
                    </button>
                    <button
                      className="secondary-btn landing-secondary"
                      type="button"
                      onClick={() => openPublicSection("demo")}
                    >
                      {publicT.exploreDemo}
                    </button>
                  </div>
                </div>
              </section>

              <section className="landing-section" id="landing-features">
                <div className="landing-section-head">
                  <p className="eyebrow">{publicT.featuresEyebrow}</p>
                  <h2>{publicT.featuresTitle}</h2>
                </div>
                <div className="landing-feature-grid">
                  {landingFeatures.map((feature) => (
                    <button
                      key={feature.title}
                      type="button"
                      className={`landing-feature-tile${selectedPublicFeature === feature.title ? " active" : ""}`}
                      onClick={() => setSelectedPublicFeature(feature.title)}
                    >
                      <div className="feature-icon">{feature.title.charAt(0)}</div>
                      <h3>{feature.title}</h3>
                      <p>{feature.copy}</p>
                    </button>
                  ))}
                </div>
                <div className="landing-detail-card">
                  <h3>{selectedPublicFeature}</h3>
                  <ul>
                    {(landingFeatures.find((feature) => feature.title === selectedPublicFeature)?.details || []).map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                </div>
              </section>

              <section className="landing-section" id="landing-about">
                <div className="landing-section-head">
                  <p className="eyebrow">{publicT.aboutEyebrow}</p>
                  <h2>{publicT.aboutTitle}</h2>
                </div>
                <div className="landing-about-card">
                  <p>{publicT.aboutBody1}</p>
                  <p>{publicT.aboutBody2}</p>
                  <p>{publicT.aboutBody3}</p>
                </div>
              </section>

              <section className="landing-section" id="landing-demo">
                <div className="landing-section-head">
                  <p className="eyebrow">{publicT.demoEyebrow}</p>
                  <h2>{publicT.demoTitle}</h2>
                </div>
                <div className="landing-demo-grid">
                  <div className="landing-detail-card">
                    <h3>{publicDemoReport.title}</h3>
                    <p>{publicDemoReport.overview}</p>
                    <div className="summary-stats landing-demo-stats">
                      <div className="stat-card">
                        <span>Total clauses</span>
                        <strong>{publicDemoReport.stats.totalClauses}</strong>
                      </div>
                      <div className="stat-card">
                        <span>High importance</span>
                        <strong>{publicDemoReport.stats.highImportanceClauses}</strong>
                      </div>
                      <div className="stat-card">
                        <span>Risk flags</span>
                        <strong>{publicDemoReport.stats.riskFlags}</strong>
                      </div>
                      <div className="stat-card">
                        <span>Read time</span>
                        <strong>{publicDemoReport.stats.readingTime}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="landing-detail-card">
                    <h3>{publicT.keyFindings}</h3>
                    <ul>
                      {publicDemoReport.highlights.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <button
                      className="primary-btn landing-primary landing-demo-action"
                      type="button"
                      onClick={() => {
                        setTitle("Sample Service Agreement");
                        setDocumentText(demoText);
                        setPendingDemoLoad(true);
                        setPublicView("login");
                      }}
                    >
                      {publicT.loginDemo}
                    </button>
                  </div>
                </div>
                <div className="landing-demo-clauses">
                  {publicDemoReport.riskyClauses.map((clause) => (
                    <article className="clause-card" key={clause.clauseId}>
                      <p className="eyebrow">{clause.clauseId}</p>
                      <h3>{clause.title}</h3>
                      <div className="clause-meta">
                        <span className="tag">{publicT.demoInsight}</span>
                        <span className="risk-flag">{publicT.needsReview}</span>
                      </div>
                      <p>
                        <strong>{publicT.simplified}:</strong> {clause.simplified}
                      </p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="landing-section landing-contact-section" id="landing-contact">
                <div className="landing-section-head">
                  <p className="eyebrow">{publicT.contactEyebrow}</p>
                  <h2>{publicT.contactTitle}</h2>
                </div>
                <form className="landing-contact-form" onSubmit={submitContactForm}>
                  <label className="field">
                    <span>{publicT.name}</span>
                    <input
                      type="text"
                      value={contactForm.name}
                      onChange={(event) => setContactForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Your name"
                    />
                  </label>
                  <label className="field">
                    <span>{publicT.email}</span>
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={(event) => setContactForm((current) => ({ ...current, email: event.target.value }))}
                      placeholder="your@email.com"
                    />
                  </label>
                  <label className="field">
                    <span>{publicT.subject}</span>
                    <input
                      type="text"
                      value={contactForm.subject}
                      onChange={(event) => setContactForm((current) => ({ ...current, subject: event.target.value }))}
                      placeholder="Query subject"
                    />
                  </label>
                  <label className="field">
                    <span>{publicT.message}</span>
                    <textarea
                      rows="5"
                      value={contactForm.message}
                      onChange={(event) => setContactForm((current) => ({ ...current, message: event.target.value }))}
                      placeholder="Write your query here"
                    />
                  </label>
                  <button className="primary-btn" type="submit">{publicT.sendQuery}</button>
                </form>
                {contactStatus ? <div className="assistant-answer landing-contact-status">{contactStatus}</div> : null}
              </section>
            </>
          ) : (
            <section className="auth-panel panel landing-auth-panel">
              <div className="panel-heading auth-heading">
                <div>
                  <p className="eyebrow">Access</p>
                  <h2>{authMode === "register" ? "Create your account" : "Sign in to your dashboard"}</h2>
                </div>
              </div>

              <form className="stack" onSubmit={submitAuth}>
                {authMode === "register" ? (
                  <label className="field">
                    <span>Name</span>
                    <input
                      type="text"
                      value={authForm.name}
                      onChange={(event) => setAuthForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Manmeet Randhawa"
                    />
                  </label>
                ) : null}

                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={authForm.email}
                    onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="you@example.com"
                  />
                </label>

                <label className="field">
                  <span>Password</span>
                  <input
                    type="password"
                    value={authForm.password}
                    onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="At least 6 characters"
                  />
                </label>

                <button className="primary-btn" disabled={isAuthenticating} type="submit">
                  {isAuthenticating ? "Please wait..." : authMode === "register" ? "Create Account" : "Sign In"}
                </button>
              </form>

              <button
                className="secondary-btn auth-toggle"
                type="button"
                onClick={() => setAuthMode((current) => (current === "login" ? "register" : "login"))}
              >
                {authMode === "login" ? "Need an account? Register" : "Already have an account? Sign in"}
              </button>

              <button
                className="secondary-btn auth-toggle"
                type="button"
                onClick={() => setPublicView("landing")}
              >
                Back to Home
              </button>

              <div className="assistant-answer">{assistantMessage}</div>
            </section>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <main className="workspace">
            <aside className="panel dashboard-sidebar">
              <LogoMark compact />
              <div className="sidebar-nav">
                {sidebarSections.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`sidebar-link${activePage === item.id ? " active" : ""}`}
                    onClick={() => setActivePage(item.id)}
                  >
                    <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
              <div className="sidebar-footer">
                <div className="sidebar-language">
                  <p className="eyebrow">Language</p>
                  <select
                    className="language-select sidebar-language-select"
                    value={selectedLanguage}
                    onChange={(event) => setSelectedLanguage(event.target.value)}
                    aria-label="Select dashboard language"
                  >
                    {(languageCapabilities.length ? languageCapabilities : languageOptionFallback).map((language) => (
                      <option key={`sidebar-${language.code}`} value={language.code}>
                        {language.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sidebar-user">
                  <p className="eyebrow">Account</p>
                  <strong>{currentUser.name}</strong>
                  <span>{currentUser.email}</span>
                </div>
                <button className="secondary-btn sidebar-logout" type="button" onClick={handleLogout}>
                  {t.logout}
                </button>
              </div>
            </aside>

            <div className="workspace-main">
            <section className={`home-page ${activePage === "home" ? "page-visible" : "page-hidden"}`}>
              <div className="dashboard-hero dashboard-home-hero">
                <LogoMark compact />
                <h1>{t.heroTitle || "Making legal documents readable, teachable, and verifiable."}</h1>
                <p className="hero-lead dashboard-lead">
                  Review clauses, translate insights, listen in native language, and guide users safely through legal text.
                </p>
              </div>
              <div className="home-feature-grid">
                {landingFeatures.map((feature) => (
                  <article className="feature-card home-feature-card" key={`home-${feature.title}`}>
                    <div className="feature-icon">{feature.title.charAt(0)}</div>
                    <h3>{feature.title}</h3>
                    <p>{feature.copy}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className={`panel workspace-step ${activePage === "workspace" ? "page-visible" : "page-hidden"}`} id="upload-section">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Step 1</p>
                  <h2>{t.step1}</h2>
                </div>
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() => {
                    setTitle("Sample Service Agreement");
                    setDocumentText(demoText);
                  }}
                >
                  {t.loadDemo}
                </button>
              </div>

              <form className="stack" onSubmit={analyzeText}>
                <label className="field">
                  <span>{t.documentTitle}</span>
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Employment Agreement"
                  />
                </label>
                <label className="field">
                  <span>{t.pasteLegalText}</span>
                  <textarea
                    rows="10"
                    value={documentText}
                    onChange={(event) => setDocumentText(event.target.value)}
                    placeholder="Paste the contract, policy, or agreement text here..."
                  />
                </label>
                <button className="primary-btn" disabled={isAnalyzing} type="submit">
                  {isAnalyzing ? "Analyzing..." : t.analyzeText}
                </button>
              </form>

              <div className="divider">
                <span>or</span>
              </div>

              <form className="upload-row" onSubmit={uploadFile}>
                <input
                  type="file"
                  accept=".txt,.md,.text,.doc,.docx,.pdf"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                />
                <button className="secondary-btn" disabled={isAnalyzing} type="submit">
                  {t.uploadFile}
                </button>
              </form>
              <p className="helper-text">{t.uploadsHelp}</p>
            </section>

            <section className={`panel workspace-library ${activePage === "documents" ? "page-visible" : "page-hidden"}`} id="documents-section">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Library</p>
                  <h2>{t.library}</h2>
                </div>
              </div>
              {!documents.length ? (
                <div className="empty-state">{t.noDocs}</div>
              ) : (
                <div className="document-list">
                  {documents.map((document) => (
                    <button
                      key={document.id}
                      type="button"
                      className={`document-item${activeDocument?.id === document.id ? " active" : ""}`}
                      onClick={() => openDocument(document.id)}
                    >
                      <strong>{document.title}</strong>
                      <span>{document.filename || document.source}</span>
                      <span>{new Date(document.createdAt).toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className={`panel workspace-insights ${activePage === "workspace" ? "page-visible" : "page-hidden"}`} id="insights-section">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Step 2</p>
                  <h2>{t.insights}</h2>
                </div>
                <select
                  className="language-select"
                  value={selectedLanguage}
                  onChange={(event) => setSelectedLanguage(event.target.value)}
                  aria-label="Select insight language"
                >
                  {(languageCapabilities.length ? languageCapabilities : languageOptionFallback).map((language) => (
                    <option key={language.code} value={language.code}>
                      {language.label}
                    </option>
                  ))}
                </select>
              </div>

              {!activeDocument ? (
                <div className="empty-state">
                  {t.emptyInsights}
                </div>
              ) : (
                <div className="summary-blocks">
                  <div>
                    <p className="eyebrow">{t.activeDocument}</p>
                    <h3>{activeDocument.title}</h3>
                    <p className="summary-copy">{localizedSummary?.overview || activeDocument.summary.overview}</p>
                    {selectedLanguageMeta?.requiresAI && selectedLanguageMeta.quality === "limited" ? (
                      <p className="translation-note">
                        High-quality {selectedLanguageMeta.label} translation needs an OpenAI API key. The app is showing clean fallback text until AI translation is configured.
                      </p>
                    ) : null}
                    <div className="audio-row">
                      <button className="secondary-btn" type="button" onClick={() => speakText(insightSpeechText)}>
                        {t.playInsights}
                      </button>
                      <button className="secondary-btn" type="button" onClick={stopSpeech}>
                        {t.stopAudio}
                      </button>
                      <button className="secondary-btn" type="button" onClick={() => downloadReport(activeDocument.id)}>
                        Download Report
                      </button>
                    </div>
                  </div>

                  <div className="summary-stats">
                    <div className="stat-card">
                      <span>{t.totalClauses}</span>
                      <strong>{activeDocument.summary.stats.totalClauses}</strong>
                    </div>
                    <div className="stat-card">
                      <span>{t.highImportance}</span>
                      <strong>{activeDocument.summary.stats.highImportanceClauses}</strong>
                    </div>
                    <div className="stat-card">
                      <span>{t.riskFlags}</span>
                      <strong>{riskCount}</strong>
                    </div>
                    <div className="stat-card">
                      <span>{t.readTime}</span>
                      <strong>{activeDocument.summary.readingTime}</strong>
                    </div>
                  </div>

                  <div className="verify-grid">
                    <div className="verify-card">
                      <p className="eyebrow">{t.verification}</p>
                      <p><strong>Status:</strong> {localizedSummary?.verificationStatus || activeDocument.verification.status}</p>
                      <p><strong>Timestamp:</strong> {activeDocument.verification.timestamp}</p>
                    </div>
                    <div className="verify-card">
                      <p className="eyebrow">{t.fingerprint}</p>
                      <p>{activeDocument.verification.documentHash.slice(0, 32)}...</p>
                      <p>{localizedSummary?.verificationExplanation || activeDocument.verification.explanation}</p>
                    </div>
                    <div className="verify-card">
                      <p className="eyebrow">Blockchain Record</p>
                      <p><strong>Chain Block:</strong> {activeDocument.verification.blockchain?.blockHash?.slice(0, 18) || "Pending"}...</p>
                      <p><strong>Smart Contract:</strong> {activeDocument.verification.blockchain?.smartContractRef || "Not linked"}</p>
                      <p><strong>Anchor Status:</strong> {activeDocument.verification.blockchain?.anchorStatus || "Recorded"}</p>
                    </div>
                  </div>

                  <div>
                    <p className="eyebrow">{t.reminders}</p>
                    <ul>
                      {(localizedSummary?.frequentRuleWarnings || activeDocument.summary.frequentRuleWarnings).map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>

                  {visibleGlossary.length ? (
                    <div>
                      <p className="eyebrow">{t.keyTerms || localizeVisibleLabel("Key terms")}</p>
                      <ul>
                        {visibleGlossary.map((entry) => (
                          <li key={entry.term}>
                            <strong>{entry.term}:</strong> {entry.plainMeaning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div>
                    <p className="eyebrow">{t.clauseExplorer}</p>
                    <div className="clauses-grid">
                      {visibleClauses.map((clause, index) => {
                        const baseClause = activeDocument.clauses[index] || clause;
                        const localizedSimplified =
                          clause.localized?.[selectedLanguage]?.simplifiedText ||
                          clause.simplifiedText ||
                          baseClause.localized?.[selectedLanguage]?.simplifiedText ||
                          baseClause.simplifiedText;
                        const localizedSuggestions =
                          clause.localized?.[selectedLanguage]?.suggestions ||
                          clause.suggestions ||
                          baseClause.localized?.[selectedLanguage]?.suggestions ||
                          baseClause.suggestions;
                        const localizedRisks =
                          clause.localized?.[selectedLanguage]?.riskFlags ||
                          clause.riskFlags ||
                          baseClause.localized?.[selectedLanguage]?.riskFlags ||
                          baseClause.riskFlags;
                        const localizedTerminology =
                          clause.terminology ||
                          baseClause.localized?.[selectedLanguage]?.terminology ||
                          baseClause.terminology ||
                          [];

                        return (
                          <article className="clause-card" key={clause.clauseId}>
                            <p className="eyebrow">{clause.clauseId}</p>
                            <h3>{clause.title || baseClause.title}</h3>
                            <div className="clause-meta">
                              <span className="tag">{localizeVisibleLabel(clause.type || baseClause.type)}</span>
                              <span className="tag">
                                {localizeVisibleLabel(clause.importance || baseClause.importance)} {localizeVisibleLabel("importance")}
                              </span>
                              {clause.confidenceScores ? (
                                <span className="tag">
                                  {(t.confidenceLabel || localizeVisibleLabel("Confidence"))} {Math.round(clause.confidenceScores.simplification * 100)}%
                                </span>
                              ) : null}
                            </div>
                            <p><strong>{t.original}:</strong> {getVisibleClauseText(clause, baseClause)}</p>
                            <p><strong>{t.simplified}:</strong> {localizedSimplified}</p>
                            {clause.confidenceScores ? (
                              <div className="helper-text">
                                <strong>{t.confidenceBreakdown || localizeVisibleLabel("AI confidence")}:</strong>{" "}
                                {(t.simplifyShort || localizeVisibleLabel("Simplify"))} {Math.round(clause.confidenceScores.simplification * 100)}%,
                                {" "}{(t.suggestShort || localizeVisibleLabel("Suggestions"))} {Math.round(clause.confidenceScores.suggestions * 100)}%,
                                {" "}{(t.riskShort || localizeVisibleLabel("Risk"))} {Math.round(clause.confidenceScores.riskAssessment * 100)}%
                              </div>
                            ) : null}
                            <ul>
                              {localizedSuggestions.map((suggestion) => (
                                <li key={suggestion}>{suggestion}</li>
                              ))}
                            </ul>
                            <div>
                              {localizedRisks.map((risk) => (
                                <span className="risk-flag" key={`${clause.clauseId}-${risk}`}>{risk}</span>
                              ))}
                            </div>
                            {localizedTerminology.length ? (
                              <div className="helper-text">
                                <strong>{t.keyTerms || localizeVisibleLabel("Key terms")}:</strong>
                                <ul>
                                  {localizedTerminology.map((entry) => (
                                    <li key={`${clause.clauseId}-${entry.term}`}>
                                      <strong>{entry.term}:</strong> {entry.plainMeaning}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                            {clause.feedbackSummary?.total ? (
                              <div className="helper-text">
                                <strong>{t.userHelpfulness || localizeVisibleLabel("User helpfulness")}:</strong> {Math.round(clause.feedbackSummary.helpfulnessScore * 100)}%
                              </div>
                            ) : null}
                            <div className="clause-feedback">
                              {feedbackSubmitted[clause.clauseId] ? (
                                <span style={{ color: 'var(--success)' }}>{t.thanks || localizeVisibleLabel("Thanks for your feedback!")}</span>
                              ) : (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <span>{t.rateHelpful || localizeVisibleLabel("Was this helpful?")}</span>
                                  <button type="button" onClick={() => submitFeedback(activeDocument.id, clause.clauseId, 1)}>👍</button>
                                  <button type="button" onClick={() => submitFeedback(activeDocument.id, clause.clauseId, 0)}>👎</button>
                                </div>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>

                  <div className="translated-document">
                    <p className="eyebrow">{t.fullDocumentView}</p>
                    <p className="helper-text">
                      {selectedLanguage === "english"
                        ? t.originalDocumentText
                        : `${t.fullDocumentView} ${selectedLanguageLabel}`}
                    </p>
                    <div className="document-text-block">
                      {showTranslatedDocumentText ? visibleDocumentText : t.translatedNotAvailable}
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className={`panel workspace-analytics ${activePage === "analytics" ? "page-visible" : "page-hidden"}`} id="analytics-section">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Insights & RuleStats</p>
                  <h2>{t.feedbackTitle || "Feedback & Analytics"}</h2>
                </div>
              </div>
              {!analytics ? (
                <div className="empty-state">No analytics data yet.</div>
              ) : (
                <div className="summary-blocks">
                  <div className="verify-grid">
                    <div className="verify-card">
                      <p className="eyebrow">{t.overallRisk || "Document Risk Overview"}</p>
                      <p><strong>Documents Analyzed:</strong> {analytics.totalDocuments}</p>
                      <p><strong>High Risk Clauses Found:</strong> {analytics.totalHighRiskClauses}</p>
                      <p><strong>Feedback Submitted:</strong> {analytics.totalFeedback}</p>
                      <p><strong>{t.userHelpfulness || "User helpfulness"}:</strong> {Math.round((analytics.averageHelpfulness || 0) * 100)}%</p>
                    </div>
                    <div className="verify-card">
                      <p className="eyebrow">{t.topBrokenRules || "Frequently Broken Rules"}</p>
                      {analytics.topBrokenRules.length === 0 ? <p>No rules broken.</p> : (
                        <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem' }}>
                          {analytics.topBrokenRules.map(r => (
                            <li key={r.rule}>{r.rule} ({r.count} times)</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="verify-card">
                      <p className="eyebrow">Integration Ready</p>
                      <p><strong>API Version:</strong> {integrationInfo?.apiVersion || "v1"}</p>
                      <p><strong>Supported Flows:</strong> {integrationInfo?.supportedFlows?.length || 0}</p>
                      <p><strong>Scalability Profile:</strong> {analytics.performance?.processingProfile || "Academic deployment"}</p>
                      <p><strong>Design:</strong> {analytics.performance?.scalableDesign || "API-first"}</p>
                    </div>
                  </div>
                  <div className="verify-card feedback-list-card">
                    <p className="eyebrow">Recent Feedback</p>
                    {analytics.recentFeedback?.length ? (
                      <div className="feedback-list">
                        {analytics.recentFeedback
                          .slice()
                          .reverse()
                          .map((entry, index) => (
                            <div className="feedback-item" key={`${entry.date}-${entry.clauseId || "document"}-${index}`}>
                              <div className="feedback-item-top">
                                <strong>{entry.clauseId || "Document feedback"}</strong>
                                <span>{Number(entry.rating) > 0 ? "Helpful" : "Needs improvement"}</span>
                              </div>
                              <p>{entry.comment?.trim() || "No written comment was added for this feedback."}</p>
                              <small>{new Date(entry.date).toLocaleString()}</small>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p>No feedback submitted yet. Use the thumbs buttons in Insights or Assistant to start collecting feedback.</p>
                    )}
                  </div>
                </div>
              )}
            </section>

            <section className={`panel assistant-panel ${activePage === "assistant" ? "page-visible" : "page-hidden"}`} id="assistant-section">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Step 3</p>
                  <h2>{t.assistant}</h2>
                </div>
              </div>
              <form className="assistant-form" onSubmit={askAssistant}>
                <input
                  type="text"
                  value={assistantQuestion}
                  onChange={(event) => setAssistantQuestion(event.target.value)}
                  placeholder="Ask about risks, payment terms, confidentiality, termination..."
                />
                <button className="primary-btn" type="submit">{t.ask}</button>
              </form>
              <div className="audio-row">
                <button className="secondary-btn" type="button" onClick={() => speakText(assistantSpeechText)}>
                  {t.playAssistant}
                </button>
                <button className="secondary-btn" type="button" onClick={stopSpeech}>
                  {t.stopAudio}
                </button>
              </div>
              <div className="assistant-answer">
                <strong>{visibleAssistantSections.summary}</strong>
                {visibleAssistantSections.explanation?.length ? (
                  <>
                    {"\n\n"}{t.whyItMatters}
                    {visibleAssistantSections.explanation.map((item) => `\n- ${item}`).join("")}
                  </>
                ) : null}
                {visibleAssistantSections.actions?.length ? (
                  <>
                    {"\n\n"}{t.whatYouCanDo}
                    {visibleAssistantSections.actions.map((item) => `\n- ${item}`).join("")}
                  </>
                ) : null}
                {visibleAssistantSections.followUp ? `\n\n${t.nextStep} ${visibleAssistantSections.followUp}` : ""}
              </div>
              {activeDocument && <div className="clause-feedback">
                {feedbackSubmitted[`${activeDocument.id}-doc`] ? (
                   <span style={{ color: 'var(--success)' }}>{t.thanks || "Thanks for your feedback!"}</span>
                 ) : (
                   <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                     <span>{t.rateHelpful || "Was this helpful?"}</span>
                     <button type="button" onClick={() => submitFeedback(activeDocument.id, null, 1)}>👍</button>
                     <button type="button" onClick={() => submitFeedback(activeDocument.id, null, 0)}>👎</button>
                   </div>
                 )}
              </div>}
            </section>

            <section className={`panel learning-panel ${activePage === "learn" ? "page-visible" : "page-hidden"}`}>
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Learn</p>
                  <h2>Legal Learning Game</h2>
                </div>
                <div className="tag">Score {learningScore}</div>
              </div>
              <div className="learning-card">
                <p className="eyebrow">Challenge {currentChallenge + 1}</p>
                <h3>{learningRounds[currentChallenge].prompt}</h3>
                <div className="learning-options">
                  {learningRounds[currentChallenge].options.map((option, index) => {
                    const isSelected = selectedChallengeAnswer === index;
                    const isCorrect = challengeResult && option.isCorrect;
                    const stateClass =
                      challengeResult == null
                        ? ""
                        : isCorrect
                          ? " correct"
                          : isSelected
                            ? " wrong"
                            : "";

                    return (
                      <button
                        key={`${learningRounds[currentChallenge].prompt}-${option.text}`}
                        type="button"
                        className={`learning-option${stateClass}`}
                        onClick={() => submitChallengeAnswer(index)}
                      >
                        {option.text}
                      </button>
                    );
                  })}
                </div>
                {challengeResult ? (
                  <div className={`learning-feedback ${challengeResult}`}>
                    <strong>{challengeResult === "correct" ? "Correct answer" : "Not quite"}</strong>
                    <p>{learningRounds[currentChallenge].explanation}</p>
                    <button className="secondary-btn" type="button" onClick={goToNextChallenge}>
                      Next Challenge
                    </button>
                  </div>
                ) : (
                  <p className="helper-text">Choose the safest or fairest legal response to score points.</p>
                )}
              </div>
            </section>
            </div>
      </main>
    </div>
  );
}

function dataSafeSections(selectedLanguage, fallbackSections, translations) {
  const structured = translations?.[selectedLanguage];
  if (structured && typeof structured === "object" && "sections" in structured) {
    return structured.sections;
  }
  return fallbackSections;
}

export default App;

