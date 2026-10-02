const { saveReplyImage } = require("../utils/groupEventImages");

module.exports = {
  config: {
    name: "خروج",
    aliases: ["صور_الخروج", "leaveimage"],
    description: "تعيين الصورة التي تُرسل عند مغادرة عضو للقروب",
    usage: "!خروج (ردّ على صورة)",
    cooldown: 5,
    adminOnly: true,
  },

  async run({ api, event, messageReply }) {
    const threadID = String(event.threadID);
    const attachment = (messageReply?.attachments || []).find(
      (item) => item?.type === "photo" || item?.url || item?.largePreviewUrl
    );
    try {
      await saveReplyImage(threadID, "leave", attachment);
      return api.sendMessage("✅ تم حفظ صورة المغادرة لهذا القروب.", threadID);
    } catch (error) {
      return api.sendMessage(`❌ ${error.message}`, threadID);
    }
  },
};