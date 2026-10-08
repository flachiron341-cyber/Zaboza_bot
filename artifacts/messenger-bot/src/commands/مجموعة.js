const persistentState = require("../utils/persistentState");
const { sendWithTyping } = require("../utils/typingBehavior");

module.exports = {
  config: {
    name: "مجموعة",
    aliases: ["group"],
    description: "ينشئ مجموعة خاصة مع الشخص الذي رددت على رسالته",
    usage: "!مجموعة (بالرد على رسالة)",
    cooldown: 10,
    adminOnly: true,
  },

  async run({ api, event, messageReply }) {
    const threadID = String(event.threadID);
    const senderID = String(event.senderID);
    const targetID = String(messageReply?.senderID || "");

    if (!targetID || targetID === senderID) {
      return api.sendMessage("❌ يجب الرد على رسالة الشخص الذي تريد إنشاء المجموعة معه.", threadID);
    }

    const key = `${senderID}:${targetID}`;
    const existing = persistentState.getCreatedGroup(key);
    if (existing) {
      try {
        await api.gcmember("add", senderID, String(existing));
      } catch {}
      return api.sendMessage(`ℹ️ تم إنشاء مجموعتكما سابقاً.\nمعرّف المجموعة: ${existing}`, threadID);
    }

    try {
      const created = await sendWithTyping(
        api,
        threadID,
        () => api.sendMessage(
          "👥 تم إنشاء المجموعة الخاصة بالمطوّر والعضو.",
          [...new Set([senderID, targetID])]
        )
      );
      const newThreadID = String(created?.threadID || "");
      if (!newThreadID) {
        return api.sendMessage("❌ لم أستطع معرفة معرّف المجموعة الجديدة.", threadID);
      }

      let adminMessage = "";
      try {
        const result = await api.gcrule("admin", senderID, newThreadID);
        if (result?.type === "error_gc_rule") adminMessage = `\n⚠️ تعذر إعطاؤك الإدارة: ${result.error}`;
      } catch (error) {
        adminMessage = `\n⚠️ تعذر إعطاؤك الإدارة: ${error.message}`;
      }

      persistentState.saveCreatedGroup(key, newThreadID);
      return api.sendMessage(
        `✅ تم إنشاء مجموعة واحدة لك وللعضو.\nمعرّف المجموعة: ${newThreadID}${adminMessage}`,
        threadID
      );
    } catch (error) {
      return api.sendMessage(`❌ فشل إنشاء المجموعة: ${error.message}`, threadID);
    }
  },
};