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
    const selfID = String(botID || api.getCurrentUserID());
    await api.sendMessage(
      "تهلاو مقدرناش مع لقحااب دزبـبي هذو نكماتهم🤮🖕🏿🤓🍆⛩️",
      threadID
    );
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      const result = await api.gcmember("remove", selfID, threadID);
      if (result?.type === "error_gc") {
        return api.sendMessage(`❌ تعذر خروج البوت: ${result.error}`, threadID);
      }
    } catch (error) {
      return api.sendMessage(`❌ تعذر خروج البوت: ${error.message}`, threadID);
    }
  },
};