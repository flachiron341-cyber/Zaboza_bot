module.exports = {
  config: {
    name: "ping",
    aliases: ["بينغ"],
    description: "يقيس سرعة استجابة البوت",
    usage: "!ping",
    cooldown: 3,
    adminOnly: false,
  },

  async run({ api, event }) {
    const start = Date.now();
    api.sendMessage("🏓 جاري القياس...", event.threadID, () => {
      const ping = Date.now() - start;
      api.sendMessage(`🏓 بينغ: ${ping}ms`, event.threadID);
    });
  },
};
