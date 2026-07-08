const { searchImages } = require("../utils/images");
const { downloadImage } = require("../utils/pinterest");
const fs = require("fs");

module.exports = {
  config: {
    name: "صورة",
    aliases: ["image", "img", "pic"],
    description: "يبحث ويرسل صور لأي شيء تطلبه",
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
      const urls = await searchImages(query, 6);

      if (!urls.length) {
        return api.sendMessage(`❌ لم أجد صوراً لـ "${query}". حاول بكلمة مختلفة.`, threadID);
      }

      // تحميل الصور بشكل متسلسل حتى نحصل على 4 صور صالحة
      const validPaths = [];
      for (const url of urls) {
        if (validPaths.length >= 4) break;
        const p = await downloadImage(url);
        if (p) validPaths.push(p);
      }

      if (!validPaths.length) {
        return api.sendMessage(`❌ فشل تحميل الصور. حاول مرة أخرى.`, threadID);
      }

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
