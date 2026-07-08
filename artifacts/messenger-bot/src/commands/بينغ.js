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
    const start = Date.now();
    api.sendMessage("🏓 جاري القياس...", event.threadID, () => {
      const ping = Date.now() - start;
      api.sendMessage(`🏓 البينغ: ${ping}ms`, event.threadID);
    });
  },
};
