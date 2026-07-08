module.exports = {
  config: {
    name: "info",
    aliases: ["معلومات", "about"],
    description: "معلومات عن البوت",
    usage: "!info",
    cooldown: 5,
    adminOnly: false,
  },

  async run({ api, event, config, commands, botID }) {
    const { threadID } = event;

    // حساب الأوامر الفريدة
    const seen = new Set();
    for (const [, cmd] of commands) seen.add(cmd.config.name);

    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const msg = [
      `🤖 ${config.botName}`,
      `━━━━━━━━━━━━━━━`,
      `🆔 ID البوت: ${botID}`,
      `📦 عدد الأوامر: ${seen.size}`,
      `🔑 البادئة: ${config.prefix}`,
      `⏱ وقت التشغيل: ${hours}س ${minutes}د ${seconds}ث`,
      `━━━━━━━━━━━━━━━`,
      `💬 اكتب ${config.prefix}help لرؤية الأوامر`,
    ].join("\n");

    api.sendMessage(msg, threadID);
  },
};
