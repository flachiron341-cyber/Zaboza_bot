const { saveReplyImage } = require("../utils/groupEventImages");

module.exports = {
  config: {
    name: "دخول",
    aliases: ["صور_الدخول", "joinimage"],
    description: "تعيين صورة ترحيب الأعضاء عند دخولهم للقروب",
    usage: "!دخول (ردّ على صورة)",
    cooldown: 5,
    adminOnly: true,
  },

  async run({ api, event, messageReply }) {
    const threadID = String(event.threadID);
    const attachment = (messageReply?.attachments || []).find(
      (item) => item?.type === "photo" || item?.url || item?.largePreviewUrl
    );
    try {
      await saveReplyImage(threadID, "join", attachment);
      return api.sendMessage("✅ تم حفظ صورة الترحيب لهذا القروب.", threadID);
    } catch (error) {
      return api.sendMessage(`❌ ${error.message}`, threadID);
    }
  },
};