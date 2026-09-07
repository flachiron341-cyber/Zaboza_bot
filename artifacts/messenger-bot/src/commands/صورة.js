const { searchImages, downloadImage } = require("../utils/images");
const { toEnglishQuery }              = require("../utils/translate");
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
    const threadID = String(event.threadID);

    if (!args.length)
      return api.sendMessage(
        "❌ اكتب ما تريد البحث عنه!\nمثال: !صورة ميسي | !صورة قطة | !صورة بحر",
        threadID
      );

    const arabicQuery = args.join(" ");
    const engQuery    = toEnglishQuery(arabicQuery);

    await api.sendMessage(`🔍 جاري البحث عن صور "${arabicQuery}"...`, threadID);

    // ننشئ 4 روابط بـ seeds مختلفة
    const urls       = await searchImages(engQuery, 4);
    const validPaths = [];

    for (const url of urls) {
      const p = await downloadImage(url);
      if (p) validPaths.push(p);
    }

    if (!validPaths.length)
      return api.sendMessage(
        `❌ لم أتمكن من إحضار صور لـ "${arabicQuery}".\nحاول بكلمة أخرى.`,
        threadID
      );

    try {
      await api.sendMessage(
        {
          body:       `🖼️ ${validPaths.length} صور لـ "${arabicQuery}"`,
          attachment: validPaths.map((p) => fs.createReadStream(p)),
        },
        threadID
      );
    } finally {
      validPaths.forEach((p) => fs.unlink(p, () => {}));
    }
  },
};
