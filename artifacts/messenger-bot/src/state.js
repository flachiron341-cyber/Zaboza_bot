/**
 * الحالة المشتركة بين الأوامر
 */
module.exports = {
  // جلسات أمر !اسئلة  —  key: messageID, value: { msgID, answer, threadID, timer }
  gameSessions: new Map(),

  // جلسات أمر !رياضيات — key: messageID, value: { msgID, answer, threadID, timer }
  mathSessions: new Map(),

  // جلسات أمر !اتاك — key: threadID, value: { active, timeout, message }
  attackState: new Map(),

  // تأخير الاتاك لكل قروب — key: threadID, value: { min, max } بالثواني
  attackDelay: new Map(),

  // حماية اسم القروب والكنيات — key: threadID, value: { active, name, nicknames: Map }
  protectionState: new Map(),

  // جلسات أمر !فيديو — key: threadID, value: { step, category, expiry }
  videoSessions: new Map(),
};
