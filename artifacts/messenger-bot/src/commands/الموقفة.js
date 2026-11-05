"use strict";

const state = require("../state");
const { getUniqueCommands, getCanonicalCommandName } = require("../utils/commandManagement");

module.exports = {
  config: {
    name: "الموقفة",
    aliases: ["موقفة", "disabled"],
    description: "يعرض الأوامر المتوقفة مؤقتاً",
    usage: "!الموقفة",
    cooldown: 3,
    adminOnly: true,
    alwaysEnabled: true,
  },

  async run({ api, event, commands }) {
    const threadID = String(event.threadID);
    const stopped = getUniqueCommands(commands).filter((command) =>
      state.disabledCommands.has(getCanonicalCommandName(command))
    );
    if (!stopped.length) {
      return api.sendMessage("لا توجد أوامر متوقفة حالياً.", threadID);
    }

    const names = stopped.map((command) => command.config.name);
    const shown = names.slice(0, 40).join("، ");
    const more = names.length > 40 ? `\n… ويوجد ${names.length - 40} أمر آخر.` : "";
    return api.sendMessage(
      `⏸️ الأوامر المتوقفة (${names.length}):\n${shown}${more}\n\nلتشغيل أمر: !تشغيل اسم_الأمر`,
      threadID,
    );
  },
};
