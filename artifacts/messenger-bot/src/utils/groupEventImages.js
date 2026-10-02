"use strict";

const axios = require("axios");
const fs = require("fs");
const path = require("path");
const persistentState = require("./persistentState");

const imageDirectory = path.join(__dirname, "../../assets/events/groups");
const allowedHosts = ["facebook.com", "fbcdn.net", "fbsbx.com", "messenger.com"];
const extensionsByMime = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function isAllowedHost(hostname) {
  return allowedHosts.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

function safeThreadID(threadID) {
  const safe = String(threadID || "").replace(/[^a-z0-9_-]/gi, "");
  if (!safe) throw new Error("معرّف القروب غير صالح.");
  return safe;
}

async function saveReplyImage(threadID, slot, attachment) {
  const imageURL = attachment?.url || attachment?.largePreviewUrl || attachment?.previewUrl;
  if (!imageURL) throw new Error("ردّ على صورة مرفقة مباشرة.");

  let parsed;
  try {
    parsed = new URL(imageURL);
  } catch {
    throw new Error("رابط الصورة غير صالح.");
  }
  if (parsed.protocol !== "https:" || !isAllowedHost(parsed.hostname)) {
    throw new Error("يجب أن تكون الصورة مرفوعة في Messenger أو Facebook.");
  }

  const response = await axios.get(parsed.href, {
    responseType: "arraybuffer",
    timeout: 20000,
    maxContentLength: 10 * 1024 * 1024,
    maxBodyLength: 10 * 1024 * 1024,
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const finalURL = response.request?.res?.responseUrl;
  if (finalURL) {
    const redirected = new URL(finalURL);
    if (redirected.protocol !== "https:" || !isAllowedHost(redirected.hostname)) {
      throw new Error("رفضت وجهة التحويل لأنها ليست من نطاقات Facebook.");
    }
  }

  const mime = String(response.headers?.["content-type"] || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  const extension = extensionsByMime[mime];
  const buffer = Buffer.from(response.data || []);
  if (!extension || buffer.length < 512 || buffer.length > 10 * 1024 * 1024) {
    throw new Error("الملف المرفق ليس صورة مدعومة أو حجمه غير مناسب.");
  }

  const id = safeThreadID(threadID);
  fs.mkdirSync(imageDirectory, { recursive: true });
  const filename = `${id}-${slot}.${extension}`;
  const destination = path.join(imageDirectory, filename);
  const temporary = `${destination}.tmp`;
  fs.writeFileSync(temporary, buffer);
  fs.renameSync(temporary, destination);

  const previous = persistentState.getGroupEventImage(threadID, slot);
  if (previous && previous !== filename) {
    const oldPath = path.join(imageDirectory, path.basename(previous));
    if (path.dirname(oldPath) === imageDirectory && fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }
  persistentState.saveGroupEventImage(threadID, slot, filename);
  return destination;
}

function getImagePath(threadID, slot) {
  const filename = persistentState.getGroupEventImage(threadID, slot);
  if (!filename || path.basename(filename) !== filename) return null;
  const imagePath = path.join(imageDirectory, filename);
  return fs.existsSync(imagePath) ? imagePath : null;
}

module.exports = { saveReplyImage, getImagePath };