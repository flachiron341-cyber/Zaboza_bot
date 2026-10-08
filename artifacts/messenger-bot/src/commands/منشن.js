module.exports = {
  config: {
    name: "منشن",
    aliases: ["mentionall", "tagall"],
    description: "منشن جماعي لأعضاء القروب (للمطورين فقط)",
    usage: "!منشن [رسالة اختيارية]",
    cooldown: 60,
    adminOnly: true,
  },

  async run({ api, event, args }) {
    const threadID = String(event.threadID);
    const threadInfo = await api.getThreadInfo(threadID);
    const participants = [...new Set((threadInfo?.participantIDs || []).map(String).filter(Boolean))]
      .filter((participantID) => participantID !== String(api.getCurrentUserID()));
    if (!participants.length) return;

    const intro = args.join(" ").trim() || "تنبيه لأعضاء القروب:";
    const mentions = participants.map((id, index) => ({ tag: `@عضو${index + 1}`, id }));
    const body = `${intro}\n${mentions.map((mention) => mention.tag).join(" ")}`;
    await api.sendMessage({ body, mentions }, threadID);
  },
};
