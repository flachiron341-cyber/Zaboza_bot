const { login } = require("ws3-fca");
const fs   = require("fs");
const path = require("path");
const config  = require("../config.json");
const handler = require("./handler");
const logger  = require("./utils/logger");
const state   = require("./state");

// ===== تحميل الكوكيز =====
const appstatePath = path.join(__dirname, "../appstate.json");
let appstate;

try {
  const raw = fs.readFileSync(appstatePath, "utf-8");
  appstate  = JSON.parse(raw);
  if (!Array.isArray(appstate) || appstate.length === 0) {
    logger.error("❌ ملف appstate.json فارغ — ضع فيه الكوكيز أولاً.");
    process.exit(1);
  }
} catch (e) {
  logger.error("❌ تعذّر قراءة appstate.json: " + e.message);
  process.exit(1);
}

// ===== تسجيل الدخول مع إعادة المحاولة =====
const MAX_RETRIES   = 10;
const RETRY_BASE_MS = 30000;

function startLogin(attempt = 1) {
  const delay = Math.min(RETRY_BASE_MS * attempt, 5 * 60 * 1000);
  logger.info(`⏳ جاري تسجيل الدخول... (محاولة ${attempt}/${MAX_RETRIES})`);

  login({ appState: appstate }, (err, api) => {
    if (err) {
      const msg = err.error || JSON.stringify(err);
      logger.error(`❌ فشل تسجيل الدخول: ${msg}`);
      if (attempt < MAX_RETRIES) {
        logger.info(`🔄 إعادة المحاولة بعد ${delay / 1000}ث...`);
        setTimeout(() => startLogin(attempt + 1), delay);
        return;
      }
      logger.error("🚫 تجاوزنا الحد الأقصى. يرجى تحديث appstate.json.");
      process.exit(1);
    }
    startBot(api);
  });
}

function startBot(api) {
  saveAppState(api);

  api.setOptions({
    listenEvents: config.listenEvents,
    selfListen:   false,
    logLevel:     "silent",
  });

  const botID = api.getCurrentUserID();
  logger.info(`✅ تسجيل الدخول نجح | ID: ${botID}`);
  logger.info(`🤖 ${config.botName} يعمل | البادئة: ${config.prefix}`);

  // حفظ الكوكيز كل 10 دقائق
  const saveInterval = setInterval(() => saveAppState(api), 10 * 60 * 1000);

  // ===== الاستماع =====
  api.listenMqtt((err, event) => {
    if (err) {
      const msg = err.error || err.message || JSON.stringify(err);
      logger.error("خطأ في الاستماع: " + msg);
      clearInterval(saveInterval);
      logger.info("🔄 انقطع الاتصال — إعادة تسجيل الدخول بعد 5 ثواني...");
      setTimeout(() => startLogin(1), 5000);
      return;
    }
    if (!event) return;

    const senderID = String(event.senderID || "");
    if (senderID === String(botID)) return;

    // رسائل نصية
    if (event.type === "message" || event.type === "message_reply") {
      handler.handleMessage(api, event, config, botID).catch((e) => {
        logger.error("خطأ غير متوقع: " + e.message);
      });
    }

    // أحداث القروب
    if (event.type === "event") {
      handleGroupEvent(api, event);
    }
  });

  // ──────────────────────────────────────────────
  //  معالج أحداث القروب
  // ──────────────────────────────────────────────
  function handleGroupEvent(api, event) {
    const threadID       = String(event.threadID || "");
    const logMessageType = event.logMessageType;
    const protection     = state.protectionState.get(threadID);
    if (!protection || !protection.active) return;

    // ── حماية اسم القروب ──
    if (logMessageType === "log:thread-name") {
      const newName = event.logMessageData && event.logMessageData.name;
      if (newName !== undefined && newName !== protection.name) {
        logger.info(`🛡 محاولة تغيير اسم القروب → إعادته: "${protection.name}"`);
        setTimeout(() => {
          api.gcname(protection.name, threadID, (err) => {
            if (!err) logger.info(`✅ أُعيد اسم القروب: "${protection.name}"`);
          });
        }, 1500);
      }
    }

    // ── حماية الكنيات ──
    if (logMessageType === "log:user-nickname") {
      const changedUID = event.logMessageData && String(event.logMessageData.participant_id || "");
      if (changedUID && protection.nicknames && protection.nicknames.has(changedUID)) {
        const savedNick = protection.nicknames.get(changedUID);
        logger.info(`🛡 محاولة تغيير كنية ${changedUID} → إعادتها: "${savedNick}"`);
        setTimeout(() => {
          api.setNickname(savedNick, threadID, changedUID, (err) => {
            if (!err) logger.info(`✅ أُعيدت كنية ${changedUID}: "${savedNick}"`);
          });
        }, 1500);
      }
    }
  }
}

// ===== حفظ الكوكيز =====
function saveAppState(api) {
  try {
    const s = api.getAppState();
    if (s && s.length) {
      fs.writeFileSync(appstatePath, JSON.stringify(s, null, 2));
      logger.info("💾 تم حفظ الكوكيز تلقائياً");
    }
  } catch (e) {
    logger.error("⚠️ فشل حفظ الكوكيز: " + e.message);
  }
}

// ===== بدء التشغيل =====
startLogin();

process.on("uncaughtException",  (err) => logger.error("uncaughtException: " + err.message));
process.on("unhandledRejection", (r)   => logger.error("unhandledRejection: " + (r?.message || r)));
