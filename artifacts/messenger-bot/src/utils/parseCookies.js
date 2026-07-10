"use strict";

/**
 * يحوّل نص الكوكيز الخام (من المتصفح) إلى صيغة appstate التي تقبلها ws3-fca
 * @param {string} rawCookie — مثال: "c_user=123; xs=abc; datr=xyz"
 * @returns {Array<object>}
 */
function parseCookieString(rawCookie) {
  const now = new Date().toISOString();
  return rawCookie
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const eqIdx = part.indexOf("=");
      if (eqIdx === -1) return null;
      const key   = part.slice(0, eqIdx).trim();
      const value = part.slice(eqIdx + 1).trim();
      return {
        key,
        value,
        domain:       ".facebook.com",
        path:         "/",
        hostOnly:     false,
        creation:     now,
        lastAccessed: now,
      };
    })
    .filter(Boolean);
}

module.exports = { parseCookieString };
