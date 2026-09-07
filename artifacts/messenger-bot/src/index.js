const { login } = require("ws3-fca");
const fs   = require("fs");
const path = require("path");
const config  = require("../config.json");
const handler = require("./handler");
const logger  = require("./utils/logger");
const state   = require("./state");
const { parseCookieString } = require("./utils/parseCookies");

// ===== مسارات الملفات =====
const appstatePath  = path.join(__dirname, "../appstate.json");
const cookiesTxtPath = path.join(__dirname, "../cookies.txt");

// ===== تحميل الكوكيز =====
function loadAppState() {
  // ── محاولة 1: قراءة cookies.txt إذا تم تحديثه مؤخراً أو appstate.json فارغ ──
  if (fs.existsSync(cookiesTxtPath)) {
    try {
      const raw = fs.readFileSync(cookiesTxtPath, "utf-8");
      // احذف التعليقات والأسطر الفارغة
      const cookieLine = raw
        .split("\n")
        .filter((l) => l.trim() && !l.trim().startsWith("#"))
        .join(";");

      if (cookieLine.trim()) {
        const parsed = parseCookieString(cookieLine);
        if (parsed.length > 0) {
          logger.info(`🍪 قُرئت ${parsed.length} كوكي من cookies.txt`);
          // لا نكتب الكوكيز إلى أي ملف؛ ملفات الجلسة تبقى يدوية وثابتة.
          return parsed;
        }
      }
    } catch (e) {
      logger.error("⚠️ فشل قراءة cookies.txt: " + e.message);
    }
  }

  // ── محاولة 2: appstate.json ──
  if (fs.existsSync(appstatePath)) {
    try {
      const raw  = fs.readFileSync(appstatePath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) {
        logger.info(`🍪 قُرئت ${data.length} كوكي من appstate.json`);
        return data;
      }
    } catch (e) {
      logger.error("⚠️ فشل قراءة appstate.json: " + e.message);
    }
  }

  return null;
}

const appstate = loadAppState();

if (!appstate) {
  logger.error(
    "❌ لا يوجد كوكيز صالح!\n" +
    "   افتح ملف cookies.txt وضع فيه كوكيز فيسبوك.\n" +
    "   راجع التعليمات داخل الملف."
  );
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
      logger.error(
        "🚫 تجاوزنا الحد الأقصى من المحاولات.\n" +
        "   ربما انتهت صلاحية الكوكيز — جدّد ملف cookies.txt."
      );
      process.exit(1);
    }
    startBot(api);
  });
}

function startBot(api) {
  api.setOptions({
    listenEvents: config.listenEvents,
    selfListen:   false,
    logLevel:     "silent",
  });

  const botID = api.getCurrentUserID();
  logger.info(`✅ تسجيل الدخول نجح | ID: ${botID}`);
  logger.info(`🤖 ${config.botName} يعمل | البادئة: ${config.prefix}`);

  // ===== الاستماع =====
  api.listenMqtt((err, event) => {
    if (err) {
      const msg = err.error || err.message || JSON.stringify(err);
      logger.error("خطأ في الاستماع: " + msg);
      logger.info("🔄 انقطع الاتصال — إعادة تسجيل الدخول بعد 5 ثواني...");
      setTimeout(() => startLogin(1), 5000);
      return;
    }
    if (!event) return;

    const senderID = String(event.senderID || "");
    if (senderID === String(botID)) return;

    if (event.type === "message" || event.type === "message_reply") {
      handler.handleMessage(api, event, config, botID).catch((e) => {
        logger.error("خطأ غير متوقع: " + e.message);
      });
    }

    if (event.type === "event") {
      handleGroupEvent(api, event);
    }
  });

  function handleGroupEvent(api, event) {
    const threadID       = String(event.threadID || "");
    const logMessageType = event.logMessageType;
    const protection     = state.protectionState.get(threadID);
    if (!protection || !protection.active) return;

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

    if (logMessageType === "log:user-nickname") {
      const changedUID = event.logMessageData && String(event.logMessageData.participant_id || "");
      if (changedUID && protection.nicknames && protection.nicknames.has(changedUID)) {
        const savedNick = protection.nicknames.get(changedUID);
        logger.info(`🛡 تغيير كنية ${changedUID} → إعادتها: "${savedNick}"`);
        setTimeout(() => {
          api.setNickname(savedNick, threadID, changedUID, (err) => {
            if (!err) logger.info(`✅ أُعيدت كنية ${changedUID}: "${savedNick}"`);
          });
        }, 1500);
      }
    }
  }
}

// ===== بدء التشغيل =====
startLogin();

process.on("uncaughtException",  (err) => logger.error("uncaughtException: " + err.message));
process.on("unhandledRejection", (r)   => logger.error("unhandledRejection: " + (r?.message || r)));
