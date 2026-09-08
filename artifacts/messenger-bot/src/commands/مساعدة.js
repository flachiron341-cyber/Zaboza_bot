const fs = require("fs");
const path = require("path");

const menuImagePath = path.join(__dirname, "../../assets/menu.jpg");
const WIDTH = 34;

const CATEGORIES = {
  عام: {
    icon: "✨",
    items: [
      ["بينغ", "قياس سرعة استجابة البوت"],
      ["معلومات", "معلومات البوت"],
      ["احصائيات", "إحصائيات التشغيل والرسائل"],
      ["uid", "عرض معرّف حسابك"],
      ["بحث", "البحث عن كلمة ونتائج مختصرة"],
      ["مساعدة", "قائمة المجالات والأوامر"],
    ],
  },
  القروب: {
    icon: "👥",
    items: [
      ["كين", "تغيير كنيات كل الأعضاء"],
      ["كين_حماية", "حماية الكنيات من التغيير"],
      ["كين_حماية_ايقاف", "إيقاف حماية الكنيات"],
      ["نيم", "تغيير اسم القروب"],
      ["حماية", "حماية اسم القروب والكنيات القديمة"],
      ["مجموعة", "إنشاء مجموعة مع شخص بالرد عليه"],
      ["استحواذ", "ترك البوت المسؤول الوحيد"],
      ["مغادرة", "إخراج البوت من القروب"],
      ["اضافة", "إضافة عضو للقروب"],
      ["طرد", "طرد عضو من القروب"],
      ["استخدام", "تحديد من يستخدم البوت"],
    ],
  },
  الترفيه: {
    icon: "🎭",
    items: [
      ["قبلة", "إرسال صورة قبلة"],
      ["زواج", "إرسال صورة زواج"],
      ["طلاق", "إرسال صورة طلاق"],
      ["سجن", "إرسال سجن"],
      ["مدح", "مدح عضو"],
      ["قول", "تحويل النص إلى صوت"],
      ["نرد", "رمي النرد"],
      ["صورة", "بحث دقيق عن صورة"],
      ["اغنية", "إرسال أغنية كرسالة صوتية"],
      ["ترجمة", "ترجمة نص إلى لغة أخرى"],
      ["طقس", "عرض حالة الطقس"],
      ["وقت", "عرض الوقت في مدينة"],
      ["اقتباس", "إرسال اقتباس عشوائي"],
      ["حظ", "نتيجة حظ ترفيهية"],
      ["حذف", "حذف صورة قائمة الأوامر"],
    ],
  },
  الألعاب: {
    icon: "🧠",
    items: [
      ["اسئلة", "أسئلة ثقافية"],
      ["رياضيات", "مسائل رياضية"],
      ["تخمين", "لعبة تخمين رقم"],
    ],
  },
  الاتاك: {
    icon: "⚡",
    items: [
      ["اتاك", "إرسال رسالة متكررة"],
      ["تايم", "تعيين مدة ثابتة أو نطاق"],
    ],
  },
  الإعدادات: {
    icon: "⚙️",
    items: [
      ["وضع", "حفظ صورة قائمة الأوامر"],
      ["تايم", "تعيين توقيت الاتاك"],
    ],
  },
};

function fit(text) {
  const chars = [...String(text)];
  return chars.length > WIDTH ? chars.slice(0, WIDTH - 1).join("") + "…" : chars.join("") + " ".repeat(Math.max(0, WIDTH - chars.length));
}

function renderCategory(prefix, name, category) {
  const lines = [
    `╔${"═".repeat(WIDTH + 4)}╗`,
    `║  ${fit(`${category.icon} ${name}`)}  ║`,
    `╠${"═".repeat(WIDTH + 4)}╣`,
  ];

  for (const [command, description] of category.items) {
    lines.push(`║  ${fit(`${prefix}${command}  —  ${description}`)}  ║`);
  }

  lines.push(`╚${"═".repeat(WIDTH + 4)}╝`);
  return lines.join("\n");
}

module.exports = {
  config: {
    name: "مساعدة",
    aliases: ["help", "cmds", "اوامر"],
    description: "يعرض المجالات أو أوامر مجال محدد",
    usage: "!مساعدة | !مساعدة القروب",
    cooldown: 5,
    adminOnly: false,
  },

  async run({ api, event, args, config }) {
    const threadID = String(event.threadID);
    const prefix = config.prefix;
    const requested = args.join(" ").trim().toLowerCase();
    const categoryName = Object.keys(CATEGORIES).find(
      (name) => name.toLowerCase() === requested
    );

    let text;
    if (categoryName) {
      text =
        `🤖 ${config.botName}\n` +
        `╰─ قائمة مجال ${categoryName}\n\n` +
        renderCategory(prefix, categoryName, CATEGORIES[categoryName]);
    } else if (requested) {
      text = `❌ المجال غير موجود.\nالمجالات المتاحة: ${Object.keys(CATEGORIES).join("، ")}`;
    } else {
      text = [
        `╔${"═".repeat(WIDTH + 4)}╗`,
        `║  ${fit(`🤖 ${config.botName} — المجالات`)}  ║`,
        `╠${"═".repeat(WIDTH + 4)}╣`,
        ...Object.entries(CATEGORIES).map(
          ([name, category]) => `║  ${fit(`${category.icon} ${name}  →  !مساعدة ${name}`)}  ║`
        ),
        `╠${"═".repeat(WIDTH + 4)}╣`,
        `║  ${fit("اختر مجالاً لعرض أوامره بالتفصيل")}  ║`,
        `╚${"═".repeat(WIDTH + 4)}╝`,
      ].join("\n");
    }

    if (fs.existsSync(menuImagePath)) {
      return api.sendMessage(
        { body: text, attachment: fs.createReadStream(menuImagePath) },
        threadID
      );
    }
    return api.sendMessage(text, threadID);
  },
};