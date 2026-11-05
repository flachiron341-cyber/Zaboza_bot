"use strict";

const state = require("../state");
const {
  findCommand,
  getCanonicalCommandName,
  getUniqueCommands,
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
    name: "تشغيل",
    aliases: ["تفعيل", "enable"],
    description: "إعادة تشغيل أمر أو عدة أوامر متوقفة",
    usage: "!تشغيل قبلة زواج | !تشغيل الكل",
    cooldown: 3,
    adminOnly: true,
    alwaysEnabled: true,
  },

  async run({ api, event, args, commands }) {
    const threadID = String(event.threadID);
    const raw = args.join(" ").trim();
    if (!raw) {
      return api.sendMessage(
        "استخدم: !تشغيل قبلة زواج\nأو !تشغيل الكل لإعادة تشغيل كل الأوامر المتوقفة.",
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

    if (requested.length === 1 && normalizeCommandName(requested[0]) === "الكل") {
      selected.push(...unique.filter((command) =>
        state.disabledCommands.has(getCanonicalCommandName(command))
      ));
    } else {
      for (const name of requested) {
        const command = findCommand(commands, name);
        if (!command) {
          unknown.push(name);
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
    const changed = state.setCommandsEnabled(canonicalNames, true);
    const lines = [];
    if (selected.length) {
      lines.push(`▶️ تم تشغيل ${selected.length} أمر: ${formatNames(selected)}`);
      if (!changed) lines.push("كانت هذه الأوامر تعمل بالفعل.");
    } else {
      lines.push("لا توجد أوامر متوقفة ضمن الأسماء التي أدخلتها.");
    }
    if (unknown.length) lines.push(`أوامر غير معروفة: ${unknown.join("، ")}`);
    return api.sendMessage(lines.join("\n"), threadID);
  },
};
