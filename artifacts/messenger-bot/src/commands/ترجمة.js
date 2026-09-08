const { translateText } = require("../utils/publicApis");
const logger = require("../utils/logger");
const { info, error } = require("../utils/brand");

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
      return api.sendMessage(error("صيغة الترجمة", ["!ترجمة النص اللغة", "مثال: !ترجمة صباح الخير en"]), threadID);
    }

    const targetLanguage = args.pop();
    const text = args.join(" ").trim();
    try {
      const result = await translateText(text, targetLanguage);
      return api.sendMessage(info("الترجمة", [`اللغة: ${result.target}`, result.text]), threadID);
    } catch (err) {
      logger.error(`فشل أمر ترجمة: ${err?.message || err}`);
      return api.sendMessage(error("تعذرت الترجمة", [err?.message || "حاول لاحقاً."]), threadID);
    }
  },
};