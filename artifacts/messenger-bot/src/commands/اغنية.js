const fs = require("fs");
const logger = require("../utils/logger");
const { searchFreeAudio, downloadFreeAudio, searchSong } = require("../utils/music");

module.exports = {
  config: {
    name: "اغنية",
    aliases: ["اغنيه", "song", "music"],
    description: "يرسل الصوت الكامل إذا كان مرخّصاً للمشاركة، وإلا يرسل رابط الاستماع",
    usage: "!اغنية [اسم أغنية أو صوت]",
    cooldown: 20,
    adminOnly: false,
  },

  async run({ api, event, args }) {
    const threadID = String(event.threadID);
    const query = args.join(" ").trim();
    if (!query) return api.sendMessage("❌ اكتب اسم الأغنية.", threadID);

    await api.sendMessage(`🔎 جاري البحث عن صوت قابل للمشاركة: "${query}"...`, threadID);
    let audioPath = null;

    try {
      let freeAudio = null;
      try {
        freeAudio = await searchFreeAudio(query);
      } catch (error) {
        logger.warn(`تعذر البحث في الصوتيات المرخصة: ${error?.message || error}`);
      }
      if (freeAudio) {
        audioPath = await downloadFreeAudio(freeAudio);
        if (!audioPath) {
          return api.sendMessage(
            `وجدت ملفاً مرخّصاً لكن حجمه يتجاوز حد الإرسال أو تعذّر تنزيله:\n${freeAudio.title}\n${freeAudio.sourceURL}`,
            threadID
          );
        }
        const attribution = [
          freeAudio.artist ? `الفنان: ${freeAudio.artist}` : "",
          `الرخصة: ${freeAudio.license}`,
          freeAudio.sourceURL ? `المصدر: ${freeAudio.sourceURL}` : "",
        ].filter(Boolean).join("\n");
        await api.sendMessage(
          {
            body: `🔊 ${freeAudio.title}\n${attribution}`,
            attachment: fs.createReadStream(audioPath),
          },
          threadID
        );
        return;
      }

      const result = await searchSong(query);
      if (!result) {
        return api.sendMessage(
          "❌ لم أجد ملفاً صوتياً كاملاً مرخّصاً أو رابط استماع لهذه العبارة. جرّب وصفاً أبسط.",
          threadID
        );
      }

      await api.sendMessage(
        `🎧 ${result.title} — ${result.artist}\n` +
          "لم أجد نسخة كاملة تسمح رخصتها بإرسالها كملف؛ هذا رابط الاستماع إلى المصدر:\n" +
          `${result.link || `https://www.deezer.com/search/${encodeURIComponent(query)}`}`,
        threadID
      );
    } catch (error) {
      logger.error(`فشل أمر اغنية: ${error?.message || error}`);
      await api.sendMessage("❌ حدث خطأ أثناء البحث أو تحميل الصوت. حاول باسم آخر لاحقاً.", threadID);
    } finally {
      if (audioPath) fs.unlink(audioPath, () => {});
    }
  },
};