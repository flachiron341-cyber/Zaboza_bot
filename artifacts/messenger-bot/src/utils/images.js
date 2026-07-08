const axios = require("axios");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * يبحث عن صور في Bing Images ويعيد روابط (حتى count رابط)
 * @param {string} query
 * @param {number} count
 * @returns {Promise<string[]>}
 */
async function searchImages(query, count = 4) {
  try {
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(
      query
    )}&form=HDRSC2&first=1&tsc=ImageBasicHover`;
    const res = await axios.get(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html",
        "Accept-Language": "ar,en;q=0.9",
      },
      timeout: 15000,
    });
    // استخراج روابط الصور من JSON المضمّن في HTML
    const matches = [
      ...res.data.matchAll(/"murl":"(https?:\/\/(?!www\.bing)[^"]+?\.(?:jpg|jpeg|png|webp))"/gi),
    ];
    const urls = matches.map((m) => m[1].replace(/\\\//g, "/"));
    // إزالة التكرارات
    const unique = [...new Set(urls)];
    return unique.slice(0, count);
  } catch {
    return [];
  }
}

module.exports = { searchImages };
