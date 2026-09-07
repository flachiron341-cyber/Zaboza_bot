const usageAccess = require("../utils/usageAccess");

module.exports = {
  config: {
    name: "استخدام",
    aliases: ["use", "access"],
    description: "يحدد من يستطيع استخدام البوت في هذا القروب",
    usage: "!استخدام المطور | !استخدام الجميع | !استخدام (رد على شخص)",
    cooldown: 3,
    adminOnly: false,
  },

  async run({ api, event, args, messageReply, config }) {
    const threadID = String(event.threadID);
    const senderID = String(event.senderID);
    const developerID = String(config.adminUIDs?.[0] || "");

    if (senderID !== developerID) {
      return api.sendMessage("🚫 هذا الأمر متاح للمطور فقط.", threadID);
    }

    const choice = String(args[0] || "").toLowerCase();

    if (choice === "المطور" || choice === "developer" || choice === "dev") {
      usageAccess.setMode(threadID, "developer");
      return api.sendMessage(
        "🔒 تم تفعيل وضع المطور.\nالآن المطور فقط يستطيع استخدام البوت في هذا القروب.",
        threadID
      );
    }

    if (choice === "الجميع" || choice === "الكل" || choice === "all") {
      usageAccess.setMode(threadID, "all");
      return api.sendMessage(
        "🔓 تم تفعيل وضع الجميع.\nالآن جميع أعضاء القروب يستطيعون استخدام البوت.",
        threadID
      );
    }

    if (!messageReply) {
      return api.sendMessage(
        "❌ استخدم أحد الخيارات:\n" +
        "• !استخدام المطور\n" +
        "• !استخدام الجميع\n" +
        "• !استخدام (رد على رسالة الشخص)",
        threadID
      );
    }

    const targetID = String(messageReply.senderID || "");
    if (!targetID) {
      return api.sendMessage("❌ لم أستطع معرفة صاحب الرسالة التي رددت عليها.", threadID);
    }

    usageAccess.grantUser(threadID, targetID);
    return api.sendMessage(
      `✅ أصبح العضو ${targetID} مسموحاً له باستخدام البوت في هذا القروب.\n` +
      `📌 الوضع الحالي: ${usageAccess.describe(threadID)}`,
      threadID
    );
  },
};