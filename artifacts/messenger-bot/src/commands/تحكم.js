const fs = require("fs");

async function getGroups(api) {
  return new Promise((resolve) => {
    let done = false;
    const fin = (d) => { if (!done) { done = true; resolve(d || []); } };
    try {
      const p = api.getThreadList(100, null, ["INBOX"], (e, d) => fin(e ? [] : d));
      if (p && p.then) p.then(fin, () => fin([]));
    } catch (e) { fin([]); }
  });
}

module.exports = {
  config: {
    name: "تحكم",
    aliases: ["كنترول", "control", "قروبات"],
    description: "🎛️ تحكم عن بعد من الخاص",
    usage: "!تحكم قروبات | !تحكم اخرج <رقم> | !تحكم معلومات <رقم>",
    cooldown: 5,
    adminOnly: true,
  },
  async run({ api, event, args, botID }) {
    const threadID = String(event.threadID);
    const say = (t) => api.sendMessage(t, threadID);
    if (event.isGroup) return say("❌ هذا الأمر يعمل في الخاص فقط — راسل البوت برسالة مباشرة.");
    const act = String(args[0] || "").trim();
    const groups = (await getGroups(api)).filter((t) => t.isGroup && String(t.threadID) !== threadID);
    if (act === "قروبات" || act === "groups" || act === "") {
      if (!groups.length) return say("ℹ️ البوت ليس في أي قروب حاليًا.");
      let msg = "📋 قروبات البوت (" + groups.length + "):\n";
      groups.slice(0, 20).forEach((g, i) => {
        msg += "\n" + (i + 1) + ") " + String(g.name || "بدون اسم").slice(0, 30);
        msg += "\n   الرقم: " + g.threadID;
      });
      return say(msg + "\n\nاستخدم:\n!تحكم اخرج <الرقم التسلسلي>\n!تحكم معلومات <الرقم التسلسلي>");
    }
    const idx = parseInt(String(args[1] || "").trim(), 10);
    if ((act === "اخرج" || act === "leave") || (act === "معلومات" || act === "info")) {
      if (!idx || idx < 1 || idx > groups.length) {
        return say("❌ اكتب الرقم التسلسلي من القائمة:\nأولًا: !تحكم قروبات\nثم: !تحكم " + act + " <الرقم>");
      }
      const g = groups[idx - 1];
      if (act === "اخرج" || act === "leave") {
        await new Promise((res) => {
          try {
            const p = api.removeUserFromGroup(String(botID), String(g.threadID), () => res());
            if (p && p.then) p.then(() => res(), () => res());
          } catch (e) { res(); }
        });
        return say("🚪 تم الخروج من:\n" + String(g.name || g.threadID));
      }
      const info = await api.getThreadInfo(String(g.threadID));
      const admins = ((info && info.adminIDs) || []).length;
      const members = ((info && info.participantIDs) || []).length;
      return say("ℹ️ معلومات القروب:\nالاسم: " + String((info && info.name) || g.name || "؟") + "\nالأعضاء: " + members + "\nالمشرفون: " + admins + "\nالرقم: " + g.threadID);
    }
    return say("❌ خيارات: قروبات | اخرج <رقم> | معلومات <رقم>");
  },
};
