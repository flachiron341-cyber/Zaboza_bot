const state = require("../state");
const { searchYoutube, downloadYoutubeVideo } = require("../utils/youtube");
const fs = require("fs");

// ──────────────────────────────────────────────
//  خريطة الفئات والفئات الفرعية
// ──────────────────────────────────────────────
const CATEGORIES = {
  "1": { label: "🎵 موسيقى",      sub: { "1": "Arabic music pop", "2": "Arabic rap hip hop", "3": "Algerian raï music", "4": "Algerian gasba flute music" } },
  "2": { label: "🎌 انمي",         search: "anime fight scene short" },
  "3": { label: "⚽ كرة قدم",      search: "football skills goals short" },
  "4": { label: "🏎️ سيارات",      search: "supercars drift short" },
  "5": { label: "💕 حب ورومانسية", search: "romantic love moments short" },
  "6": { label: "🥊 قتال",         search: "martial arts fight short" },
  "7": { label: "🤖 ذكاء اصطناعي", search: "artificial intelligence AI short" },
  "8": { label: "📚 معلومات",      search: "amazing facts short" },
  "9": { label: "😂 فكاهة",        search: "funny moments short" },
  "10":{ label: "🌍 طبيعة",        search: "nature beauty landscape short" },
};

const MUSIC_LABELS = {
  "1": "عربي عام",
  "2": "راب عربي",
  "3": "راي",
  "4": "قصبة",
};

function mainMenu() {
  const lines = [
    `╔══════════════════════════╗`,
    `║   🎬  اختر فئة الفيديو   ║`,
    `╚══════════════════════════╝`,
    ``,
  ];
  for (const [k, v] of Object.entries(CATEGORIES)) {
    lines.push(`  ${k}. ${v.label}`);
  }
  lines.push(``, `📌 اكتب رقم الفئة كرد على هذه الرسالة`);
  return lines.join("\n");
}

function musicMenu() {
  return [
    `╔══════════════════════════╗`,
    `║   🎵  اختر نوع الموسيقى  ║`,
    `╚══════════════════════════╝`,
    ``,
    `  1. عربي عام`,
    `  2. راب عربي`,
    `  3. راي`,
    `  4. قصبة`,
    ``,
    `📌 اكتب رقم الاختيار كرد على هذه الرسالة`,
  ].join("\n");
}

module.exports = {
  config: {
    name: "فيديو",
    aliases: ["video", "vid"],
    description: "يجلب فيديو من يوتيوب حسب الفئة التي تختارها",
    usage: "!فيديو",
    cooldown: 5,
    adminOnly: false,
  },

  async run({ api, event }) {
    const threadID = String(event.threadID);

    // احذف أي جلسة قديمة لهذا الـ thread
    for (const [k, v] of state.videoSessions) {
      if (v.threadID === threadID) {
        clearTimeout(v.timer);
        state.videoSessions.delete(k);
      }
    }

    const msgInfo = await api.sendMessage(mainMenu(), threadID);
    if (!msgInfo || !msgInfo.messageID) return;

    const msgID = String(msgInfo.messageID);

    // انتهاء الجلسة بعد 2 دقيقة
    const timer = setTimeout(() => {
      state.videoSessions.delete(msgID);
    }, 120000);

    state.videoSessions.set(msgID, {
      step: "main",
      timer,
      threadID,
    });
  },
};

// ──────────────────────────────────────────────
//  معالجة الردود التفاعلية (تُستدعى من handler)
// ──────────────────────────────────────────────
async function handleVideoReply(api, event, session) {
  const threadID = String(event.threadID);
  const choice   = (event.body || "").trim();

  clearTimeout(session.timer);
  state.videoSessions.delete(session.msgID);

  if (session.step === "main") {
    const cat = CATEGORIES[choice];
    if (!cat) {
      await api.sendMessage("❌ رقم غير صحيح. اكتب !فيديو من جديد.", threadID);
      return;
    }

    if (cat.sub) {
      // موسيقى → قائمة فرعية
      const msgInfo = await api.sendMessage(musicMenu(), threadID);
      if (!msgInfo || !msgInfo.messageID) return;
      const msgID = String(msgInfo.messageID);
      const t = setTimeout(() => state.videoSessions.delete(msgID), 120000);
      state.videoSessions.set(msgID, { step: "music", sub: cat.sub, timer: t, threadID, msgID });
    } else {
      await sendVideo(api, threadID, cat.search, cat.label);
    }

  } else if (session.step === "music") {
    const query = session.sub[choice];
    if (!query) {
      await api.sendMessage("❌ رقم غير صحيح. اكتب !فيديو من جديد.", threadID);
      return;
    }
    const label = MUSIC_LABELS[choice] || "موسيقى";
    await sendVideo(api, threadID, query, `🎵 ${label}`);
  }
}

async function sendVideo(api, threadID, query, label) {
  await api.sendMessage(`🔍 جاري البحث عن فيديو "${label}" في يوتيوب...`, threadID);

  const video = await searchYoutube(query);
  if (!video) {
    return api.sendMessage(`❌ لم أجد فيديو مناسباً لـ "${label}".`, threadID);
  }

  await api.sendMessage(`✅ وجدت فيديو: ${video.title}\n⏳ جاري التحميل...`, threadID);

  const tmpPath = await downloadYoutubeVideo(video.url, 60);
  if (!tmpPath) {
    return api.sendMessage(
      `❌ تعذّر تحميل الفيديو.\n🔗 ${video.url}`,
      threadID
    );
  }

  try {
    await api.sendMessage(
      { body: `🎬 ${video.title}`, attachment: fs.createReadStream(tmpPath) },
      threadID
    );
  } finally {
    fs.unlink(tmpPath, () => {});
  }
}

module.exports.handleVideoReply = handleVideoReply;
