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

function getTargetID(event) {
  const replyID = event?.messageReply?.senderID;
  if (replyID) return String(replyID);
  const mention = event?.mentions ? Object.keys(event.mentions)[0] : null;
  if (mention) return String(mention);
  return null;
}

module.exports = {
  config: {
    name: "ادمن",
    aliases: ["admin", "ترقية"],
    description: "منح أو إزالة صلاحية المشرف (بالرد على رسالة العضو)",
    usage: "!ادمن (رد على العضو) | !ادمن ازالة (رد على العضو)",
    cooldown: 2,
    adminOnly: true,
  },

  async run({ api, event, args }) {
    const threadID = String(event.threadID);
    const action = String(args[0] || "").trim().toLowerCase();
    const remove = ["ازالة", "إزالة", "remove", "demote", "unadmin"].includes(action);

    const targetID = getTargetID(event);
    if (!targetID) {
      api.sendMessage("❌ ردّ على رسالة العضو الذي تريد ترقيته أو إزالته أولًا.", threadID).catch(() => {});
      return;
    }

    try {
      await setAdminSafe(api, threadID, targetID, !remove);
      api.sendMessage(`✅ ${remove ? "تمت إزالة إشراف" : "تم ترقية"} العضو بنجاح.`, threadID).catch(() => {});
    } catch (err) {
      const msg = String(err?.message || err);
      if (msg.includes("already an admin")) {
        api.sendMessage("ℹ️ العضو مشرف بالفعل.", threadID).catch(() => {});
      } else if (msg.includes("not an admin")) {
        api.sendMessage("ℹ️ العضو ليس مشرفًا أصلًا.", threadID).catch(() => {});
      } else {
        console.log("❌ خطأ ادمن:", msg);
        api.sendMessage("❌ فشل تنفيذ الأمر.", threadID).catch(() => {});
      }
    }
  },
};
