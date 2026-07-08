module.exports = {
  config: {
    name: "uid",
    aliases: ["id", "myid"],
    description: "يعرض ID الخاص بك أو بالشخص المُشار إليه",
    usage: "!uid (أو رُدّ على رسالة شخص)",
    cooldown: 3,
    adminOnly: false,
  },

  async run({ api, event, messageReply }) {
    const { threadID, senderID } = event;

    if (messageReply) {
      const targetID = messageReply.senderID;
      return api.sendMessage(
        `🆔 ID المُشار إليه: ${targetID}`,
        threadID
      );
    }

    api.sendMessage(`🆔 ID الخاص بك: ${senderID}`, threadID);
  },
};
