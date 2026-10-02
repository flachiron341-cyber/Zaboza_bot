const fs   = require("fs");
const path = require("path");
const permissions = require("../utils/permissions");
const { parseFacebookUserID } = require("../utils/facebookUserId");

const VIDEO_PATH = path.join(__dirname, "../../assets/videos/kick.mp4");

module.exports = {
  config: {
    name: "طرد",
    aliases: ["kick", "remove"],
    description: "يطرد شخصاً بالرد على رسالته أو باستخدام معرّفه/رابط ملفه الرقمي",
    usage: "!طرد (رد) | !طرد [ID أو رابط Facebook]",
    cooldown: 5,
    adminOnly: true,
  },

  async run({ api, event, args, messageReply }) {
    const threadID = String(event.threadID);
    const senderID = String(event.senderID);

    const targetID = args.length
      ? parseFacebookUserID(args.join(" "))
      : String(messageReply?.senderID || "");
    if (!targetID) {
      return api.sendMessage(
        "❌ ردّ على رسالة الشخص أو اكتب معرّفه/رابط Facebook يحتوي على ID رقمي.",
        threadID
      );
    }

    if (targetID === String(api.getCurrentUserID())) {
      return api.sendMessage("😂 لا يمكنني طرد نفسي!", threadID);
    }
    if (permissions.isDeveloper(targetID)) {
      return api.sendMessage("🚫 لا يمكن طرد مسؤول.", threadID);
    }

    // طرد العضو — نتعامل مع كلا نوعي الأخطاء
    let success = false;
    let errMsg  = "";

    try {
      const result = await new Promise((resolve, reject) => {
        api.gcmember("remove", targetID, threadID, (err, data) => {
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
      return api.sendMessage(`❌ فشل الطرد: ${errMsg}`, threadID);
    }

    // إرسال الفيديو إذا كان موجوداً
    if (fs.existsSync(VIDEO_PATH)) {
      try {
        await api.sendMessage(
          { body: `✅ تم طرد ${targetID} من القروب! 👋🚪`, attachment: fs.createReadStream(VIDEO_PATH) },
          threadID
        );
        return;
      } catch {}
    }

    await api.sendMessage(`✅ تم طرد ${targetID} من القروب! 👋🚪`, threadID);
  },
};
