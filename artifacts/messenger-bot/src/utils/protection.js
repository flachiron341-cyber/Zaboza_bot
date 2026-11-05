const lastSent = new Map();
const cmdCounter = new Map();

function rand(min, max) { return Math.floor(min + Math.random() * (max - min)); }

async function humanDelay(api, threadID, msMin, msMax) {
  try { if (api.sendTypingIndicator) api.sendTypingIndicator(threadID, true); } catch (e) {}
  await new Promise((r) => setTimeout(r, rand(msMin || 1500, msMax || 4000)));
  try { if (api.sendTypingIndicator) api.sendTypingIndicator(threadID, false); } catch (e) {}
}

// __dupFixed
function isDuplicate(threadID, text) {
  const t = String(text || "").trim();
  if (!t || t === "[media]") return false;
  const key = String(threadID);
  const now = Date.now();
  const prev = lastSent.get(key);
  lastSent.set(key, { text: t, time: now });
  if (lastSent.size > 200) lastSent.delete(lastSent.keys().next().value);
  if (prev && prev.text === t && now - prev.time < 4000) return true;
  return false;
}
function throttle(senderID, maxPerMin) {
  const key = String(senderID);
  const now = Date.now();
  let rec = cmdCounter.get(key) || { count: 0, reset: now + 60000 };
  if (now > rec.reset) rec = { count: 0, reset: now + 60000 };
  rec.count++;
  cmdCounter.set(key, rec);
  return rec.count <= (maxPerMin || 10);
}

async function markRead(api, event) {
  try { if (api.markAsRead) await api.markAsRead(String(event.threadID)); } catch (e) {}
}

module.exports = { humanDelay, isDuplicate, throttle, markRead };
