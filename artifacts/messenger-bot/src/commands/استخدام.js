const usageAccess = require("../utils/usageAccess");

module.exports = {
  config: {
    name: "استخدام",
    aliases: ["use", "access"],
    description: "يقفل الاستخدام للمطورين أو يمنح عضواً محدداً صلاحية في القروب",
    usage: "!استخدام المطور | !استخدام (رد على شخص) | !استخدام سحب (رد)",
    cooldown: 3,
    adminOnly: true,
  },

  async run({ api, event, args, messageReply, config }) {
    const threadID = String(event.threadID);
    const choice = String(args[0] || "").toLowerCase();

    if (choice === "المطور" || choice === "developer" || choice === "dev") {
      usageAccess.setMode(threadID, "developer");
      return api.sendMessage(
        "🔒 تم قفل استخدام البوت للمطورين فقط في هذا القروب.",
        threadID
      );
    }

    if (["الجميع", "الكل", "all"].includes(choice)) {
      return api.sendMessage("🚫 الاستخدام المفتوح للجميع معطّل. امنح الصلاحية لكل شخص بالرد على رسالته.", threadID);
    }

    if (!messageReply) {
      return api.sendMessage(
        "❌ استخدم أحد الخيارات:\n" +
        "• !استخدام المطور\n" +
        "• !استخدام (رد على رسالة الشخص لمنحه الصلاحية)\n" +
        "• !استخدام سحب (رد على رسالة الشخص لإلغاء الصلاحية)",
        threadID
      );
    }

    const targetID = String(messageReply.senderID || "");
    if (!targetID) {
      return api.sendMessage("❌ لم أستطع معرفة صاحب الرسالة التي رددت عليها.", threadID);
    }

    if (choice === "سحب" || choice === "إزالة" || choice === "remove") {
      const removed = usageAccess.revokeUser(threadID, targetID);
      return api.sendMessage(
        removed ? `🔒 أُلغيت صلاحية ${targetID}.` : `ℹ️ لم تكن لدى ${targetID} صلاحية إضافية.`,
        threadID
      );
    }

    usageAccess.grantUser(threadID, targetID);
    return api.sendMessage(
      `✅ أصبح العضو ${targetID} مسموحاً له باستخدام البوت في هذا القروب.\n` +
      `📌 الوضع الحالي: ${usageAccess.describe(threadID)}`,
      threadID
    );
  },
};