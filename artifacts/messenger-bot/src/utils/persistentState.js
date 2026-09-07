"use strict";

const fs = require("fs");
const path = require("path");

const statePath = path.join(__dirname, "../data/bot-state.json");

function readState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(statePath, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

let data = readState();

function writeState() {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(data, null, 2), "utf8");
}

function getNicknameProtections() {
  return data.nicknameProtections && typeof data.nicknameProtections === "object"
    ? data.nicknameProtections
    : {};
}

function saveNicknameProtection(threadID, nicknames) {
  data.nicknameProtections = getNicknameProtections();
  data.nicknameProtections[String(threadID)] = {
    nicknames: Object.fromEntries(
      [...nicknames.entries()].map(([uid, nickname]) => [String(uid), nickname ?? ""])
    ),
  };
  writeState();
}

function removeNicknameProtection(threadID) {
  data.nicknameProtections = getNicknameProtections();
  delete data.nicknameProtections[String(threadID)];
  writeState();
}

function getAttackDelays() {
  return data.attackDelays && typeof data.attackDelays === "object"
    ? data.attackDelays
    : {};
}

function saveAttackDelay(threadID, delay) {
  data.attackDelays = getAttackDelays();
  data.attackDelays[String(threadID)] = {
    min: Number(delay.min),
    max: Number(delay.max),
  };
  writeState();
}

function getGroupProtections() {
  return data.groupProtections && typeof data.groupProtections === "object"
    ? data.groupProtections
    : {};
}

function saveGroupProtection(threadID, protection) {
  data.groupProtections = getGroupProtections();
  data.groupProtections[String(threadID)] = {
    name: String(protection.name || ""),
    nicknames: Object.fromEntries(
      [...(protection.nicknames || new Map()).entries()]
        .map(([uid, nickname]) => [String(uid), nickname ?? ""])
    ),
  };
  writeState();
}

function removeGroupProtection(threadID) {
  data.groupProtections = getGroupProtections();
  delete data.groupProtections[String(threadID)];
  writeState();
}

function getCreatedGroups() {
  return data.createdGroups && typeof data.createdGroups === "object"
    ? data.createdGroups
    : {};
}

function getCreatedGroup(key) {
  return getCreatedGroups()[String(key)] || null;
}

function saveCreatedGroup(key, threadID) {
  data.createdGroups = getCreatedGroups();
  data.createdGroups[String(key)] = String(threadID);
  writeState();
}

module.exports = {
  readState,
  saveNicknameProtection,
  removeNicknameProtection,
  getAttackDelays,
  saveAttackDelay,
  getGroupProtections,
  saveGroupProtection,
  removeGroupProtection,
  getCreatedGroup,
  saveCreatedGroup,
};