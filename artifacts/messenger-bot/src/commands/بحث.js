const { searchWeb } = require("../utils/publicApis");
const logger = require("../utils/logger");

module.exports = {
  config: {
    name: "بحث",
    aliases: ["search", "ويكيبيديا"],
    description: "يبحث عن كلمة ويعرض نتائج مختصرة",
    usage: "!بحث [كلمة]",
    cooldown: 10,
    adminOnly: false,
  },

  async run({ api, event, args }) {
    const threadID = String(event.threadID);
    const query = args.join(" ").trim();
    if (!query) return api.sendMessage("❌ اكتب الكلمة التي تريد البحث عنها.", threadID);

    try {
      const results = await searchWeb(query);
      if (!results.length) return api.sendMessage(`❌ لم أجد نتائج عن "${query}".`, threadID);
      const text = [
        `🔎 نتائج البحث عن: ${query}`,
        "",
        ...results.map(
          (item, index) =>
            `${index + 1}. ${item.title}\n${item.snippet || "لا يوجد ملخص"}\n${item.url}`
        ),
      ].join("\n\n");
      return api.sendMessage(text.slice(0, 6000), threadID);
    } catch (error) {
      logger.error(`فشل أمر بحث: ${error?.message || error}`);
      return api.sendMessage("❌ تعذر تنفيذ البحث حالياً.", threadID);
    }
  },
};