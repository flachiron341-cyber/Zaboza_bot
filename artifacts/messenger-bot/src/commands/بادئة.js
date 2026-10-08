const persistentState = require("../utils/persistentState");

module.exports = {
  config: {
    name: "بادئة",
    aliases: ["prefix"],
    description: "إضافة بادئات للبوت — للمطور الرئيسي فقط",
    usage: "!بادئة [بادئة، بادئة]",
    cooldown: 3,
    rootOnly: true,
  },

  async run({ api, event, args, config }) {
    const threadID = String(event.threadID);
    const prefixes = [...new Set(args.join(" ").split(/[,\u060c\s]+/u).map((item) => item.trim()).filter(Boolean))];
    if (!prefixes.length) {
      return api.sendMessage("اكتب بادئة واحدة أو أكثر مفصولة بفواصل، مثل: !بادئة ! /", threadID);
    }
    if (prefixes.length > 8 || prefixes.some((prefix) => prefix.length > 4 || /\s/u.test(prefix))) {
      return api.sendMessage("كل بادئة يجب أن تكون من 1 إلى 4 محارف، وبحد أقصى 8 بادئات.", threadID);
    }

    config.prefix = prefixes[0];
    config.prefixes = prefixes;
    persistentState.saveCommandPrefixSettings({ primary: prefixes[0], prefixes });
    return api.sendMessage(`تم حفظ البادئات: ${prefixes.join(" ، ")}\nالبادئات الافتراضية تبقى مفعّلة أيضاً.`, threadID);
  },
};
