"use strict";

const persistentState = require("./persistentState");

const DEFAULT_PREFIXES = ["!", "/", ".", "#"];

function getPrefixes(config = {}) {
  const saved = persistentState.getCommandPrefixSettings();
  const configured = [
    saved.primary,
    config.prefix,
    ...saved.prefixes,
    ...(Array.isArray(config.prefixes) ? config.prefixes : []),
    ...DEFAULT_PREFIXES,
  ];
  return [...new Set(configured.map((item) => String(item || "").trim()).filter(Boolean))]
    .sort((left, right) => right.length - left.length);
}

function applySavedPrefixes(config = {}) {
  const saved = persistentState.getCommandPrefixSettings();
  if (saved.primary) config.prefix = saved.primary;
  if (saved.prefixes.length) config.prefixes = saved.prefixes;
  return config;
}

function parseCommand(body, config) {
  const text = String(body || "").trim();
  const prefix = getPrefixes(config).find((candidate) => text.startsWith(candidate));
  if (!prefix) return null;

  const parts = text.slice(prefix.length).trim().split(/\s+/).filter(Boolean);
  const name = String(parts.shift() || "").toLowerCase();
  return name ? { prefix, name, args: parts } : null;
}

module.exports = { DEFAULT_PREFIXES, getPrefixes, applySavedPrefixes, parseCommand };