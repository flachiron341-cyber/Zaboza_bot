const { info } = require("../utils/brand");

module.exports = {
  config: {
    name: "uid",
    aliases: ["id", "myid"],
    description: "يعرض ID الخاص بك أو بالشخص المُشار إليه",
    usage: "!uid (أو رُدّ على رسالة شخص)",
    cooldown: 3,
    adminOnly: false,
  },

  async run({ api, event, messageReply }) {
    const { threadID, senderID } = event;
    if (messageReply) {
      return api.sendMessage(info("معرّف الحساب", [`المشار إليه: ${messageReply.senderID}`]), threadID);
    }
    api.sendMessage(info("معرّف الحساب", [`معرّفك: ${senderID}`]), threadID);
  },
};
