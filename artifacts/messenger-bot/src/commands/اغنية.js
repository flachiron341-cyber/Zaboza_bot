const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" };

// ===== المسارات (مصححة حسب مكان الملف الفعلي) =====
const WORKDIR = path.join(__dirname, "..", ".."); // مجلد المشروع: artifacts/messenger-bot
const YTDLP = path.join(WORKDIR, "yt-dlp");
const COOKIES_CANDIDATES = [
  path.join(WORKDIR, "cookies.txt"),              // داخل مجلد المشروع
  path.join(WORKDIR, "..", "cookies.txt"),        // جذر Replit
  "/home/runner/workspace/cookies.txt",
];
const COOKIES = COOKIES_CANDIDATES.find((p) => fs.existsSync(p)) || null;
const MAX_BYTES = 24 * 1024 * 1024;

console.log("📁 أغنية | مجلد العمل: " + WORKDIR);
console.log("🍪 كوكيز: " + (COOKIES || "غير موجود!"));

// ================= أدوات مساعدة =================
async function getJson(url, timeoutMs = 12000) {
  const r = await fetch(url, {
    headers: { ...UA, Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return await r.json();
}

async function fetchBuffer(url, referer) {
  const r = await fetch(url, {
    headers: { ...UA, ...(referer ? { Referer: referer } : {}) },
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw new Error("HTTP " + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error("الملف أكبر من 24MB");
  return buf;
}

function isAudioOk(buf) {
  if (!buf || buf.length < 50000) return false;
  const head = buf.slice(0, 12).toString("latin1");
  return head.includes("ftyp") || head.includes("ID3") || head.charCodeAt(0) === 0xff || head.startsWith("OggS");
}

// ================= البحث =================

// 0) Innertube — واجهة يوتيوب الداخلية، بدون مفتاح نهائيًا
const INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";

function collectVideos(node, out) {
  if (!node || typeof node !== "object") return;
  if (node.videoRenderer && node.videoRenderer.videoId) {
    const vr = node.videoRenderer;
    const title = vr.title && vr.title.runs ? vr.title.runs.map((x) => x.text).join("") : "";
    out.push({ id: vr.videoRenderer.videoId, title });
  }
  for (const k of Object.keys(node)) collectVideos(node[k], out);
}

function scoreTitle(title, tokens) {
  const t = String(title || "").toLowerCase();
  let score = 0;
  for (const tok of tokens) if (t.includes(tok)) score++;
  if (/official|audio|lyric|song|music/.test(t)) score += 0.5;
  return score;
}

async function findViaInnertube(q) {
  try {
    const r = await fetch("https://www.youtube.com/youtubei/v1/search?key=" + INNERTUBE_KEY, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...UA },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "ANDROID",
            clientVersion: "20.10.38",
            androidSdkVersion: 30,
            hl: "en",
            gl: "US",
          },
        },
        query: q,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const d = await r.json();
    const videos = [];
    collectVideos(d, videos);
    if (!videos.length) {
      console.log("🔍 Innertube: لا نتائج");
      return null;
    }
    const tokens = q.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
    let best = videos[0].id, bestScore = -1;
    for (const v of videos.slice(0, 15)) {
      const s = scoreTitle(v.title, tokens);
      if (s > bestScore) { bestScore = s; best = v.id; }
    }
    console.log("🔍 Innertube: " + best + " (" + videos.length + " نتيجة)");
    return best;
  } catch (e) {
    console.log("⚠️ Innertube فشل:", String(e.message || e).slice(0, 150));
    return null;
  }
}

// 1) Serper (احتياطي)
async function findViaSerper(q) {
  const K = (process.env.SERPER_API_KEY || "").trim();
  if (!K) return null;
  const tokens = q.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
  const queries = [
    "site:youtube.com/watch " + q + " official audio",
    "site:youtube.com/watch " + q,
    "site:music.youtube.com " + q,
  ];
  let best = null, bestScore = -1;
  for (const query of queries) {
    try {
      const r = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": K, "Content-Type": "application/json" },
        body: JSON.stringify({ q: query, num: 10 }),
        signal: AbortSignal.timeout(12000),
      });
      const d = await r.json();
      for (const o of ((d && d.organic) || [])) {
        const m = String(o.link || "").match(/(?:youtube\.com\/watch\?v=|music\.youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
        if (!m) continue;
        const title = String(o.title || "").toLowerCase();
        let score = scoreTitle(title, tokens);
        if (score > bestScore) { bestScore = score; best = m[1]; }
      }
    } catch (e) {}
  }
  console.log(best ? "🔍 Serper: " + best : "🔍 Serper: لا نتائج");
  return best;
}

// 2) Piped
const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.reallyaweso.me",
  "https://api.piped.private.coffee",
  "https://pipedapi.r4fo.com",
];
async function findViaPiped(q) {
  for (const base of PIPED_INSTANCES) {
    try {
      const d = await getJson(base + "/search?q=" + encodeURIComponent(q) + "&filter=videos");
      const items = (d && d.items) || [];
      const first = items.find((v) => v.url && /watch\?v=[\w-]{6,}/.test(v.url));
      if (first) {
        const id = first.url.match(/watch\?v=([\w-]{6,})/)[1];
        console.log("🔍 Piped(" + base + "): " + id);
        return id;
      }
    } catch (e) {}
  }
  console.log("🔍 Piped: لا نتائج");
  return null;
}

// 3) Invidious
const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://yt.chocolatemoo53.com",
  "https://invidious.tiekoetter.com",
];
async function findViaInvidious(q) {
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const d = await getJson(base + "/api/v1/search?q=" + encodeURIComponent(q) + "&type=video&page=1");
      const items = Array.isArray(d) ? d : [];
      const v = items.find((x) => x.type === "video" && x.videoId);
      if (v) {
        console.log("🔍 Invidious(" + base + "): " + v.videoId);
        return v.videoId;
      }
    } catch (e) {}
  }
  console.log("🔍 Invidious: لا نتائج");
  return null;
}

