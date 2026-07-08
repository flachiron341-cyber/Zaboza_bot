const fs = require("fs");
const path = require("path");
const logger = require("./utils/logger");

// ===== تحميل الأوامر تلقائياً =====
const commands = new Map();
const cooldowns = new Map();

const commandsDir = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsDir).filter((f) => f.endsWith(".js"));

for (const file of commandFiles) {
  try {
    const cmd = require(path.join(commandsDir, file));
    if (cmd.config && cmd.config.name) {
      commands.set(cmd.config.name.toLowerCase(), cmd);
      // الأسماء المستعارة
      if (cmd.config.aliases && Array.isArray(cmd.config.aliases)) {
        for (const alias of cmd.config.aliases) {
          commands.set(alias.toLowerCase(), cmd);
        }
      }
      logger.info(`📦 تم تحميل الأمر: ${cmd.config.name}`);
    }
  } catch (e) {
    logger.error(`خطأ في تحميل ${file}: ${e.message}`);
  }
}

logger.info(`✅ تم تحميل ${commands.size} أمر`);

// ===== معالج الرسائل =====
async function handleMessage(api, event, config, botID) {
  const { senderID, threadID, body, messageReply } = event;

  if (!body || !body.startsWith(config.prefix)) return;

  // تقطيع الأمر والمعطيات
  const args = body.slice(config.prefix.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();

  if (!commands.has(commandName)) return;

  const command = commands.get(commandName);

  // التحقق من الصلاحيات
  if (command.config.adminOnly) {
    if (!config.adminUIDs.includes(senderID)) {
      return api.sendMessage("🚫 هذا الأمر للمشرفين فقط.", threadID);
    }
  }

  // نظام التهدئة (cooldown) — نستخدم الاسم الأصلي لا الاسم البديل
  const cooldownKey = `${senderID}-${command.config.name}`;
  const cooldownTime = (command.config.cooldown || config.cooldown) * 1000;
  const now = Date.now();

  if (cooldowns.has(cooldownKey)) {
    const expiresAt = cooldowns.get(cooldownKey) + cooldownTime;
    if (now < expiresAt) {
      const remaining = ((expiresAt - now) / 1000).toFixed(1);
      return api.sendMessage(
        `⏳ انتظر ${remaining} ثانية قبل استخدام هذا الأمر مجدداً.`,
        threadID
      );
    }
  }

  cooldowns.set(cooldownKey, now);
  setTimeout(() => cooldowns.delete(cooldownKey), cooldownTime);

  // تنفيذ الأمر
  try {
    logger.info(`▶ ${senderID} استخدم: ${config.prefix}${commandName} ${args.join(" ")}`);
    await command.run({ api, event, args, config, botID, commands, messageReply });
  } catch (err) {
    logger.error(`خطأ في أمر ${commandName}: ${err.message}`);
    api.sendMessage(`❌ حدث خطأ أثناء تنفيذ الأمر.`, threadID);
  }
}

// ===== معالج الأحداث =====
async function handleEvent(api, event, config, botID) {
  // يمكن إضافة معالجات هنا مستقبلاً
  // مثلاً: الترحيب بالأعضاء الجدد
}

module.exports = { handleMessage, handleEvent };
