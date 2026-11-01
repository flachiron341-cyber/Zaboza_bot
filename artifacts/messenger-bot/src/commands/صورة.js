const fs = require("fs");
const path = require("path");
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" };

module.exports = {
  config: {
    name: "صورة",
    aliases: ["image", "img", "pic", "بنترست"],
    description: "🔎 صور من Pinterest حسب طلبك بدقة",
    usage: "!صورة <وصف>",
    cooldown: 5,
    adminOnly: false,
  },

  async run({ api, event, args }) {
    const threadID = String(event.threadID);
    const q = args.join(" ").trim();
    if (!q) return api.sendMessage("❌ اكتب: !صورة غروب الشمس", threadID);
    api.sendMessage("🔎 جاري البحث عن صورة...", threadID);
    try {
      const K = process.env.SERPER_API_KEY;
      if (!K) return api.sendMessage("❌ مفتاح SERPER_API_KEY غير مضبوط في Secrets.", threadID);
      const r = await fetch("https://google.serper.dev/images", {
        method: "POST",
        headers: { "X-API-KEY": K, "Content-Type": "application/json" },
        body: JSON.stringify({ q: "site:pinterest.com " + q, num: 10 }),
      });
      const d = await r.json();
      const imgs = (((d && d.images) || [])).map((i) => i.imageUrl).filter(Boolean).slice(0, 8);
      if (!imgs.length) return api.sendMessage("❌ لم أجد صورًا مطابقة، جرّب وصفًا آخر.", threadID);
      for (const u of imgs) {
        try {
          const ir = await fetch(u, { headers: { "User-Agent": UA["User-Agent"] } });
          const ct = ir.headers.get("content-type") || "";
          if (!ct.startsWith("image/")) continue;
          const buf = Buffer.from(await ir.arrayBuffer());
          if (buf.length < 2000 || buf.length > 8 * 1024 * 1024) continue;
          const ext = ct.includes("png") ? ".png" : ct.includes("webp") ? ".webp" : ct.includes("gif") ? ".gif" : ".jpg";
          const tmp = path.join("/tmp", "img_" + Date.now() + ext);
          fs.writeFileSync(tmp, buf);
          await api.sendMessage({ attachment: fs.createReadStream(tmp) }, threadID);
          try { fs.unlinkSync(tmp); } catch (e) {}
          return;
        } catch (e) {}
      }
      return api.sendMessage("❌ تعذر تحميل الصور، حاول بكلمات أخرى.", threadID);
    } catch (e) {
      console.log("❌ صورة خطأ:", String(e && e.message || e).slice(0, 200));
      return api.sendMessage("❌ حدث خطأ، حاول بعد قليل.", threadID);
    }
  },
};

// ===== تشغيل متعدد الصور - جزء 1 =====
module.exports.run = async function({ api, event, args }) {
  const threadID = String(event.threadID);
  const q = args.join(" ").trim();
  if (!q) return api.sendMessage("❌ اكتب: !صورة غروب الشمس", threadID);
  api.sendMessage("🔎 جاري البحث عن صور...", threadID);
  try {
    const K = process.env.SERPER_API_KEY;
    if (!K) return api.sendMessage("❌ مفتاح SERPER_API_KEY غير مضبوط.", threadID);
    const r = await fetch("https://google.serper.dev/images", { method: "POST", headers: { "X-API-KEY": K, "Content-Type": "application/json" }, body: JSON.stringify({ q: "site:pinterest.com " + q, num: 10 }) });
    const d = await r.json();
    const imgs = ((d && d.images) || []).map((i) => i.imageUrl).filter(Boolean).slice(0, 20);
    if (!imgs.length) return api.sendMessage("❌ لم أجد صورًا مطابقة، جرّب وصفًا آخر.", threadID);
    let sent = 0;
    for (const u of imgs) {
      if (sent >= 5) break;
      try {
        const ir = await fetch(u, { headers: { "User-Agent": UA["User-Agent"] } });
        const ct = ir.headers.get("content-type") || "";
        if (!ct.startsWith("image/")) continue;
        const buf = Buffer.from(await ir.arrayBuffer());
        if (buf.length < 2000 || buf.length > 8 * 1024 * 1024) continue;
        const ext = ct.includes("png") ? ".png" : ct.includes("webp") ? ".webp" : ct.includes("gif") ? ".gif" : ".jpg";
        const tmp = path.join("/tmp", "img_" + Date.now() + "_" + sent + ext);
        fs.writeFileSync(tmp, buf);
        await api.sendMessage({ attachment: fs.createReadStream(tmp) }, threadID);
        try { fs.unlinkSync(tmp); } catch (e) {}
        sent++;
        await new Promise((r2) => setTimeout(r2, 1200));
      } catch (e) {}
    }
    if (!sent) return api.sendMessage("❌ تعذر تحميل الصور، حاول بكلمات أخرى.", threadID);
  } catch (e) {
    console.log("❌ صورة خطأ:", String(e && e.message || e).slice(0, 200));
    return api.sendMessage("❌ حدث خطأ، حاول بعد قليل.", threadID);
  }
};
