const BRAND = "𓆩 ⚡ 𝐙𝐀𝐁𝐎𝐙𝐀 ⚡ 𓆪";
const RULE = "━━━━━━━━━━━━━━━━━━";

function message(title, lines = [], icon = "✦") {
  return [
    BRAND,
    RULE,
    `${icon} ${title}`,
    ...lines.filter((line) => line !== undefined && line !== null && line !== ""),
    RULE,
    BRAND,
  ].join("\n");
}

function success(title, lines = []) {
  return message(title, lines, "✅");
}

function error(title, lines = []) {
  return message(title, lines, "⚠️");
}

function info(title, lines = []) {
  return message(title, lines, "✦");
}

function normalizeAnswer(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[إأآ]/g, "ا")
    .replace(/ة/g, "ه")
    .toLocaleLowerCase("ar");
}

module.exports = { BRAND, RULE, message, success, error, info, normalizeAnswer };