const logger = require("../utils/logger");
const { error, info, success } = require("../utils/brand");

const activeJobs = new Map();

function waitBetweenChanges(job, milliseconds) {
  return new Promise((resolve) => {
    const finish = (cancelled) => {
      if (job.timer) clearTimeout(job.timer);
      job.timer = null;
      job.cancelWait = null;
      resolve(cancelled);
    };
    job.timer = setTimeout(() => finish(false), milliseconds);
    job.cancelWait = () => finish(true);
  });
}

module.exports = {
  config: {
    name: "كين",
    aliases: ["nickname", "nick"],
    description: "يغيّر كنيات أعضاء القروب بالتتابع | !كين عكس لمسحها",
    usage: "!كين [الكنية] | !كين عكس | !كين ايقاف",
    cooldown: 2,
    adminOnly: true,
  },

  async run({ api, event, args, botID }) {
    const threadID = String(event.threadID);
    const action = String(args[0] || "").trim().toLowerCase();
    const currentJob = activeJobs.get(threadID);

    if (action === "ايقاف" || action === "إيقاف" || action === "stop") {
      if (!currentJob) {
        return api.sendMessage("⚠️ لا توجد عملية تغيير كنيات نشطة.", threadID);
      }
      currentJob.cancelled = true;
      currentJob.cancelWait?.();
      return api.sendMessage("⏹ تم طلب إيقاف العملية بعد انتهاء التغيير الجاري.", threadID);
    }

    if (currentJob) {
      return api.sendMessage("⚠️ توجد عملية كنيات نشطة في هذا القروب. أوقفها أولاً بـ !كين ايقاف.", threadID);
    }

    const reset = action === "عكس" || action === "reset";
    const nickname = reset ? "" : args.join(" ").trim();
    if (!nickname && !reset) {
      return api.sendMessage(
        error("الكنية غير موجودة", ["استخدم !كين [الكنية] لتطبيقها على الأعضاء، أو !كين عكس لمسح الكنيات."]),
        threadID
      );
    }

    const job = { cancelled: false, timer: null, cancelWait: null };
    activeJobs.set(threadID, job);
    let changed = 0;
    let failed = 0;
    let total = 0;

    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const participants = [...new Set((threadInfo?.participantIDs || []).map(String).filter(Boolean))]
        .filter((participantID) => participantID !== String(botID || ""));
      total = participants.length;
      if (!total) {
        return api.sendMessage(error("تعذر قراءة الأعضاء", ["لم تصل قائمة أعضاء صالحة من Facebook."]), threadID);
      }

      await api.sendMessage(
        info("بدء تغيير الكنيات", [
          `العملية: ${reset ? "مسح الكنيات المخصصة" : `تعيين "${nickname}"`}`,
          `عدد الأعضاء: ${total}`,
          "الفاصل بين الأعضاء: عشوائي من 5 إلى 10 ثوانٍ.",
          "لإيقاف العملية: !كين ايقاف",
        ]),
        threadID
      );

      for (let index = 0; index < participants.length; index++) {
        if (job.cancelled) break;
        try {
          await api.setNickname(
            nickname,
            threadID,
            participants[index],
            undefined,
            String(event.senderID || "")
          );
          changed++;
        } catch (err) {
          failed++;
          logger.warn(`تعذر تحديث كنية عضو في القروب ${threadID}: ${err?.message || err}`);
        }

        if (index < participants.length - 1 && !job.cancelled) {
          const delay = 5000 + Math.floor(Math.random() * 5001);
          await waitBetweenChanges(job, delay);
        }
      }

      const stopped = job.cancelled;
      return api.sendMessage(
        success(stopped ? "توقفت عملية الكنيات" : "اكتملت عملية الكنيات", [
          `الكنيات التي تغيّرت بنجاح: ${changed}`,
          `الإجمالي: ${total}`,
          `تعذّر تغييرها: ${failed}`,
          reset ? "تم مسح الكنيات المخصصة للأعضاء الذين نجح التغيير لهم." : `الكنية: ${nickname}`,
        ]),
        threadID
      );
    } catch (err) {
      logger.error(`فشل أمر كين في القروب ${threadID}: ${err?.message || err}`);
      return api.sendMessage(error("تعذر تغيير الكنيات", ["تأكد أن البوت يملك الصلاحية وحاول لاحقاً."]), threadID);
    } finally {
      if (job.timer) clearTimeout(job.timer);
      if (activeJobs.get(threadID) === job) activeJobs.delete(threadID);
    }
  },
};