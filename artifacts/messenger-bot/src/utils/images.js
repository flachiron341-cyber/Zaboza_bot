const axios = require("axios");
const fs    = require("fs");
const path  = require("path");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * يُنشئ روابط صور من loremflickr بكلمة البحث (إنجليزية)
 */
function searchImages(query, count = 4) {
  const encoded = encodeURIComponent(query.trim().replace(/\s+/g, ","));
  return Array.from({ length: count }, (_, i) =>
    `https://loremflickr.com/600/600/${encoded}?lock=${i + Math.floor(Math.random() * 900)}`
  );
}

/**
 * يُحمّل صورة من URL ويحفظها ملفاً مؤقتاً (arraybuffer → يتبع الـ redirects)
 */
async function downloadImage(imageUrl) {
  const tmpPath = path.join("/tmp", `img_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`);
  try {
    const res = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent": UA,
        "Accept": "image/webp,image/jpeg,image/*,*/*;q=0.8",
        "Referer": "https://www.google.com/",
      },
      maxRedirects: 10,
      timeout: 20000,
    });

    if (!res.data || res.data.byteLength < 500) return null;

    fs.writeFileSync(tmpPath, Buffer.from(res.data));
    return tmpPath;
  } catch {
    try { fs.unlinkSync(tmpPath); } catch {}
    return null;
  }
}

module.exports = { searchImages, downloadImage };
