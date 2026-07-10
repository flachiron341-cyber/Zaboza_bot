const ytsr    = require("ytsr");
const ytdl    = require("ytdl-core");
const ffmpeg  = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const fs      = require("fs");
const path    = require("path");

ffmpeg.setFfmpegPath(ffmpegPath);

// ──────────────────────────────────────────────
// تحويل "0:30" → ثواني
// ──────────────────────────────────────────────
function durationToSeconds(dur) {
  if (!dur) return Infinity;
  const parts = dur.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

/**
 * يبحث في يوتيوب ويعيد أفضل نتيجة فيديو بين 10-90 ثانية
 * @param {string} query
 * @returns {Promise<{url, title, duration} | null>}
 */
async function searchYoutube(query) {
  try {
    const results = await ytsr(query, { limit: 20 });
    const videos  = (results.items || []).filter(
      (v) => v.type === "video" && v.duration && !v.isLive
    );

    // نفضّل الفيديوهات بين 10 و 90 ثانية
    const short = videos.filter((v) => {
      const s = durationToSeconds(v.duration);
      return s >= 10 && s <= 90;
    });

    const pick = (short.length ? short : videos)[0];
    if (!pick) return null;

    return {
      url:      pick.url,
      title:    pick.title,
      duration: durationToSeconds(pick.duration),
    };
  } catch (e) {
    return null;
  }
}

/**
 * يُحمّل فيديو من يوتيوب ويقصّه إلى 60 ثانية كحد أقصى
 * @param {string} url
 * @param {number} maxDuration بالثواني
 * @returns {Promise<string|null>} مسار الملف المؤقت
 */
async function downloadYoutubeVideo(url, maxDuration = 60) {
  const tmpIn  = path.join("/tmp", `yt_in_${Date.now()}.mp4`);
  const tmpOut = path.join("/tmp", `yt_out_${Date.now()}.mp4`);

  try {
    // تحميل الفيديو بأدنى جودة
    const info    = await ytdl.getInfo(url);
    const formats = ytdl.filterFormats(info.formats, "videoandaudio");
    const chosen  = formats.find((f) => f.container === "mp4") || formats[0];

    if (!chosen) return null;

    await new Promise((resolve, reject) => {
      const stream = ytdl.downloadFromInfo(info, { format: chosen });
      const out    = fs.createWriteStream(tmpIn);
      stream.pipe(out);
      stream.on("error", reject);
      out.on("finish", resolve);
      out.on("error", reject);
      setTimeout(() => reject(new Error("timeout")), 90000);
    });

    // قص الفيديو لـ 60 ثانية
    await new Promise((resolve, reject) => {
      ffmpeg(tmpIn)
        .setStartTime(0)
        .setDuration(maxDuration)
        .videoCodec("libx264")
        .audioCodec("aac")
        .format("mp4")
        .on("end",   resolve)
        .on("error", reject)
        .save(tmpOut);
    });

    fs.unlink(tmpIn, () => {});
    return tmpOut;
  } catch {
    try { fs.unlink(tmpIn,  () => {}); } catch {}
    try { fs.unlink(tmpOut, () => {}); } catch {}
    return null;
  }
}

module.exports = { searchYoutube, downloadYoutubeVideo };
