const { searchImages, downloadImage } = require("../utils/images");
const { toEnglishSearchQuery }        = require("../utils/translate");
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
    const engQuery    = await toEnglishSearchQuery(arabicQuery);

    await api.sendMessage(`🔍 جاري البحث عن صور "${arabicQuery}"...`, threadID);

    const results = await searchImages(engQuery, 40);
    const validPaths = [];
    const usedSources = [];

    for (const image of results) {
      const p = await downloadImage(image);
      if (p) {
        validPaths.push(p);
        usedSources.push(image);
        if (validPaths.length === 6) break;
      }
    }

    if (!validPaths.length)
      return api.sendMessage(
        `❌ لم أتمكن من إحضار صور لـ "${arabicQuery}".\nحاول بكلمة أخرى.`,
        threadID
      );

    try {
      await api.sendMessage(
        {
          body: [
            `🖼️ ${validPaths.length} صور مرتبطة بـ "${arabicQuery}"`,
            ...usedSources.map((image, index) =>
              `${index + 1}. ${image.title}${image.attribution ? ` (${image.attribution})` : ""}${image.sourceURL ? ` — ${image.sourceURL}` : ""}`
            ),
            "المصدر: Wikimedia Commons",
          ].join("\n"),
          attachment: validPaths.map((p) => fs.createReadStream(p)),
        },
        threadID
      );
    } finally {
      validPaths.forEach((p) => fs.unlink(p, () => {}));
    }
  },
};
