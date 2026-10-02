const state = require("../state");
const { info } = require("../utils/brand");

const stopNames = new Set(["ايقاف", "إيقاف", "توقف", "off", "تلقائيايقاف", "تلقائي_ايقاف"]);

module.exports = {
  config: {
    name: "تلقائي",
    aliases: ["autoreply", "تلقائيايقاف", "تلقائي_ايقاف"],
    description: "إعداد الرد التلقائي على الكلمات المحددة وسحب الرسائل",
    usage: "!تلقائي تشغيل [الرد] | !تلقائي ايقاف",
    cooldown: 3,
    adminOnly: true,
  },

  async run({ api, event, args, invokedName }) {
    const threadID = String(event.threadID);
    const action = String(args[0] || "").toLowerCase();
    const settings = state.autoReplySettings;

    if (stopNames.has(action) || stopNames.has(String(invokedName || ""))) {
      state.saveAutoReply({ ...settings, enabled: false });
      return api.sendMessage("🔕 تم إيقاف الرد التلقائي.", threadID);
    }

    if (!args.length) {
      return api.sendMessage(
        settings.enabled
          ? `✅ الرد التلقائي يعمل.\nالرد الحالي: ${settings.response}`
          : "🔕 الرد التلقائي متوقف. شغّله بكتابة !تلقائي تشغيل [نص الرد].",
        threadID
      );
    }

    const response = (["تشغيل", "on", "start"].includes(action) ? args.slice(1) : args).join(" ").trim();
    if (!response) {
      return api.sendMessage("❌ اكتب نص الرد: !تلقائي تشغيل [نص الرد].", threadID);
    }

    state.saveAutoReply({ enabled: true, response: response.slice(0, 1000) });
    return api.sendMessage(
      info("تم تفعيل الرد التلقائي", [
        "سيعمل مع الكلمات المحددة ككلمات مستقلة، وكذلك عند سحب رسالة.",
        `الرد: ${response.slice(0, 1000)}`,
      ]),
      threadID
    );
  },
};