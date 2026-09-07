const { login } = require("ws3-fca");
const fs   = require("fs");
const path = require("path");
const config  = require("../config.json");
const handler = require("./handler");
const logger  = require("./utils/logger");
const state   = require("./state");
const { parseCookieString } = require("./utils/parseCookies");

// ===== مسارات الملفات =====
const appstateSecretName = "FACEBOOK_APPSTATE";
const appstatePath = path.join(__dirname, "../appstate.json");
const cookiesTxtPath = path.join(__dirname, "../cookies.txt");
const groupEventImageDir = path.join(__dirname, "../assets/events");

// ===== تحميل الكوكيز =====
function isUsableAppState(data) {
  if (!Array.isArray(data) || data.length === 0) return false;
  const keys = new Set(data.map((cookie) => String(cookie?.key || cookie?.name || "")));
  return keys.has("c_user") && keys.has("xs");
}

function parseAppStateSecret(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const appstate = Array.isArray(parsed)
      ? parsed
      : parsed?.appState || parsed?.appstate || parsed?.cookies;
    if (isUsableAppState(appstate)) return appstate;
  } catch {
    // السر قد يكون Cookie header بدلاً من JSON.
  }

  const parsedCookies = parseCookieString(raw);
  return isUsableAppState(parsedCookies) ? parsedCookies : null;
}

function loadAppState() {
  // ── المصدر الأساسي: ملف يدوي يمكن تبديله بسهولة بين الحسابات ──
  if (fs.existsSync(appstatePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(appstatePath, "utf-8"));
      if (isUsableAppState(data)) {
        logger.info(`🍪 قُرئت ${data.length} كوكي من appstate.json`);
        return data;
      }
      logger.error("⚠️ appstate.json لا يحتوي c_user و xs.");
    } catch (e) {
      logger.error("⚠️ فشل قراءة appstate.json: " + e.message);
    }
  }

  // ── الاحتياطي: سر Replit لا يظهر محتواه في السجلات ──
  const secretValue = process.env[appstateSecretName];
  if (secretValue) {
    const secretAppstate = parseAppStateSecret(secretValue);
    if (secretAppstate) {
      logger.info(`🍪 قُرئت ${secretAppstate.length} كوكي من سر ${appstateSecretName}`);
      return secretAppstate;
    }
    logger.error(`⚠️ سر ${appstateSecretName} لا يحتوي appstate صالحاً.`);
  }

  // ── احتياطي إضافي: Cookie header يدوي ──
  // ── محاولة 2: قراءة cookies.txt (يدوية فقط، بدون أي كتابة) ──
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
        if (isUsableAppState(parsed)) {
          logger.info(`🍪 قُرئت ${parsed.length} كوكي من cookies.txt`);
          // لا نكتب الكوكيز إلى أي ملف؛ ملفات الجلسة تبقى يدوية وثابتة.
          return parsed;
        }
      }
    } catch (e) {
      logger.error("⚠️ فشل قراءة cookies.txt: " + e.message);
    }
  }

  return null;
}

// ===== تسجيل الدخول مع إعادة المحاولة =====
const RETRY_BASE_MS = 30000;
const MAX_RETRY_DELAY_MS = 5 * 60 * 1000;
let retryTimer = null;
let loginInProgress = false;
let activeAPI = null;

function sendGroupEventImage(api, threadID, filename) {
  const imagePath = path.join(groupEventImageDir, filename);
  if (!fs.existsSync(imagePath)) {
    logger.warn(`صورة حدث القروب غير موجودة: ${filename}`);
    return;
  }
  api.sendMessage(
    { attachment: fs.createReadStream(imagePath) },
    threadID
  ).catch((error) => logger.error(`فشل إرسال صورة حدث القروب: ${error.message}`));
}

function scheduleLogin(attempt = 1, overrideDelay = null) {
  if (retryTimer || loginInProgress) return;
  const delay = overrideDelay ?? Math.min(RETRY_BASE_MS * attempt, MAX_RETRY_DELAY_MS);
  logger.info(`🔄 إعادة المحاولة بعد ${Math.ceil(delay / 1000)}ث...`);
  retryTimer = setTimeout(() => {
    retryTimer = null;
    startLogin(attempt);
  }, delay);
}

