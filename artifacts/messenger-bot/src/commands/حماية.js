const state = require("../state");

module.exports = {
  config: {
    name: "حماية",
    aliases: ["protect", "guard"],
    description: "يحمي اسم القروب والكنيات من التغيير | !حماية ايقاف لإيقافها",
    usage: "!حماية | !حماية ايقاف",
    cooldown: 5,
    adminOnly: false,
  },

  async run({ api, event, args }) {
    const threadID = String(event.threadID);

    // ── إيقاف الحماية ──
    if (args[0] === "ايقاف" || args[0] === "off") {
      if (!state.protectionState.get(threadID)?.active) {
        return api.sendMessage("⚠️ الحماية غير مفعّلة أصلاً.", threadID);
      }
      state.protectionState.delete(threadID);
      return api.sendMessage("🔓 تم إيقاف الحماية.", threadID);
    }

    // ── تفعيل الحماية ──
    await api.sendMessage("⏳ جاري تفعيل الحماية...", threadID);

    const info = await new Promise((resolve) => {
      api.getThreadInfo(threadID, (err, data) => resolve(err ? null : data));
    });

    if (!info) {
      return api.sendMessage("❌ فشل الحصول على معلومات القروب.", threadID);
    }

    const currentName = info.threadName || "";
    const nicknames   = new Map();

    const customization = info.nicknames || {};
    for (const [uid, nick] of Object.entries(customization)) {
      if (nick) nicknames.set(String(uid), nick);
    }

    state.protectionState.set(threadID, {
      active: true,
      name:   currentName,
      nicknames,
    });

    await api.sendMessage(
      [
        `🛡️ تم تفعيل الحماية!`,
        ``,
        `📛 الاسم المحمي: "${currentName}"`,
        `👥 الكنيات المحفوظة: ${nicknames.size}`,
        ``,
        `للإيقاف: !حماية ايقاف`,
      ].join("\n"),
      threadID
    );
  },
};
