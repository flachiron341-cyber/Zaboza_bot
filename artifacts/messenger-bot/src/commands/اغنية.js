const fs = require("fs");
const logger = require("../utils/logger");
const { searchSong, downloadSongPreview } = require("../utils/music");

module.exports = {
  config: {
    name: "اغنية",
    aliases: ["اغنيه", "song", "music"],
    description: "يبحث عن الأغنية ويرسلها كرسالة صوتية",
    usage: "!اغنية [اسم الأغنية]",
    cooldown: 20,
    adminOnly: false,
  },

  async run({ api, event, args }) {
    const threadID = String(event.threadID);
    const query = args.join(" ").trim();
    if (!query) return api.sendMessage("❌ اكتب اسم الأغنية.", threadID);

    await api.sendMessage(`🎵 جاري البحث عن "${query}"...`, threadID);
    let audioPath = null;

    try {
      const result = await searchSong(query);
      if (!result) return api.sendMessage("❌ لم أجد معاينة صوتية لهذه الأغنية.", threadID);

      audioPath = await downloadSongPreview(result.preview);
      if (!audioPath) return api.sendMessage("❌ تعذر تحميل المعاينة الصوتية.", threadID);

      await api.sendMessage(
        {
          body: `🎧 ${result.title} — ${result.artist}\n(معاينة صوتية متاحة من المصدر)`,
          attachment: fs.createReadStream(audioPath),
        },
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