function startLogin(attempt = 1) {
  if (loginInProgress) return;
  loginInProgress = true;

  // نعيد قراءة الملف اليدوي في كل محاولة حتى لا تستخدم المكتبة نسخة
  // قد تكون عدّلتها أثناء محاولة سابقة.
  const appstate = loadAppState();
  if (!appstate) {
    loginInProgress = false;
    logger.error(
      `❌ لا يوجد كوكيز صالح في appstate.json أو ${appstateSecretName}.\n` +
      "   ضع تصدير المتصفح في cookies.txt ثم شغّل مثبت الكوكيز."
    );
    scheduleLogin(attempt + 1);
    return;
  }

  logger.info(`⏳ جاري تسجيل الدخول... (محاولة ${attempt})`);

  login(
    { appState: appstate },
    {
      autoReconnect: false,
      listenEvents: config.listenEvents,
      selfListen: false,
      logLevel: "silent",
    },
    (err, api) => {
    loginInProgress = false;
    if (err) {
      const msg = err.error || JSON.stringify(err);
      logger.error(`❌ فشل تسجيل الدخول: ${msg}`);
      scheduleLogin(attempt + 1);
      return;
    }
    startBot(api);
    }
  );
}

function startBot(api) {
  activeAPI = api;

  api.setOptions({
    listenEvents: config.listenEvents,
    selfListen:   false,
    logLevel:     "silent",
    autoReconnect: false,
  });

  const botID = api.getCurrentUserID();
  logger.info(`✅ تسجيل الدخول نجح | ID: ${botID}`);
  logger.info(`🤖 ${config.botName} يعمل | البادئة: ${config.prefix}`);

  // ===== الاستماع =====
  api.listenMqtt((err, event) => {
    if (err) {
      const msg = err.error || err.message || JSON.stringify(err);
      logger.error("خطأ في الاستماع: " + msg);
      if (api !== activeAPI) return;
      activeAPI = null;
      logger.info("🔄 انقطع الاتصال — إعادة تسجيل الدخول بعد 5 ثواني...");
      scheduleLogin(1, 5000);
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

    if (event.type === "message_unsend") {
      handler.handleUnsend(api, event).catch((e) => {
        logger.error("خطأ في كشف الرسالة المحذوفة: " + e.message);
      });
    }

    if (event.type === "event") {
      handleGroupEvent(api, event);
    }
  });

  function handleGroupEvent(api, event) {
    const threadID       = String(event.threadID || "");
    const logMessageType = event.logMessageType;

    if (logMessageType === "log:unsubscribe") {
      sendGroupEventImage(api, threadID, "1788550124005.jpg");
    }
    if (logMessageType === "log:subscribe") {
      sendGroupEventImage(api, threadID, "1788550142034.jpg");
    }

    const nicknameProtection = state.nicknameProtectionState.get(threadID);

    if (nicknameProtection?.active && logMessageType === "log:subscribe") {
      const added = event.logMessageData?.addedParticipants || [];
      for (const participant of added) {
        const uid = String(
          typeof participant === "object"
            ? participant.userFbId || participant.userID || participant.id || ""
            : participant
        );
        if (uid) nicknameProtection.nicknames.set(uid, "");
      }
      state.persistNicknameProtection(threadID);
    }

    if (nicknameProtection?.active && logMessageType === "log:unsubscribe") {
      const uid = String(event.logMessageData?.leftParticipantFbId || "");
      if (uid) {
        nicknameProtection.nicknames.delete(uid);
        state.persistNicknameProtection(threadID);
      }
    }

    if (nicknameProtection?.active && logMessageType === "log:user-nickname") {
      const changedUID = String(event.logMessageData?.participant_id || "");
      if (changedUID && nicknameProtection.nicknames.has(changedUID)) {
        const savedNick = nicknameProtection.nicknames.get(changedUID) || "";
        logger.info(`🛡 إعادة كنية ${changedUID} إلى "${savedNick}"`);
        setTimeout(() => {
          api.setNickname(savedNick, threadID, changedUID, (err) => {
            if (!err) logger.info(`✅ أُعيدت كنية ${changedUID}`);
          });
        }, 500);
      }
    }

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
