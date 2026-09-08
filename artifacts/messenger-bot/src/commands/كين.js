const state = require("../state");
const logger = require("../utils/logger");
const { info, error, success } = require("../utils/brand");

function getThreadInfo(api, threadID) {
  return new Promise((resolve) => {
    api.getThreadInfo(threadID, (err, data) => resolve(err ? null : data));
  });
}

function setNickname(api, nickname, threadID, userID) {
  return new Promise((resolve, reject) => {
    api.setNickname(nickname, threadID, userID, (err) => (err ? reject(err) : resolve()));
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  config: {
    name: "كين",
    aliases: ["nickname", "nick"],
    description: "يضع كنية لكل أعضاء القروب | !كين عكس لإزالة الكنيات",
    usage: "!كين [الكنية] | !كين عكس",
    cooldown: 15,
    adminOnly: true,
  },

  async run({ api, event, args }) {
    const threadID = String(event.threadID);
    const reset = String(args[0] || "").toLocaleLowerCase("ar") === "عكس" || String(args[0] || "").toLowerCase() === "reset";
    if (!args.length && !reset) {
      return api.sendMessage(
        error("الكنية غير موجودة", ["استخدم !كين اسم الكنية أو !كين عكس لإزالة الكنيات."]),
        threadID
      );
    }

    const nickname = reset ? "" : args.join(" ");
    const infoData = await getThreadInfo(api, threadID);
    if (!infoData) return api.sendMessage(error("تعذر قراءة القروب", ["لم أستطع جلب قائمة الأعضاء من Facebook."]), threadID);

    const participants = [...new Set((infoData.participantIDs || []).map(String).filter(Boolean))];
    if (!participants.length) return api.sendMessage(error("لا يوجد أعضاء", ["لم تصل قائمة أعضاء صالحة من المكتبة."]), threadID);

    await api.sendMessage(
      info("تغيير كنيات القروب", [
        `الهدف: ${nickname || "إزالة جميع الكنيات"}`,
        `عدد الأعضاء: ${participants.length}`,
        "سيتم التنفيذ بالتتابع مع تأخير عشوائي من 2 إلى 5 ثوانٍ.",
      ]),
      threadID
    );

    let done = 0;
    let failed = 0;
    const protection = state.nicknameProtectionState.get(threadID);

    for (let index = 0; index < participants.length; index++) {
      const uid = participants[index];
      try {
        // الاسم الصحيح في ws3-fca هو setNickname(name, threadID, userID, callback).
        await setNickname(api, nickname, threadID, uid);
        done++;
        // لا نحفظ الحماية إلا بعد نجاح Facebook فعلياً.
        if (protection) protection.nicknames.set(uid, nickname);
      } catch (err) {
        failed++;
        logger.error(`فشل تغيير كنية العضو ${uid}: ${err?.message || err}`);
      }
      if (protection && index === participants.length - 1) state.persistNicknameProtection(threadID);
      if (index < participants.length - 1) await delay(2000 + Math.floor(Math.random() * 3001));
    }

    return api.sendMessage(
      success("اكتملت محاولة تغيير الكنيات", [
        `الكنية: ${nickname || "بدون كنية"}`,
        `نجح: ${done}`,
        `فشل: ${failed}`,
        failed ? "تم تسجيل الأعضاء الذين رفض Facebook تغيير كنيتهم في logs." : "تمت العملية بنجاح.",
      ]),
      threadID
    );
  },
};