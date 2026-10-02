"use strict";

const axios = require("axios");
const fs = require("fs");
const path = require("path");

const COMMONS_UA = "Mozilla/5.0 (compatible; ZABOZA-Messenger-Bot/1.0)";
const AUDIO_EXTENSIONS = /\.(mp3|ogg|oga|opus|wav|flac|m4a)$/i;

function cleanMetadata(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function canRedistribute(licenseValue) {
  const license = cleanMetadata(licenseValue)
    .toLowerCase()
    .replace(/[-–—]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (
    license.includes("public domain") ||
    license.startsWith("cc0") ||
    /^cc by(?: sa)?(?: \d|$)/.test(license)
  );
}

function matchScore(query, title, description) {
  const ignored = new Set(["sound", "audio", "music", "song", "effect", "صوت", "موسيقى", "أغنية", "اغنية"]);
  const words = [...new Set(String(query || "").toLowerCase().match(/[\p{L}\p{N}]+/gu) || [])]
    .filter((word) => !ignored.has(word));
  if (!words.length) return 0;

  const titleWords = new Set(String(title || "").toLowerCase().match(/[\p{L}\p{N}]+/gu) || []);
  const descriptionWords = new Set(String(description || "").toLowerCase().match(/[\p{L}\p{N}]+/gu) || []);
  return words.reduce((score, word) => {
    if (titleWords.has(word)) return score + 3;
    if (descriptionWords.has(word)) return score + 1;
    return score;
  }, 0);
}

async function searchFreeAudio(query) {
  const response = await axios.get("https://commons.wikimedia.org/w/api.php", {
    params: {
      action: "query",
      generator: "search",
      gsrsearch: `filetype:audio ${query}`,
      gsrnamespace: 6,
      gsrlimit: 30,
      prop: "imageinfo",
      iiprop: "url|size|extmetadata",
      format: "json",
      origin: "*",
    },
    headers: { "User-Agent": COMMONS_UA, Accept: "application/json" },
    timeout: 25000,
  });

  return Object.values(response.data?.query?.pages || {})
    .map((page) => {
      const image = page.imageinfo?.[0] || {};
      const metadata = image.extmetadata || {};
      const title = String(page.title || "").replace(/^File:/i, "");
      const description = cleanMetadata(metadata.ImageDescription?.value);
      const license = cleanMetadata(metadata.LicenseShortName?.value);
      return {
        title,
        description,
        url: String(image.url || ""),
        sourceURL: String(image.descriptionurl || ""),
        license,
        artist: cleanMetadata(metadata.Artist?.value),
        size: Number(image.size || 0),
        score: matchScore(query, title, description),
      };
    })
    .filter((item) =>
      item.url &&
      AUDIO_EXTENSIONS.test(item.title) &&
      item.score > 0 &&
      canRedistribute(item.license)
    )
    .sort((left, right) => right.score - left.score)[0] || null;
}

async function downloadFreeAudio(audio) {
  if (!audio?.url) return null;
  const maxBytes = 24 * 1024 * 1024;
  if (audio.size > maxBytes) return null;
  const extension = path.extname(new URL(audio.url).pathname).toLowerCase() || ".audio";
  const filePath = path.join(
    "/tmp",
    `free_audio_${Date.now()}_${Math.random().toString(36).slice(2)}${extension}`
  );

  try {
    const response = await axios.get(audio.url, {
      responseType: "arraybuffer",
      headers: { "User-Agent": COMMONS_UA, Referer: "https://commons.wikimedia.org/" },
      maxContentLength: maxBytes,
      maxBodyLength: maxBytes,
      maxRedirects: 10,
      timeout: 60000,
    });
    const mime = String(response.headers?.["content-type"] || "").split(";")[0].toLowerCase();
    const isOgg = /^(application\/ogg|audio\/ogg)$/.test(mime) && /\.(ogg|oga|opus)$/i.test(extension);
    if ((!mime.startsWith("audio/") && !isOgg) || !response.data || response.data.byteLength < 1000) {
      return null;
    }
    fs.writeFileSync(filePath, Buffer.from(response.data));
    return filePath;
  } catch {
    try { fs.unlinkSync(filePath); } catch {}
    return null;
  }
}

async function searchSong(query) {
  const response = await axios.get("https://api.deezer.com/search", {
    params: { q: query, limit: 10 },
    timeout: 20000,
  });

  const tracks = Array.isArray(response.data?.data) ? response.data.data : [];
  const track = tracks.find((item) => item?.preview) || tracks[0];
  if (!track?.preview) return null;

  return {
    title: String(track.title || query),
    artist: String(track.artist?.name || "غير معروف"),
    preview: String(track.preview),
    link: String(track.link || ""),
    duration: Number(track.duration || 30),
  };
}

async function downloadSongPreview(previewUrl) {
  const filePath = path.join(
    "/tmp",
    `song_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`
  );

  try {
    const response = await axios.get(previewUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
      maxContentLength: 12 * 1024 * 1024,
      maxBodyLength: 12 * 1024 * 1024,
    });
    const buffer = Buffer.from(response.data || []);
    if (buffer.length < 1000) return null;
    fs.writeFileSync(filePath, buffer);
    return filePath;
  } catch {
    try {
      fs.unlinkSync(filePath);
    } catch {}
    return null;
  }
}

module.exports = {
  searchFreeAudio,
  downloadFreeAudio,
  searchSong,
  downloadSongPreview,
  canRedistribute,
};