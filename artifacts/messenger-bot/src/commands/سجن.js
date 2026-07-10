const { downloadImage } = require("../utils/images");
const fs = require("fs");

const TAGS = ["prison,bars,cell", "jail,iron,bars", "handcuffs,police", "prison,fence,locked"];

module.exports = {
  config: {
    name: "سجن",
    aliases: ["jail", "prison"],
    description: "يسجن الشخص الذي رددت على رسالته",
    usage: "!سجن (رُدّ على رسالة شخص)",
    cooldown: 5,
    adminOnly: false,
  },

  async run({ api, event, messageReply }) {
    const threadID = String(event.threadID);
    const senderID = String(event.senderID);

    if (!messageReply)
      return api.sendMessage("❌ رُدّ على رسالة الشخص الذي تريد سجنه!", threadID);

    const target = String(messageReply.senderID);
    const body   = `🚔 ${target} ذهب إلى السجن! أمر من ${senderID} 👮‍♂️🔒`;

    await sendWithImage(api, threadID, body, TAGS);
  },
};

async function sendWithImage(api, threadID, body, tags) {
  for (let i = 0; i < tags.length; i++) {
    const url = `https://loremflickr.com/600/600/${tags[i]}?lock=${Math.floor(Math.random() * 999) + 1}`;
    const tmp = await downloadImage(url);
    if (!tmp) continue;
    try {
      await api.sendMessage({ body, attachment: fs.createReadStream(tmp) }, threadID);
      return;
    } catch {}
    finally { fs.unlink(tmp, () => {}); }
  }
  await api.sendMessage(body, threadID);
}
