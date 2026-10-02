const { saveReplyImage } = require("../utils/groupEventImages");

module.exports = {
  config: {
    name: "دخول_البوت",
    aliases: ["botjoinimage"],
    description: "تعيين الصورة التي تُرسل عند إضافة البوت نفسه للقروب",
    usage: "!دخول_البوت (ردّ على صورة)",
    cooldown: 5,
    adminOnly: true,
  },

  async run({ api, event, messageReply }) {
    const threadID = String(event.threadID);
    const attachment = (messageReply?.attachments || []).find(
      (item) => item?.type === "photo" || item?.url || item?.largePreviewUrl
    );
    try {
      await saveReplyImage(threadID, "botJoin", attachment);
      return api.sendMessage("✅ تم حفظ صورة دخول البوت لهذا القروب.", threadID);
    } catch (error) {
      return api.sendMessage(`❌ ${error.message}`, threadID);
    }
  },
};