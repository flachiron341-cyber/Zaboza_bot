module.exports = {
  config: {
    name: "help",
    aliases: ["مساعدة", "h"],
    description: "يعرض قائمة الأوامر المتاحة",
    usage: "!help [اسم_الأمر]",
    cooldown: 5,
    adminOnly: false,
  },

  async run({ api, event, args, config, commands }) {
    const { threadID } = event;
    const prefix = config.prefix;

    // إذا طلب المستخدم تفاصيل أمر معين
    if (args[0]) {
      const cmdName = args[0].toLowerCase();
      const cmd = commands.get(cmdName);
      if (!cmd) {
        return api.sendMessage(`❌ الأمر "${args[0]}" غير موجود.`, threadID);
      }
      const c = cmd.config;
      const msg = [
        `📖 معلومات الأمر: ${prefix}${c.name}`,
        `━━━━━━━━━━━━━━━`,
        `📝 الوصف: ${c.description || "لا يوجد وصف"}`,
        `📌 الاستخدام: ${c.usage || prefix + c.name}`,
        c.aliases?.length ? `🔤 الأسماء البديلة: ${c.aliases.join("، ")}` : "",
        `⏱ التهدئة: ${c.cooldown || config.cooldown} ثانية`,
        `🔒 للمشرفين فقط: ${c.adminOnly ? "نعم" : "لا"}`,
      ]
        .filter(Boolean)
        .join("\n");
      return api.sendMessage(msg, threadID);
    }

    // عرض كل الأوامر (بدون تكرار الأسماء البديلة)
    const seen = new Set();
    const list = [];
    for (const [, cmd] of commands) {
      if (!seen.has(cmd.config.name)) {
        seen.add(cmd.config.name);
        list.push(`• ${prefix}${cmd.config.name} — ${cmd.config.description || ""}`);
      }
    }

    const msg = [
      `🤖 قائمة الأوامر (${list.length} أمر)`,
      `━━━━━━━━━━━━━━━`,
      list.join("\n"),
      `━━━━━━━━━━━━━━━`,
      `💡 للمزيد: ${prefix}help [اسم_الأمر]`,
    ].join("\n");

    api.sendMessage(msg, threadID);
  },
};
