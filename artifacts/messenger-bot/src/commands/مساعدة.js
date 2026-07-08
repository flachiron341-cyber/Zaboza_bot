// ═══════════════════════════════════════
//  أمر: مساعدة  —  قائمة الأوامر المنسّقة
// ═══════════════════════════════════════

// عرض الصندوق الداخلي (عدد الأحرف بين الحدين)
const W = 28;

/** يملأ النص بمسافات حتى العرض المطلوب */
function pad(str, width) {
  const s = String(str ?? "");
  // حساب تقريبي للأحرف العربية الموسّعة
  const len = [...s].length;
  const spaces = Math.max(0, width - len);
  return s + " ".repeat(spaces);
}

/** يقطع النص إن تجاوز الحدّ ويضيف … */
function trunc(str, max) {
  const s = String(str ?? "");
  return [...s].length > max ? [...s].slice(0, max - 1).join("") + "…" : s;
}

/** يبني صفّاً كاملاً داخل الصندوق */
function row(content) {
  return `║ ${pad(content, W)} ║`;
}

/** خط فاصل */
const SEP = `╠${"═".repeat(W + 2)}╣`;
/** سطر فارغ */
const EMPTY = `║${" ".repeat(W + 2)}║`;
/** الخط العلوي */
const TOP = `╔${"═".repeat(W + 2)}╗`;
/** الخط السفلي */
const BOT = `╚${"═".repeat(W + 2)}╝`;

// ──────────────────────────────────────
module.exports = {
  config: {
    name: "مساعدة",
    aliases: ["help", "h"],
    description: "يعرض قائمة الأوامر المتاحة",
    usage: "!مساعدة [اسم_الأمر]",
    cooldown: 5,
    adminOnly: false,
  },

  async run({ api, event, args, config, commands }) {
    const { threadID } = event;
    const p = config.prefix; // البادئة

    // ══════════════════════════════════
    //  تفاصيل أمر واحد
    // ══════════════════════════════════
    if (args[0]) {
      const key = args[0].toLowerCase().replace(/^!/, "");
      const cmd = commands.get(key);

      if (!cmd) {
        const msg = [
          TOP,
          row("❌  أمر غير موجود"),
          SEP,
          row(`الأمر « ${trunc(args[0], 18)} » غير متاح`),
          row(`اكتب ${p}مساعدة لعرض الكل`),
          BOT,
        ].join("\n");
        return api.sendMessage(msg, threadID);
      }

      const c = cmd.config;
      const desc   = trunc(c.description ?? "لا يوجد وصف", W - 2);
      const usage  = trunc(c.usage ?? p + c.name, W - 2);
      const aliasLine = c.aliases?.length
        ? trunc(c.aliases.map(a => p + a).join("  ،  "), W - 2)
        : "—";
      const cooldown = `${c.cooldown ?? config.cooldown} ثانية`;
      const adminTxt = c.adminOnly ? "✅ نعم" : "❌ لا";

      const msg = [
        TOP,
        row(`📖  ${trunc(c.name, W - 4)}`),
        SEP,
        row(`📝  ${desc}`),
        EMPTY,
        row(`📌 الاستخدام`),
        row(`   ${usage}`),
        EMPTY,
        row(`🔤 الأسماء البديلة`),
        row(`   ${aliasLine}`),
        EMPTY,
        row(`⏱ التهدئة :  ${cooldown}`),
        row(`🔒 للمشرفين :  ${adminTxt}`),
        BOT,
      ].join("\n");

      return api.sendMessage(msg, threadID);
    }

    // ══════════════════════════════════
    //  القائمة الرئيسية
    // ══════════════════════════════════
    const categories = [
      {
        icon: "⚙️",
        title: "عـــام",
        cmds: ["بينغ", "معلومات", "مساعدة", "uid"],
      },
      {
        icon: "🏠",
        title: "القـروب",
        cmds: ["نيم", "كين", "حماية"],
      },
      {
        icon: "💣",
        title: "الاتـاك",
        cmds: ["اتاك", "تايم"],
      },
      {
        icon: "🎭",
        title: "الترفيـه",
        cmds: ["قبلة", "زواج", "طلاق", "سجن", "مدح", "صورة", "قول"],
      },
      {
        icon: "🎮",
        title: "الألعـاب",
        cmds: ["اسئلة", "رياضيات", "نرد"],
      },
    ];

    // عدد الأوامر الفريدة
    const seen = new Set();
    for (const [, cmd] of commands) seen.add(cmd.config.name);
    const total = seen.size;

    const parts = [];

    // ─── الهيدر ───
    parts.push(
      TOP,
      row("✨  Z A B O Z A   B O T"),
      row("    قائمة الأوامر الكاملة"),
      SEP,
      row(`📦 الأوامر: ${total}   │   البادئة: ${p}`),
      BOT
    );

    // ─── الفئات ───
    for (const cat of categories) {
      const available = cat.cmds.filter(name => commands.has(name));
      if (!available.length) continue;

      parts.push(
        "",
        TOP,
        row(`${cat.icon}  ${cat.title}`),
        SEP
      );

      for (const name of available) {
        const cmd    = commands.get(name);
        const desc   = trunc(cmd?.config?.description ?? "", W - 7);
        parts.push(row(`◈ ${p}${name}`));
        parts.push(row(`  ↳ ${desc}`));
        parts.push(EMPTY);
      }

      // نزيل السطر الفارغ الأخير قبل القفل
      parts.pop();
      parts.push(BOT);
    }

    // ─── الفوتر ───
    parts.push(
      "",
      TOP,
      row("💡 لمعرفة تفاصيل أي أمر اكتب:"),
      row(`   ${p}مساعدة [اسم الأمر]`),
      BOT
    );

    api.sendMessage(parts.join("\n"), threadID);
  },
};
