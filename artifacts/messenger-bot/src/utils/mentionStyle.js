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

function createMentionedAction(kind, actorID, targetID) {
  const action = ACTIONS[kind];
  if (!action) throw new Error(`Unknown mention action: ${kind}`);

  const actorTag = "@المبادر";
  const targetTag = "@العضو";
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

module.exports = { createMentionedAction };
