const { parseFacebookUserID } = require("../utils/facebookUserId");
const logger = require("../utils/logger");

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
    if (!targetID) return;
    }

    // حالة 2: رد على رسالة
    if (!targetID && messageReply) {
      targetID = String(messageReply.senderID);
    }

    if (!targetID) return;

    try {
      const result = await api.gcmember("add", targetID, threadID);
      if (result && result.type === "error_gc") {
        logger.warn(`تعذرت إضافة عضو إلى القروب ${threadID}: ${result.error}`);
      }
    } catch (e) {
      logger.warn(`تعذرت إضافة عضو إلى القروب ${threadID}: ${e?.message || e}`);
    }
  },
};
