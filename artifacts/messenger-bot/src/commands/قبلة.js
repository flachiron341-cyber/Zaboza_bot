const { downloadImage } = require("../utils/images");
const fs = require("fs");

// روابط محددة للقبلة — loremflickr بـ tags واضحة
const TAGS = ["kiss,romantic", "couple,kiss,love", "kiss,anime", "romantic,couple"];

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
    const threadID = String(event.threadID);
    const senderID = String(event.senderID);

    if (!messageReply)
      return api.sendMessage("❌ رُدّ على رسالة الشخص الذي تريد تقبيله!", threadID);

    const target = String(messageReply.senderID);
    const body   = `💋 ${senderID} قبّل ${target}! 😘`;

    await sendWithImage(api, threadID, body, TAGS);
  },
};

async function sendWithImage(api, threadID, body, tags) {
  // نجرّب كل تاج حتى نحصل على صورة
  for (let i = 0; i < tags.length; i++) {
    const url = `https://loremflickr.com/600/600/${tags[i]}?lock=${Math.floor(Math.random() * 999) + 1}`;
    const tmp = await downloadImage(url);
    if (!tmp) continue;
    try {
      await api.sendMessage({ body, attachment: fs.createReadStream(tmp) }, threadID);
      return;
    } catch { /* جرّب التاج التالي */ }
    finally { fs.unlink(tmp, () => {}); }
  }
  // fallback نصي
  await api.sendMessage(body, threadID);
}
