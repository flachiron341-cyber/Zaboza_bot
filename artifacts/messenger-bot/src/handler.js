const fs   = require("fs");
const path = require("path");
const logger = require("./utils/logger");
const state  = require("./state");
const usageAccess = require("./utils/usageAccess");
const { handleNextMessage } = require("./utils/gameRouter");
const permissions = require("./utils/permissions");
const { getPrefixes, parseCommand } = require("./utils/prefixes");
const { info } = require("./utils/brand");
const { isCommandEnabled } = require("./utils/commandManagement");

// ===== تحميل الأوامر =====
const commands = new Map();
const cooldowns = new Map();

const commandsDir  = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsDir).filter((f) => f.endsWith(".js"));

for (const file of commandFiles) {
  try {
    const cmd = require(path.join(commandsDir, file));
    if (cmd.config && cmd.config.name) {
      commands.set(cmd.config.name.toLowerCase(), cmd);
      if (Array.isArray(cmd.config.aliases)) {
        for (const alias of cmd.config.aliases) {
          commands.set(alias.toLowerCase(), cmd);
        }
      }
      logger.info(`📦 تم تحميل: ${cmd.config.name}`);
    }
  } catch (e) {
    logger.error(`خطأ في تحميل ${file}: ${e.message}`);
  }
}
logger.info(`✅ إجمالي الأوامر المحملة: ${commandFiles.length}`);

// ===== تطبيع الحدث =====
function normalizeEvent(event) {
  const e = Object.assign({}, event);
  if (e.threadID)  e.threadID  = String(e.threadID);
  if (e.senderID)  e.senderID  = String(e.senderID);
  if (e.messageID) e.messageID = String(e.messageID);
  if (e.messageReply) {
    e.messageReply = Object.assign({}, e.messageReply);
    if (e.messageReply.messageID) e.messageReply.messageID = String(e.messageReply.messageID);
    if (e.messageReply.senderID)  e.messageReply.senderID  = String(e.messageReply.senderID);
    if (e.messageReply.threadID)  e.messageReply.threadID  = String(e.messageReply.threadID);
  }
  return e;
}

// ===== معالج الرسائل الرئيسي =====
async function handleMessage(api, rawEvent, config, botID) {
  const event = normalizeEvent(rawEvent);
  // __aiHookV3: الذكاء للجميع (الأوامر تبقى مقفلة)
  try {
    if (!parseCommand(event.body, config)) {
      const aiToggle = require("./utils/aiToggle");
      const __t = (event.body || "").trim();
      if (__t && aiToggle.get(String(event.threadID))) { aiReply(api, event, config); }
    }
  } catch (e) {}
  const { senderID, threadID, body, messageReply } = event;
  const developerIDs = permissions.getDeveloperIDs();
  state.stats.messagesReceived++;

  // __protectionApplied
  const protection = require("./utils/protection");
  if (!api.__protected) {
    api.__protected = true;
    const __origSend = api.sendMessage.bind(api);
    api.sendMessage = function(msg, tid, ...rest) {
      const text = typeof msg === "string" ? msg : (msg && msg.body) ? msg.body : "[media]";
      if (!(msg && msg.__noDupCheck) && protection.isDuplicate(tid, text)) {
        logger.warn("تجاهل رد مكرر في " + tid);
        return Promise.resolve();
      }
      return __origSend(msg, tid, ...rest);
    };
  }

  // لا نرسل إجابات ألعاب أو رسائل صلاحية
  // لأي عضو غير مسموح له باستخدام البوت.
  if (!usageAccess.isAllowed(threadID, senderID, developerIDs)) return;

  state.rememberMessage(event);
  try {
    const __txt = (event.body || "").trim();
  } catch (e) {}
// __atakPreHook: الرد التلقائي يعمل حتى مع غير المدرجين
  try {
    const __ak = commands.get("اتاك");
    if (__ak && isCommandEnabled(__ak, state.disabledCommands) && typeof __ak.onMessage === "function") {
      __ak.onMessage(api, event);
    }
  } catch (e) {}


  // ── إجابات الألعاب القديمة (بالرد على رسالة البوت) ──
    if (messageReply && body) {
    const refID = String(messageReply.messageID);

    // اسئلة
    const gameSession = state.gameSessions.get(refID);
    if (gameSession && gameSession.threadID === threadID) {
      await processGameAnswer(api, event, gameSession, "اسئلة");
      return;
    }
    // رياضيات
    const mathSession = state.mathSessions.get(refID);
    if (mathSession && mathSession.threadID === threadID) {
      await processGameAnswer(api, event, mathSession, "رياضيات");
      return;
    }
  }

  // الألعاب الجديدة تستقبل الرسالة التالية للمستخدم حتى بدون رد مباشر.

  const parsed = parseCommand(body, config);
  if (!parsed) {
    try {
    } catch (e) {}
    try {
      const text = (body || "").trim();
      // __atakHook
      try {
        const __atakCmd = commands.get("اتاك");
        if (__atakCmd && isCommandEnabled(__atakCmd, state.disabledCommands) && typeof __atakCmd.onMessage === "function") {
          __atakCmd.onMessage(api, event);
        }
      } catch (e) {}
    } catch (e) {}
    return;
  }
  const { args, name: commandName } = parsed;

  if (!commands.has(commandName)) return;

  const command = commands.get(commandName);
  if (!isCommandEnabled(command, state.disabledCommands)) {
    return api.sendMessage("⏸️ هذا الأمر متوقف مؤقتاً.", threadID);
  }

  // صلاحية استخدام البوت حسب إعداد هذا القروب.
  if (command.config.rootOnly && !permissions.isRootDeveloper(senderID)) {
    return api.sendMessage("🚫 هذا الأمر للمطور الرئيسي فقط.", threadID);
  }
  if (command.config.adminOnly && !permissions.isDeveloper(senderID) && !(config.g1UIDs || []).map(String).includes(String(senderID))) {
    return api.sendMessage("🚫 هذا الأمر للمطورين فقط.", threadID);
  }


  // نظام التهدئة
  const cooldownKey  = `${senderID}-${command.config.name}`;
  const cooldownTime =
    (command.config.cooldown ?? config.cooldown ?? 0) * 1000;
  const now          = Date.now();

  if (cooldowns.has(cooldownKey)) {
    const exp = cooldowns.get(cooldownKey) + cooldownTime;
    if (now < exp) {
      const rem = ((exp - now) / 1000).toFixed(1);
      return api.sendMessage(`⏳ انتظر ${rem} ثانية.`, threadID);
    }
  }
  cooldowns.set(cooldownKey, now);
  setTimeout(() => cooldowns.delete(cooldownKey), cooldownTime);

  // تنفيذ الأمر
  if (!protection.throttle(senderID, 10)) {
    return api.sendMessage("تأن قليلا هناك حد للاستخدام.", threadID);
  }
  state.stats.commandsProcessed++;
  try {
    await protection.markRead(api, event);
    await protection.humanDelay(api, threadID, 1200, 3500);
      logger.info(`▶ ${senderID} → ${parsed.prefix}${commandName}`);
      await command.run({
        api, event, args, config, botID, commands, messageReply,
        invokedName: commandName, prefix: parsed.prefix,
      });
  } catch (err) {
    state.stats.commandFailures++;
    logger.error(`خطأ في أمر ${commandName}: ${err.message}`);
    // لا نرسل رسالة خطأ للمستخدم تلقائياً
  }
}

