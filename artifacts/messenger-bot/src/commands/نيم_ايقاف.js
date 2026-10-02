const state = require("../state");

module.exports = {
  config: {
    name: "نيم_ايقاف",
    aliases: ["nameprotectoff"],
    description: "إيقاف حماية اسم القروب",
    usage: "!نيم_ايقاف",
    cooldown: 3,
    adminOnly: true,
  },

  async run({ api, event }) {
    const threadID = String(event.threadID);
    const wasProtected =
      state.nameProtectionState.has(threadID) ||
      state.protectionState.has(threadID);
    state.removeNameProtection(threadID);
    state.removeGroupProtection(threadID);
    return api.sendMessage(
      wasProtected ? "🔓 تم إيقاف حماية اسم القروب." : "ℹ️ حماية الاسم غير مفعّلة.",
      threadID
    );
  },
};