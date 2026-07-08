module.exports = {
  config: {
    name: "نرد",
    aliases: ["dice", "زهر"],
    description: "يرمي نرداً عشوائياً من 1 إلى 6",
    usage: "!نرد",
    cooldown: 3,
    adminOnly: false,
  },

  async run({ api, event }) {
    const { threadID } = event;
    const faces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
    const num = Math.floor(Math.random() * 6) + 1;

    let comment;
    if (num < 3) {
      comment = "يدك فيه يا عبد 🤨👨🏿‍🍼";
    } else if (num === 3) {
      comment = "حضك متوسط 😐";
    } else {
      comment = "حسدتك يوق 😔💔🤰🏽";
    }

    api.sendMessage(
      `🎲 رميت النرد...\n\n${faces[num - 1]}  الرقم: ${num}\n\n${comment}`,
      threadID
    );
  },
};
