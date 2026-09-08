const names = require("../data/names.json");
const { info, error } = require("../utils/brand");

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

module.exports = {
  config: {
    name: "اسماء",
    aliases: ["names", "اسم"],
    description: "اقتراح أسماء مميزة",
    usage: "!اسماء | !اسماء ولد | !اسماء بنت | !اسماء اجنبي",
    cooldown: 2,
    adminOnly: false,
  },

  async run({ api, event, args }) {
    const requested = String(args[0] || "").toLocaleLowerCase("ar");
    const category = requested && names[requested] ? requested : "عام";
    const pool = category === "عام"
      ? Object.values(names).flat()
      : names[category];
    if (!pool?.length) {
      return api.sendMessage(error("تصنيف غير موجود", ["المتاح: ولد، بنت، اجنبي."]), String(event.threadID));
    }
    const suggestions = [...new Set(Array.from({ length: 5 }, () => pick(pool)))];
    return api.sendMessage(
      info("اقتراحات أسماء مميزة", [`التصنيف: ${category === "عام" ? "متنوع" : category}`, ...suggestions.map((name, index) => `${index + 1}. ${name}`)]),
      String(event.threadID)
    );
  },
};