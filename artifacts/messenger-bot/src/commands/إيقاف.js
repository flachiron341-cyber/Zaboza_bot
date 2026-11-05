"use strict";

const state = require("../state");
const {
  findCommand,
  getCanonicalCommandName,
  getUniqueCommands,
  isProtectedCommand,
  normalizeCommandName,
  parseCommandNames,
} = require("../utils/commandManagement");

function formatNames(commands, limit = 18) {
  const names = commands.map((command) => command.config.name);
  const shown = names.slice(0, limit).join("، ");
  return names.length > limit ? `${shown} … (+${names.length - limit})` : shown;
}

module.exports = {
  config: {
    name: "إيقاف",
    aliases: ["ايقاف", "تعطيل", "disable"],
    description: "إيقاف أمر أو عدة أوامر مؤقتاً",
    usage: "!إيقاف قبلة زواج | !إيقاف الكل",
    cooldown: 3,
    adminOnly: true,
    alwaysEnabled: true,
  },

  async run({ api, event, args, commands }) {
    const threadID = String(event.threadID);
    const raw = args.join(" ").trim();
    if (!raw) {
      return api.sendMessage(
        "استخدم: !إيقاف قبلة زواج\nأو !إيقاف الكل لإيقاف كل الأوامر القابلة للإيقاف.",
        threadID,
      );
    }

    const requested = parseCommandNames(raw, commands);
    if (requested.some((name) => normalizeCommandName(name) === "الكل") && requested.length > 1) {
      return api.sendMessage("اكتب «الكل» وحدها أو اكتب أسماء الأوامر.", threadID);
    }

    const unique = getUniqueCommands(commands);
    const selected = [];
    const selectedNames = new Set();
    const unknown = [];
    const protectedNames = [];

    if (requested.length === 1 && normalizeCommandName(requested[0]) === "الكل") {
      selected.push(...unique.filter((command) => !isProtectedCommand(command)));
    } else {
      for (const name of requested) {
        const command = findCommand(commands, name);
        if (!command) {
          unknown.push(name);
          continue;
        }
        if (isProtectedCommand(command)) {
          protectedNames.push(command.config.name);
          continue;
        }
        const canonical = getCanonicalCommandName(command);
        if (!selectedNames.has(canonical)) {
          selectedNames.add(canonical);
          selected.push(command);
        }
      }
    }

    const canonicalNames = selected.map(getCanonicalCommandName);
    const changed = state.setCommandsEnabled(canonicalNames, false);
    const cleanupFailures = [];
    for (const command of selected) {
      if (typeof command.onDisable !== "function") continue;
      try {
        await command.onDisable({ api, event, commands });
      } catch {
        cleanupFailures.push(command.config.name);
      }
    }
    const lines = [];
    if (selected.length) {
      lines.push(`⏸️ تم إيقاف ${selected.length} أمر مؤقتاً: ${formatNames(selected)}`);
      if (!changed) lines.push("كانت هذه الأوامر متوقفة بالفعل.");
    } else {
      lines.push("لم يتم إيقاف أي أمر.");
    }
    if (protectedNames.length) {
      lines.push(`لا يمكن إيقاف أوامر الإدارة: ${[...new Set(protectedNames)].join("، ")}`);
    }
    if (cleanupFailures.length) {
      lines.push(`تعذر إيقاف النشاط الجاري لهذه الأوامر: ${[...new Set(cleanupFailures)].join("، ")}`);
    }
    if (unknown.length) {
      lines.push(`أوامر غير معروفة: ${unknown.join("، ")}`);
    }
    lines.push("لعرض القائمة: !الموقفة");
    return api.sendMessage(lines.join("\n"), threadID);
  },
};
