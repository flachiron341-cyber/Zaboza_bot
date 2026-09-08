const state = require("../state");
const words = require("../data/word-games.json").reverse;
const { userKey, clearSession } = require("../utils/gameRouter");
const { info, error } = require("../utils/brand");

function reverse(value) {
  return [...String(value)].reverse().join("");
}

module.exports = {
  config: {
    name: "معكوس",
    aliases: ["reverse", "عكس_كلمة"],
    description: "اكتشف الكلمة المكتوبة بالعكس",
    usage: "!معكوس",
    cooldown: 3,
    adminOnly: false,
  },

  async run({ api, event }) {
    const threadID = String(event.threadID);
    const key = userKey(threadID, event.senderID);
    if (state.reverseGames.has(key)) {
      return api.sendMessage(info("تحدي معكوس نشط", ["أرسل الكلمة الأصلية أو اكتب !الغاء."]), threadID);
    }
    const answer = words[Math.floor(Math.random() * words.length)];
    const session = { answer, startedAt: Date.now() };
    session.timer = setTimeout(() => {
      if (state.reverseGames.get(key) !== session) return;
      clearSession(state.reverseGames, key, session);
      api.sendMessage(error("انتهى تحدي المعكوس", [`الكلمة الأصلية: ${answer}`]), threadID);
    }, 60 * 1000);
    state.reverseGames.set(key, session);
    return api.sendMessage(
      info("تحدي الكلمة المعكوسة", [`الكلمة: ${reverse(answer)}`, "اكتب الكلمة الأصلية خلال 60 ثانية."]),
      threadID
    );
  },
};