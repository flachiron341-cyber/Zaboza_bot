const { getUserNames } = require("../utils/mentionStyle");

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

    // تمرير threadInfo حتى تُقرأ الأسماء من بيانات القروب أولاً (إصلاح "عضو عضو عضو")
    const names = await getUserNames(api, participants, threadInfo);

    // ── إصلاح مهم: منع تكرار نص الوسم نفسه ──
    // ماسنجر يرفظ ربط الوسوم المكررة بنفس النص، لذلك نجعل كل وسم فريداً.
    const usedCounts = new Map();
    const mentions = participants.map((id, index) => {
      const base = names[id] || `عضو${index + 1}`;
      const count = usedCounts.get(base) || 0;
      usedCounts.set(base, count + 1);
      const tag = count === 0 ? `@${base}` : `@${base}${count + 1}`;
      return { tag, id };
    });

    const body = `${intro}\n${mentions.map((mention) => mention.tag).join(" ")}`;
    await api.sendMessage({ body, mentions }, threadID);
  },
};
