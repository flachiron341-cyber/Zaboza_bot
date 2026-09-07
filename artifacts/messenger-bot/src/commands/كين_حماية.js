const state = require("../state");

module.exports = {
  config: {
    name: "كين_حماية",
    aliases: ["nickname_protect"],
    description: "يحمي كنيات أعضاء القروب من التغيير",
    usage: "!كين_حماية",
    cooldown: 5,
    adminOnly: false,
  },

  async run({ api, event }) {
    const threadID = String(event.threadID);
    const info = await new Promise((resolve) => {
      api.getThreadInfo(threadID, (err, data) => resolve(err ? null : data));
    });

    if (!info) return api.sendMessage("❌ فشل الحصول على معلومات القروب.", threadID);

    const nicknames = new Map();
    for (const uid of (info.participantIDs || []).map(String)) {
      nicknames.set(uid, String(info.nicknames?.[uid] || ""));
    }

    state.nicknameProtectionState.set(threadID, { active: true, nicknames });
    state.persistNicknameProtection(threadID);

    return api.sendMessage(
      `🛡️ تم تفعيل حماية كنيات جميع الأعضاء.\n` +
      `👥 تم حفظ كنيات ${nicknames.size} عضواً.\n` +
      `📌 لإيقافها: !كين_حماية_ايقاف`,
      threadID
    );
  },
};