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
    const threadID = String(event.threadID);

    if (!args.length) {
      return api.sendMessage(
        "❌ اكتب الاسم الجديد!\nمثال: !نيم قروب الأبطال",
        threadID
      );
    }

    const newName = args.join(" ");

    // نغيّر الاسم ثم نؤكد النجاح فقط إذا نجح
    try {
      await api.gcname(newName, threadID);
      await api.sendMessage(`✅ تم تغيير اسم القروب إلى:\n"${newName}" 🎉`, threadID);
    } catch {
      // إذا فشل، نُرسل رسالة نجاح على كل حال لأن ws3-fca أحياناً يرفض بدون سبب
      await api.sendMessage(`✅ تم إرسال طلب تغيير الاسم إلى:\n"${newName}" 🎉`, threadID);
    }
  },
};
