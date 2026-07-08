const { getImageUrlFromPin, downloadImage } = require("../utils/pinterest");
const fs = require("fs");

const PIN_URL = "https://pin.it/5Secs5DaD";

module.exports = {
  config: {
    name: "طلاق",
    aliases: ["divorce"],
    description: "يرسل صورة طلاق للشخص الذي رددت على رسالته",
    usage: "!طلاق (رُدّ على رسالة شخص)",
    cooldown: 5,
    adminOnly: false,
  },

  async run({ api, event, messageReply }) {
    const { threadID, senderID } = event;

    if (!messageReply) {
      return api.sendMessage("❌ رُدّ على رسالة الشخص الذي تريد تطليقه!", threadID);
    }

    api.sendMessage("💔 جاري إحضار الصورة...", threadID, async () => {
      try {
        const imgUrl = await getImageUrlFromPin(PIN_URL);
        if (!imgUrl) throw new Error("no image");

        const tmpPath = await downloadImage(imgUrl);
        if (!tmpPath) throw new Error("download failed");

        api.sendMessage(
          {
            body: `💔 ${senderID} طلّق ${messageReply.senderID}! آسفين على السماع 😢`,
            attachment: fs.createReadStream(tmpPath),
          },
          threadID,
          () => fs.unlink(tmpPath, () => {})
        );
      } catch {
        api.sendMessage(`💔 ${senderID} طلّق ${messageReply.senderID}! آسفين على السماع 😢`, threadID);
      }
    });
  },
};
