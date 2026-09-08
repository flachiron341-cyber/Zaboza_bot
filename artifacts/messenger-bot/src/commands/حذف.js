const fs = require("fs");
const path = require("path");

const menuImagePath = path.join(__dirname, "../../assets/menu.jpg");

module.exports = {
  config: {
    name: "حذف",
    aliases: ["deletemenu", "delete_menu"],
    description: "يحذف صورة قائمة الأوامر المحفوظة",
    usage: "!حذف",
    cooldown: 3,
    adminOnly: true,
  },

  async run({ api, event }) {
    const threadID = String(event.threadID);
    if (!fs.existsSync(menuImagePath)) {
      return api.sendMessage("ℹ️ لا توجد صورة محفوظة لقائمة الأوامر.", threadID);
    }

    try {
      fs.unlinkSync(menuImagePath);
      return api.sendMessage("✅ تم حذف صورة قائمة الأوامر المحفوظة.", threadID);
    } catch (error) {
      return api.sendMessage(`❌ تعذر حذف صورة قائمة الأوامر: ${error.message}`, threadID);
    }
  },
};