// ═══════════════════════════════════════
//  أمر: مساعدة  —  قائمة الأوامر المنسّقة
// ═══════════════════════════════════════

const W = 28;

function pad(str, width) {
  const s = String(str ?? "");
  const len = [...s].length;
  return s + " ".repeat(Math.max(0, width - len));
}

function trunc(str, max) {
  const s = String(str ?? "");
  return [...s].length > max ? [...s].slice(0, max - 1).join("") + "…" : s;
}

function row(content) {
  return `║ ${pad(content, W)} ║`;
}

const SEP  = `╠${"═".repeat(W + 2)}╣`;
const BLANK = `║ ${" ".repeat(W)} ║`;

function section(icon, title, items) {
  const lines = [
    SEP,
    row(`${icon} ${title}`),
    SEP,
  ];
  for (const [cmd, desc] of items) {
    lines.push(row(`!${pad(cmd, 10)} ${trunc(desc, W - 12)}`));
  }
  return lines;
}

module.exports = {
  config: {
    name: "مساعدة",
    aliases: ["help", "cmds", "اوامر"],
    description: "يعرض قائمة كل الأوامر المتاحة",
    usage: "!مساعدة",
    cooldown: 5,
    adminOnly: false,
  },

  async run({ api, event, config }) {
    const threadID = String(event.threadID);
    const p = config.prefix;

    const lines = [
      `╔${"═".repeat(W + 2)}╗`,
      row(`🤖  zaboza bot — الأوامر`),
      row(`📌 البادئة: ${p}   |  19 أمر`),
      `╠${"═".repeat(W + 2)}╣`,
      ...section("📋", "عام", [
        ["بينغ",    "قياس سرعة الاستجابة"],
        ["معلومات", "معلومات عن البوت"],
        ["uid",     "عرض ID حسابك"],
        ["تايم",    "تأخير ثابت أو عشوائي"],
        ["مساعدة",  "قائمة الأوامر"],
      ]),
      BLANK,
      ...section("👥", "القروب", [
        ["نيم",     "تغيير اسم القروب"],
        ["كين",     "تغيير كنيات الأعضاء"],
        ["حماية",   "حماية اسم القروب"],
        ["طرد",     "طرد عضو (مطور فقط)"],
        ["اضافة",   "إضافة عضو (مطور فقط)"],
      ]),
      BLANK,
      ...section("📣", "الاتاك", [
        ["اتاك",    "إرسال رسالة متكررة"],
        ["تايم",    "ثابت أو نطاق مثل 15_30"],
      ]),
      BLANK,
      ...section("🎭", "الترفيه", [
        ["قبلة",    "يرسل صورة قبلة 💋"],
        ["زواج",    "يرسل صورة زواج 💍"],
        ["طلاق",    "يرسل صورة طلاق 💔"],
        ["سجن",     "يضع شخص في السجن 🔒"],
        ["مدح",     "يمدح شخص بكلام جميل"],
        ["صورة",    "يبحث ويرسل صور 🖼️"],
        ["قول",     "يحوّل نص لصوت 🎙️"],
        ["نرد",     "يرمي نرداً عشوائياً"],
        ["فيديو",   "يجلب فيديو من يوتيوب"],
      ]),
      BLANK,
      ...section("🧠", "الألعاب", [
        ["اسئلة",   "أسئلة ثقافية 30 ثانية"],
        ["رياضيات", "مسائل رياضيات 30 ثانية"],
      ]),
      `╚${"═".repeat(W + 2)}╝`,
      ``,
      `💡 مثال: ${p}صورة ميسي | ${p}قول مرحبا`,
    ];

    await api.sendMessage(lines.join("\n"), threadID);
  },
};
