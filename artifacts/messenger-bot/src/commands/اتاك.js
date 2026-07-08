const state = require("../state");

module.exports = {
  config: {
    name: "اتاك",
    aliases: ["attack", "سبام"],
    description: "يرسل رسالة بشكل متكرر حتى كتابة !اتاك ايقاف",
    usage: "!اتاك [الرسالة] | !اتاك ايقاف",
    cooldown: 5,
    adminOnly: false,
  },

  async run({ api, event, args }) {
    const { threadID } = event;

    // ── إيقاف الاتاك ──
    if (args[0] === "ايقاف" || args[0] === "stop") {
      const current = state.attackState.get(threadID);
      if (!current || !current.active) {
        return api.sendMessage("⚠️ لا يوجد اتاك نشط حالياً.", threadID);
      }
      clearInterval(current.interval);
      state.attackState.delete(threadID);
      return api.sendMessage("✅ تم إيقاف الاتاك.", threadID);
    }

    // ── منع التشغيل المتزامن ──
    if (state.attackState.has(threadID)) {
      return api.sendMessage(
        "⚠️ الاتاك شغّال بالفعل! أوقفه أولاً بـ !اتاك ايقاف",
        threadID
      );
    }

    if (!args.length) {
      return api.sendMessage(
        "❌ اكتب الرسالة التي تريد ترسلها!\nمثال: !اتاك مرحبا يا جماعة",
        threadID
      );
    }

    const message = args.join(" ");
    const delay = state.attackDelay.get(threadID) || 5000; // افتراضي 5 ثواني

    api.sendMessage(
      `✅ بدأ الاتاك!\n📨 الرسالة: "${message}"\n⏱ كل ${delay / 1000} ثانية\n\n🛑 لإيقافه: !اتاك ايقاف`,
      threadID
    );

    const interval = setInterval(() => {
      const s = state.attackState.get(threadID);
      if (!s || !s.active) {
        clearInterval(interval);
        return;
      }
      api.sendMessage(message, threadID);
    }, delay);

    state.attackState.set(threadID, { active: true, interval, message });
  },
};
