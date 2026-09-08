const state = require("../state");
const { info } = require("../utils/brand");

function formatUptime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `${days}ي ${hours}س ${minutes}د ${secs}ث`;
}

module.exports = {
  config: {
    name: "احصائيات",
    aliases: ["إحصائيات", "stats", "stat"],
    description: "يعرض إحصائيات تشغيل البوت",
    usage: "!احصائيات",
    cooldown: 5,
    adminOnly: false,
  },

  async run({ api, event }) {
    const stats = state.stats;
    const uptime = (Date.now() - stats.startedAt) / 1000;
    return api.sendMessage(
      info("إحصائيات ZABOZA", [
        `⏱ وقت التشغيل: ${formatUptime(uptime)}`,
        `💬 الرسائل المستلمة: ${stats.messagesReceived}`,
        `⚙️ الأوامر المعالجة: ${stats.commandsProcessed}`,
        `❌ أخطاء الأوامر: ${stats.commandFailures}`,
      ]),
      String(event.threadID)
    );
  },
};