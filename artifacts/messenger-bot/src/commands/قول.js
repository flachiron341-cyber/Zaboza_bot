const { textToSpeech } = require("../utils/tts");
const fs = require("fs");

module.exports = {
  config: {
    name: "قول",
    aliases: ["say", "tts", "صوت"],
    description: "يحوّل النص إلى رسالة صوتية",
    usage: "!قول [النص]",
    cooldown: 10,
    adminOnly: false,
  },

  async run({ api, event, args }) {
    const threadID = String(event.threadID);

    if (!args.length)
      return api.sendMessage("❌ اكتب النص!\nمثال: !قول ميااو", threadID);

    const text = args.join(" ");
    if (text.length > 200)
      return api.sendMessage("❌ النص طويل جداً! الحد الأقصى 200 حرف.", threadID);

    await api.sendMessage("🎙️ جاري تحويل النص إلى صوت...", threadID);

    const tmpPath = await textToSpeech(text);

    if (!tmpPath)
      return api.sendMessage(`🔊 "${text}"\n(تعذّر توليد الصوت، حاول لاحقاً)`, threadID);

    try {
      await api.sendMessage(
        { body: `🔊 "${text}"`, attachment: fs.createReadStream(tmpPath) },
        threadID
      );
    } finally {
      fs.unlink(tmpPath, () => {});
    }
  },
};
