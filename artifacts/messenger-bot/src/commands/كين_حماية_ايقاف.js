const state = require("../state");

module.exports = {
  config: {
    name: "كين_حماية_ايقاف",
    aliases: ["nickname_protect_off"],
    description: "يوقف حماية كنيات الأعضاء",
    usage: "!كين_حماية_ايقاف",
    cooldown: 5,
    adminOnly: false,
  },

  async run({ api, event }) {
    const threadID = String(event.threadID);
    if (!state.nicknameProtectionState.has(threadID)) {
      return api.sendMessage("⚠️ حماية الكنيات غير مفعّلة.", threadID);
    }

    state.removeNicknameProtection(threadID);
    return api.sendMessage("🔓 تم إيقاف حماية الكنيات.", threadID);
  },
};