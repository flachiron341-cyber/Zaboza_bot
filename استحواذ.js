// ✅ غيّر هذا الرقم إذا تغيّر حسابك الشخصي (المطور)
const DEVELOPER_ID = "61595316508781";

function setAdminSafe(api, threadID, userID, makeAdmin) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (err) => {
      if (settled) return;
      settled = true;
      err ? reject(err) : resolve();
    };
    try {
      if (typeof api.changeAdminStatus === "function") {
        const p = api.changeAdminStatus(threadID, userID, makeAdmin, done);
        if (p && typeof p.then === "function") p.then(() => done(null), done);
      } else if (typeof api.gcmember === "function") {
        const p = api.gcmember(makeAdmin ? "add-admin" : "remove-admin", threadID, userID, done);
        if (p && typeof p.then === "function") p.then(() => done(null), done);
      } else {
        done(new Error("NO_ADMIN_FUNCTION"));
      }
    } catch (err) {
      done(err);
    }
  });
}

module.exports = {
  config: {
    name: "استحواذ",
    aliases: ["takeover", "سيطرة"],
    description: "إزالة صلاحية المشرف من جميع الأعضاء ما عدا المطور",
    usage: "!استحواذ",
    cooldown: 5,
    adminOnly: true,
  },

  async run({ api, event, botID }) {
    const threadID = String(event.threadID);
    try {
      const info = await api.getThreadInfo(threadID);
      const admins = (info?.adminIDs || [])
        .map((a) => String(typeof a === "object" ? a.id : a))
        .filter(Boolean);

      const targets = admins.filter(
        (id) => id !== DEVELOPER_ID && id !== String(botID || "")
      );

      if (!targets.length) {
        api.sendMessage("ℹ️ لا يوجد مشرفون آخرون في هذا القروب.", threadID).catch(() => {});
        return;
      }

      api.sendMessage(`⏳ جاري إزالة إشراف ${targets.length} عضو...`, threadID).catch(() => {});

      let ok = 0;
      let fail = 0;
      for (const id of targets) {
        try {
          await setAdminSafe(api, threadID, id, false);
          ok++;
        } catch (err) {
          fail++;
          console.log("❌ خطأ استحواذ:", JSON.stringify(err, Object.getOwnPropertyNames(err || {})));
        }
        await new Promise((r) => setTimeout(r, 3000));
      }

      api.sendMessage(`✅ انتهى الاستحواذ: ${ok} تمت إزالتهم${fail ? `، ${fail} فشل` : ""}.`, threadID).catch(() => {});
    } catch (err) {
      console.log("❌ خطأ استحواذ عام:", JSON.stringify(err, Object.getOwnPropertyNames(err || {})));
      api.sendMessage("❌ حدث خطأ أثناء تنفيذ الأمر.", threadID).catch(() => {});
    }
  },
};
