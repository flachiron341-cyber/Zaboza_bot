const persistentState = require("../utils/persistentState");
const { DEFAULT_PREFIXES, getPrefixes } = require("../utils/prefixes");

module.exports = {
  config: {
    name: "بادئة",
    aliases: ["prefix"],
    description: "إضافة بادئات البوت أو حذف بادئة مخصصة — للمطور الرئيسي فقط",
    usage: "!بادئة [بادئة، بادئة] | !بادئة حذف [بادئة]",
    cooldown: 3,
    rootOnly: true,
  },

  async run({ api, event, args, config }) {
    const threadID = String(event.threadID);
    const action = String(args[0] || "").trim().toLowerCase();

    if (action === "حذف" || action === "delete" || action === "remove") {
      const targets = args
        .slice(1)
        .join(" ")
        .split(/[,\u060c\s]+/u)
        .map((item) => item.trim())
        .filter(Boolean);
      if (!targets.length) {
        return api.sendMessage(
          "اكتب البادئة التي تريد حذفها، مثل: !بادئة حذف ؟",
          threadID
        );
      }

      const requested = new Set(targets);
      const protectedDefaults = targets.filter((prefix) => DEFAULT_PREFIXES.includes(prefix));
      const currentCustom = getPrefixes(config).filter(
        (prefix) => !DEFAULT_PREFIXES.includes(prefix)
      );
      const removed = currentCustom.filter((prefix) => requested.has(prefix));
      if (!removed.length) {
        const suffix = protectedDefaults.length
          ? "\nالبادئات الافتراضية ! / . # لا يمكن حذفها."
          : "";
        return api.sendMessage(`لم أجد بادئة مخصصة مطابقة للحذف.${suffix}`, threadID);
      }

      const remaining = currentCustom.filter((prefix) => !requested.has(prefix));
      const primary = remaining[0] || DEFAULT_PREFIXES[0];
      const savedPrefixes = remaining.length ? remaining : [primary];
      config.prefix = primary;
      config.prefixes = savedPrefixes;
      persistentState.saveCommandPrefixSettings({ primary, prefixes: savedPrefixes });

      const suffix = protectedDefaults.length
        ? "\nالبادئات الافتراضية ! / . # بقيت مفعّلة."
        : "";
      return api.sendMessage(
        `تم حذف البادئة: ${removed.join(" ، ")}${suffix}`,
        threadID
      );
    }

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
