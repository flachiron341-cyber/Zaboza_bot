const { getCityTime } = require("../utils/publicApis");
const logger = require("../utils/logger");

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
    if (!city) return api.sendMessage("❌ اكتب اسم المدينة.", threadID);

    try {
      const result = await getCityTime(city);
      return api.sendMessage(`🕒 الوقت في ${city}:\n${result.formatted}\nالمنطقة: ${result.timezone}`, threadID);
    } catch (error) {
      logger.error(`فشل أمر وقت: ${error?.message || error}`);
      return api.sendMessage("❌ تعذر معرفة وقت هذه المدينة حالياً.", threadID);
    }
  },
};