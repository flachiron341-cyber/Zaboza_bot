const { cancelUserGames } = require("../utils/gameRouter");
const { success, info } = require("../utils/brand");

module.exports = {
  config: {
    name: "الغاء",
    aliases: ["إلغاء", "cancel"],
    description: "إلغاء اللعبة أو الجلسة الحالية",
    usage: "!الغاء",
    cooldown: 0,
    adminOnly: false,
  },

  async run({ api, event }) {
    const count = cancelUserGames(String(event.threadID), String(event.senderID));
    await api.sendMessage(
      count
        ? success("تم الإلغاء", ["تم إنهاء الجلسة أو المباراة الحالية."])
        : info("لا توجد جلسة نشطة", ["لا توجد لعبة مرتبطة بحسابك حالياً."]),
      String(event.threadID)
    );
  },
};