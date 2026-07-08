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
    const prefix = config.prefix;

    if (args[0]) {
      const cmd = commands.get(args[0].toLowerCase());
      if (!cmd) return api.sendMessage(`❌ الأمر "${args[0]}" غير موجود.`, threadID);
      const c = cmd.config;
      const msg = [
        `┌─────────────────────┐`,
        `│  📖 ${c.name}`,
        `└─────────────────────┘`,
        `📝 ${c.description || "لا يوجد وصف"}`,
        `📌 الاستخدام: ${c.usage || prefix + c.name}`,
        c.aliases?.length ? `🔤 الأسماء البديلة: ${c.aliases.join("، ")}` : "",
        `⏱ التهدئة: ${c.cooldown || config.cooldown}ث`,
        `🔒 للمشرفين: ${c.adminOnly ? "نعم" : "لا"}`,
      ].filter(Boolean).join("\n");
      return api.sendMessage(msg, threadID);
    }

    const seen = new Set();
    const list = [];
    for (const [, cmd] of commands) {
      if (!seen.has(cmd.config.name)) {
        seen.add(cmd.config.name);
        list.push(`  ${prefix}${cmd.config.name}`);
      }
    }

    const msg = [
      `╔══════════════════════╗`,
      `║   🤖  zaboza bot      ║`,
      `╚══════════════════════╝`,
      ``,
      `📋 الأوامر المتاحة (${list.length}):`,
      list.join("\n"),
      ``,
      `💡 للتفاصيل: ${prefix}مساعدة [أمر]`,
    ].join("\n");

    api.sendMessage(msg, threadID);
  },
};
