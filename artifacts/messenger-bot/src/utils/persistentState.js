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
  };
  writeState();
}

function removeGroupProtection(threadID) {
  data.groupProtections = getGroupProtections();
  delete data.groupProtections[String(threadID)];
  writeState();
}

function getNameProtections() {
  return data.nameProtections && typeof data.nameProtections === "object"
    ? data.nameProtections
    : {};
}

function saveNameProtection(threadID, name) {
  data.nameProtections = getNameProtections();
  data.nameProtections[String(threadID)] = String(name || "");
  writeState();
}

function removeNameProtection(threadID) {
  data.nameProtections = getNameProtections();
  delete data.nameProtections[String(threadID)];
  writeState();
}

function getCreatedGroups() {
  return data.createdGroups && typeof data.createdGroups === "object"
    ? data.createdGroups
    : {};
}

function getGroupEventImages() {
  return data.groupEventImages && typeof data.groupEventImages === "object"
    ? data.groupEventImages
    : {};
}

function getGroupEventImage(threadID, slot) {
  return String(getGroupEventImages()[String(threadID)]?.[String(slot)] || "");
}

function saveGroupEventImage(threadID, slot, filename) {
  const id = String(threadID);
  const images = getGroupEventImages();
  images[id] = { ...(images[id] || {}), [String(slot)]: String(filename) };
  data.groupEventImages = images;
  writeState();
}

function getGroupEventImagesEnabled() {
  return data.groupEventImagesEnabled && typeof data.groupEventImagesEnabled === "object"
    ? data.groupEventImagesEnabled
    : {};
}

function saveGroupEventImagesEnabled(threadID, enabled) {
  data.groupEventImagesEnabled = getGroupEventImagesEnabled();
  data.groupEventImagesEnabled[String(threadID)] = Boolean(enabled);
  writeState();
}

function getCommandPrefixSettings() {
  const saved = data.commandPrefixSettings && typeof data.commandPrefixSettings === "object"
    ? data.commandPrefixSettings
    : {};
  return {
    primary: String(saved.primary || ""),
    prefixes: Array.isArray(saved.prefixes) ? saved.prefixes.map(String) : [],
  };
}

function saveCommandPrefixSettings(settings) {
  const prefixes = [...new Set((settings?.prefixes || []).map((prefix) => String(prefix).trim()).filter(Boolean))];
  data.commandPrefixSettings = {
    primary: String(settings?.primary || prefixes[0] || ""),
    prefixes,
  };
  writeState();
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
  getAttackDelays,
  saveAttackDelay,
  getGroupProtections,
  saveGroupProtection,
  removeGroupProtection,
  getNameProtections,
  saveNameProtection,
  removeNameProtection,
  getGroupEventImage,
  saveGroupEventImage,
  getGroupEventImagesEnabled,
  saveGroupEventImagesEnabled,
  getCommandPrefixSettings,
  saveCommandPrefixSettings,
  getCreatedGroup,
  saveCreatedGroup,
};