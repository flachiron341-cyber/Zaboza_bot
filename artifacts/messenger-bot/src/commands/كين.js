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
    const threadID = String(event.threadID);

    if (args[0] === "عكس" || args[0] === "reset") {
      return applyNickname(api, threadID, "");
    }

    if (!args.length) {
      return api.sendMessage(
        "❌ اكتب الكنية!\nأمثلة:\n  !كين ⭐ نجم القروب\n  !كين عكس  (لإزالة الكنيات)",
        threadID
      );
    }

    return applyNickname(api, threadID, args.join(" "));
  },
};

async function applyNickname(api, threadID, nickname) {
  const label = nickname ? `تعيين كنية "${nickname}"` : "إزالة الكنيات";
  await api.sendMessage(`⏳ جاري ${label}...`, threadID);

  // جلب معلومات القروب
  const info = await new Promise((resolve) => {
    api.getThreadInfo(threadID, (err, data) => resolve(err ? null : data));
  });

  if (!info) {
    return api.sendMessage("❌ فشل الحصول على معلومات القروب.", threadID);
  }

  const participants = (info.participantIDs || []).map(String);
  if (!participants.length) {
    return api.sendMessage("⚠️ لا يوجد أعضاء في القروب.", threadID);
  }

  let done = 0;
  let failed = 0;

  // معالجة متسلسلة مع تأخير 800ms بين كل طلب لتجنّب حظر فيسبوك
  for (const uid of participants) {
    try {
      // api.setNickname هو الاسم الصحيح في ws3-fca
      await new Promise((resolve, reject) => {
        api.setNickname(nickname, threadID, uid, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      done++;
    } catch {
      failed++;
    }
    await new Promise((r) => setTimeout(r, 800));
  }

  const icon = nickname ? "✅" : "🔄";
  await api.sendMessage(
    `${icon} ${label}\n✔ نجح: ${done} | ✖ فشل: ${failed}`,
    threadID
  );
}
