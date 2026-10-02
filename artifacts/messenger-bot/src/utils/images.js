const axios = require("axios");
const fs    = require("fs");
const path  = require("path");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function normalizedWords(value) {
  return String(value || "").toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function relevance(query, title, description) {
  const ignored = new Set(["the", "and", "for", "with", "from", "about", "a", "an", "of", "in", "on", "at", "to", "is", "are"]);
  const queryWords = [...new Set(normalizedWords(query))].filter((word) => !ignored.has(word));
  const titleWords = new Set(normalizedWords(title));
  const descriptionWords = new Set(normalizedWords(description));
  const primaryWord = queryWords[0];
  if (!primaryWord || (!titleWords.has(primaryWord) && !descriptionWords.has(primaryWord))) return 0;
  let score = 0;
  for (const word of queryWords) {
    if (titleWords.has(word)) score += 2;
    else if (descriptionWords.has(word)) score += 1;
  }
  return score;
}

/**
 * يبحث في Wikimedia Commons ويعطي الأولوية لعنوان/وصف يطابق كلمات الموضوع.
 */
async function searchImages(query, count = 6) {
  try {
    const response = await axios.get("https://commons.wikimedia.org/w/api.php", {
      params: {
        action: "query",
        generator: "search",
        gsrsearch: query,
        gsrnamespace: 6,
        gsrlimit: 50,
        prop: "imageinfo",
        iiprop: "url|extmetadata",
        iiurlwidth: 900,
        format: "json",
        origin: "*",
      },
      headers: { "User-Agent": UA },
      timeout: 20000,
    });

    const results = Object.values(response.data?.query?.pages || {})
      .map((page) => {
        const info = page.imageinfo?.[0];
        const description = String(info?.extmetadata?.ImageDescription?.value || "")
          .replace(/<[^>]*>/g, " ");
        const url = info?.thumburl || info?.url;
        const artist = String(info?.extmetadata?.Artist?.value || "").replace(/<[^>]*>/g, " ").trim();
        const license = String(info?.extmetadata?.LicenseShortName?.value || "").trim();
        return {
          url,
          title: String(page.title || "").replace(/^File:/i, ""),
          sourceURL: String(info?.descriptionurl || ""),
          attribution: [artist, license].filter(Boolean).join(" · "),
          score: relevance(query, page.title, description),
        };
      })
      .filter((image) => image.url && image.score > 0)
      .sort((left, right) => right.score - left.score);
    return results.slice(0, Math.max(count, 6));
  } catch {
    return [];
  }
}

/**
 * يُحمّل صورة من URL ويحفظها ملفاً مؤقتاً (arraybuffer → يتبع الـ redirects)
 */
async function downloadImage(imageUrl) {
  const url = typeof imageUrl === "string" ? imageUrl : imageUrl?.url;
  if (!url) return null;
  const tmpPath = path.join("/tmp", `img_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`);
  try {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent": UA,
        "Accept": "image/jpeg,image/png,image/webp,image/gif",
        "Referer": "https://commons.wikimedia.org/",
      },
      maxRedirects: 10,
      maxContentLength: 12 * 1024 * 1024,
      timeout: 20000,
    });

    const mime = String(res.headers?.["content-type"] || "").split(";")[0].toLowerCase();
    if (!/^image\/(jpeg|png|webp|gif)$/.test(mime) || !res.data || res.data.byteLength < 500) {
      return null;
    }

    fs.writeFileSync(tmpPath, Buffer.from(res.data));
    return tmpPath;
  } catch {
    try { fs.unlinkSync(tmpPath); } catch {}
    return null;
  }
}

module.exports = { searchImages, downloadImage, relevance, normalizedWords };
