const DEVELOPER_ID = "61595316508781";

function setAdminSafe(api, threadID, userID, makeAdmin) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (err, data) => {
      if (settled) return;
      settled = true;
      if (err) return reject(err);
      if (data && (data.error || String(data.type || "").startsWith("error"))) {
        return reject(new Error(data.error || "خطأ غير معروف"));
      }
      resolve(data);
    };
    try {
      if (typeof api.gcrule === "function") {
        const p = api.gcrule(makeAdmin ? "admin" : "unadmin", String(userID), String(threadID), done);
        if (p && typeof p.then === "function") p.then((d) => done(null, d), done);
      } else {
        done(new Error("NO_GCRULE"));
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
          const msg = String(err?.message || err);
          if (msg.includes("not an admin")) {
            ok++;
          } else {
            fail++;
            console.log("❌ خطأ استحواذ:", msg);
          }
        }
        await new Promise((r) => setTimeout(r, 3000));
      }

      api.sendMessage(`✅ انتهى الاستحواذ: ${ok} تمت إزالتهم${fail ? `، ${fail} فشل` : ""}.`, threadID).catch(() => {});
    } catch (err) {
      console.log("❌ خطأ استحواذ عام:", String(err?.message || err));
      api.sendMessage("❌ حدث خطأ أثناء تنفيذ الأمر.", threadID).catch(() => {});
    }
  },
};
