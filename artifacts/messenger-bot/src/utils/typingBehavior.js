"use strict";

const logger = require("./logger");
const installedApis = new WeakSet();

async function sendWithTyping(api, threadID, send, minDelayMs = 3000, maxDelayMs = 3000) {
  const id = String(threadID || "");
  const sendTyping = typeof api?.sendTypingIndicator === "function"
    ? api.sendTypingIndicator.bind(api)
    : null;

  let typingStarted = false;
  if (id && sendTyping) {
    try {
      await sendTyping(true, id);
      typingStarted = true;
    } catch (error) {
      logger.warn(`تعذر إظهار مؤشر الكتابة في القروب ${id}: ${error?.message || error}`);
    }
  }

  const delay = minDelayMs + Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1));
  await new Promise((resolve) => setTimeout(resolve, delay));

  try {
    return await send();
  } finally {
    if (typingStarted) {
      try {
        await sendTyping(false, id);
      } catch (error) {
        logger.warn(`تعذر إيقاف مؤشر الكتابة في القروب ${id}: ${error?.message || error}`);
      }
    }
  }
}

function installTypingBehavior(api, minDelayMs = 3000, maxDelayMs = 3000) {
  if (!api || installedApis.has(api) || typeof api.sendMessage !== "function") return;

  const sendMessage = api.sendMessage.bind(api);
  const pendingByThread = new Map();

  api.sendMessage = (...args) => {
    const rawThreadID = args[1];
    const threadID = typeof rawThreadID === "string" || typeof rawThreadID === "number"
      ? String(rawThreadID)
      : "";

    const send = () => sendWithTyping(
      api,
      threadID,
      () => sendMessage(...args),
      minDelayMs,
      maxDelayMs
    );

    if (!threadID) return send();

    const previous = pendingByThread.get(threadID) || Promise.resolve();
    const operation = previous.catch(() => {}).then(send);
    pendingByThread.set(threadID, operation);
    const clear = () => {
      if (pendingByThread.get(threadID) === operation) pendingByThread.delete(threadID);
    };
    operation.then(clear, clear);
    return operation;
  };

  installedApis.add(api);
}

module.exports = { installTypingBehavior, sendWithTyping };
