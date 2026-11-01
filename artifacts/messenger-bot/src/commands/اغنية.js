const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const YTDLP = "/home/runner/workspace/artifacts/messenger-bot/yt-dlp";

async function findYouTube(q) {
  const K = process.env.SERPER_API_KEY;
  if (!K) return null;
  const tokens = q.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
  const queries = [
    "site:youtube.com/watch " + q + " official audio",
    "site:youtube.com/watch " + q,
    "site:music.youtube.com " + q,
  ];
  let best = null;
  let bestTitle = "";
  let bestScore = -1;
  for (const query of queries) {
    try {
      const r = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": K, "Content-Type": "application/json" },
        body: JSON.stringify({ q: query, num: 10 }),
      });
      const d = await r.json();
      const org = (d && d.organic) || [];
      for (const o of org) {
        const link = String(o.link || "");
        const m = link.match(/(?:youtube\.com\/watch\?v=|music\.youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
        if (!m) continue;
        const title = String(o.title || "").toLowerCase();
        let score = 0;
        for (const t of tokens) { if (title.includes(t)) score++; }
        if (/official|audio|lyric|song|music/.test(title)) score += 0.5;
        if (score > bestScore) {
          bestScore = score;
          best = "https://www.youtube.com/watch?v=" + m[1];
          bestTitle = String(o.title || "");
        }
      }
    } catch (e) {}
  }
  if (best) console.log("🎵 المختارة:", bestTitle, "| التطابق:", bestScore);
  return best;
}

function ytdlp(url) {
  return new Promise((resolve, reject) => {
    const dir = "/home/runner/workspace/artifacts/messenger-bot";
    try { for (const x of fs.readdirSync(dir)) { if (x.startsWith("song_dl.")) { try { fs.unlinkSync(dir + "/" + x); } catch (e) {} } } } catch (e) {}
    const env = Object.assign({}, process.env, { PATH: (process.env.HOME || "/home/runner") + "/.deno/bin:" + (process.env.PATH || "") });
    execFile(YTDLP, ["-f", "bestaudio[ext=m4a]/bestaudio", "--no-playlist", "--force-overwrites", "-o", dir + "/song_dl.%(ext)s", url], { timeout: 180000, env }, (err) => {
      if (err) return reject(new Error(String(err).slice(0, 200)));
      try {
        const f2 = fs.readdirSync(dir).find((x) => x.startsWith("song_dl."));
        if (f2) return resolve(dir + "/" + f2);
      } catch (e) {}
      reject(new Error("file missing after download"));
    });
  });
}

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
    api.sendMessage("🎵 جاري البحث عن الأغنية...", threadID);
    try {
      const url = await findYouTube(q);
      if (!url) return api.sendMessage("❌ لم أجد الأغنية، جرّب اسمًا آخر.", threadID);
      api.sendMessage("⬇️ جاري التحميل والتحويل صوتيًا...", threadID);
      const file = await ytdlp(url);
      await api.sendMessage({ attachment: fs.createReadStream(file) }, threadID);
      try { fs.unlinkSync(file); } catch (e) {}
    } catch (e) {
      console.log("❌ اغنية خطأ:", String(e.message || e).slice(0, 300));
      api.sendMessage("❌ تعذر التحميل، جرّب أغنية أخرى.", threadID);
    }
  },
};
