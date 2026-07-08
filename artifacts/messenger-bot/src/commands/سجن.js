const { getImageUrlFromPin, downloadImage } = require("../utils/pinterest");
const fs = require("fs");

const PIN_URL = "https://pin.it/24Mlzo7Gu";

module.exports = {
  config: {
    name: "سجن",
    aliases: ["jail", "prison"],
    description: "يسجن الشخص الذي رددت على رسالته",
    usage: "!سجن (رُدّ على رسالة شخص)",
    cooldown: 5,
    adminOnly: false,
  },

  async run({ api, event, messageReply }) {
    const { threadID, senderID } = event;

    if (!messageReply) {
      return api.sendMessage("❌ رُدّ على رسالة الشخص الذي تريد سجنه!", threadID);
    }

    api.sendMessage("🚔 جاري إحضار الصورة...", threadID, async () => {
      try {
        const imgUrl = await getImageUrlFromPin(PIN_URL);
        if (!imgUrl) throw new Error("no image");

        const tmpPath = await downloadImage(imgUrl);
        if (!tmpPath) throw new Error("download failed");

        api.sendMessage(
          {
            body: `🚔 ${messageReply.senderID} ذهب إلى السجن! أمر من ${senderID} 👮‍♂️🔒`,
            attachment: fs.createReadStream(tmpPath),
          },
          threadID,
          () => fs.unlink(tmpPath, () => {})
        );
      } catch {
        api.sendMessage(`🔒 ${messageReply.senderID} ذهب إلى السجن! أمر من ${senderID} 👮‍♂️`, threadID);
      }
    });
  },
};
