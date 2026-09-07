module.exports = {
  config: {
    name: "حذف",
    aliases: ["delete", "unsend"],
    description: "يحذف رسالة البوت التي رددت عليها",
    usage: "!حذف (بالرد على رسالة البوت)",
    cooldown: 3,
    adminOnly: false,
  },

  async run({ api, event, messageReply, botID }) {
    const threadID = String(event.threadID);
    if (!messageReply?.messageID) {
      return api.sendMessage("❌ يجب الرد على رسالة البوت التي تريد حذفها.", threadID);
    }
    if (String(messageReply.senderID) !== String(botID)) {
      return api.sendMessage("❌ يمكن حذف رسائل البوت فقط.", threadID);
    }

    try {
      const unsend = api.unsent || api.unsend;
      if (typeof unsend !== "function") throw new Error("دالة حذف الرسائل غير متاحة.");
      await unsend.call(api, String(messageReply.messageID), threadID);
      return api.sendMessage("✅ تم حذف الرسالة.", threadID);
    } catch (error) {
      return api.sendMessage(`❌ تعذر حذف الرسالة: ${error.message}`, threadID);
    }
  },
};