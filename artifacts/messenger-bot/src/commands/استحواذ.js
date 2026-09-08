const logger = require("../utils/logger");

module.exports = {
  config: {
    name: "استحواذ",
    aliases: ["takeover"],
    description: "ترك البوت والمطور فقط كمسؤولين",
    usage: "!استحواذ",
    cooldown: 10,
    adminOnly: true,
  },

  async run({ api, event, botID, config }) {
    const threadID = String(event.threadID);
    const selfID = String(botID || api.getCurrentUserID());
    const developerID = String(config.adminUIDs?.[0] || event.senderID || "");

    const memberID = (member) =>
      String(
        typeof member === "object"
          ? member.id || member.userID || member.uid || member.userFbId || ""
          : member || ""
      );

    const ruleChange = (action, uid) =>
      new Promise((resolve, reject) => {
        api.gcrule(action, uid, threadID, (err, result) => {
          if (err) return reject(err);
          if (result?.type === "error_gc_rule") {
            return reject(new Error(result.error || "Facebook رفض العملية"));
          }
          resolve(result);
        });
      });

    const info = await new Promise((resolve) => {
      api.getThreadInfo(threadID, (err, data) => resolve(err ? null : data));
    });

    if (!info) return api.sendMessage("❌ فشل الحصول على معلومات القروب.", threadID);

    const currentAdminIDs = [...new Set((info.adminIDs || []).map(memberID).filter(Boolean))];
    const failures = [];
    let developerPromoted = currentAdminIDs.includes(developerID);

    if (!developerPromoted) {
      try {
        await ruleChange("admin", developerID);
        developerPromoted = true;
        logger.info(`✅ تمت محاولة منح المطور ${developerID} صلاحية الإدارة.`);
      } catch (error) {
        failures.push(`${developerID}: ${error.message}`);
        logger.error(`فشل منح المطور صلاحية الإدارة: ${error.message}`);
      }
    }

    let removed = 0;
    for (const uid of currentAdminIDs) {
      if (uid === selfID || uid === developerID) continue;
      try {
        await ruleChange("unadmin", uid);
        removed++;
      } catch (error) {
        failures.push(`${uid}: ${error.message}`);
        logger.error(`فشل إزالة صلاحية المسؤول ${uid}: ${error.message}`);
      }
    }

    const lines = [
      `⚡ اكتملت محاولة الاستحواذ على إدارة القروب.`,
      `✅ أزيلت صلاحية ${removed} مسؤولاً.`,
      developerPromoted
        ? `👤 المطور ${developerID}: مسؤول`
        : `⚠️ تعذر منح المطور ${developerID} صلاحية الإدارة`,
      `🤖 البوت ${selfID}: محفوظ`,
    ];
    if (failures.length) {
      lines.push(`⚠️ تعذر تغيير ${failures.length} عضو. راجع logs لمعرفاتهم.`);
    }
    return api.sendMessage(lines.join("\n"), threadID);
  },
};