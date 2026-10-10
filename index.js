const { login } = require("ws3-fca");
const fs   = require("fs");
const path = require("path");
const { randomUUID } = require("node:crypto");
const {
  getPaths,
  readEncryptedAppState,
  readJsonFile,
  writeJsonAtomic,
} = require("@workspace/bot-control");
const config  = require("../config.json");
const { applySavedPrefixes } = require("./utils/prefixes");
const { installTypingBehavior } = require("./utils/typingBehavior");
applySavedPrefixes(config);
const handler = require("./handler");
const logger  = require("./utils/logger");
const state   = require("./state");
const { parseCookieString } = require("./utils/parseCookies");
const groupEventImages = require("./utils/groupEventImages");

// ===== مسارات الملفات =====
const appstateSecretName = "FACEBOOK_APPSTATE";
const appstatePath = path.join(__dirname, "../appstate.json");
const cookiesTxtPath = path.join(__dirname, "../cookies.txt");
const dashboardPaths = getPaths(__dirname);
const groupEventImageDir = path.join(__dirname, "../assets/events");
const groupEventDedupe = new Map();
const nameRestoreInFlight = new Set();

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
  // جلسات لوحة التحكم تُحفظ مشفرة وتعلو على أي مصدر قديم.
  if (fs.existsSync(dashboardPaths.appStateFile)) {
    try {
      const encryptedAppState = readEncryptedAppState(
        dashboardPaths.appStateFile,
        process.env.SESSION_SECRET,
      );
      if (isUsableAppState(encryptedAppState)) {
        logger.info("🍪 قُرئت جلسة Messenger المشفرة من لوحة التحكم");
        return encryptedAppState;
      }
      logger.error("⚠️ جلسة لوحة التحكم غير صالحة.");
    } catch {
      logger.error("⚠️ تعذر فك تشفير جلسة لوحة التحكم؛ لم تُستخدم أي جلسة احتياطية.");
    }
    return null;
  }

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
const MAX_RETRY_DELAY_MS = 30000;
let retryTimer = null;
let loginInProgress = false;
let activeAPI = null;
let activeListener = null;
let lifecycleGeneration = 0;
let currentBotStatus = "unknown";
let controlPollTimer = null;
let heartbeatTimer = null;

function readDashboardControl() {
  try {
    const control = readJsonFile(dashboardPaths.controlFile, {});
    return {
      ...control,
      desiredState: control.desiredState === "stopped" ? "stopped" : "running",
      autoReconnect: control.autoReconnect !== false,
    };
  } catch {
    logger.warn("تعذرت قراءة إعدادات تشغيل اللوحة؛ سيُستخدم آخر وضع محفوظ.");
    return null;
  }
}

const initialDashboardControl = readDashboardControl() || {
  desiredState: "running",
  autoReconnect: true,
};
let desiredRunning = initialDashboardControl.desiredState !== "stopped";
let autoReconnectEnabled = initialDashboardControl.autoReconnect !== false;
let lastControlCommandId = initialDashboardControl.commandId || null;

