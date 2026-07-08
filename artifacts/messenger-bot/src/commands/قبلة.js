const { getImageUrlFromPin, downloadImage } = require("../utils/pinterest");
const fs = require("fs");

const PIN_URL = "https://pin.it/10owvvdzy";

module.exports = {
  config: {
    name: "قبلة",
    aliases: ["kiss", "بوسة"],
    description: "يرسل صورة قبلة للشخص الذي رددت على رسالته",
    usage: "!قبلة (رُدّ على رسالة شخص)",
    cooldown: 5,
    adminOnly: false,
  },

  async run({ api, event, messageReply }) {
    const { threadID, senderID } = event;

    if (!messageReply) {
      return api.sendMessage("❌ رُدّ على رسالة الشخص الذي تريد تقبيله!", threadID);
    }

    api.sendMessage("💋 جاري إحضار الصورة...", threadID, async () => {
      try {
        const imgUrl = await getImageUrlFromPin(PIN_URL);
        if (!imgUrl) throw new Error("لم يتم العثور على الصورة");

        const tmpPath = await downloadImage(imgUrl);
        if (!tmpPath) throw new Error("فشل تحميل الصورة");

        api.sendMessage(
          {
            body: `💋 ${senderID} قبّل ${messageReply.senderID}!`,
            attachment: fs.createReadStream(tmpPath),
          },
          threadID,
          () => fs.unlink(tmpPath, () => {})
        );
      } catch (e) {
        api.sendMessage(`💋 قبلة! 😘 (تعذّر إحضار الصورة)`, threadID);
      }
    });
  },
};
