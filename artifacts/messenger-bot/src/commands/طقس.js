const { getWeather } = require("../utils/publicApis");
const logger = require("../utils/logger");

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
    if (!city) return api.sendMessage("❌ اكتب اسم المدينة.", threadID);

    try {
      const weather = await getWeather(city);
      return api.sendMessage(
        [
          `🌤️ الطقس في ${weather.city}${weather.country ? `، ${weather.country}` : ""}`,
          `الحالة: ${weather.description}`,
          `🌡️ الحرارة: ${weather.temp}°C | المحسوسة: ${weather.feelsLike}°C`,
          `💧 الرطوبة: ${weather.humidity}% | 💨 الرياح: ${weather.wind} كم/س`,
        ].join("\n"),
        threadID
      );
    } catch (error) {
      logger.error(`فشل أمر طقس: ${error?.message || error}`);
      return api.sendMessage("❌ تعذر جلب الطقس لهذه المدينة حالياً.", threadID);
    }
  },
};