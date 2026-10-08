const logger = require("../utils/logger");

module.exports = {
  config: {
    name: "رسالة",
    aliases: ["رسالة_حذف", "حذف_رسالة", "unsend"],
    description: "يحذف رسالة البوت عند الرد عليها (للمطورين فقط)",
    usage: "!رسالة حذف (ردّ على رسالة للبوت)",
    cooldown: 0,
    adminOnly: true,
  },

  async run({ api, event, args, invokedName, messageReply, botID }) {
    const invoked = String(invokedName || "").toLowerCase();
    const action = String(args[0] || "").toLowerCase();
    if (invoked !== "رسالة_حذف" && action !== "حذف") return;
    const senderID = String(messageReply?.senderID || "");
    const ownID = String(botID || api.getCurrentUserID());
    const messageID = String(messageReply?.messageID || "");
    if (!messageID || !senderID || senderID !== ownID) return;
    try {
      await api.unsendMessage(messageID);
    } catch (error) {
      logger.warn(`تعذر حذف رسالة البوت في القروب ${String(event.threadID)}: ${error?.message || error}`);
    }
  },
};
