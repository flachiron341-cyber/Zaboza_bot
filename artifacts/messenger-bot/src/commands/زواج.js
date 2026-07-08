const { getImageUrlFromPin, downloadImage } = require("../utils/pinterest");
const fs = require("fs");

const PIN_URL = "https://pin.it/7gZ6qnHTh";

module.exports = {
  config: {
    name: "زواج",
    aliases: ["marry", "زفاف"],
    description: "يرسل صورة زواج للشخص الذي رددت على رسالته",
    usage: "!زواج (رُدّ على رسالة شخص)",
    cooldown: 5,
    adminOnly: false,
  },

  async run({ api, event, messageReply }) {
    const { threadID, senderID } = event;

    if (!messageReply) {
      return api.sendMessage("❌ رُدّ على رسالة الشخص الذي تريد الزواج منه!", threadID);
    }

    api.sendMessage("💍 جاري إحضار الصورة...", threadID, async () => {
      try {
        const imgUrl = await getImageUrlFromPin(PIN_URL);
        if (!imgUrl) throw new Error("no image");

        const tmpPath = await downloadImage(imgUrl);
        if (!tmpPath) throw new Error("download failed");

        api.sendMessage(
          {
            body: `💍 تهانينا! ${senderID} تزوج من ${messageReply.senderID} 🎊`,
            attachment: fs.createReadStream(tmpPath),
          },
          threadID,
          () => fs.unlink(tmpPath, () => {})
        );
      } catch {
        api.sendMessage(`💍 تهانينا! ${senderID} تزوج من ${messageReply.senderID} 🎊`, threadID);
      }
    });
  },
};
