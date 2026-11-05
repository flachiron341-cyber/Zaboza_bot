"use strict";

function normalizeCommandName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي");
}

function getUniqueCommands(commands) {
  return [...new Set(commands instanceof Map ? commands.values() : [])]
    .filter((command) => command?.config?.name);
}

function getCanonicalCommandName(command) {
  return normalizeCommandName(command?.config?.name);
}

function findCommand(commands, name) {
  const target = normalizeCommandName(name);
  if (!target) return null;

  return getUniqueCommands(commands).find((command) => {
    if (getCanonicalCommandName(command) === target) return true;
    return Array.isArray(command.config.aliases) &&
      command.config.aliases.some((alias) => normalizeCommandName(alias) === target);
  }) || null;
}

function parseCommandNames(raw, commands) {
  return String(raw || "")
    .split(/[,\u060C]+/)
    .map((group) => group.trim())
    .filter(Boolean)
    .flatMap((group) => findCommand(commands, group) ? [group] : group.split(/\s+/).filter(Boolean));
}

function isProtectedCommand(command) {
  return command?.config?.alwaysEnabled === true;
}

function isCommandEnabled(command, disabledCommands) {
  if (!command?.config?.name || isProtectedCommand(command)) return true;
  return !disabledCommands?.has(getCanonicalCommandName(command));
}

module.exports = {
  findCommand,
  getCanonicalCommandName,
  getUniqueCommands,
  isCommandEnabled,
  isProtectedCommand,
  normalizeCommandName,
  parseCommandNames,
};
