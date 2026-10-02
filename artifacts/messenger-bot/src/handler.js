const fs   = require("fs");
const path = require("path");
const logger = require("./utils/logger");
const state  = require("./state");
const usageAccess = require("./utils/usageAccess");
const { handleNextMessage } = require("./utils/gameRouter");
const permissions = require("./utils/permissions");
const { getPrefixes, parseCommand } = require("./utils/prefixes");
const { info } = require("./utils/brand");

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
  const { senderID, threadID, body, messageReply } = event;
  const developerIDs = permissions.getDeveloperIDs();
  state.stats.messagesReceived++;

  // لا نرسل ردوداً تلقائية أو إجابات ألعاب أو رسائل صلاحية
  // لأي عضو غير مسموح له باستخدام البوت.
  if (!usageAccess.isAllowed(threadID, senderID, developerIDs)) return;

  state.rememberMessage(event);

  const autoReplyWords = ["زينون", "انس", "انسة", "نوسة"];
  const escapedWords = autoReplyWords.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const autoReplyPattern = new RegExp(
    `(^|[^\\p{L}\\p{N}_])(?:${escapedWords.join("|")})(?=$|[^\\p{L}\\p{N}_])`,
    "u"
  );
  if (
    event.isGroup &&
    body &&
    state.autoReplySettings.enabled &&
    autoReplyPattern.test(String(body))
  ) {
    return api.sendMessage(info("رد تلقائي", [state.autoReplySettings.response]), threadID);
  }

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
  if (body && await handleNextMessage(api, event, getPrefixes(config))) return;

  const parsed = parseCommand(body, config);
  if (!parsed) return;
  const { args, name: commandName } = parsed;

  if (!commands.has(commandName)) return;

  const command = commands.get(commandName);

  // صلاحية استخدام البوت حسب إعداد هذا القروب.
  if (command.config.rootOnly && !permissions.isRootDeveloper(senderID)) {
    return api.sendMessage("🚫 هذا الأمر للمطور الرئيسي فقط.", threadID);
  }
  if (command.config.adminOnly && !permissions.isDeveloper(senderID)) {
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
  state.stats.commandsProcessed++;
  try {
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

async function handleUnsend(api, rawEvent, config) {
  const event = normalizeEvent(rawEvent);
  if (!usageAccess.isAllowed(
    event.threadID,
    event.senderID,
    permissions.getDeveloperIDs()
  )) return;
  if (!state.autoReplySettings.enabled || !state.autoReplySettings.response) return;

  // لا نعيد نشر محتوى اختار صاحبه سحبه من المحادثة.
  await api.sendMessage(
    info("رد تلقائي", [state.autoReplySettings.response]),
    String(event.threadID)
  );
}

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

module.exports = { handleMessage, handleUnsend, commands };
