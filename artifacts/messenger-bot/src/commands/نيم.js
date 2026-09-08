const state = require("../state");
const logger = require("../utils/logger");

module.exports = {
  config: {
    name: "نيم",
    aliases: ["name", "اسم"],
    description: "يغيّر اسم القروب",
    usage: "!نيم [الاسم الجديد]",
    cooldown: 10,
    adminOnly: true,
  },

  async run({ api, event, args }) {
    const threadID = String(event.threadID);

    if (!args.length) {
      return api.sendMessage(
        "❌ اكتب الاسم الجديد!\nمثال: !نيم قروب الأبطال",
        threadID
      );
    }

    const newName = args.join(" ");

    try {
      await new Promise((resolve, reject) => {
        api.gcname(newName, threadID, (err) => (err ? reject(err) : resolve()));
      });
      state.persistNameProtection(threadID, newName);
      await api.sendMessage(
        `✅ تم تغيير اسم القروب إلى:\n"${newName}" 🎉\n🛡️ تم حفظه كاسم محمي.`,
        threadID
      );
    } catch (error) {
      logger.error(`فشل تغيير اسم القروب أو حفظ الحماية: ${error?.message || error}`);
      await api.sendMessage(
        `❌ تعذر تغيير اسم القروب. تأكد أن البوت مسؤول وأن Facebook يسمح بالعملية.\n` +
        `السبب: ${error?.message || "خطأ غير معروف"}`,
        threadID
      );
    }
  },
};
