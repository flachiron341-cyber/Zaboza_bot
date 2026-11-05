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

function getUserNames(api, userIDs) {
  const ids = [...new Set((userIDs || []).map(String).filter(Boolean))];
  if (!ids.length || typeof api?.getUserInfo !== "function") {
    return Promise.resolve({});
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(value);
    };
    const timeout = setTimeout(() => finish({}), 4000);

    try {
      api.getUserInfo(ids, true, (error, data) => {
        if (error || !data || typeof data !== "object") {
          finish({});
          return;
        }
        const names = {};
        for (const id of ids) {
          const record = data[id];
          names[id] = normalizeDisplayName(
            record?.name || record?.fullName || record?.firstName,
            "عضو",
          );
        }
        finish(names);
      });
    } catch {
      finish({});
    }
  });
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
