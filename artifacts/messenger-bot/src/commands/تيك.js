const fs = require("fs");
const path = require("path");
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Accept": "application/json" };

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

async function resolveByUrl(url) {
  const d = await getJson("https://www.tikwm.com/api/?url=" + encodeURIComponent(url));
  return (d && d.data && (d.data.play || d.data.wmplay)) || null;
}

async function searchTikTok(q) {
  const d = await getJson("https://www.tikwm.com/api/feed/search?keywords=" + encodeURIComponent(q) + "&count=10&cursor=0");
  const vids = d && d.data ? (Array.isArray(d.data) ? d.data : (d.data.videos || d.data.items || [])) : [];
  for (const v of vids) {
    const play = v.play || v.wmplay || (v.video && v.video.play) || v.play_addr;
    const page = v.web_url || v.url || (v.id ? "https://www.tiktok.com/@x/video/" + v.id : null);
    if (play) return { play: play, page: page };
  }
  if (vids[0]) return { play: null, page: vids[0].web_url || vids[0].url || null };
  try {
    const r = await fetch("https://www.bing.com/search?q=" + encodeURIComponent("site:tiktok.com " + q), { headers: { "User-Agent": UA["User-Agent"] } });
    const html = await r.text();
    const m = html.match(/https?:\/\/(www\.)?tiktok\.com\/@[^"'<>\s]+\/video\/\d+/);
    if (m) return { play: null, page: m[0] };
  } catch (e) {}
  return null;
}

async function downloadSend(api, threadID, play) {
  const vr = await fetch(play, { headers: { "User-Agent": UA["User-Agent"], "Referer": "https://www.tikwm.com/" } });
  const buf = Buffer.from(await vr.arrayBuffer());
  if (buf.length < 1000 || buf.slice(4, 8).toString() !== "ftyp") return api.sendMessage("❌ الملف ليس فيديو صالحًا.", threadID);
  if (buf.length > 45 * 1024 * 1024) return api.sendMessage("❌ الفيديو كبير جدًا.", threadID);
  const tmp = path.join("/tmp", "tt_" + Date.now() + ".mp4");
  fs.writeFileSync(tmp, buf);
  await api.sendMessage({ attachment: fs.createReadStream(tmp) }, threadID);
  try { fs.unlinkSync(tmp); } catch (e) {}
}

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
      let play = null;
      if (link) {
        play = await resolveByUrl(link);
      } else {
        const res = await searchTikTok(text);
        if (res) play = res.play || (res.page ? await resolveByUrl(res.page) : null);
      }
      if (!play) return api.sendMessage("❌ لم أجد نتائج، جرّب كلمات أخرى.", threadID);
      await downloadSend(api, threadID, play);
    } catch (e) {
      console.log("❌ تيك خطأ:", String(e && e.message || e).slice(0, 200));
      api.sendMessage("❌ تعذر التحميل حاليًا، حاول بعد قليل.", threadID);
    }
  },
};

