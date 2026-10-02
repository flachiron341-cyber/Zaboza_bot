const { parseFacebookUserID } = require("../utils/facebookUserId");

module.exports = {
  config: {
    name: "اضافة",
    aliases: ["add", "invite"],
    description: "يضيف شخصاً للقروب — رُدّ على رسالته أو اكتب رابط حسابه",
    usage: "!اضافة (رُدّ على رسالة) | !اضافة https://www.facebook.com/...",
    cooldown: 10,
    adminOnly: true,
  },

  async run({ api, event, args, messageReply }) {
    const threadID = String(event.threadID);

    let targetID = null;

    // معرّف أو رابط Facebook يحتوي على معرّف رقمي.
    if (args.length > 0) {
      targetID = parseFacebookUserID(args.join(" "));
      if (!targetID) {
        return api.sendMessage(
          "❌ اكتب ID أو رابط Facebook يحتوي على ID رقمي.",
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
