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
      console.log("❌ خطأ ادمن:", JSON.stringify(err, Object.getOwnPropertyNames(err || {})));
      api.sendMessage("❌ فشل تنفيذ الأمر.", threadID).catch(() => {});
    }
  },
};
