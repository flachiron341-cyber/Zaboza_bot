const { login } = require("ws3-fca");
const fs = require("fs");
const path = require("path");
const config = require("../config.json");
const handler = require("./handler");
const logger = require("./utils/logger");
const state = require("./state");

// ===== تحميل الكوكيز =====
const appstatePath = path.join(__dirname, "../appstate.json");
let appstate;

try {
  const raw = fs.readFileSync(appstatePath, "utf-8");
  appstate = JSON.parse(raw);
  if (!Array.isArray(appstate) || appstate.length === 0) {
    logger.error("❌ ملف appstate.json فارغ — ضع فيه الكوكيز أولاً.");
    process.exit(1);
  }
} catch (e) {
  logger.error("❌ تعذّر قراءة appstate.json: " + e.message);
  process.exit(1);
}

// ===== تسجيل الدخول =====
logger.info("⏳ جاري تسجيل الدخول إلى فيسبوك...");

login({ appState: appstate }, async (err, api) => {
  if (err) {
    logger.error("❌ فشل تسجيل الدخول: " + JSON.stringify(err));
    process.exit(1);
  }

  // حفظ الكوكيز المحدّثة
  fs.writeFileSync(appstatePath, JSON.stringify(api.getAppState(), null, 2));

  api.setOptions({
    listenEvents: config.listenEvents,
    selfListen: false,
    logLevel: "silent",
  });

  const botID = api.getCurrentUserID();
  logger.info(`✅ تسجيل الدخول نجح | ID: ${botID}`);
  logger.info(`🤖 ${config.botName} يعمل | البادئة: ${config.prefix}`);

  // ===== الاستماع للرسائل والأحداث =====
  api.listenMqtt((err, event) => {
    if (err) {
      logger.error("خطأ في الاستماع: " + JSON.stringify(err));
      return;
    }

    if (!event) return;

    // تجاهل رسائل البوت نفسه
    if (event.senderID === botID) return;

    // ===== رسائل نصية =====
    if (event.type === "message" || event.type === "message_reply") {
      handler.handleMessage(api, event, config, botID);
    }

    // ===== أحداث القروب (للحماية) =====
    if (event.type === "event") {
      handleGroupEvent(api, event);
    }
  });

  // ===== معالج أحداث القروب =====
  function handleGroupEvent(api, event) {
    const { threadID, logMessageType } = event;
    const protection = state.protectionState.get(threadID);
    if (!protection || !protection.active) return;

    // حماية اسم القروب
    if (logMessageType === "log:thread-name") {
      const newName = event.logMessageData && event.logMessageData.name;
      if (newName && newName !== protection.name) {
        setTimeout(() => {
          api.setTitle(protection.name, threadID, (err) => {
            if (!err)
              logger.info(`🛡 أعدت اسم القروب في ${threadID} إلى: ${protection.name}`);
          });
        }, 1000);
      }
    }

    // حماية الكنيات
    if (logMessageType === "log:user-nickname") {
      const changedUID =
        event.logMessageData && event.logMessageData.participant_id;
      if (changedUID && protection.nicknames && protection.nicknames.has(changedUID)) {
        const savedNick = protection.nicknames.get(changedUID);
        setTimeout(() => {
          api.changeNickname(savedNick, threadID, changedUID, (err) => {
            if (!err)
              logger.info(`🛡 أعدت كنية ${changedUID} في ${threadID} إلى: ${savedNick}`);
          });
        }, 1000);
      }
    }
  }
});

process.on("uncaughtException", (err) => {
  logger.error("خطأ غير متوقع: " + err.message);
});

process.on("unhandledRejection", (reason) => {
  logger.error("رفض غير معالج: " + reason);
});
