const { getCityTime } = require("../utils/publicApis");
const logger = require("../utils/logger");
const { info, error } = require("../utils/brand");

module.exports = {
  config: {
    name: "وقت",
    aliases: ["clock"],
    description: "يعرض الوقت الحالي في مدينة",
    usage: "!وقت [المدينة]",
    cooldown: 10,
    adminOnly: false,
  },

  async run({ api, event, args }) {
    const threadID = String(event.threadID);
    const city = args.join(" ").trim();
    if (!city) return api.sendMessage(error("المدينة غير موجودة", ["اكتب اسم المدينة."]), threadID);

    try {
      const result = await getCityTime(city);
      return api.sendMessage(info("الوقت المحلي", [`المدينة: ${city}`, result.formatted, `المنطقة: ${result.timezone}`]), threadID);
    } catch (err) {
      logger.error(`فشل أمر وقت: ${err?.message || err}`);
      return api.sendMessage(error("تعذر معرفة الوقت", ["تحقق من اسم المدينة وحاول لاحقاً."]), threadID);
    }
  },
};