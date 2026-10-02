const { searchWeb } = require("../utils/publicApis");
const { info, error } = require("../utils/brand");

module.exports = {
  config: {
    name: "ذكاء",
    aliases: ["ai", "مساعد", "اسأل", "دارجة", "ذكاء_جزائري"],
    description: "بحث معرفي مختصر من مصادر عامة، من دون مفتاح API",
    usage: "!ذكاء [سؤالك] | !دارجة [سؤالك]",
    cooldown: 8,
    adminOnly: false,
  },

  async run({ api, event, args, config, invokedName }) {
    const threadID = String(event.threadID);
    const question = args.join(" ").trim();
    if (!question) {
      return api.sendMessage("❌ اكتب موضوعاً أو سؤالاً للبحث، مثل: !ذكاء ما هو الذكاء الاصطناعي؟", threadID);
    }

    try {
      const results = await searchWeb(question);
      if (!results.length) {
        return api.sendMessage(
          error("لم أجد نتيجة", ["جرّب كلمات بحث أقصر أو مختلفة. هذا الأمر يعتمد على نتائج الويب ولا يحتاج مفتاح API."]),
          threadID
        );
      }
      const dialect = ["دارجة", "ذكاء_جزائري"].includes(String(invokedName || ""));
      const lines = [
        `السؤال: ${question}`,
        dialect ? "هاك وش لقيت في المصادر:" : "ملخص من نتائج المصادر العامة:",
        ...results.slice(0, 3).map((item, index) =>
          `${index + 1}. ${item.title}\n${item.snippet || "لا يتوفر ملخص."}${item.url ? `\n${item.url}` : ""}`
        ),
      ];
      return api.sendMessage(info("مساعد المعرفة", lines).slice(0, 6000), threadID);
    } catch {
      return api.sendMessage(error("تعذر البحث", ["تحقق من اتصال البوت بالإنترنت ثم حاول مجدداً."]), threadID);
    }
  },
};