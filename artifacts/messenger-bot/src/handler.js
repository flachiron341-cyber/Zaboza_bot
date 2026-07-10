const fs   = require("fs");
const path = require("path");
const logger = require("./utils/logger");
const state  = require("./state");

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

// جلب معالج ردود !فيديو بشكل lazy لتجنّب الدورات
let _videoHandler = null;
function getVideoHandler() {
  if (!_videoHandler) {
    try { _videoHandler = require("./commands/فيديو").handleVideoReply; } catch {}
  }
  return _videoHandler;
}

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

  // ── إجابات الألعاب (يجب أن يكون رداً على رسالة البوت) ──
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
    // فيديو
    const videoSession = state.videoSessions.get(refID);
    if (videoSession && videoSession.threadID === threadID) {
      const handler = getVideoHandler();
      if (handler) {
        videoSession.msgID = refID;
        await handler(api, event, videoSession).catch(() => {});
      }
      return;
    }
  }

  if (!body || !body.startsWith(config.prefix)) return;

  const args        = body.slice(config.prefix.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();

  if (!commands.has(commandName)) return;

  const command = commands.get(commandName);

  // صلاحيات الأدمن
  if (command.config.adminOnly && !config.adminUIDs.includes(senderID)) {
    return api.sendMessage("🚫 هذا الأمر للمشرفين فقط.", threadID);
  }

  // نظام التهدئة
  const cooldownKey  = `${senderID}-${command.config.name}`;
  const cooldownTime = (command.config.cooldown || config.cooldown) * 1000;
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
  try {
    logger.info(`▶ ${senderID} → ${config.prefix}${commandName} ${args.join(" ")}`);
    await command.run({ api, event, args, config, botID, commands, messageReply });
  } catch (err) {
    logger.error(`خطأ في أمر ${commandName}: ${err.message}`);
    // لا نرسل رسالة خطأ للمستخدم تلقائياً
  }
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

module.exports = { handleMessage, commands };
