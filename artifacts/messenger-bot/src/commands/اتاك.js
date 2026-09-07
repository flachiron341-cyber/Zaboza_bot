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
    const threadID = String(event.threadID);

    // ── إيقاف الاتاك ──
    if (args[0] === "ايقاف" || args[0] === "stop") {
      const current = state.attackState.get(threadID);
      if (!current || !current.active) {
        return api.sendMessage("⚠️ لا يوجد اتاك نشط حالياً.", threadID);
      }
      if (current.timeout) clearTimeout(current.timeout);
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
    const configured = state.attackDelay.get(threadID) || { min: 5, max: 5 };
    const min = Number(configured.min);
    const max = Number(configured.max);

    await api.sendMessage(
      `✅ بدأ الاتاك!\n📨 الرسالة: "${message}"\n` +
      `⏱ كل ${min === max ? `${min} ثانية` : `مدة عشوائية بين ${min} و${max} ثانية`}\n\n` +
      `🛑 لإيقافه: !اتاك ايقاف`,
      threadID
    );

    const randomDelay = () => {
      const seconds = min === max
        ? min
        : Math.floor(Math.random() * (max - min + 1)) + min;
      return seconds * 1000;
    };

    const scheduleNext = () => {
      const s = state.attackState.get(threadID);
      if (!s || !s.active) {
        return;
      }

      s.timeout = setTimeout(async () => {
        const current = state.attackState.get(threadID);
        if (!current || !current.active) return;

        try {
          await api.sendMessage(message, threadID);
        } catch {}

        // يتم اختيار مدة جديدة بعد كل رسالة.
        scheduleNext();
      }, randomDelay());
    };

    state.attackState.set(threadID, {
      active: true,
      timeout: null,
      message,
      min,
      max,
    });
    scheduleNext();
  },
};
