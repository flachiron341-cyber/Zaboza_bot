"use strict";

const axios = require("axios");
const fs = require("fs");
const path = require("path");

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

module.exports = { searchSong, downloadSongPreview };