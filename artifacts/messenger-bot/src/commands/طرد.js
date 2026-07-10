const fs   = require("fs");
const path = require("path");

const VIDEO_PATH = path.join(__dirname, "../../assets/videos/kick.mp4");

module.exports = {
  config: {
    name: "طرد",
    aliases: ["kick", "remove"],
    description: "يطرد الشخص الذي رددت على رسالته من القروب (البوت يجب أن يكون مسؤولاً)",
    usage: "!طرد (رُدّ على رسالة الشخص)",
    cooldown: 5,
    adminOnly: false,
  },

  async run({ api, event, messageReply, config }) {
    const threadID = String(event.threadID);
    const senderID = String(event.senderID);

    if (!config.adminUIDs || !config.adminUIDs.includes(senderID)) {
      return api.sendMessage("🚫 هذا الأمر للمطور فقط.", threadID);
    }

    if (!messageReply) {
      return api.sendMessage("❌ رُدّ على رسالة الشخص الذي تريد طرده!", threadID);
    }

    const targetID = String(messageReply.senderID);

    if (targetID === String(api.getCurrentUserID())) {
      return api.sendMessage("😂 لا يمكنني طرد نفسي!", threadID);
    }
    if (config.adminUIDs && config.adminUIDs.includes(targetID)) {
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
