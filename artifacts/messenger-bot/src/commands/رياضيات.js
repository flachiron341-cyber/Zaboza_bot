const state = require("../state");

// ── توليد مسألة حسب المستوى ──
function generateProblem(level) {
  const ops = level === "سهل_جدا" || level === "سهل" ? ["+", "-"] : ["+", "-", "*"];
  const op = ops[Math.floor(Math.random() * ops.length)];

  let max, min;
  switch (level) {
    case "سهل_جدا": min = 1; max = 10; break;
    case "سهل":     min = 1; max = 20; break;
    case "متوسط":   min = 5; max = 50; break;
    case "صعب":     min = 10; max = 100; break;
    default:        min = 1; max = 10;
  }

  const a = Math.floor(Math.random() * (max - min + 1)) + min;
  const b = Math.floor(Math.random() * (max - min + 1)) + min;

  let question, answer;
  if (op === "+") { question = `${a} + ${b}`; answer = a + b; }
  else if (op === "-") {
    const big = Math.max(a, b), small = Math.min(a, b);
    question = `${big} - ${small}`; answer = big - small;
  } else {
    const x = Math.floor(Math.random() * 10) + 1;
    const y = Math.floor(Math.random() * 10) + 1;
    question = `${x} × ${y}`; answer = x * y;
  }

  return { question, answer };
}

const levelNames = {
  "سهل_جدا": "سهل جداً 🟢",
  "سهل":     "سهل 🔵",
  "متوسط":   "متوسط 🟡",
  "صعب":     "صعب 🔴",
};

module.exports = {
  config: {
    name: "رياضيات",
    aliases: ["math", "حساب"],
    description: "يرسل مسألة رياضية. اختر المستوى: !رياضيات [سهل_جدا | سهل | متوسط | صعب]",
    usage: "!رياضيات [المستوى]",
    cooldown: 10,
    adminOnly: false,
  },

  async run({ api, event, args }) {
    const { threadID } = event;

    // فحص وجود جلسة نشطة
    for (const [, session] of state.mathSessions) {
      if (session.threadID === threadID) {
        return api.sendMessage("⚠️ يوجد سؤال رياضيات نشط! أجب عليه أولاً.", threadID);
      }
    }

    // إذا لم يُحدد المستوى، أظهر الخيارات
    const validLevels = ["سهل_جدا", "سهل", "متوسط", "صعب"];
    const level = args[0];

    if (!level || !validLevels.includes(level)) {
      return api.sendMessage(
        [
          `🧮 مرحباً بك في لعبة الرياضيات!`,
          ``,
          `اختر المستوى:`,
          `  !رياضيات سهل_جدا  — أرقام 1–10 (جمع وطرح)`,
          `  !رياضيات سهل     — أرقام 1–20 (جمع وطرح)`,
          `  !رياضيات متوسط   — أرقام 1–50 (جمع وطرح وضرب)`,
          `  !رياضيات صعب     — أرقام 1–100 (جميع العمليات)`,
        ].join("\n"),
        threadID
      );
    }

    const { question, answer } = generateProblem(level);

    api.sendMessage(
      [
        `╔══════════════════════╗`,
        `║   🧮  مسألة رياضيات   ║`,
        `╚══════════════════════╝`,
        ``,
        `📊 المستوى: ${levelNames[level]}`,
        ``,
        `❓ كم يساوي: ${question} = ؟`,
        ``,
        `⏱ لديك 30 ثانية`,
        `💡 ردّ على هذه الرسالة بالإجابة`,
      ].join("\n"),
      threadID,
      (err, msgInfo) => {
        if (err || !msgInfo) return;

        const msgID = msgInfo.messageID;

        const timer = setTimeout(() => {
          state.mathSessions.delete(msgID);
          api.sendMessage(
            `⏰ انتهى الوقت! الإجابة كانت: ${answer} 😔`,
            threadID
          );
        }, 30000);

        state.mathSessions.set(msgID, {
          msgID,
          answer,
          threadID,
          timer,
        });
      }
    );
  },
};
