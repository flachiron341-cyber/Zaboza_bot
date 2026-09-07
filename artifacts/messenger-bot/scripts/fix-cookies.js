"use strict";

/*
 * مثبت الكوكيز:
 * يحوّل تصدير المتصفح JSON أو Cookie header إلى appstate.json.
 *
 * الاستخدام:
 *   pnpm run fix-cookies -- cookies-export.json
 *   pnpm run fix-cookies -- cookies.txt
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const inputPath = path.resolve(process.argv[2] || path.join(root, "cookies.txt"));
const outputPath = path.join(root, "appstate.json");

function makeCookie(raw) {
  const key = String(raw?.key || raw?.name || "").trim();
  if (!key || raw?.value === undefined || raw?.value === null) return null;

  return {
    key,
    value: String(raw.value),
    domain: raw.domain || "facebook.com",
    path: raw.path || "/",
    hostOnly: Boolean(raw.hostOnly),
    ...(raw.creation ? { creation: raw.creation } : {}),
    ...(raw.lastAccessed ? { lastAccessed: raw.lastAccessed } : {}),
    ...(raw.expirationDate ? { expirationDate: raw.expirationDate } : {}),
  };
}

function fromRawText(text) {
  const withoutComments = text
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith("#"))
    .join(" ")
    .trim();

  return withoutComments
    .split(";")
    .map((part) => {
      const index = part.indexOf("=");
      if (index < 1) return null;
      return makeCookie({
        key: part.slice(0, index).trim(),
        value: part.slice(index + 1).trim(),
      });
    })
    .filter(Boolean);
}

function extractCookies(text) {
  try {
    const parsed = JSON.parse(text);
    const list = Array.isArray(parsed)
      ? parsed
      : parsed.cookies || parsed.appState || parsed.appstate;

    if (Array.isArray(list)) return list.map(makeCookie).filter(Boolean);
  } catch {
    // النص ليس JSON؛ سنعامله كـ Cookie header.
  }

  return fromRawText(text);
}

function deduplicate(cookies) {
  const byKey = new Map();
  for (const cookie of cookies) byKey.set(cookie.key, cookie);
  return [...byKey.values()];
}

if (!fs.existsSync(inputPath)) {
  console.error(`❌ ملف الإدخال غير موجود: ${inputPath}`);
  process.exitCode = 1;
} else {
  const cookies = deduplicate(
    extractCookies(fs.readFileSync(inputPath, "utf8"))
  );
  const keys = new Set(cookies.map((cookie) => cookie.key));

  if (!keys.has("c_user") || !keys.has("xs")) {
    console.error("❌ الكوكيز غير مكتملة: يجب أن تحتوي c_user و xs.");
    process.exitCode = 1;
  } else {
    const tempPath = `${outputPath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(cookies, null, 2), { mode: 0o600 });
    fs.renameSync(tempPath, outputPath);
    try { fs.chmodSync(outputPath, 0o600); } catch {}
    console.log(`✅ تم تثبيت ${cookies.length} كوكيز في appstate.json`);
    console.log("🔒 الملف اليدوي هو مصدر البوت ولن يغيّره البوت أثناء التشغيل.");
  }
}