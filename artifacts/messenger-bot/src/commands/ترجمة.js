const { translateText } = require("../utils/publicApis");
const logger = require("../utils/logger");

module.exports = {
  config: {
    name: "ترجمة",
    aliases: ["translate"],
    description: "يترجم النص إلى اللغة المطلوبة",
    usage: "!ترجمة [النص] [اللغة]",
    cooldown: 10,
    adminOnly: false,
  },

  async run({ api, event, args }) {
    const threadID = String(event.threadID);
    if (args.length < 2) {
      return api.sendMessage("❌ الصيغة: !ترجمة النص اللغة\nمثال: !ترجمة صباح الخير en", threadID);
    }

    const targetLanguage = args.pop();
    const text = args.join(" ").trim();
    try {
      const result = await translateText(text, targetLanguage);
      return api.sendMessage(`🌐 الترجمة (${result.target}):\n${result.text}`, threadID);
    } catch (error) {
      logger.error(`فشل أمر ترجمة: ${error?.message || error}`);
      return api.sendMessage(`❌ تعذرت الترجمة: ${error?.message || "حاول لاحقاً."}`, threadID);
    }
  },
};