module.exports = {
  config: {
    name: "كين",
    aliases: ["nickname", "nick"],
    description: "يضع كنية لكل أعضاء القروب | !كين عكس لإزالة الكنيات",
    usage: "!كين [الكنية] | !كين عكس",
    cooldown: 15,
    adminOnly: false,
  },

  async run({ api, event, args }) {
    const { threadID } = event;

    // ── إزالة كل الكنيات ──
    if (args[0] === "عكس" || args[0] === "reset") {
      api.sendMessage("🔄 جاري إزالة كل الكنيات...", threadID);

      api.getThreadInfo(threadID, (err, info) => {
        if (err || !info) {
          return api.sendMessage("❌ فشل الحصول على معلومات القروب.", threadID);
        }

        const participants = info.participantIDs || [];
        let done = 0;
        let failed = 0;
        const total = participants.length;

        if (total === 0) return api.sendMessage("⚠️ لا يوجد أعضاء.", threadID);

        participants.forEach((uid) => {
          api.changeNickname("", threadID, uid, (e) => {
            if (e) failed++;
            else done++;
            if (done + failed === total) {
              api.sendMessage(
                `✅ تم إزالة الكنيات\n✔ نجح: ${done} | ✖ فشل: ${failed}`,
                threadID
              );
            }
          });
        });
      });
      return;
    }

    // ── تعيين كنية لكل الأعضاء ──
    if (!args.length) {
      return api.sendMessage(
        "❌ اكتب الكنية!\nأمثلة:\n  !كين ⭐ نجم القروب\n  !كين عكس  (لإزالة الكنيات)",
        threadID
      );
    }

    const nickname = args.join(" ");
    api.sendMessage(`⏳ جاري تعيين كنية "${nickname}" لكل الأعضاء...`, threadID);

    api.getThreadInfo(threadID, (err, info) => {
      if (err || !info) {
        return api.sendMessage("❌ فشل الحصول على معلومات القروب.", threadID);
      }

      const participants = info.participantIDs || [];
      let done = 0;
      let failed = 0;
      const total = participants.length;

      if (total === 0) return api.sendMessage("⚠️ لا يوجد أعضاء.", threadID);

      participants.forEach((uid) => {
        api.changeNickname(nickname, threadID, uid, (e) => {
          if (e) failed++;
          else done++;
          if (done + failed === total) {
            api.sendMessage(
              `✅ تم تعيين الكنية: "${nickname}"\n✔ نجح: ${done} | ✖ فشل: ${failed}`,
              threadID
            );
          }
        });
      });
    });
  },
};
