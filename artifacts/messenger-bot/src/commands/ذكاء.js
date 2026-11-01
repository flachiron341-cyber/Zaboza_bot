const on = require("../utils/aiToggle");
module.exports = {
  config: {
    name: "ذكاء",
    aliases: ["ai", "gpt"],
    description: "اسأل الذكاء الاصطناعي Gemini",
    usage: "!ذكاء on|off|سؤال",
    cooldown: 5,
    adminOnly: false,
  },
  async run({ api, event, args }) {
    const tid = String(event.threadID);
    const a0 = (args[0] || "").toLowerCase();
    const say = (t) => api.sendMessage(t, tid);
    if (["on", "شغل"].includes(a0)) { on.set(tid, 1); return say("🟢 تم تشغيل الذكاء الاصطناعي."); }
    if (["off", "طفي"].includes(a0)) { on.set(tid, 0); return say("🔴 تم إيقاف الذكاء الاصطناعي."); }
    if (!on.get(tid)) return say("⚪ الذكاء متوقف. اكتب: !ذكاء on");
    const q = args.join(" ").trim();
    if (!q) return say("❌ اكتب سؤالك: !ذكاء <سؤال>");
    const K = process.env.GEMINI_API_KEY;
    if (!K) return say("❌ مفتاح Gemini غير مضبوط في Secrets.");
    try {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=" + K, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "أجب بالعربية باختصار وود: " + q }] }] }),
      });
      const d = await r.json();
      const t = d?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!t) { console.log("❌ Gemini:", JSON.stringify(d).slice(0, 300)); return say("❌ لم أستلم ردًا."); }
      say(t);
    } catch (e) {
      console.log("❌ خطأ:", String(e?.message || e));
      say("❌ خطأ في الاتصال بالذكاء الاصطناعي.");
    }
  },
};
