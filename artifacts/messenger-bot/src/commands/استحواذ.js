module.exports = {
  config: {
    name: "استحواذ",
    aliases: ["takeover"],
    description: "إزالة صلاحية المسؤول من جميع المسؤولين وترك البوت فقط",
    usage: "!استحواذ",
    cooldown: 10,
    adminOnly: true,
  },

  async run({ api, event, botID }) {
    const threadID = String(event.threadID);
    const selfID = String(botID || api.getCurrentUserID());
    const info = await new Promise((resolve) => {
      api.getThreadInfo(threadID, (err, data) => resolve(err ? null : data));
    });

    if (!info) return api.sendMessage("❌ فشل الحصول على معلومات القروب.", threadID);

    const adminIDs = (info.adminIDs || [])
      .map((admin) => String(typeof admin === "object" ? admin.id || admin.userID : admin))
      .filter((uid) => uid && uid !== selfID);

    if (!adminIDs.length) {
      return api.sendMessage("✅ البوت هو المسؤول الوحيد حالياً.", threadID);
    }

    let removed = 0;
    for (const uid of adminIDs) {
      try {
        const result = await api.gcrule("unadmin", uid, threadID);
        if (!result || result.type !== "error_gc_rule") removed++;
      } catch {}
    }

    return api.sendMessage(
      `⚡ تم الاستحواذ على إدارة القروب.\n` +
      `✅ تمت إزالة صلاحية ${removed} مسؤولاً، والبوت هو المسؤول الوحيد.`,
      threadID
    );
  },
};