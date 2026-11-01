const logger = require("../utils/logger");
const state = require("../state");

const activeJobs = new Map();
const SEND_FEEDBACK = true;

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

function setNicknameSafe(api, nickname, threadID, userID) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (err) => {
      if (settled) return;
      settled = true;
      err ? reject(err) : resolve();
    };

    try {
      // ✅ الدالة الصحيحة في مكتبة ws3-fca
      if (typeof api.nickname === "function") {
        const maybePromise = api.nickname(nickname, threadID, userID, done);
        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise.then(() => done(null), done);
        }
      } else if (typeof api.setNickname === "function") {
        const maybePromise = api.setNickname(nickname, threadID, userID, done);
        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise.then(() => done(null), done);
        }
      } else if (typeof api.changeNickname === "function") {
        const maybePromise = api.changeNickname(nickname, threadID, userID, done);
        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise.then(() => done(null), done);
        }
      } else {
        done(new Error("NO_NICKNAME_FUNCTION"));
      }
    } catch (err) {
      done(err);
    }
  });
}

function sendFeedback(api, threadID, text) {
  if (!SEND_FEEDBACK) return;
  api.sendMessage(text, threadID).catch(() => {});
}

module.exports = {
  config: {
    name: "كين",
    aliases: ["nickname", "nick"],
    description: "تغيير كنيات الأعضاء بالتتابع وحمايتها من التعديل",
    usage: "!كين [الكنية] | !كين عكس | !كين ايقاف",
    cooldown: 2,
    adminOnly: true,
  },

  async run({ api, event, args, botID }) {
    const threadID = String(event.threadID);
    const action = String(args[0] || "").trim().toLowerCase();
    const currentJob = activeJobs.get(threadID);

    if (action === "ايقاف" || action === "إيقاف" || action === "stop") {
      if (currentJob) {
        currentJob.cancelled = true;
        currentJob.cancelWait?.();
        sendFeedback(api, threadID, "🛑 تم إيقاف عملية تغيير الكنيات.");
      }
      return;
    }

    if (currentJob) {
      sendFeedback(api, threadID, "⏳ هناك عملية تغيير كنيات جارية بالفعل في هذا القروب.");
      return;
    }

    const reset = action === "عكس" || action === "حذف" || action === "reset" || action === "delete";
    const nickname = reset ? "" : args.join(" ").trim();

    if (!nickname && !reset) {
      sendFeedback(api, threadID, "❌ استخدم: !كين [الكنية] أو !كين عكس أو !كين ايقاف");
      return;
    }

    if (nickname.length > 40) {
      sendFeedback(api, threadID, "❌ الكنية طويلة جدًا (الحد الأقصى 40 حرفًا).");
      return;
    }

    const job = { cancelled: false, timer: null, cancelWait: null };
    activeJobs.set(threadID, job);
    let changed = 0;
    let failed = 0;
    let total = 0;

    sendFeedback(
      api,
      threadID,
      reset
        ? "⏳ جاري حذف الكنيات بالتتابع... (اكتب !كين ايقاف للإيقاف)"
        : `⏳ جاري تغيير الكنيات إلى "${nickname}" بالتتابع... (اكتب !كين ايقاف للإيقاف)`
    );

    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const participants = [...new Set((threadInfo?.participantIDs || []).map(String).filter(Boolean))]
        .filter((participantID) => participantID !== String(botID || ""));
      total = participants.length;
      if (!total) {
        sendFeedback(api, threadID, "❌ لا يوجد أعضاء في هذا القروب.");
        return;
      }

      if (!reset && state && state.persistNameProtection) {
        state.persistNameProtection(threadID, nickname);
      } else if (reset && state && state.removeNameProtection) {
        state.removeNameProtection(threadID);
      }

      for (let index = 0; index < participants.length; index++) {
        if (job.cancelled) break;
        try {
          await setNicknameSafe(api, nickname, threadID, participants[index]);
          changed++;
        } catch (err) {
          failed++;
          if (logger && logger.warn) {
            logger.warn(`تعذر تحديث كنية عضو في القروب ${threadID}: ${err?.message || err}`);
          }
        }

        if (index < participants.length - 1 && !job.cancelled) {
          const delay = 3000 + Math.floor(Math.random() * 2001);
          await waitBetweenChanges(job, delay);
        }
      }

      if (!job.cancelled) {
        sendFeedback(
          api,
          threadID,
          `✅ ${reset ? "تم حذف الكنيات" : "تم تغيير الكنيات"}: ${changed}/${total} بنجاح${failed ? ` (${failed} فشل)` : ""}.`
        );
      }

      if (logger && logger.info) {
        logger.info(`انتهى أمر كين: ${changed}/${total} نجاح، ${failed} فشل.`);
      }
    } catch (err) {
      sendFeedback(api, threadID, "❌ حدث خطأ أثناء تنفيذ الأمر.");
      if (logger && logger.error) {
        logger.error(`فشل أمر كين في القروب ${threadID}: ${err?.message || err}`);
      }
    } finally {
      if (job.timer) clearTimeout(job.timer);
      if (activeJobs.get(threadID) === job) activeJobs.delete(threadID);
    }
  },
};