async function findSong(q) {
  return (await findViaInnertube(q))
      || (await findViaSerper(q))
      || (await findViaPiped(q))
      || (await findViaInvidious(q));
}

// ================= التحميل =================

async function downloadViaPiped(id) {
  for (const base of PIPED_INSTANCES) {
    try {
      const d = await getJson(base + "/streams/" + id);
      const streams = (d && d.audioStreams) || [];
      const s = streams.find((x) => /mp4|m4a/.test(x.mimeType || "")) || streams[0];
      if (!s || !s.url) continue;
      if (Number(s.contentLength) > MAX_BYTES) continue;
      console.log("⬇️ Piped صوت: " + (s.mimeType || "?") + " " + (s.contentLength || "?") + "B");
      const buf = await fetchBuffer(s.url);
      if (isAudioOk(buf)) return buf;
    } catch (e) {
      console.log("⚠️ Piped تحميل فشل:", String(e.message || e).slice(0, 100));
    }
  }
  return null;
}

async function downloadViaInvidious(id) {
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const buf = await fetchBuffer(base + "/latest_version?id=" + id + "&itag=140&local=true");
      if (isAudioOk(buf)) return buf;
    } catch (e) {}
  }
  return null;
}

async function downloadViaCobalt(videoUrl) {
  try {
    const r = await fetch("https://api.cobalt.tools/", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ url: videoUrl, downloadMode: "audio", audioFormat: "mp3" }),
      signal: AbortSignal.timeout(30000),
    });
    const d = await r.json();
    if (d && d.status === "tunnel" && d.url) {
      const buf = await fetchBuffer(d.url);
      if (isAudioOk(buf)) return buf;
    }
  } catch (e) {}
  return null;
}

// 4) yt-dlp مع الكوكيز
async function downloadViaYtdlp(videoUrl) {
  if (!fs.existsSync(YTDLP)) {
    console.log("⚠️ yt-dlp غير موجود في: " + YTDLP);
    return null;
  }
  const out = path.join(WORKDIR, "song_dl_" + Date.now() + ".%(ext)s");
  const env = { ...process.env, PATH: (process.env.HOME || "/home/runner") + "/.deno/bin:" + (process.env.PATH || "") };
  const args = [
    "-f", "bestaudio[ext=m4a]/bestaudio/best",
    "--no-playlist",
    "--force-overwrites",
    "--max-filesize", "24m",
    "--no-warnings",
    "-o", out, videoUrl,
  ];
  if (COOKIES) {
    args.push("--cookies", COOKIES);
    console.log("🍪 سيتم استخدام ملف الكوكيز: " + COOKIES);
  }
  await new Promise((resolve, reject) => {
    execFile(YTDLP, args, { timeout: 180000, env }, (err, stdout, stderr) => {
      if (err) {
        console.log("⚠️ yt-dlp فشل:", String(stderr || err).slice(0, 300));
        return reject(err);
      }
      resolve();
    });
  });
  const prefix = "song_dl_";
  const found = fs.readdirSync(WORKDIR).find((x) => x.startsWith(prefix));
  if (!found) return null;
  const filePath = path.join(WORKDIR, found);
  const buf = fs.readFileSync(filePath);
  try { fs.unlinkSync(filePath); } catch (e) {}
  return isAudioOk(buf) ? buf : null;
}

async function downloadSong(id) {
  const videoUrl = "https://www.youtube.com/watch?v=" + id;
  let buf = await downloadViaPiped(id);
  if (buf) return buf;
  buf = await downloadViaInvidious(id);
  if (buf) return buf;
  buf = await downloadViaCobalt(videoUrl);
  if (buf) return buf;
  buf = await downloadViaYtdlp(videoUrl);
  if (buf) return buf;
  throw new Error("كل طرق التحميل فشلت");
}

// ================= الأمر =================
module.exports = {
  config: {
    name: "اغنية",
    aliases: ["اغنيه", "song", "music"],
    description: "🎵 ابحث عن أغنية وارسلها صوتًا",
    usage: "!اغنية <اسم الأغنية>",
    cooldown: 20,
    adminOnly: false,
  },
  async run({ api, event, args }) {
    const threadID = String(event.threadID);
    const q = args.join(" ").trim();
    if (!q) return api.sendMessage("❌ اكتب: !اغنية اسم الأغنية", threadID);
    console.log("🎵 البحث عن:", q);
    api.sendMessage("🎵 جاري البحث عن الأغنية...", threadID);
    try {
      const id = await findSong(q);
      if (!id) return api.sendMessage("❌ لم أجد الأغنية، جرّب اسمًا آخر.", threadID);
      api.sendMessage("⬇️ جاري التحميل...", threadID);
      const buf = await downloadSong(id);
      const tmp = path.join("/tmp", "song_" + Date.now() + ".m4a");
      fs.writeFileSync(tmp, buf);
      await api.sendMessage({ attachment: fs.createReadStream(tmp) }, threadID);
      try { fs.unlinkSync(tmp); } catch (e) {}
    } catch (e) {
      console.log("❌ اغنية خطأ:", String(e.message || e).slice(0, 300));
      api.sendMessage("❌ تعذر التحميل، جرّب أغنية أخرى.", threadID);
    }
  },
};
