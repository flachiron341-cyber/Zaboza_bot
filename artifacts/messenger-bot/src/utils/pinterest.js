const axios = require("axios");
const fs = require("fs");
const path = require("path");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * يجلب رابط الصورة من pin.it أو رابط Pinterest عادي
 * @param {string} pinUrl
 * @returns {Promise<string|null>}
 */
async function getImageUrlFromPin(pinUrl) {
  try {
    const res = await axios.get(pinUrl, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      maxRedirects: 10,
      timeout: 15000,
    });
    // استخراج og:image
    const match = res.data.match(
      /<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i
    ) || res.data.match(/content="([^"]+)"\s+property="og:image"/i);
    if (match) return match[1].replace(/&amp;/g, "&");
    return null;
  } catch {
    return null;
  }
}

/**
 * يحمّل صورة من URL إلى ملف مؤقت ويعيد مساره
 * @param {string} imageUrl
 * @returns {Promise<string|null>}
 */
async function downloadImage(imageUrl) {
  try {
    const tmpPath = path.join("/tmp", `img_${Date.now()}.jpg`);
    const res = await axios.get(imageUrl, {
      responseType: "stream",
      headers: { "User-Agent": UA },
      timeout: 20000,
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

module.exports = { getImageUrlFromPin, downloadImage };
