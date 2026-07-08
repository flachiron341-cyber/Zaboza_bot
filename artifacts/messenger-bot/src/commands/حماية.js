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
    const { threadID } = event;

    // ── إيقاف الحماية ──
    if (args[0] === "ايقاف" || args[0] === "off") {
      if (!state.protectionState.get(threadID)?.active) {
        return api.sendMessage("⚠️ الحماية غير مفعّلة أصلاً.", threadID);
      }
      state.protectionState.delete(threadID);
      return api.sendMessage("🔓 تم إيقاف الحماية.", threadID);
    }

    // ── تفعيل الحماية ──
    api.sendMessage("⏳ جاري تفعيل الحماية وحفظ البيانات الحالية...", threadID);

    api.getThreadInfo(threadID, (err, info) => {
      if (err || !info) {
        return api.sendMessage("❌ فشل الحصول على معلومات القروب.", threadID);
      }

      const currentName = info.threadName || "";
      const nicknames = new Map();

      // حفظ كنيات الأعضاء الحالية
      const customization = info.nicknames || {};
      for (const [uid, nick] of Object.entries(customization)) {
        if (nick) nicknames.set(uid, nick);
      }

      state.protectionState.set(threadID, {
        active: true,
        name: currentName,
        nicknames,
      });

      api.sendMessage(
        [
          `🛡️ تم تفعيل الحماية!`,
          ``,
          `📛 الاسم المحمي: "${currentName}"`,
          `👥 الكنيات المحفوظة: ${nicknames.size}`,
          ``,
          `أي تغيير في الاسم أو الكنيات سيُعاد تلقائياً.`,
          `لإيقاف الحماية: !حماية ايقاف`,
        ].join("\n"),
        threadID
      );
    });
  },
};
