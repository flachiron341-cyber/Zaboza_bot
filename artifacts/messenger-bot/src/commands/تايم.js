const state = require("../state");

module.exports = {
  config: {
    name: "تايم",
    aliases: ["time", "وقت"],
    description: "يضبط تأخير الاتاك ثابتاً أو كنطاق عشوائي",
    usage: "!تايم [ثواني] أو !تايم [من_إلى]",
    cooldown: 3,
    adminOnly: false,
  },

  async run({ api, event, args }) {
    const { threadID } = event;

    const value = args[0];
    if (!value) {
      const current = state.attackDelay.get(threadID) || { min: 5, max: 5 };
      const display = current.min === current.max
        ? `${current.min} ثانية`
        : `${current.min}_${current.max} ثانية`;
      return api.sendMessage(
        `⏱ التأخير الحالي للاتاك: ${display}\n\n` +
        `للتغيير الثابت: !تايم 20\n` +
        `للتغيير العشوائي: !تايم 15_30\n` +
        `النطاق المسموح: 1 إلى 540 ثانية`,
        threadID
      );
    }

    const parts = value.split("_");
    if (
      parts.length > 2 ||
      parts.some((part) => part === "" || !/^\d+(?:\.\d+)?$/.test(part))
    ) {
      return api.sendMessage(
        "❌ الصيغة غير صحيحة.\nاستخدم: !تايم 20 أو !تايم 15_30",
        threadID
      );
    }

    let min = Number(parts[0]);
    let max = Number(parts[1] ?? parts[0]);

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return api.sendMessage("❌ اكتب أرقاماً صحيحة للوقت.", threadID);
    }

    // يسمح بكتابة 30_15 أيضاً ويحوّلها تلقائياً إلى 15_30.
    if (min > max) [min, max] = [max, min];
    min = Math.max(1, Math.min(540, min));
    max = Math.max(1, Math.min(540, max));

    state.attackDelay.set(threadID, { min, max });
    state.persistAttackDelay(threadID);

    const display = min === max ? `${min} ثانية` : `${min}_${max} ثانية`;
    await api.sendMessage(`✅ تم ضبط تأخير الاتاك على: ${display}`, threadID);
  },
};
