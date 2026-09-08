const state = require("../state");

function toNumber(value) {
  return Number(
    String(value || "")
      .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
      .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
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
    const key = `${threadID}:${senderID}`;
    const active = state.guessGames.get(key);

    if (!args.length) {
      if (active) {
        return api.sendMessage(`🎯 لديك لعبة جارية. أرسل تخميناً بين 1 و100.\nالمحاولات المتبقية: ${active.attempts}`, threadID);
      }
      state.guessGames.set(key, {
        answer: Math.floor(Math.random() * 100) + 1,
        attempts: 7,
      });
      return api.sendMessage(
        "🎯 بدأت لعبة التخمين!\nاخترت رقماً بين 1 و100.\nأرسل: !تخمين الرقم\nلديك 7 محاولات.",
        threadID
      );
    }

    if (!active) {
      return api.sendMessage("❌ ابدأ اللعبة أولاً بكتابة !تخمين.", threadID);
    }

    const guess = toNumber(args[0]);
    if (!Number.isInteger(guess) || guess < 1 || guess > 100) {
      return api.sendMessage("❌ اكتب رقماً صحيحاً بين 1 و100.", threadID);
    }

    active.attempts -= 1;
    if (guess === active.answer) {
      state.guessGames.delete(key);
      return api.sendMessage(`🎉 صحيح! الرقم هو ${active.answer}. ربحت اللعبة!`, threadID);
    }

    if (active.attempts <= 0) {
      state.guessGames.delete(key);
      return api.sendMessage(`انتهت المحاولات 😔 الرقم الصحيح كان ${active.answer}.`, threadID);
    }

    const hint = guess < active.answer ? "الرقم أكبر من تخمينك." : "الرقم أصغر من تخمينك.";
    return api.sendMessage(`❌ ليس صحيحاً. ${hint}\nالمحاولات المتبقية: ${active.attempts}`, threadID);
  },
};