const fs = require("fs");
const logger = require("../utils/logger");
const {
  resolveSurah,
  downloadSurah,
  splitSurahForMessenger,
  cleanupSurah,
} = require("../utils/quranAudio");
const { error } = require("../utils/brand");

module.exports = {
  config: {
    name: "سورة",
    aliases: ["surah", "quran"],
    description: "يرسل تلاوة كاملة للسورة التي تختارها",
    usage: "!سورة [اسم السورة أو رقمها]",
    cooldown: 30,
    adminOnly: false,
  },

  async run({ api, event, args }) {
    const threadID = String(event.threadID);
    const query = args.join(" ").trim();
    const surah = resolveSurah(query);
    if (!surah) {
      return api.sendMessage(
        error("اسم السورة غير واضح", ["مثال: !سورة الكهف أو !سورة 18."]),
        threadID
      );
    }

    let audio = null;
    try {
      await api.sendMessage(`⏳ جاري تجهيز سورة ${surah.name} بصوت مشاري العفاسي...`, threadID);
      audio = await downloadSurah(surah.number);
      const parts = await splitSurahForMessenger(audio);
      for (let index = 0; index < parts.length; index++) {
        const partLabel = parts.length > 1 ? ` — الجزء ${index + 1}/${parts.length}` : "";
        const body =
          `📖 سورة ${surah.name}${partLabel}\n` +
          "القارئ: مشاري العفاسي · المصدر: AlQuran Cloud";
        await api.sendMessage(
          { body, attachment: fs.createReadStream(parts[index]) },
          threadID
        );
        if (index < parts.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 700));
        }
      }
    } catch (err) {
      logger.error(`فشل أمر سورة (${surah.number}): ${err?.message || err}`);
      await api.sendMessage(
        `❌ تعذر إرسال السورة كملف صوتي. يمكنك الاستماع إليها من المصدر:\n${surah.audioURL}`,
        threadID
      );
    } finally {
      if (audio) cleanupSurah(audio);
    }
  },
};