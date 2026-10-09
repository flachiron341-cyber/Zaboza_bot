const logger = require("../utils/logger");

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
      if (currentJob) {
        currentJob.cancelled = true;
        currentJob.cancelWait?.();
      }
      return;
    }

    if (currentJob) return;

    const reset = action === "عكس" || action === "حذف" || action === "reset" || action === "delete";
    const nickname = reset ? "" : args.join(" ").trim();
    if (!nickname && !reset) return;

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
      if (!total) return;

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
          const delay = 3000 + Math.floor(Math.random() * 2001);
          await waitBetweenChanges(job, delay);
        }
      }
      logger.info(`انتهى أمر كين: ${changed}/${total} نجاح، ${failed} فشل.`);
    } catch (err) {
      logger.error(`فشل أمر كين في القروب ${threadID}: ${err?.message || err}`);
    } finally {
      if (job.timer) clearTimeout(job.timer);
      if (activeJobs.get(threadID) === job) activeJobs.delete(threadID);
    }
  },
};