// ===== نسخة بحث محسّنة (تتجاوز السابقة) =====
async function searchTikTok(q) {
  // 1) بحث tikwm المباشر
  try {
    const d = await getJson("https://www.tikwm.com/api/feed/search?keywords=" + encodeURIComponent(q) + "&count=10&cursor=0");
    const vids = d && d.data ? (Array.isArray(d.data) ? d.data : (d.data.videos || d.data.items || [])) : [];
    for (const v of vids) {
      const play = v.play || v.wmplay || (v.video && v.video.play) || v.play_addr;
      const page = v.web_url || v.url || (v.id ? "https://www.tiktok.com/@x/video/" + v.id : null);
      if (play) return { play: play, page: page };
    }
    if (vids[0]) return { play: null, page: vids[0].web_url || vids[0].url || null };
  } catch (e) {}
  // 2) DuckDuckGo Lite (مضمون أكثر)
  try {
    const r = await fetch("https://lite.duckduckgo.com/lite/?q=" + encodeURIComponent("site:tiktok.com " + q), { headers: { "User-Agent": UA["User-Agent"] } });
    const html = await r.text();
    const urls = [];
    const re = /uddg=([^"&]+)/g;
    let mm;
    while ((mm = re.exec(html)) !== null) {
      try { urls.push(decodeURIComponent(mm[1])); } catch (e) {}
    }
    const vid = urls.find((u) => /tiktok\.com\/@[^/]+\/video\/\d+/.test(u));
    if (vid) return { play: null, page: vid };
  } catch (e) {}
  return null;
}

// ===== محرك بحث مجمع — يعيد قائمة روابط مرتبة (تتجاوز السابق) =====
async function searchTikTok(q) {
  const found = [];
  const seen = new Set();
  const push = (u) => {
    try { u = decodeURIComponent(String(u)).split("&")[0]; } catch (e) {}
    if (u && /tiktok\.com\/@[^/]+\/video\/\d+/.test(u) && !seen.has(u)) { seen.add(u); found.push(u); }
  };
  try {
    const r = await fetch("https://lite.duckduckgo.com/lite/?q=" + encodeURIComponent('"' + q + '" site:tiktok.com'), { headers: { "User-Agent": UA["User-Agent"] } });
    const html = await r.text();
    const re = /uddg=([^"&]+)/g;
    let m;
    while ((m = re.exec(html)) !== null) { push(m[1]); }
  } catch (e) {}
  try {
    const r = await fetch("https://www.mojeek.com/search?q=" + encodeURIComponent('"' + q + '" site:tiktok.com'), { headers: { "User-Agent": UA["User-Agent"] } });
    const html = await r.text();
    const re = /https?:\/\/(www\.)?tiktok\.com\/@[^"'<>\s]+\/video\/\d+/g;
    let m;
    while ((m = re.exec(html)) !== null) { push(m[0]); }
  } catch (e) {}
  return found.slice(0, 8);
}

// ===== تشغيل نهائي: يجرب كل المرشحين بالترتيب حتى نجاح واحد صالح =====
module.exports.run = async function({ api, event, args }) {
  const threadID = String(event.threadID);
  const text = (args.join(" ") || "").trim();
  if (!text) return api.sendMessage("❌ اكتب: !تيك لقطات نيمار", threadID);
  api.sendMessage("🔎 جاري البحث في تيك توك...", threadID);
  try {
    const link = extractTikTokUrl(text);
    const candidates = link ? [link] : await searchTikTok(text);
    if (!candidates.length) return api.sendMessage("❌ لم أجد نتائج، جرّب كلمات أخرى.", threadID);
    let lastErr = "";
    for (const page of candidates) {
      try {
        const play = await resolveByUrl(page);
        if (!play) continue;
        const vr = await fetch(play, { headers: { "User-Agent": UA["User-Agent"], "Referer": "https://www.tikwm.com/" } });
        const buf = Buffer.from(await vr.arrayBuffer());
        if (buf.length < 1000 || buf.slice(4, 8).toString() !== "ftyp") continue;
        if (buf.length > 45 * 1024 * 1024) continue;
        const tmp = path.join("/tmp", "tt_" + Date.now() + ".mp4");
        fs.writeFileSync(tmp, buf);
        await api.sendMessage({ attachment: fs.createReadStream(tmp) }, threadID);
        try { fs.unlinkSync(tmp); } catch (e) {}
        return;
      } catch (e) {
        lastErr = String(e && e.message || e).slice(0, 120);
      }
    }
    console.log("❌ تيك فشل كل المرشحين (" + candidates.length + "):", lastErr);
    api.sendMessage("❌ تعذر تحميل الفيديوهات الموجودة، حاول بكلمات أخرى.", threadID);
  } catch (e) {
    console.log("❌ تيك خطأ:", String(e && e.message || e).slice(0, 200));
    api.sendMessage("❌ حدث خطأ، حاول بعد قليل.", threadID);
  }
};

// ===== البحث عبر Google الرسمي (Serper) — يتجاوز كل ما سبق =====
async function searchTikTok(q) {
  const out = [];
  const seen = new Set();
  const push = (u) => {
    try { u = String(u).split("&")[0]; } catch (e) {}
    if (u && /tiktok\.com\/@[^/]+\/video\/\d+/.test(u) && !seen.has(u)) { seen.add(u); out.push(u); }
  };
  try {
    const K = process.env.SERPER_API_KEY;
    if (K) {
      const r = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": K, "Content-Type": "application/json" },
        body: JSON.stringify({ q: "site:tiktok.com " + q, num: 10 }),
      });
      const d = await r.json();
      for (const o of ((d && d.organic) || [])) { push(o.link); }
    }
  } catch (e) {}
  return out.slice(0, 8);
}
