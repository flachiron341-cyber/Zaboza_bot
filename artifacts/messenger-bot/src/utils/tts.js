const axios = require("axios");
const fs    = require("fs");
const path  = require("path");

/**
 * يحوّل نصاً إلى ملف صوتي مؤقت (arraybuffer للموثوقية)
 */
async function textToSpeech(text) {
  const safeText = String(text).slice(0, 200);
  const tmpPath  = path.join("/tmp", `tts_${Date.now()}.mp3`);

  const endpoints = [
    () => axios.get(
      `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(safeText)}&tl=ar&sl=ar&client=tw-ob`,
      {
        responseType: "arraybuffer",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://translate.google.com/",
          "Accept-Language": "ar,en;q=0.9",
        },
        timeout: 15000,
      }
    ),
    () => axios.get(
      `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(safeText)}&tl=ar&client=gtx`,
      {
        responseType: "arraybuffer",
        headers: {
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
          "Referer": "https://translate.google.com/",
        },
        timeout: 15000,
      }
    ),
  ];

  for (const attempt of endpoints) {
    try {
      const res = await attempt();
      if (!res || !res.data || res.data.byteLength < 100) continue;

      const ct = res.headers["content-type"] || "";
      if (!ct.includes("audio") && !ct.includes("mpeg")) continue;

      fs.writeFileSync(tmpPath, Buffer.from(res.data));
      return tmpPath;
    } catch {}
  }

  return null;
}

module.exports = { textToSpeech };
