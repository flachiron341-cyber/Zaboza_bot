const fs = require("fs");
const path = require("path");
const { downloadImage } = require("../utils/images");

const menuImagePath = path.join(__dirname, "../../assets/menu.jpg");

module.exports = {
  config: {
    name: "وضع",
    aliases: ["setmenu", "set_menu"],
    description: "يحفظ الصورة المرفقة لقائمة الأوامر",
    usage: "!وضع (بالرد على صورة)",
    cooldown: 5,
    adminOnly: true,
  },

  async run({ api, event, messageReply }) {
    const threadID = String(event.threadID);
    const attachment = (messageReply?.attachments || []).find(
      (item) => item?.type === "photo" || item?.url || item?.largePreviewUrl
    );
    const imageURL = attachment?.url || attachment?.largePreviewUrl || attachment?.previewUrl;
    if (!imageURL) {
      return api.sendMessage("❌ يجب الرد على صورة لحفظها لقائمة الأوامر.", threadID);
    }

    const tempPath = await downloadImage(imageURL);
    if (!tempPath) return api.sendMessage("❌ تعذر تحميل الصورة.", threadID);

    try {
      fs.mkdirSync(path.dirname(menuImagePath), { recursive: true });
      fs.copyFileSync(tempPath, menuImagePath);
      return api.sendMessage("✅ تم حفظ صورة قائمة الأوامر وستبقى بعد إعادة التشغيل.", threadID);
    } finally {
      fs.unlink(tempPath, () => {});
    }
  },
};