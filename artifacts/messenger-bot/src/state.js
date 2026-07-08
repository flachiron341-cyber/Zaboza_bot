/**
 * الحالة المشتركة بين الأوامر
 */

// حالة الاتاك: Map<threadID, { interval, message }>
const attackState = new Map();

// تأخير الاتاك لكل قروب: Map<threadID, number(ms)>
const attackDelay = new Map();

// حالة الحماية: Map<threadID, { name, nicknames: Map<uid, nickname> }>
const protectionState = new Map();

// جلسات أسئلة: Map<questionMsgID, { answer, senderID, threadID, timer }>
const gameSessions = new Map();

// جلسات رياضيات: Map<questionMsgID, { answer, senderID, threadID, timer }>
const mathSessions = new Map();

module.exports = {
  attackState,
  attackDelay,
  protectionState,
  gameSessions,
  mathSessions,
};
