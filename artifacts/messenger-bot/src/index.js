const login = require("ws3-fca");
const fs = require("fs");
const path = require("path");
const config = require("../config.json");
const handler = require("./handler");
const logger = require("./utils/logger");

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

  // إعدادات API
  api.setOptions({
    listenEvents: config.listenEvents,
    selfListen: false,
    logLevel: "silent",
  });

  const botID = api.getCurrentUserID();
  logger.info(`✅ تسجيل الدخول نجح | ID: ${botID}`);
  logger.info(`🤖 البوت يعمل | البادئة: ${config.prefix}`);

  // ===== الاستماع للرسائل =====
  api.listenMqtt((err, event) => {
    if (err) {
      logger.error("خطأ في الاستماع: " + err);
      return;
    }

    // نتجاهل رسائل البوت نفسه
    if (event.senderID === botID) return;

    // معالجة الرسائل النصية فقط
    if (event.type === "message" || event.type === "message_reply") {
      handler.handleMessage(api, event, config, botID);
    }

    // معالجة أحداث أخرى (انضمام، مغادرة...)
    if (event.type === "event") {
      handler.handleEvent(api, event, config, botID);
    }
  });
});

// معالجة الأخطاء غير المتوقعة
process.on("uncaughtException", (err) => {
  logger.error("خطأ غير متوقع: " + err.message);
});

process.on("unhandledRejection", (reason) => {
  logger.error("رفض غير معالج: " + reason);
});
