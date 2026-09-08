const symbols = require("../data/symbols.json");
const { info, error } = require("../utils/brand");

module.exports = {
  config: {
    name: "رموز",
    aliases: ["symbols", "زخارف"],
    description: "عرض رموز وزخارف قابلة للنسخ",
    usage: "!رموز | !رموز فخمة | !رموز اسهم | !رموز بايو",
    cooldown: 2,
    adminOnly: false,
  },

  async run({ api, event, args }) {
    const aliases = { "فخم": "فخمة", "اسهم": "اسهم", "أسهم": "اسهم", "اسم": "اسماء", "بايو": "بايو" };
    const requested = String(args[0] || "").toLocaleLowerCase("ar");
    const category = aliases[requested] || requested;
    if (category && !symbols[category]) {
      return api.sendMessage(error("تصنيف غير موجود", [`المتاح: ${Object.keys(symbols).join("، ")}`]), String(event.threadID));
    }
    const categories = category ? [category] : Object.keys(symbols);
    const lines = categories.map((name) => `✦ ${name}: ${symbols[name].join("  ")}`);
    return api.sendMessage(info("مكتبة رموز ZABOZA", lines), String(event.threadID));
  },
};