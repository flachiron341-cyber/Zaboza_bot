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
      ["نيم", "تغيير اسم القروب"],
      ["نيم_ايقاف", "إيقاف حماية اسم القروب"],
      ["كين", "تعيين كنية لكل الأعضاء أو مسحها بـ حذف أو عكس"],
      ["كين حذف", "مسح كنيات جميع أعضاء القروب"],
      ["كين ايقاف", "إيقاف عملية تغيير الكنيات الجارية"],
      ["صور تلقائية", "تشغيل أو إيقاف صور أحداث القروب"],
      ["منشن", "منشن جماعي لأعضاء القروب للمطورين"],
      ["مجموعة", "إنشاء مجموعة مع شخص بالرد عليه"],
      ["مغادرة", "إخراج البوت من القروب"],
      ["دخول", "تعيين صورة ترحيب الأعضاء (بالرد على صورة)"],
      ["خروج", "مغادرة البوت أو تعيين صورة المغادرة (بالرد على صورة)"],
      ["دخول_البوت", "تعيين صورة دخول البوت (بالرد على صورة)"],
      ["اضافة", "إضافة عضو للقروب"],
      ["طرد", "طرد بالرد أو ID أو رابط حساب"],
      ["استخدام", "منح صلاحية استخدام لعضو محدد"],
      ["مطور", "إدارة المطورين (للمطور الرئيسي)"],
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
      ["صورة", "إرسال ست صور مرتبطة بموضوع البحث"],
      ["ذكاء", "بحث معرفي مختصر من مصادر عامة"],
      ["اغنية", "ملف صوتي كامل مرخّص أو رابط الاستماع"],
      ["سورة", "إرسال تلاوة السورة كاملة باسمها أو رقمها"],
      ["ترجمة", "ترجمة نص إلى لغة أخرى"],
      ["طقس", "عرض حالة الطقس"],
      ["وقت", "عرض الوقت في مدينة"],
      ["اقتباس", "إرسال اقتباس عشوائي"],
      ["حظ", "نتيجة حظ ترفيهية"],
      ["حذف", "حذف صورة قائمة الأوامر"],
      ["اسماء", "اقتراح أسماء مميزة"],
      ["بايو", "إنشاء Bio جاهز"],
      ["رموز", "رموز وزخارف قابلة للنسخ"],
    ],
  },
  الألعاب: {
    icon: "🧠",
    items: [
      ["اسئلة", "أسئلة ثقافية"],
      ["رياضيات", "مسائل رياضية"],
      ["تخمين", "لعبة تخمين رقم"],
      ["xo", "لعبة XO بين لاعبين"],
      ["حجر", "حجر ورق مقص"],
      ["صحا_وخطأ", "لعبة صح أو خطأ"],
      ["حروف", "تكوين كلمات من حروف"],
      ["معكوس", "اكتشاف الكلمة المعكوسة"],
      ["الغاء", "إلغاء اللعبة الحالية"],
    ],
  },
  الإرسال: {
    icon: "📨",
    items: [
      ["اتاك", "إرسال تلقائي مستمر حسب تايم حتى الإيقاف (للمطورين)"],
      ["تايم", "ضبط توقيت الإرسال (للمطورين)"],
    ],
  },
  الإعدادات: {
    icon: "⚙️",
    items: [
      ["وضع", "حفظ صورة قائمة الأوامر"],
        ["بادئة", "إضافة أو حذف بادئات البوت (للمطور الرئيسي)"],
        ["رسالة حذف", "حذف رسالة البوت عند الرد عليها"],
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