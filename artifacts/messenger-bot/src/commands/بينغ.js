const { info } = require("../utils/brand");

module.exports = {
  config: {
    name: "بينغ",
    aliases: ["ping"],
    description: "يقيس سرعة استجابة البوت",
    usage: "!بينغ",
    cooldown: 3,
    adminOnly: false,
  },

  async run({ api, event }) {
    const threadID = String(event.threadID);
    const start = Date.now();
    await api.sendMessage(info("قياس الاستجابة", ["جاري القياس..."]), threadID);
    const ms = Date.now() - start;
    await api.sendMessage(info("الاستجابة", [`الزمن: ${ms}ms`]), threadID);
  },
};
