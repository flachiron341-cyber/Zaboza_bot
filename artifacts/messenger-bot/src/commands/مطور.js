const permissions = require("../utils/permissions");

module.exports = {
  config: {
    name: "مطور",
    aliases: ["developer"],
    description: "إضافة أو إزالة مطور بالرد على رسالته (للمطور الرئيسي فقط)",
    usage: "!مطور (رد) | !مطور حذف (رد)",
    cooldown: 3,
    rootOnly: true,
  },

  async run({ api, event, args, messageReply }) {
    const threadID = String(event.threadID);
    const targetID = String(messageReply?.senderID || "");
    if (!targetID) {
      return api.sendMessage("❌ ردّ على رسالة الشخص. للإزالة استخدم: !مطور حذف (رد).", threadID);
    }

    const remove = ["حذف", "إزالة", "remove"].includes(String(args[0] || "").toLowerCase());
    const result = remove
      ? permissions.removeDeveloper(targetID)
      : permissions.addDeveloper(targetID);

    if (result.ok) {
      return api.sendMessage(
        remove ? `✅ أُزيلت صلاحية المطور عن ${targetID}.` : `✅ أُضيف ${targetID} إلى قائمة المطورين.`,
        threadID
      );
    }

    const messages = {
      invalid: "❌ لم أتمكن من قراءة معرّف صالح من الرسالة.",
      exists: "ℹ️ هذا الحساب مطور بالفعل.",
      missing: "ℹ️ هذا الحساب غير موجود في قائمة المطورين.",
      root: "🚫 لا يمكن إزالة المطور الرئيسي بهذا الأمر.",
    };
    return api.sendMessage(messages[result.reason] || "❌ تعذر تحديث قائمة المطورين.", threadID);
  },
};