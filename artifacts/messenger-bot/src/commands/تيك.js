const fs = require("fs");
const path = require("path");

const UA = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  "Accept": "application/json",
};

// ===== أدوات مساعدة =====
function extractTikTokUrl(t) {
  const m = String(t || "").match(/https?:\/\/[^\s"'<>]*tiktok\.com[^\s"'<>]*/i);
  return m ? m[0] : null;
}

async function getJson(url) {
  const r = await fetch(url, { headers: UA });
  const ct = r.headers.get("content-type") || "";
  if (!ct.includes("json")) return null;
  return await r.json();
}

// ===== استخراج رابط التحميل من رابط الفيديو (عبر tikwm) =====
async function resolveByUrl(url) {
  try {
    const d = await getJson("https://www.tikwm.com/api/?url=" + encodeURIComponent(url));
    return (d && d.data && (d.data.play || d.data.wmplay)) || null;
  } catch (e) {
    console.log("❌ تيك/resolve:", String(e && e.message || e).slice(0, 120));
    return null;
  }
}

// ===== 1) بحث مباشر في tikwm =====
async function searchTikwm(q) {
  try {
    const d = await getJson("https://www.tikwm.com/api/feed/search?keywords=" + encodeURIComponent(q) + "&count=10&cursor=0");
    const vids = d && d.data ? (Array.isArray(d.data) ? d.data : (d.data.videos || d.data.items || [])) : [];
    const out = [];
    for (const v of vids) {
      const play = v.play || v.wmplay || (v.video && v.video.play) || v.play_addr;
      const page = v.web_url || v.url || (v.id ? "https://www.tiktok.com/@x/video/" + v.id : null);
      if (play || page) out.push({ play: play || null, page: page || null });
    }
    return out;
  } catch (e) {
    return [];
  }
}

// ===== 2) بحث DuckDuckGo (احتياطي، لا يحتاج مفتاح) =====
async function searchDuck(q) {
  const out = [];
  const seen = new Set();
  try {
    const r = await fetch("https://lite.duckduckgo.com/lite/?q=" + encodeURIComponent('"' + q + '" site:tiktok.com'), { headers: { "User-Agent": UA["User-Agent"] } });
    const html = await r.text();
    const re = /uddg=([^"&]+)/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      let u;
      try { u = decodeURIComponent(m[1]); } catch (e) { continue; }
      if (/tiktok\.com\/@[^/]+\/video\/\d+/.test(u) && !seen.has(u)) {
        seen.add(u);
        out.push({ play: null, page: u });
      }
    }
  } catch (e) {}
  return out;
}

// ===== 3) بحث Google عبر Serper (اختياري — يعمل فقط إذا المفتاح موجود) =====
async function searchSerper(q) {
  const out = [];
  const K = (process.env.SERPER_API_KEY || "").trim();
  if (!K) return out;
  try {
    const r = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": K, "Content-Type": "application/json" },
      body: JSON.stringify({ q: "site:tiktok.com " + q, num: 10 }),
    });
    const d = await r.json();
    for (const o of ((d && d.organic) || [])) {
      if (o.link && /tiktok\.com\/@[^/]+\/video\/\d+/.test(o.link)) {
        out.push({ play: null, page: o.link });
      }
    }
  } catch (e) {}
  return out;
}

// ===== تنزيل وإرسال الفيديو =====
async function trySend(api, threadID, play) {
  const vr = await fetch(play, { headers: { "User-Agent": UA["User-Agent"], "Referer": "https://www.tikwm.com/" } });
  const buf = Buffer.from(await vr.arrayBuffer());
  // تحقق أن الملف فيديو MP4 حقيقي (ftyp أو moov في بدايته)
  const sig = buf.length > 12 ? buf.slice(4, 8).toString() : "";
  if (buf.length < 1000 || (sig !== "ftyp" && sig !== "moov")) return false;
  if (buf.length > 45 * 1024 * 1024) return false;
  const tmp = path.join("/tmp", "tt_" + Date.now() + ".mp4");
  fs.writeFileSync(tmp, buf);
  await api.sendMessage({ attachment: fs.createReadStream(tmp) }, threadID);
  try { fs.unlinkSync(tmp); } catch (e) {}
  return true;
}

// ===== الأمر =====
module.exports = {
  config: {
    name: "تيك",
    aliases: ["تيكتوك", "tiktok", "tt"],
    description: "🔎 بحث في تيك توك وإرسال فيديو",
    usage: "!تيك <بحث أو رابط>",
    cooldown: 10,
    adminOnly: false,
  },
  async run({ api, event, args }) {
    const threadID = String(event.threadID);
    const text = (args.join(" ") || "").trim();
    if (!text) return api.sendMessage("❌ اكتب: !تيك لقطات نيمار", threadID);
    api.sendMessage("🔎 جاري البحث في تيك توك...", threadID);
    try {
      const link = extractTikTokUrl(text);
      // اجمع كل المرشحين من المصادر الثلاثة
      const cand = link ? [{ play: null, page: link }] : [
        ...await searchTikwm(text),
        ...await searchDuck(text),
        ...await searchSerper(text),
      ];
      if (!cand.length) {
        console.log("❌ تيك: لا نتائج من كل المصادر. SERPER_KEY:", Boolean((process.env.SERPER_API_KEY || "").trim()));
        return api.sendMessage("❌ لم أجد نتائج، جرّب كلمات أخرى.", threadID);
      }
      console.log("🔎 تيك: مرشحون =", cand.length);
      let sent = false;
      for (const c of cand.slice(0, 8)) {
        try {
          const play = c.play || (c.page ? await resolveByUrl(c.page) : null);
          if (!play) continue;
          if (await trySend(api, threadID, play)) { sent = true; break; }
        } catch (e) {
          console.log("❌ تيك/مرشح:", String(e && e.message || e).slice(0, 120));
        }
      }
      if (!sent) {
        console.log("❌ تيك: فشل كل المرشحين (" + cand.length + ")");
        api.sendMessage("❌ تعذر تحميل الفيديوهات، حاول بكلمات أخرى.", threadID);
      }
    } catch (e) {
      console.log("❌ تيك خطأ:", String(e && e.message || e).slice(0, 200));
      api.sendMessage("❌ حدث خطأ، حاول بعد قليل.", threadID);
    }
  },
};
