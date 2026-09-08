const { searchWeb } = require("../utils/publicApis");
const logger = require("../utils/logger");
const { info, error } = require("../utils/brand");

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
    if (!query) return api.sendMessage(error("صيغة البحث", ["اكتب الكلمة التي تريد البحث عنها."]), threadID);

    try {
      const results = await searchWeb(query);
      if (!results.length) return api.sendMessage(error("لا توجد نتائج", [`لم أجد نتائج عن: ${query}`]), threadID);
      const text = info("نتائج البحث", [
        `الكلمة: ${query}`,
        "",
        ...results.map(
          (item, index) =>
            `${index + 1}. ${item.title}\n${item.snippet || "لا يوجد ملخص"}\n${item.url}`
        ),
      ]);
      return api.sendMessage(text.slice(0, 6000), threadID);
    } catch (err) {
      logger.error(`فشل أمر بحث: ${err?.message || err}`);
      return api.sendMessage(error("تعذر البحث", ["حاول لاحقاً."]), threadID);
    }
  },
};