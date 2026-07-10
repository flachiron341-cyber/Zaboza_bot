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
    await api.sendMessage("🏓 جاري القياس...", threadID);
    const ms = Date.now() - start;
    await api.sendMessage(`🏓 بونغ!\n⚡ الاستجابة: ${ms}ms`, threadID);
  },
};
