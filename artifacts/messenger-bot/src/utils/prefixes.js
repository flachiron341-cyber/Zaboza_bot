"use strict";

const DEFAULT_PREFIXES = ["!", "/", ".", "#"];

function getPrefixes(config = {}) {
  const configured = [
    config.prefix,
    ...(Array.isArray(config.prefixes) ? config.prefixes : []),
    ...DEFAULT_PREFIXES,
  ];
  return [...new Set(configured.map((item) => String(item || "").trim()).filter(Boolean))]
    .sort((left, right) => right.length - left.length);
}

function parseCommand(body, config) {
  const text = String(body || "").trim();
  const prefix = getPrefixes(config).find((candidate) => text.startsWith(candidate));
  if (!prefix) return null;

  const parts = text.slice(prefix.length).trim().split(/\s+/).filter(Boolean);
  const name = String(parts.shift() || "").toLowerCase();
  return name ? { prefix, name, args: parts } : null;
}

module.exports = { DEFAULT_PREFIXES, getPrefixes, parseCommand };