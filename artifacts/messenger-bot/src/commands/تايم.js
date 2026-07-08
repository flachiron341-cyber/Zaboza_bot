const state = require("../state");

module.exports = {
  config: {
    name: "تايم",
    aliases: ["time", "وقت"],
    description: "يضبط التأخير بين رسائل الاتاك (من 1ث إلى 540ث)",
    usage: "!تايم [ثواني]",
    cooldown: 3,
    adminOnly: false,
  },

  async run({ api, event, args }) {
    const { threadID } = event;

    if (!args[0] || isNaN(args[0])) {
      const cur = (state.attackDelay.get(threadID) || 5000) / 1000;
      return api.sendMessage(
        `⏱ التأخير الحالي للاتاك: ${cur}ث\n\nللتغيير: !تايم [ثواني]\nالنطاق المسموح: 1ث – 540ث (9 دقائق)`,
        threadID
      );
    }

    let seconds = parseFloat(args[0]);
    if (seconds < 1) seconds = 1;
    if (seconds > 540) seconds = 540;

    const ms = Math.round(seconds * 1000);
    state.attackDelay.set(threadID, ms);

    const display = seconds >= 60
      ? `${Math.floor(seconds / 60)} دقيقة${seconds % 60 ? " و" + (seconds % 60) + " ثانية" : ""}`
      : `${seconds} ثانية`;

    api.sendMessage(`✅ تم ضبط تأخير الاتاك على: ${display}`, threadID);
  },
};