async function handleUnsend() {}

// ===== معالج إجابات الألعاب =====
async function processGameAnswer(api, event, session, type) {
  const { threadID, body } = event;

  if (session.timer) clearTimeout(session.timer);
  if (type === "اسئلة") state.gameSessions.delete(session.msgID);
  else                  state.mathSessions.delete(session.msgID);

  const userAnswer    = (body || "").trim().replace(/\s+/g, "");
  const correctAnswer = String(session.answer).trim().replace(/\s+/g, "");

  const isCorrect =
    userAnswer === correctAnswer ||
    userAnswer.toLowerCase() === correctAnswer.toLowerCase();

  if (isCorrect) {
    await api.sendMessage("🎉 أنت عبقري! الإجابة صحيحة 🌟✨", threadID);
  } else {
    await api.sendMessage(
      `❌ إجابة خاطئة 😢\n✅ الإجابة الصحيحة: ${session.answer}`,
      threadID
    );
  }
}

async function aiReply(api, event, config) {
  const threadID = String(event.threadID);
  const q = (event.body || "").trim();
  if (!q) return;
  const say = (t) => api.sendMessage(t, threadID).catch(() => {});
  const GK = process.env.GEMINI_API_KEY;
  const GQ = process.env.GROQ_API_KEY;
  const prompt = "أنت مساعد ذكي ومهذب في مجموعة ماسنجر. أجب بالعربية باختصار في جملتين كحد أقصى. السؤال: " + q;
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
  const mk = "m" + "essage";
  const groqP = GQ ? (async () => {
    const r = await withTimeout(fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + GQ }, body: JSON.stringify({ model: "qwen/qwen3.8-27b", messages: [{ role: "user", content: prompt }], max_tokens: 120 }) }), 9000);
    const d = await r.json();
    const t = d && d.choices && d.choices[0] && d.choices[0][mk] && d.choices[0][mk].content;
    if (!t) throw new Error("groq-empty");
    return t;
  })() : Promise.reject(new Error("no-groq"));
  const gemP = GK ? (async () => {
    await new Promise((r) => setTimeout(r, 800));
    const r = await withTimeout(fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=" + GK, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }), 9000);
    const d = await r.json();
    const t = d && d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts && d.candidates[0].content.parts[0] && d.candidates[0].content.parts[0].text;
    if (!t) throw new Error("gem-empty");
    return t;
  })() : Promise.reject(new Error("no-gem"));
  try {
    const winner = await Promise.any([groqP, gemP]);
    return say(String(winner).slice(0, 800));
  } catch (e) {
    console.log("⚠️ الذكاء:", String(e && e.message || e).slice(0, 100));
    return say("⏰ تعذر الرد الآن، أعد المحاولة.");
  }
}






module.exports = { handleMessage, handleUnsend, commands };
