"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ENVELOPE_VERSION = 1;
const SESSION_CONTEXT = Buffer.from("messenger-dashboard-appstate:v1", "utf8");

function getWorkspaceRoot(startDirectory = process.cwd()) {
  let current = path.resolve(startDirectory);
  while (true) {
    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error("Could not locate workspace root.");
    current = parent;
  }
}

function getPaths(startDirectory = process.cwd()) {
  const root = getWorkspaceRoot(startDirectory);
  const dataDirectory = path.join(root, "artifacts", "messenger-bot", "data");
  return {
    root,
    dataDirectory,
    appStateFile: path.join(dataDirectory, "dashboard-appstate.enc"),
    controlFile: path.join(dataDirectory, "dashboard-control.json"),
    statusFile: path.join(dataDirectory, "dashboard-status.json"),
    eventsFile: path.join(dataDirectory, "dashboard-events.json"),
  };
}

function getEncryptionKey(secret) {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
  }
  return crypto.createHash("sha256").update(secret, "utf8").digest();
}

function encryptAppState(appState, secret) {
  if (!Array.isArray(appState) || appState.length === 0) {
    throw new Error("A non-empty Messenger appstate array is required.");
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(secret), iv);
  cipher.setAAD(SESSION_CONTEXT);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(appState), "utf8"),
    cipher.final(),
  ]);
  return JSON.stringify({
    version: ENVELOPE_VERSION,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: encrypted.toString("base64"),
  });
}

function decryptAppState(envelopeText, secret) {
  const envelope = typeof envelopeText === "string" ? JSON.parse(envelopeText) : envelopeText;
  if (
    !envelope ||
    envelope.version !== ENVELOPE_VERSION ||
    typeof envelope.iv !== "string" ||
    typeof envelope.tag !== "string" ||
    typeof envelope.ciphertext !== "string"
  ) {
    throw new Error("Invalid encrypted Messenger session envelope.");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(secret),
    Buffer.from(envelope.iv, "base64"),
  );
  decipher.setAAD(SESSION_CONTEXT);
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
  const appState = JSON.parse(plaintext);
  if (!Array.isArray(appState) || appState.length === 0) {
    throw new Error("Decrypted Messenger session is invalid.");
  }
  return appState;
}

function writeTextAtomic(filePath, text, mode = 0o600) {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const temporaryPath = `${filePath}.${process.pid}.${crypto.randomBytes(8).toString("hex")}.tmp`;
  let fileDescriptor;
  try {
    fileDescriptor = fs.openSync(temporaryPath, "wx", mode);
    fs.writeFileSync(fileDescriptor, text, "utf8");
    fs.fsyncSync(fileDescriptor);
    fs.closeSync(fileDescriptor);
    fileDescriptor = undefined;
    fs.renameSync(temporaryPath, filePath);
    fs.chmodSync(filePath, mode);
  } catch (error) {
    if (fileDescriptor !== undefined) fs.closeSync(fileDescriptor);
    try {
      fs.unlinkSync(temporaryPath);
    } catch {}
    throw error;
  }
}

function writeJsonAtomic(filePath, value, mode = 0o600) {
  writeTextAtomic(filePath, JSON.stringify(value), mode);
}

function readJsonFile(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    if (error && error.code === "ENOENT") return fallback;
    throw error;
  }
}

function writeEncryptedAppState(filePath, appState, secret) {
  writeTextAtomic(filePath, encryptAppState(appState, secret));
}

function readEncryptedAppState(filePath, secret) {
  return decryptAppState(fs.readFileSync(filePath, "utf8"), secret);
}

module.exports = {
  decryptAppState,
  encryptAppState,
  getPaths,
  readEncryptedAppState,
  readJsonFile,
  writeEncryptedAppState,
  writeJsonAtomic,
};
