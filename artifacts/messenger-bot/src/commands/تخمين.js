const state = require("../state");
const { userKey, clearSession } = require("../utils/gameRouter");
const { success, error, info } = require("../utils/brand");

function toNumber(value) {
  return Number(
    String(value || "")
      .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
      .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
      .trim()
  );
}

module.exports = {
  config: {
    name: "تخمين",
    aliases: ["guess"],
    description: "لعبة تخمين رقم بين 1 و100",
    usage: "!تخمين | !تخمين [رقم]",
    cooldown: 2,
    adminOnly: false,
  },

  async run({ api, event, args }) {
    const threadID = String(event.threadID);
    const senderID = String(event.senderID);
    const key = userKey(threadID, senderID);
    let active = state.guessGames.get(key);

    if (!args.length) {
      if (active) {
        return api.sendMessage(
          info("لعبة تخمين جارية", [`المحاولات المتبقية: ${active.attempts}`, "أرسل رقماً بين 1 و100 أو اكتب !الغاء."]),
          threadID
        );
      }

      active = {
        answer: Math.floor(Math.random() * 100) + 1,
        attempts: 7,
        startedAt: Date.now(),
      };
      active.timer = setTimeout(() => {
        if (state.guessGames.get(key) !== active) return;
        clearSession(state.guessGames, key, active);
        api.sendMessage(error("انتهى وقت التخمين", ["انتهت الجلسة تلقائياً بعد فترة من عدم النشاط."]), threadID);
      }, 15 * 60 * 1000);
      state.guessGames.set(key, active);
      return api.sendMessage(
        info("بدأت لعبة التخمين", ["اخترت رقماً سرياً من 1 إلى 100.", "أرسل تخمينك في الرسالة التالية.", "لديك 7 محاولات."]),
        threadID
      );
    }

    if (!active) {
      return api.sendMessage(error("لا توجد لعبة", ["ابدأ أولاً بكتابة !تخمين."]), threadID);
    }

    const guess = toNumber(args[0]);
    if (!Number.isInteger(guess) || guess < 1 || guess > 100) {
      return api.sendMessage(error("تخمين غير صالح", ["اكتب رقماً صحيحاً من 1 إلى 100."]), threadID);
    }

    active.attempts -= 1;
    if (guess === active.answer) {
      clearSession(state.guessGames, key, active);
      return api.sendMessage(success("فوز في لعبة التخمين", [`الرقم السري: ${active.answer}`, "أحسنت، لقد ربحت."]), threadID);
    }
    if (active.attempts <= 0) {
      clearSession(state.guessGames, key, active);
      return api.sendMessage(error("انتهت المحاولات", [`الرقم السري كان: ${active.answer}`]), threadID);
    }
    const hint = guess < active.answer ? "الرقم السري أكبر." : "الرقم السري أصغر.";
    return api.sendMessage(info("تلميح التخمين", [hint, `المحاولات المتبقية: ${active.attempts}`]), threadID);
  },
};