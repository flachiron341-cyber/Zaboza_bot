module.exports = {
  config: {
    name: "معلومات",
    aliases: ["info", "about"],
    description: "معلومات عن البوت",
    usage: "!معلومات",
    cooldown: 5,
    adminOnly: false,
  },

  async run({ api, event, config, commands, botID }) {
    const { threadID } = event;

    const seen = new Set();
    for (const [, cmd] of commands) seen.add(cmd.config.name);

    const up = process.uptime();
    const h = Math.floor(up / 3600);
    const m = Math.floor((up % 3600) / 60);
    const s = Math.floor(up % 60);

    const msg = [
      `╔══════════════════════╗`,
      `║   🤖  zaboza bot      ║`,
      `╚══════════════════════╝`,
      ``,
      `🆔 ID: ${botID}`,
      `📦 الأوامر: ${seen.size}`,
      `🔑 البادئة: ${config.prefix}`,
      `⏱ وقت التشغيل: ${h}س ${m}د ${s}ث`,
      ``,
      `💬 ${config.prefix}مساعدة — لعرض الأوامر`,
    ].join("\n");

    api.sendMessage(msg, threadID);
  },
};
