const { leaveGroup } = require("../utils/leaveGroup");

module.exports = {
  config: {
    name: "مغادرة",
    aliases: ["leave"],
    description: "يخرج البوت من القروب",
    usage: "!مغادرة",
    cooldown: 10,
    adminOnly: true,
  },

  async run({ api, event, botID }) {
    const threadID = String(event.threadID);
    try {
      await leaveGroup(api, threadID, botID);
    } catch (error) {
      await api.sendMessage(`❌ تعذر خروج البوت: ${error?.message || error}`, threadID);
    }
  },
};