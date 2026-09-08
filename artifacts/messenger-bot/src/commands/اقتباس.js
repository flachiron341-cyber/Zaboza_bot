const quotes = [
  "الخطوة الصغيرة اليوم تصنع فرقاً كبيراً غداً.",
  "لا تنتظر الفرصة، اصنعها.",
  "الهدوء قوة لا يراها الجميع.",
  "كل بداية صعبة، لكن الاستمرار يصنع النتيجة.",
  "ثق بنفسك وابدأ بما تملك.",
];

module.exports = {
  config: {
    name: "اقتباس",
    aliases: ["quote"],
    description: "يرسل اقتباساً قصيراً عشوائياً",
    usage: "!اقتباس",
    cooldown: 5,
    adminOnly: false,
  },
  async run({ api, event }) {
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    return api.sendMessage(`💬 ${quote}`, String(event.threadID));
  },
};