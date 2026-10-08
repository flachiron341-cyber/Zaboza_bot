/**
 * الحالة المشتركة بين الأوامر
 */
const persistentState = require("./utils/persistentState");
const savedState = persistentState.readState();

const attackDelay = new Map(
  Object.entries(savedState.attackDelays || {}).map(([threadID, delay]) => [
    String(threadID),
    { min: Number(delay.min), max: Number(delay.max) },
  ])
);

const protectionState = new Map();
for (const [threadID, entry] of Object.entries(savedState.groupProtections || {})) {
  protectionState.set(String(threadID), {
    active: true,
    name: String(entry?.name || ""),
  });
}

const nameProtectionState = new Map(
  Object.entries(savedState.nameProtections || {}).map(([threadID, name]) => [
    String(threadID),
    { active: true, name: String(name || "") },
  ])
);
const groupEventImagesEnabled = new Map(
  Object.entries(savedState.groupEventImagesEnabled || {}).map(([threadID, enabled]) => [
    String(threadID),
    Boolean(enabled),
  ])
);

module.exports = {
  // جلسات أمر !اسئلة  —  key: messageID, value: { msgID, answer, threadID, timer }
  gameSessions: new Map(),

  // جلسات أمر !رياضيات — key: messageID, value: { msgID, answer, threadID, timer }
  mathSessions: new Map(),

  // جلسات أمر !اتاك — key: threadID, value: { active, timeout, message }
  attackState: new Map(),

  // تأخير الاتاك لكل قروب — key: threadID, value: { min, max } بالثواني
  attackDelay,

  // حماية اسم القروب — key: threadID, value: { active, name }
  protectionState,

  // حماية اسم القروب التي يفعّلها أمر !نيم.
  nameProtectionState,
  groupEventImagesEnabled,

  // لعبة التخمين: جلسة مستقلة لكل قروب ومستخدم.
  guessGames: new Map(),

  // ألعاب الرسائل التالية: key = threadID:senderID.
  trueFalseGames: new Map(),
  lettersGames: new Map(),
  reverseGames: new Map(),

  // XO: مباراة واحدة مستقلة لكل قروب.
  xoGames: new Map(),

  // إحصائيات التشغيل الحالية.
  stats: {
    startedAt: Date.now(),
    messagesReceived: 0,
    commandsProcessed: 0,
    commandFailures: 0,
  },

  // الرسائل الحديثة اللازمة لاكتشاف الرسائل المحذوفة.
  messageHistory: new Map(),

  rememberMessage(event) {
    const messageID = String(event?.messageID || "");
    if (!messageID) return;
    this.messageHistory.set(messageID, {
      body: String(event.body || ""),
      senderID: String(event.senderID || ""),
      threadID: String(event.threadID || ""),
      timestamp: event.timestamp || Date.now(),
    });
    while (this.messageHistory.size > 1000) {
      this.messageHistory.delete(this.messageHistory.keys().next().value);
    }
  },

  persistNameProtection(threadID, name) {
    const id = String(threadID);
    this.nameProtectionState.set(id, { active: true, name: String(name || "") });
    persistentState.saveNameProtection(id, name);
  },

  removeNameProtection(threadID) {
    this.nameProtectionState.delete(String(threadID));
    persistentState.removeNameProtection(String(threadID));
  },

  isGroupEventImagesEnabled(threadID) {
    return this.groupEventImagesEnabled.get(String(threadID)) !== false;
  },

  setGroupEventImagesEnabled(threadID, enabled) {
    const id = String(threadID);
    const value = Boolean(enabled);
    this.groupEventImagesEnabled.set(id, value);
    persistentState.saveGroupEventImagesEnabled(id, value);
  },

  persistAttackDelay(threadID) {
    const delay = this.attackDelay.get(String(threadID));
    if (delay) persistentState.saveAttackDelay(String(threadID), delay);
  },

  persistGroupProtection(threadID) {
    const protection = this.protectionState.get(String(threadID));
    if (protection) persistentState.saveGroupProtection(String(threadID), protection);
  },

  removeGroupProtection(threadID) {
    this.protectionState.delete(String(threadID));
    persistentState.removeGroupProtection(String(threadID));
  },
};
