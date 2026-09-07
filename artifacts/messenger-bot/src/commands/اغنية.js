const fs = require("fs");
const { searchYoutube, downloadYoutubeAudio } = require("../utils/youtube");

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
    const result = await searchYoutube(query);
    if (!result) return api.sendMessage("❌ لم أجد الأغنية المطلوبة.", threadID);

    const audioPath = await downloadYoutubeAudio(result.url);
    if (!audioPath) return api.sendMessage("❌ تعذر تحميل الأغنية كصوت.", threadID);

    try {
      await api.sendMessage(
        { body: `🎧 ${result.title}`, attachment: fs.createReadStream(audioPath) },
        threadID
      );
    } finally {
      fs.unlink(audioPath, () => {});
    }
  },
};