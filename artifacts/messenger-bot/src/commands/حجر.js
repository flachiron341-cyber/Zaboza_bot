const { info, error } = require("../utils/brand");

const moves = {
  حجر: "حجر",
  rock: "حجر",
  ورق: "ورق",
  paper: "ورق",
  مقص: "مقص",
  scissors: "مقص",
};

const beats = { حجر: "مقص", ورق: "حجر", مقص: "ورق" };

module.exports = {
  config: {
    name: "حجر",
    aliases: ["rps", "حجر_ورق_مقص"],
    description: "لعبة حجر ورق مقص",
    usage: "!حجر حجر | !حجر ورق | !حجر مقص",
    cooldown: 1,
    adminOnly: false,
  },

  async run({ api, event, args }) {
    const input = String(args[0] || "").toLocaleLowerCase("ar");
    const player = moves[input];
    if (!player) {
      return api.sendMessage(error("اختيار غير صالح", ["استخدم: !حجر حجر أو !حجر ورق أو !حجر مقص."]), String(event.threadID));
    }
    const bot = Object.keys(beats)[Math.floor(Math.random() * 3)];
    const result = player === bot ? "تعادل" : beats[player] === bot ? "أنت الفائز" : "فاز البوت";
    return api.sendMessage(
      info("حجر ورق مقص", [`اختيارك: ${player}`, `اختيار البوت: ${bot}`, `النتيجة: ${result}`]),
      String(event.threadID)
    );
  },
};