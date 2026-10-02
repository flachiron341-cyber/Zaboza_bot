"use strict";

const fs = require("fs");
const path = require("path");
const config = require("../../config.json");

const developersPath = path.join(__dirname, "../data/developers.txt");
const rootDeveloperID = String(config.rootDeveloperID || config.adminUIDs?.[0] || "61594304253023");

function getDeveloperIDs() {
  let savedIDs = [];
  try {
    savedIDs = fs.readFileSync(developersPath, "utf8")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => /^\d{5,}$/.test(id));
  } catch {
    savedIDs = [];
  }
  return [...new Set([rootDeveloperID, ...savedIDs])];
}

function isDeveloper(userID) {
  return getDeveloperIDs().includes(String(userID || ""));
}

function isRootDeveloper(userID) {
  return String(userID || "") === rootDeveloperID;
}

function saveDeveloperIDs(ids) {
  const normalized = [...new Set(ids.map((id) => String(id).trim()).filter((id) => /^\d{5,}$/.test(id)))];
  if (!normalized.includes(rootDeveloperID)) normalized.unshift(rootDeveloperID);
  fs.mkdirSync(path.dirname(developersPath), { recursive: true });
  fs.writeFileSync(developersPath, normalized.join(","), "utf8");
  return normalized;
}

function addDeveloper(userID) {
  const id = String(userID || "").trim();
  if (!/^\d{5,}$/.test(id)) return { ok: false, reason: "invalid" };
  const ids = getDeveloperIDs();
  if (ids.includes(id)) return { ok: false, reason: "exists" };
  saveDeveloperIDs([...ids, id]);
  return { ok: true };
}

function removeDeveloper(userID) {
  const id = String(userID || "").trim();
  if (!/^\d{5,}$/.test(id)) return { ok: false, reason: "invalid" };
  if (isRootDeveloper(id)) return { ok: false, reason: "root" };
  const ids = getDeveloperIDs();
  if (!ids.includes(id)) return { ok: false, reason: "missing" };
  saveDeveloperIDs(ids.filter((savedID) => savedID !== id));
  return { ok: true };
}

module.exports = {
  getDeveloperIDs,
  isDeveloper,
  isRootDeveloper,
  addDeveloper,
  removeDeveloper,
};