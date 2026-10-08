const permissions = require("../utils/permissions");
const { parseFacebookUserID } = require("../utils/facebookUserId");
const logger = require("../utils/logger");

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
    if (!targetID) return;

    if (targetID === String(api.getCurrentUserID())) return;
    if (permissions.isDeveloper(targetID)) return;

    try {
      const result = await api.gcmember("remove", targetID, threadID);
      if (result && result.type === "error_gc") {
        logger.warn(`تعذر طرد عضو من القروب ${threadID}: ${result.error}`);
      }
    } catch (e) {
      logger.warn(`تعذر طرد عضو من القروب ${threadID}: ${e?.message || e}`);
    }
  },
};
