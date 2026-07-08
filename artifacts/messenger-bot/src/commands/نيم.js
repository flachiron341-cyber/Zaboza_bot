module.exports = {
  config: {
    name: "نيم",
    aliases: ["name", "اسم"],
    description: "يغيّر اسم القروب",
    usage: "!نيم [الاسم الجديد]",
    cooldown: 10,
    adminOnly: false,
  },

  async run({ api, event, args }) {
    const { threadID } = event;

    if (!args.length) {
      return api.sendMessage("❌ اكتب الاسم الجديد!\nمثال: !نيم قروب الأبطال", threadID);
    }

    const newName = args.join(" ");

    api.setTitle(newName, threadID, (err) => {
      if (err) {
        return api.sendMessage(`❌ فشل تغيير الاسم: ${err.error || err}`, threadID);
      }
      api.sendMessage(`✅ تم تغيير اسم القروب إلى:\n"${newName}"`, threadID);
    });
  },
};
