const { getWeather } = require("../utils/publicApis");
const logger = require("../utils/logger");
const { info, error } = require("../utils/brand");

module.exports = {
  config: {
    name: "طقس",
    aliases: ["weather"],
    description: "يعرض حالة الطقس في مدينة",
    usage: "!طقس [المدينة]",
    cooldown: 10,
    adminOnly: false,
  },

  async run({ api, event, args }) {
    const threadID = String(event.threadID);
    const city = args.join(" ").trim();
    if (!city) return api.sendMessage(error("المدينة غير موجودة", ["اكتب اسم المدينة."]), threadID);

    try {
      const weather = await getWeather(city);
      return api.sendMessage(info("حالة الطقس", [
          `المكان: ${weather.city}${weather.country ? `، ${weather.country}` : ""}`,
          `الحالة: ${weather.description}`,
          `🌡️ الحرارة: ${weather.temp}°C | المحسوسة: ${weather.feelsLike}°C`,
          `💧 الرطوبة: ${weather.humidity}% | 💨 الرياح: ${weather.wind} كم/س`,
        ]), threadID);
    } catch (err) {
      logger.error(`فشل أمر طقس: ${err?.message || err}`);
      return api.sendMessage(error("تعذر جلب الطقس", ["تحقق من اسم المدينة وحاول لاحقاً."]), threadID);
    }
  },
};