const usageAccess = require("../utils/usageAccess");

module.exports = {
  config: {
    name: "استخدام",
    aliases: ["استعمال", "use"],
    description: "إدارة صلاحية استخدام البوت في هذا القروب",
    usage: "!استخدام (رد لمنح) | !استخدام سحب (رد) | !استخدام الكل | !استخدام مطور | !استخدام حالة",
    cooldown: 3,
    adminOnly: true,
  },
  async run({ api, event, args }) {
    const threadID = String(event.threadID);
    const say = (t) => api.sendMessage(t, threadID);
    const a0 = String(args[0] || "").trim();
    const target = String((event.messageReply && event.messageReply.senderID) || args[1] || "").trim();

    if (a0 === "سحب" || a0 === "سحب!") {
      if (!target) return say("❌ رد على رسالة الشخص الذي تريد سحب صلاحيته.");
      usageAccess.revokeUser(threadID, target);
      return say("✅ تم سحب صلاحية الاستخدام من: " + target);
    }
    if (a0 === "الكل" || a0 === "all") {
      usageAccess.setMode(threadID, "all");
      return say("✅ الوضع الآن: الجميع يستطيعون استخدام البوت في هذا القروب.");
    }
    if (a0 === "مطور" || a0 === "dev") {
      usageAccess.setMode(threadID, "developer");
      return say("✅ الوضع الآن: المطور فقط.");
    }
    if (a0 === "حالة" || a0 === "" || a0 === "status") {
      return say("📋 حالة القروب: " + usageAccess.describe(threadID));
    }
    const grantTarget = String((event.messageReply && event.messageReply.senderID) || a0 || "").trim();
    if (grantTarget) {
      usageAccess.grantUser(threadID, grantTarget);
      return say("✅ تم منح صلاحية الاستخدام لـ: " + grantTarget);
    }
    return say("❌ الصيغ:\n• رد على شخص + !استخدام (لمنحه الصلاحية)\n• رد + !استخدام سحب (لسحبها)\n• !استخدام الكل | !استخدام مطور | !استخدام حالة");
  },
};
