const state = require("../state");
const { success, error, info, normalizeAnswer } = require("./brand");

function userKey(threadID, senderID) {
  return `${String(threadID)}:${String(senderID)}`;
}

function clearSession(map, key, session) {
  if (session?.timer) clearTimeout(session.timer);
  map.delete(key);
}

function parseBooleanAnswer(body) {
  const answer = normalizeAnswer(body).replace(/[.!؟?]/g, "");
  if (["صح", "صحيح", "نعم", "true"].includes(answer)) return true;
  if (["خطا", "خطأ", "غلط", "لا", "false"].includes(answer)) return false;
  return null;
}

async function handleGuess(api, event, key, session) {
  const guess = Number(
    String(event.body || "")
      .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
      .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
      .trim()
  );

  if (!Number.isInteger(guess) || guess < 1 || guess > 100) {
    await api.sendMessage(
      error("تخمين غير صالح", ["أرسل رقماً صحيحاً من 1 إلى 100. لم تُحتسب المحاولة."]),
      event.threadID
    );
    return;
  }

  session.attempts -= 1;
  if (guess === session.answer) {
    clearSession(state.guessGames, key, session);
    await api.sendMessage(
      success("انتصار في التخمين", [`الرقم السري: ${session.answer}`, "أحسنت، انتهت اللعبة بفوزك."]),
      event.threadID
    );
    return;
  }

  if (session.attempts <= 0) {
    clearSession(state.guessGames, key, session);
    await api.sendMessage(
      error("انتهت اللعبة", [`الرقم السري كان: ${session.answer}`, "نفدت كل المحاولات."]),
      event.threadID
    );
    return;
  }

  const hint = guess < session.answer ? "الرقم السري أكبر من تخمينك." : "الرقم السري أصغر من تخمينك.";
  await api.sendMessage(
    info("نتيجة التخمين", [hint, `المحاولات المتبقية: ${session.attempts}`]),
    event.threadID
  );
}

async function handleTrueFalse(api, event, key, session) {
  const answer = parseBooleanAnswer(event.body);
  if (answer === null) {
    await api.sendMessage(
      error("إجابة غير مفهومة", ["اكتب: صح أو خطأ. لم تُنهَ الجولة بعد."]),
      event.threadID
    );
    return;
  }

  clearSession(state.trueFalseGames, key, session);
  if (answer === session.answer) {
    await api.sendMessage(success("إجابة صحيحة", ["أحسنت، إجابتك في محلها."]), event.threadID);
  } else {
    await api.sendMessage(
      error("إجابة غير صحيحة", [`الإجابة الصحيحة: ${session.answer ? "صح" : "خطأ"}`]),
      event.threadID
    );
  }
}

async function handleLetters(api, event, key, session) {
  const answer = normalizeAnswer(event.body).replace(/\s/g, "");
  if (!answer) return;
  if (answer === normalizeAnswer(session.answer).replace(/\s/g, "")) {
    clearSession(state.lettersGames, key, session);
    await api.sendMessage(success("تحدي الحروف", [`الكلمة الصحيحة: ${session.answer}`, "رائع، حصلت على نقطة معنوية."]), event.threadID);
    return;
  }
  await api.sendMessage(error("ليست الكلمة المطلوبة", ["حاول تكوين كلمة صحيحة من الحروف المعروضة."]), event.threadID);
}

async function handleReverse(api, event, key, session) {
  const answer = normalizeAnswer(event.body);
  if (answer === normalizeAnswer(session.answer)) {
    clearSession(state.reverseGames, key, session);
    await api.sendMessage(success("تحدي المعكوس", [`الكلمة الأصلية: ${session.answer}`, "إجابة ممتازة."]), event.threadID);
    return;
  }
  await api.sendMessage(error("إجابة غير صحيحة", ["حاول قراءة الكلمة من الجهة الأخرى."]), event.threadID);
}

async function handleNextMessage(api, event, prefix = "!") {
  const threadID = String(event.threadID || "");
  const senderID = String(event.senderID || "");
  const key = userKey(threadID, senderID);
  const body = String(event.body || "").trim();
  if (!body || body.startsWith(String(prefix))) return false;

  const handlers = [
    [state.guessGames, handleGuess],
    [state.trueFalseGames, handleTrueFalse],
    [state.lettersGames, handleLetters],
    [state.reverseGames, handleReverse],
  ];

  for (const [map, handler] of handlers) {
    const session = map.get(key);
    if (session) {
      await handler(api, event, key, session);
      return true;
    }
  }
  return false;
}

function cancelUserGames(threadID, senderID) {
  const key = userKey(threadID, senderID);
  let cancelled = 0;
  for (const map of [state.guessGames, state.trueFalseGames, state.lettersGames, state.reverseGames]) {
    const session = map.get(key);
    if (session) {
      clearSession(map, key, session);
      cancelled++;
    }
  }

  const xo = state.xoGames.get(String(threadID));
  if (xo && [xo.playerX, xo.playerO].includes(String(senderID))) {
    if (xo.timer) clearTimeout(xo.timer);
    state.xoGames.delete(String(threadID));
    cancelled++;
  }
  return cancelled;
}

module.exports = { handleNextMessage, cancelUserGames, userKey, clearSession };