const { searchImages } = require("../utils/images");
const { downloadImage } = require("../utils/pinterest");
const fs = require("fs");

function sendImage(api, threadID, body, tmpPath) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), 15000);
    api.sendMessage(
      { body, attachment: fs.createReadStream(tmpPath) },
      threadID,
      (err) => {
        clearTimeout(timer);
        fs.unlink(tmpPath, () => {});
        if (err) reject(err); else resolve();
      }
    );
  });
}

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

    if (!messageReply)
      return api.sendMessage("❌ رُدّ على رسالة الشخص الذي تريد الزواج منه!", threadID);

    const target = messageReply.senderID;
    const body   = `💍 تهانينا! ${senderID} تزوج من ${target} 🎊`;

    try {
      const urls = await searchImages("wedding couple romantic anime", 5);
      for (const url of urls) {
        const tmp = await downloadImage(url);
        if (tmp) {
          await sendImage(api, threadID, body, tmp);
          return;
        }
      }
    } catch { /* يصل للـ fallback */ }

    api.sendMessage(body, threadID);
  },
};
