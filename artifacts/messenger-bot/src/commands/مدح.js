const praises = [
  "والله أنت إنسان رائع 🌟 القروب بدونك ناقص وضحكتك تنور المكان، الله لا يحرمنا منك يا غالي 💙",
  "يا صديقي، ما شاء الله عليك! شخصية قوية وقلب طيب، نادر تلاقي زيك 🏆✨ أنت فعلاً كنز!",
  "ما أعرف كيف أشكرك على وجودك بيننا! أنت تضيف روح للقروب ما تعوض 💎 الله يحفظك.",
  "سبحان الله، كل ما تكتب شيء يرسم ابتسامة على وجهي 😊 أنت إنسان حلو جداً من جد!",
  "أنت من الناس اللي تتمنى دايماً تكون معاهم، شخصيتك خفيفة وقلبك كبير جداً ❤️ ربي يوفقك.",
  "ما شاء الله! ذكاء، لطف، وأسلوب رائع في نفس الوقت؟ هذا نادر والله 🎯 أنت مميز فعلاً!",
  "يا أخي أنت واحد من أحسن الناس اللي أعرفهم، روحك حلوة وتعاملك أحلى 🌹 ربي يبارك فيك.",
  "بصراحة كل ما أشوف كتابتك أبتسم، أنت تجيب الإيجابية معاك أينما ذهبت 🌈 لا تتغير أبداً!",
];

module.exports = {
  config: {
    name: "مدح",
    aliases: ["praise", "compliment"],
    description: "يمدح الشخص الذي رددت على رسالته",
    usage: "!مدح (ردّ على رسالة شخص)",
    cooldown: 10,
    adminOnly: false,
  },

  async run({ api, event, messageReply }) {
    const { threadID, senderID } = event;

    if (!messageReply) {
      return api.sendMessage("❌ ردّ على رسالة الشخص الذي تريد مدحه!", threadID);
    }

    if (String(messageReply.senderID) === String(senderID)) {
      return api.sendMessage("😂 ما تقدر تمدح نفسك يا حبيب!", threadID);
    }

    const targetID = String(messageReply.senderID);
    const praise = praises[Math.floor(Math.random() * praises.length)];

    api.getUserInfo(targetID, (err, data) => {
      let name = "صديقنا";
      if (!err && data && data[targetID]) {
        name = data[targetID].name || name;
      }
      api.sendMessage(`🌸 ${name}، ${praise}`, threadID);
    });
  },
};
