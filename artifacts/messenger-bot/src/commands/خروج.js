const { saveReplyImage } = require("../utils/groupEventImages");
const { leaveGroup } = require("../utils/leaveGroup");

module.exports = {
  config: {
    name: "خروج",
    aliases: ["صور_الخروج", "leaveimage"],
    description: "يخرج البوت برسالة وداع؛ أو ردّ على صورة لتعيين صورة المغادرة",
    usage: "!خروج | !خروج (ردّ على صورة)",
    cooldown: 5,
    adminOnly: true,
  },

  async run({ api, event, messageReply, botID }) {
    const threadID = String(event.threadID);
    const attachment = (messageReply?.attachments || []).find(
      (item) => item?.type === "photo" || item?.url || item?.largePreviewUrl
    );
    if (!attachment) {
      try {
        await leaveGroup(api, threadID, botID);
      } catch (error) {
        await api.sendMessage(`❌ تعذر خروج البوت: ${error?.message || error}`, threadID);
      }
      return;
    }
    try {
      await saveReplyImage(threadID, "leave", attachment);
      return api.sendMessage("✅ تم حفظ صورة المغادرة لهذا القروب.", threadID);
    } catch (error) {
      return api.sendMessage(`❌ ${error.message}`, threadID);
    }
  },
};