function writeDashboardStatus() {
  try {
    writeJsonAtomic(dashboardPaths.statusFile, {
      status: currentBotStatus,
      autoReconnect: autoReconnectEnabled,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    logger.warn("تعذر تحديث حالة البوت في لوحة التحكم.");
  }
}

function addDashboardEvent(level, message) {
  try {
    const saved = readJsonFile(dashboardPaths.eventsFile, []);
    const events = Array.isArray(saved) ? saved : [];
    events.push({
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      message,
    });
    writeJsonAtomic(dashboardPaths.eventsFile, events.slice(-40));
  } catch {
    logger.warn("تعذر تسجيل حدث لوحة التحكم.");
  }
}

function setBotStatus(status, eventMessage = null, level = "info") {
  const changed = currentBotStatus !== status;
  currentBotStatus = status;
  if (changed && eventMessage) addDashboardEvent(level, eventMessage);
  writeDashboardStatus();
}

function stopActiveListener() {
  const listener = activeListener;
  activeListener = null;
  activeAPI = null;
  if (listener && typeof listener.stop === "function") {
    try {
      listener.stop();
    } catch {
      logger.warn("تعذر إغلاق اتصال Messenger السابق.");
    }
  }
}

function pauseBot() {
  desiredRunning = false;
  lifecycleGeneration += 1;
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  stopActiveListener();
  setBotStatus("stopped", "أوقف المدير البوت من لوحة التحكم.", "warn");
}

function restartBot(eventMessage) {
  lifecycleGeneration += 1;
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  stopActiveListener();
  if (eventMessage) addDashboardEvent("info", eventMessage);
  if (!desiredRunning) {
    setBotStatus("stopped");
    return;
  }
  setBotStatus("connecting");
  if (!loginInProgress) startLogin(1);
}

function applyDashboardControl() {
  const control = readDashboardControl();
  if (!control) return;
  const wasAutoReconnectEnabled = autoReconnectEnabled;
  autoReconnectEnabled = control.autoReconnect;
  if (wasAutoReconnectEnabled && !autoReconnectEnabled && retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
    setBotStatus("error", "عُطّلت إعادة الاتصال التلقائية.", "warn");
  }
  const commandChanged =
    Boolean(control.commandId) && control.commandId !== lastControlCommandId;
  if (commandChanged) lastControlCommandId = control.commandId;

  if (control.desiredState === "stopped") {
    if (desiredRunning || activeAPI || retryTimer) pauseBot();
    else setBotStatus("stopped");
    return;
  }

  if (!desiredRunning) {
    desiredRunning = true;
    restartBot("أعاد المدير تشغيل البوت من لوحة التحكم.");
    return;
  }

  if (commandChanged && control.action === "save_and_run") {
    restartBot("تم تحديث جلسة Messenger من لوحة التحكم.");
    return;
  }

  if (desiredRunning && !activeAPI && !loginInProgress && !retryTimer) {
    startLogin(1);
  }
}

function formatLoginError(err) {
  if (!err) return "سبب غير معروف";
  const details = [
    err.error,
    err.message,
    err.code,
    typeof err.stack === "string" ? err.stack.split("\n")[0] : "",
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  return details[0] || "تعذر تحديد سبب الخطأ";
}

function sendGroupEventImage(api, threadID, filename, slot) {
  if (!state.isGroupEventImagesEnabled(threadID)) return;
  const configuredPath = slot ? groupEventImages.getImagePath(threadID, slot) : null;
  const imagePath = configuredPath || path.join(groupEventImageDir, filename);
  if (!fs.existsSync(imagePath)) {
    logger.warn(`صورة حدث القروب غير موجودة: ${filename}`);
    return;
  }
  api.sendMessage(
    { attachment: fs.createReadStream(imagePath) },
    threadID
  ).catch((error) => logger.error(`فشل إرسال صورة حدث القروب: ${formatLoginError(error)}`));
}

function participantID(value) {
  return String(
    typeof value === "object"
      ? value?.userFbId || value?.userID || value?.id || value?.uid || ""
      : value || ""
  );
}

function shouldHandleGroupEvent(event) {
  const data = event.logMessageData || {};
  const added = (data.addedParticipants || []).map(participantID).sort().join(",");
  const actor = participantID(data.leftParticipantFbId);
  const key = [
    String(event.threadID || ""),
    String(event.logMessageType || ""),
    added,
    actor,
  ].join("|");
  const now = Date.now();
  const previous = groupEventDedupe.get(key) || 0;
  groupEventDedupe.set(key, now);

  for (const [savedKey, timestamp] of groupEventDedupe) {
    if (now - timestamp > 10000) groupEventDedupe.delete(savedKey);
  }

  if (now - previous < 3000) {
    logger.warn(`تم تجاهل حدث قروب مكرر: ${key}`);
    return false;
  }
  return true;
}

function scheduleLogin(attempt = 1, overrideDelay = null) {
  if (!desiredRunning || !autoReconnectEnabled) {
    setBotStatus(
      desiredRunning ? "error" : "stopped",
      desiredRunning ? "تعذر الاتصال؛ أُوقفت إعادة المحاولة تلقائياً." : null,
      "error",
    );
    return;
  }
  if (retryTimer || loginInProgress) return;
  const delay = overrideDelay ?? Math.min(RETRY_BASE_MS * attempt, MAX_RETRY_DELAY_MS);
  logger.info(`🔄 إعادة المحاولة بعد ${Math.ceil(delay / 1000)}ث...`);
  setBotStatus("connecting");
  retryTimer = setTimeout(() => {
    retryTimer = null;
    startLogin(attempt);
  }, delay);
}

function startLogin(attempt = 1) {
  if (!desiredRunning || loginInProgress) return;
  loginInProgress = true;
  const generation = lifecycleGeneration;

  // نعيد قراءة الملف اليدوي في كل محاولة حتى لا تستخدم المكتبة نسخة
  // قد تكون عدّلتها أثناء محاولة سابقة.
  const appstate = loadAppState();
  if (!appstate) {
    loginInProgress = false;
    setBotStatus("error", "لا توجد جلسة Messenger صالحة للتشغيل.", "error");
    logger.error(
      `❌ لا يوجد كوكيز صالح في appstate.json أو ${appstateSecretName}.\n` +
      "   ضع تصدير المتصفح في cookies.txt ثم شغّل مثبت الكوكيز."
    );
    scheduleLogin(attempt + 1);
    return;
  }

  logger.info(`⏳ جاري تسجيل الدخول... (محاولة ${attempt})`);

  try {
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
        if (generation !== lifecycleGeneration || !desiredRunning) {
          if (!desiredRunning) setBotStatus("stopped");
          else if (!retryTimer && !activeAPI) startLogin(1);
          return;
        }
        if (err) {
          setBotStatus("error", "فشل تسجيل الدخول؛ تحقق من صلاحية جلسة Messenger.", "error");
          logger.error(`❌ فشل تسجيل الدخول: ${formatLoginError(err)}`);
          scheduleLogin(attempt + 1);
          return;
        }
        startBot(api).catch((startError) => {
          activeAPI = null;
          setBotStatus("error", "تعذر بدء الاستماع لرسائل Messenger.", "error");
          logger.error(`❌ تعذر تشغيل البوت بعد تسجيل الدخول: ${formatLoginError(startError)}`);
          scheduleLogin(attempt + 1);
        });
      }
    );
  } catch (loginError) {
    loginInProgress = false;
    setBotStatus("error", "تعذر بدء تسجيل الدخول إلى Messenger.", "error");
    logger.error(`❌ تعذر بدء تسجيل الدخول: ${formatLoginError(loginError)}`);
    scheduleLogin(attempt + 1);
  }
}

async function startBot(api) {
  if (!desiredRunning) {
    setBotStatus("stopped");
    return;
  }
  activeAPI = api;

  api.setOptions({
    listenEvents: config.listenEvents,
    selfListen:   false,
    logLevel:     "silent",
    autoReconnect: false,
  });
  // أعد تثبيت مؤشر الكتابة والتأخير عند كل تسجيل دخول أو تبديل للجلسة.
  installTypingBehavior(api, 3000, 3000);

  const botID = api.getCurrentUserID();
  logger.info(`✅ تسجيل الدخول نجح | ID: ${botID}`);
  logger.info(`🤖 ${config.botName} يعمل | البادئة: ${config.prefix}`);

  // ===== الاستماع =====
  const listener = await api.listenMqtt((err, event) => {
    if (err) {
      const msg = err.error || err.message || JSON.stringify(err);
      logger.error("خطأ في الاستماع: " + msg);
      if (api !== activeAPI) return;
      activeAPI = null;
      activeListener = null;
      setBotStatus("error", "انقطع اتصال Messenger.", "warn");
      if (autoReconnectEnabled) {
        logger.info("🔄 انقطع الاتصال — إعادة تسجيل الدخول بعد 5 ثواني...");
        scheduleLogin(1, 5000);
      }
      return;
    }
    if (!event || !desiredRunning || api !== activeAPI) return;

    const senderID = String(event.senderID || "");
    if (senderID === String(botID)) return;

    if (event.type === "message" || event.type === "message_reply") {
      handler.handleMessage(api, event, config, botID).catch((e) => {
        logger.error("خطأ غير متوقع: " + e.message);
      });
    }

    if (event.type === "message_unsend") {
      handler.handleUnsend(api, event, config).catch((e) => {
        logger.error("خطأ في كشف الرسالة المحذوفة: " + e.message);
      });
    }

    if (event.type === "event") {
      handleGroupEvent(api, event);
    }
  });
  if (!desiredRunning || api !== activeAPI) {
    if (typeof listener?.stop === "function") listener.stop();
    return;
  }
  activeListener = listener;
  setBotStatus("running", "اكتمل الاتصال ويستمع البوت للرسائل.");

  function handleGroupEvent(api, event) {
    const threadID       = String(event.threadID || "");
    const logMessageType = event.logMessageType;
    if (
      (logMessageType === "log:subscribe" || logMessageType === "log:unsubscribe") &&
      !shouldHandleGroupEvent(event)
    ) {
      return;
    }

    if (logMessageType === "log:unsubscribe") {
      const leftID = participantID(event.logMessageData?.leftParticipantFbId);
      // عند خروج البوت نفسه لا يمكن إرسال صورة بعد مغادرته، كما أن ذلك
      // كان سبب خطأ Messenger 1545012 في السجل.
      if (leftID !== String(botID)) {
        sendGroupEventImage(api, threadID, "1788550124005.jpg", "leave");
      }
    }
    if (logMessageType === "log:subscribe") {
      const addedIDs = (event.logMessageData?.addedParticipants || []).map(participantID);
      const isBotJoin = addedIDs.includes(String(botID));
      const image = isBotJoin ? "bot-joined.jpg" : "1788550142034.jpg";
      sendGroupEventImage(api, threadID, image, isBotJoin ? "botJoin" : "join");
    }

    const protection = state.protectionState.get(threadID);
    const nameProtection = state.nameProtectionState.get(threadID);
    const protectedName = nameProtection?.active
      ? nameProtection.name
      : protection?.active
        ? protection.name
        : "";

    if (logMessageType === "log:thread-name" && protectedName) {
      const newName = event.logMessageData && event.logMessageData.name;
      const senderID = String(event.senderID || event.logMessageData?.senderID || "");
      if (
        newName !== undefined &&
        newName !== protectedName &&
        senderID !== String(botID) &&
        !nameRestoreInFlight.has(threadID)
      ) {
        nameRestoreInFlight.add(threadID);
        logger.info(`🛡 محاولة إعادة اسم القروب إلى: "${protectedName}"`);
        setTimeout(() => {
          api.gcname(protectedName, threadID, (err) => {
            nameRestoreInFlight.delete(threadID);
            if (err) {
              logger.error(`فشل إعادة اسم القروب: ${formatLoginError(err)}`);
            } else {
              logger.info(`✅ أُعيد اسم القروب: "${protectedName}"`);
            }
          });
        }, 1500);
      }
    }

    if (!protection || !protection.active) return;

  }
}

// عند تحديث الملف اليدوي، أعد الاتصال به ما لم تكن جلسة اللوحة هي المصدر النشط.
fs.watchFile(appstatePath, { interval: 2000 }, (current, previous) => {
  if (
    current.mtimeMs === previous.mtimeMs &&
    current.size === previous.size &&
    current.ino === previous.ino
  ) {
    return;
  }
  if (fs.existsSync(dashboardPaths.appStateFile) || !desiredRunning) return;
  logger.info("📄 تم تغيير appstate.json — تجربة الكوكيز الجديدة...");
  restartBot("تم تحديث ملف جلسة Messenger اليدوي.");
});

controlPollTimer = setInterval(applyDashboardControl, 1000);
heartbeatTimer = setInterval(writeDashboardStatus, 10000);

// ===== بدء التشغيل =====
if (desiredRunning) {
  setBotStatus("connecting", "بدأ تشغيل البوت.");
  startLogin();
} else {
  setBotStatus("stopped");
}

function shutdown() {
  desiredRunning = false;
  lifecycleGeneration += 1;
  if (retryTimer) clearTimeout(retryTimer);
  if (controlPollTimer) clearInterval(controlPollTimer);
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  stopActiveListener();
  setBotStatus("stopped");
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

process.on("uncaughtException",  (err) => logger.error("uncaughtException: " + err.message));
process.on("unhandledRejection", (r)   => logger.error("unhandledRejection: " + (r?.message || r)));
