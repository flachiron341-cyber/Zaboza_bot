const state = require("../state");
const { userKey, clearSession } = require("../utils/gameRouter");
const { info, error } = require("../utils/brand");

const questions = [
  { q: "الشمس نجم.", a: true }, { q: "الماء يغلي عند 100 درجة مئوية على سطح البحر.", a: true },
  { q: "القمر كوكب.", a: false }, { q: "عاصمة الجزائر هي الجزائر.", a: true },
  { q: "الخفاش من الطيور.", a: false }, { q: "عدد أضلاع المربع أربعة.", a: true },
  { q: "كوكب المشتري أصغر من الأرض.", a: false }, { q: "اللغة العربية تكتب من اليمين إلى اليسار.", a: true },
  { q: "البحر الميت أعلى من مستوى سطح البحر.", a: false }, { q: "الفهد من أسرع الحيوانات البرية.", a: true },
  { q: "الأرض مسطحة.", a: false }, { q: "الأخطبوط له ثمانية أذرع.", a: true },
  { q: "عاصمة اليابان هي طوكيو.", a: true }, { q: "الذهب أخف من الخشب دائماً.", a: false },
  { q: "القلب يضخ الدم إلى أنحاء الجسم.", a: true }, { q: "الصوت ينتقل في الفراغ.", a: false },
  { q: "المثلث له أربعة أضلاع.", a: false }, { q: "القطب الشمالي يقع في قارة.", a: false },
  { q: "اللغة الإنجليزية تستخدم الأبجدية اللاتينية.", a: true }, { q: "كوكب عطارد أبعد عن الشمس من الأرض.", a: false }
];

module.exports = {
  config: {
    name: "صحا_وخطأ",
    aliases: ["صح_خطأ", "truefalse", "صحاوخطا"],
    description: "لعبة صح أو خطأ",
    usage: "!صحا_وخطأ",
    cooldown: 3,
    adminOnly: false,
  },

  async run({ api, event, args }) {
    const threadID = String(event.threadID);
    const key = userKey(threadID, event.senderID);
    const current = state.trueFalseGames.get(key);
    if (current) {
      return api.sendMessage(info("سؤال نشط", ["أجب بـ صح أو خطأ، أو اكتب !الغاء."]), threadID);
    }

    const item = questions[Math.floor(Math.random() * questions.length)];
    const session = { question: item.q, answer: item.a, startedAt: Date.now() };
    session.timer = setTimeout(() => {
      if (state.trueFalseGames.get(key) !== session) return;
      clearSession(state.trueFalseGames, key, session);
      api.sendMessage(error("انتهى السؤال", [`الإجابة الصحيحة: ${item.a ? "صح" : "خطأ"}`]), threadID);
    }, 90 * 1000);
    state.trueFalseGames.set(key, session);
    return api.sendMessage(
      info("تحدي صح أم خطأ", [`❓ ${item.q}`, "✅ صح    |    ❌ خطأ", "أرسل إجابتك في الرسالة التالية."]),
      threadID
    );
  },
};