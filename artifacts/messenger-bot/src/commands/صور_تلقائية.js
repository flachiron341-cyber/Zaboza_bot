const state = require("../state");

const OFF = new Set(["ايقاف", "إيقاف", "توقف", "off", "stop"]);
const ON = new Set(["تشغيل", "تفعيل", "on", "start"]);

module.exports = {
  config: {
    name: "صور",
    aliases: ["صور_تلقائية", "eventimages"],
    description: "التحكم في صور دخول الأعضاء ومغادرتهم ودخول البوت",
    usage: "!صور تلقائية ايقاف | !صور تلقائية تشغيل",
    cooldown: 3,
    adminOnly: true,
  },

  async run({ api, event, args }) {
    const threadID = String(event.threadID);
    const action = String(args[0] === "تلقائية" ? args[1] || "" : args[0] || "").trim().toLowerCase();
    if (OFF.has(action)) {
      state.setGroupEventImagesEnabled(threadID, false);
      return api.sendMessage("تم إيقاف صور الدخول والمغادرة ودخول البوت في هذا القروب.", threadID);
    }
    if (ON.has(action)) {
      state.setGroupEventImagesEnabled(threadID, true);
      return api.sendMessage("تم تشغيل صور الدخول والمغادرة ودخول البوت في هذا القروب.", threadID);
    }
    const status = state.isGroupEventImagesEnabled(threadID) ? "تعمل" : "متوقفة";
    return api.sendMessage(
      `صور أحداث القروب ${status}.\nاستخدم !صور تلقائية ايقاف أو !صور تلقائية تشغيل.`,
      threadID
    );
  },
};
