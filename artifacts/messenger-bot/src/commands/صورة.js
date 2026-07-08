const { searchImages } = require("../utils/images");
const { downloadImage } = require("../utils/pinterest");
const fs = require("fs");

module.exports = {
  config: {
    name: "صورة",
    aliases: ["image", "img", "pic"],
    description: "يبحث ويرسل 4 صور لأي شيء تطلبه",
    usage: "!صورة [الموضوع]",
    cooldown: 10,
    adminOnly: false,
  },

  async run({ api, event, args }) {
    const { threadID } = event;

    if (!args.length) {
      return api.sendMessage("❌ اكتب ما تريد البحث عنه!\nمثال: !صورة سيارات", threadID);
    }

    const query = args.join(" ");
    api.sendMessage(`🔍 جاري البحث عن صور "${query}"...`, threadID);

    try {
      const urls = await searchImages(query, 4);

      if (!urls.length) {
        return api.sendMessage(`❌ لم أجد صوراً لـ "${query}". حاول بكلمة مختلفة.`, threadID);
      }

      // تحميل الصور بشكل متوازٍ
      const tmpPaths = await Promise.all(urls.map((u) => downloadImage(u)));
      const validPaths = tmpPaths.filter(Boolean);

      if (!validPaths.length) {
        return api.sendMessage(`❌ فشل تحميل الصور. حاول مرة أخرى.`, threadID);
      }

      // إرسال الصور كمرفقات متعددة
      api.sendMessage(
        {
          body: `🖼️ ${validPaths.length} صور لـ "${query}"`,
          attachment: validPaths.map((p) => fs.createReadStream(p)),
        },
        threadID,
        () => validPaths.forEach((p) => fs.unlink(p, () => {}))
      );
    } catch (e) {
      api.sendMessage(`❌ حدث خطأ أثناء البحث.`, threadID);
    }
  },
};
