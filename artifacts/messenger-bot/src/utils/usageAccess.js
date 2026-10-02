"use strict";

const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../data/usage.json");
const usageState = new Map();

function normalizeRecord(record) {
  const mode = ["developer", "users"].includes(record?.mode)
    ? record.mode
    : "developer";

  return {
    mode,
    users: new Set((Array.isArray(record?.users) ? record.users : []).map(String)),
  };
}

function load() {
  try {
    if (!fs.existsSync(filePath)) return;
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    for (const [threadID, record] of Object.entries(data)) {
      usageState.set(String(threadID), normalizeRecord(record));
    }
  } catch {
    // الوصول الافتراضي مقفل للمطورين فقط.
  }
}

function save() {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const data = {};
    for (const [threadID, record] of usageState) {
      data[threadID] = {
        mode: record.mode,
        users: [...record.users],
      };
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch {
    // لا نوقف البوت إذا تعذّر حفظ إعداد صلاحيات قروب واحد.
  }
}

function get(threadID) {
  const id = String(threadID);
  if (!usageState.has(id)) {
    usageState.set(id, { mode: "developer", users: new Set() });
  }
  return usageState.get(id);
}

function setMode(threadID, mode) {
  if (!["developer", "users"].includes(mode)) {
    throw new Error("وضع الوصول يجب أن يكون developer أو users.");
  }
  const id = String(threadID);
  const record = get(id);
  record.mode = mode;
  if (mode !== "users") record.users.clear();
  save();
  return record;
}

function grantUser(threadID, userID) {
  const record = get(threadID);
  if (record.mode !== "users") {
    record.mode = "users";
    record.users.clear();
  }
  record.users.add(String(userID));
  save();
  return record;
}

function revokeUser(threadID, userID) {
  const record = get(threadID);
  const removed = record.users.delete(String(userID));
  if (record.mode === "users" && record.users.size === 0) record.mode = "developer";
  save();
  return removed;
}

function isAllowed(threadID, senderID, developerIDs = []) {
  const record = get(threadID);
  const sender = String(senderID);
  const developers = Array.isArray(developerIDs) ? developerIDs.map(String) : [String(developerIDs)];

  // المطورون يحتفظون دائماً بصلاحية التحكم والاستخدام.
  if (developers.includes(sender)) return true;
  if (record.mode === "developer") return false;
  return record.users.has(sender);
}

function describe(threadID) {
  const record = get(threadID);
  if (record.mode === "developer") return "المطور فقط";
  if (record.mode === "users") return `المطور والأعضاء المسموح لهم (${record.users.size})`;
  return "المطورون فقط";
}

load();

module.exports = {
  get,
  setMode,
  grantUser,
  revokeUser,
  isAllowed,
  describe,
};