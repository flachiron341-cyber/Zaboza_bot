const bios = require("../data/bios.json");
const { info, error } = require("../utils/brand");

module.exports = {
  config: {
    name: "بايو",
    aliases: ["bio", "بايوهات"],
    description: "إنشاء Bio مزخرف وجاهز",
    usage: "!بايو | !بايو انمي | !بايو فخم",
    cooldown: 2,
    adminOnly: false,
  },

  async run({ api, event, args }) {
    const requested = String(args.join(" ") || "").toLocaleLowerCase("ar");
    const category = requested && bios[requested] ? requested : "عام";
    if (!bios[category]?.length) {
      return api.sendMessage(error("تصنيف غير موجود", [`المتاح: ${Object.keys(bios).join("، ")}`]), String(event.threadID));
    }
    const bio = bios[category][Math.floor(Math.random() * bios[category].length)];
    return api.sendMessage(info("Bio جاهز", [`التصنيف: ${category}`, `『 ${bio} 』`]), String(event.threadID));
  },
};