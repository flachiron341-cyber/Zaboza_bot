const state = require("../state");

function generateProblem() {
  const levels = [
    { ops: ["+", "-"],        min: 1,  max: 10  },
    { ops: ["+", "-"],        min: 1,  max: 20  },
    { ops: ["+", "-", "*"],   min: 5,  max: 50  },
    { ops: ["+", "-", "*"],   min: 10, max: 100 },
  ];
  const lvl = levels[Math.floor(Math.random() * levels.length)];
  const op  = lvl.ops[Math.floor(Math.random() * lvl.ops.length)];
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

  if (op === "+") {
    const a = rand(lvl.min, lvl.max), b = rand(lvl.min, lvl.max);
    return { question: `${a} + ${b}`, answer: a + b };
  }
  if (op === "-") {
    const a = rand(lvl.min, lvl.max), b = rand(lvl.min, a);
    return { question: `${a} - ${b}`, answer: a - b };
  }
  // ضرب
  const a = rand(2, 12), b = rand(2, 12);
  return { question: `${a} × ${b}`, answer: a * b };
}

module.exports = {
  config: {
    name: "رياضيات",
    aliases: ["math", "حساب"],
    description: "يرسل مسألة رياضية للإجابة خلال 30 ثانية",
    usage: "!رياضيات",
    cooldown: 5,
    adminOnly: false,
  },

  async run({ api, event }) {
    const threadID = String(event.threadID);

    for (const [, session] of state.mathSessions) {
      if (session.threadID === threadID)
        return api.sendMessage("⚠️ يوجد سؤال رياضيات نشط! أجب عليه أولاً.", threadID);
    }

    const { question, answer } = generateProblem();

    let msgInfo;
    try {
      msgInfo = await api.sendMessage(
        [
          `╔══════════════════════╗`,
          `║   🧮  مسألة رياضيات   ║`,
          `╚══════════════════════╝`,
          ``,
          `❓ كم يساوي: ${question} = ؟`,
          ``,
          `⏱ لديك 30 ثانية`,
          `💡 ردّ على هذه الرسالة بالإجابة`,
        ].join("\n"),
        threadID
      );
    } catch {
      return;
    }

    if (!msgInfo || !msgInfo.messageID) return;

    const msgID = String(msgInfo.messageID);

    const timer = setTimeout(() => {
      state.mathSessions.delete(msgID);
      api.sendMessage(`⏰ انتهى الوقت! الإجابة كانت: ${answer} 😔`, threadID);
    }, 30000);

    state.mathSessions.set(msgID, { msgID, answer, threadID, timer });
  },
};
