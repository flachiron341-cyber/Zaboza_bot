const state = require("../state");
const challenges = require("../data/word-games.json").letters;
const { userKey, clearSession } = require("../utils/gameRouter");
const { info, error } = require("../utils/brand");

module.exports = {
  config: {
    name: "حروف",
    aliases: ["letters", "كلمة"],
    description: "كوّن كلمة من الحروف المعروضة",
    usage: "!حروف",
    cooldown: 3,
    adminOnly: false,
  },

  async run({ api, event }) {
    const threadID = String(event.threadID);
    const key = userKey(threadID, event.senderID);
    if (state.lettersGames.has(key)) {
      return api.sendMessage(info("تحدي حروف نشط", ["أرسل إجابتك أو اكتب !الغاء."]), threadID);
    }
    const item = challenges[Math.floor(Math.random() * challenges.length)];
    const session = { answer: item.word, letters: item.letters, startedAt: Date.now() };
    session.timer = setTimeout(() => {
      if (state.lettersGames.get(key) !== session) return;
      clearSession(state.lettersGames, key, session);
      api.sendMessage(error("انتهى تحدي الحروف", [`كانت الكلمة: ${item.word}`]), threadID);
    }, 60 * 1000);
    state.lettersGames.set(key, session);
    return api.sendMessage(
      info("تحدي تكوين الكلمات", [
        `الحروف: ${item.letters.join(" | ")}`,
        "كوّن كلمة صحيحة من هذه الحروف.",
        "لديك 60 ثانية.",
      ]),
      threadID
    );
  },
};