"use strict";

const ACTIONS = {
  kiss: { icon: "💋", text: (actor, target) => `${actor} أهدى قبلة إلى ${target}` },
  wedding: { icon: "💍", text: (actor, target) => `العروسان: ${actor} و ${target}` },
  divorce: { icon: "💔", text: (actor, target) => `${actor} انفصل عن ${target}` },
  jail: { icon: "🚔", text: (actor, target) => `أُرسل ${target} إلى السجن بأمر ${actor}` },
};

const FRAMES = [
  (icon, text) => `╭━━━〔 ${icon} 〕━━━╮\n${text}\n╰━━━━━━━━━━━━━━╯`,
  (icon, text) => `✦══════ ${icon} ══════✦\n${text}\n✦════════════════✦`,
  (icon, text) => `┏━━━ ⋆｡°✩ ${icon} ✩°｡⋆ ━━━┓\n${text}\n┗━━━━━━━━━━━━━━━━━━┛`,
  (icon, text) => `༺═──── ${icon} ────═༻\n${text}\n༺════════════════༻`,
  (icon, text) => `⟡──────── ${icon} ────────⟡\n${text}\n⟡──────────────────⟡`,
];

function normalizeDisplayName(value, fallback = "عضو") {
  const name = String(value || "")
    .replace(/[@\r\n\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 48);
  return name || fallback;
}

// ── جديد: استخراج الأسماء من بيانات القروب نفسها (سريع وموثوق) ──
function namesFromThreadInfo(threadInfo, ids) {
  const names = {};
  if (!threadInfo) return names;

  // 1) الألقاب داخل القروب لها الأولوية
  const nicknames = Array.isArray(threadInfo.nicknames) ? threadInfo.nicknames : [];
  for (const entry of nicknames) {
    const id = String(entry?.id || entry?.userID || "");
    if (!id) continue;
    const nick = normalizeDisplayName(entry?.nickname, "");
    if (nick) names[id] = nick;
  }

  // 2) الأسماء الحقيقية المرفقة في threadInfo
  const userInfo = Array.isArray(threadInfo.userInfo) ? threadInfo.userInfo : [];
  for (const user of userInfo) {
    const id = String(user?.id || user?.userID || "");
    if (!id || names[id]) continue;
    const realName = normalizeDisplayName(
      user?.name || user?.fullName || user?.firstName,
      ""
    );
    if (realName) names[id] = realName;
  }

  return names;
}

function chunk(list, size) {
  const parts = [];
  for (let i = 0; i < list.length; i += size) parts.push(list.slice(i, i + size));
  return parts;
}

// ── جلب دفعة واحدة عبر getUserInfo بصيغة fca الصحيحة: (ids, callback) ──
function getUserInfoChunk(api, ids) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(value);
    };
    const timeout = setTimeout(() => finish({}), 5000);

    const callback = (error, data) => {
      if (error || !data || typeof data !== "object") {
        finish({});
        return;
      }
      const names = {};
      for (const id of ids) {
        const record = data[id];
        names[id] = normalizeDisplayName(
          record?.name || record?.fullName || record?.firstName,
          ""
        );
      }
      finish(names);
    };

    try {
      // الصيغة الصحيحة في ws3-fca: getUserInfo(ids, callback) — بدون "true"
      api.getUserInfo(ids, callback);
    } catch {
      finish({});
    }
  });
}

// ── الدالة الرئيسية: القروب أولاً، ثم تكملة عبر getUserInfo على دفعات ──
async function getUserNames(api, userIDs, threadInfo) {
  const ids = [...new Set((userIDs || []).map(String).filter(Boolean))];
  if (!ids.length) return {};

  // المصدر الأول: بيانات القروب (فوري، لا يفشل)
  const names = namesFromThreadInfo(threadInfo, ids);

  // المصدر الثاني: تكملة الناقص عبر getUserInfo بدفعات من 40
  const missing = ids.filter((id) => !names[id]);
  if (missing.length && typeof api?.getUserInfo === "function") {
    for (const part of chunk(missing, 40)) {
      const got = await getUserInfoChunk(api, part);
      for (const id of part) {
        const name = got[id];
        if (name) names[id] = name;
      }
    }
  }

  return names;
}

function createMentionedAction(kind, actorID, targetID, actorName, targetName) {
  const action = ACTIONS[kind];
  if (!action) throw new Error(`Unknown mention action: ${kind}`);

  const actorTag = `@${normalizeDisplayName(actorName, "المبادر")}`;
  const targetTag = `@${normalizeDisplayName(targetName, "العضو")}`;
  const text = action.text(actorTag, targetTag);
  const frame = FRAMES[Math.floor(Math.random() * FRAMES.length)];
  return {
    body: frame(action.icon, text),
    mentions: [
      { tag: actorTag, id: String(actorID) },
      { tag: targetTag, id: String(targetID) },
    ],
  };
}

module.exports = { createMentionedAction, getUserNames };
