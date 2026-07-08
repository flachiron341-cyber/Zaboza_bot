const axios = require("axios");
const fs = require("fs");
const path = require("path");

/**
 * يحوّل نصاً عربياً إلى ملف صوتي مؤقت ويعيد مساره
 * يستخدم Google Translate TTS (غير رسمي - مجاني)
 * @param {string} text
 * @returns {Promise<string|null>}
 */
async function textToSpeech(text) {
  try {
    const safeText = text.substring(0, 200); // حد أقصى 200 حرف
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      safeText
    )}&tl=ar&sl=ar&client=gtx`;

    const tmpPath = path.join("/tmp", `tts_${Date.now()}.mp3`);
    const res = await axios.get(url, {
      responseType: "stream",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://translate.google.com/",
      },
      timeout: 15000,
    });

    const writer = fs.createWriteStream(tmpPath);
    res.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    return tmpPath;
  } catch {
    return null;
  }
}

module.exports = { textToSpeech };
