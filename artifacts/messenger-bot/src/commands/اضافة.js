module.exports = {
  config: {
    name: "اضافة",
    aliases: ["add", "invite"],
    description: "يضيف شخصاً للقروب — رُدّ على رسالته أو اكتب رابط حسابه",
    usage: "!اضافة (رُدّ على رسالة) | !اضافة https://www.facebook.com/...",
    cooldown: 10,
    adminOnly: false,
  },

  async run({ api, event, args, messageReply, config }) {
    const threadID = String(event.threadID);
    const senderID = String(event.senderID);

    if (!config.adminUIDs || !config.adminUIDs.includes(senderID)) {
      return api.sendMessage("🚫 هذا الأمر للمطور فقط.", threadID);
    }

    let targetID = null;

    // حالة 1: رابط فيسبوك
    if (args.length > 0) {
      const url = args[0];
      const m = url.match(/(?:profile\.php\?id=|facebook\.com\/(?:people\/[^/]+\/)?)(\d{10,})/);
      if (m) {
        targetID = m[1];
      } else {
        return api.sendMessage(
          "❌ رابط غير صحيح!\nمثال: !اضافة https://www.facebook.com/profile.php?id=61591676525701",
          threadID
        );
      }
    }

    // حالة 2: رد على رسالة
    if (!targetID && messageReply) {
      targetID = String(messageReply.senderID);
    }

    if (!targetID) {
      return api.sendMessage(
        "❌ رُدّ على رسالة الشخص أو اكتب رابط حسابه!\nمثال: !اضافة https://www.facebook.com/profile.php?id=...",
        threadID
      );
    }

    await api.sendMessage(`⏳ جاري إضافة ${targetID}...`, threadID);

    let success = false;
    let errMsg  = "";

    try {
      const result = await new Promise((resolve, reject) => {
        api.gcmember("add", targetID, threadID, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
      if (result && result.type === "error_gc") {
        errMsg = result.error;
      } else {
        success = true;
      }
    } catch (e) {
      errMsg = e.message || "خطأ غير معروف";
    }

    if (!success) {
      return api.sendMessage(`❌ فشلت الإضافة: ${errMsg}`, threadID);
    }

    // صورة الإضافة تُرسل مرة واحدة فقط من log:subscribe في index.js.
    // إرسالها هنا أيضاً كان سبب ظهورها مرتين بعد نجاح الإضافة.
    await api.sendMessage(
      `✅ تمت إضافة ${targetID}.\n🎉 ستصل صورة الترحيب عند تسجيل حدث دخول العضو.`,
      threadID
    );
  },
};
