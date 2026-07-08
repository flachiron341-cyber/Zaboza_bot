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
    name: "طلاق",
    aliases: ["divorce"],
    description: "يرسل صورة طلاق للشخص الذي رددت على رسالته",
    usage: "!طلاق (رُدّ على رسالة شخص)",
    cooldown: 5,
    adminOnly: false,
  },

  async run({ api, event, messageReply }) {
    const { threadID, senderID } = event;

    if (!messageReply)
      return api.sendMessage("❌ رُدّ على رسالة الشخص الذي تريد تطليقه!", threadID);

    const target = messageReply.senderID;
    const body   = `💔 ${senderID} طلّق ${target}! آسفين على السماع 😢`;

    try {
      const urls = await searchImages("sad breakup heartbreak anime", 5);
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
