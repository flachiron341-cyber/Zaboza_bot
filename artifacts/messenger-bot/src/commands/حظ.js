const messages = [
  "اليوم مناسب لبداية جديدة.",
  "فرصة جميلة قد تظهر أمامك، انتبه لها.",
  "لا تتسرع؛ الحظ يحب من يخطط.",
  "خبر جيد في الطريق، بإذن الله.",
  "استمر، فنتيجتك أفضل مما تتوقع.",
];

module.exports = {
  config: {
    name: "حظ",
    aliases: ["luck"],
    description: "يعرض نتيجة حظ ترفيهية عشوائية",
    usage: "!حظ",
    cooldown: 5,
    adminOnly: false,
  },
  async run({ api, event }) {
    const percent = Math.floor(Math.random() * 101);
    const message = messages[Math.floor(Math.random() * messages.length)];
    return api.sendMessage(`🍀 نسبة حظك اليوم: ${percent}%\n${message}`, String(event.threadID));
  },
};