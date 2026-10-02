"use strict";

function parseFacebookUserID(value) {
  const raw = String(value || "").trim();
  if (/^\d{5,}$/.test(raw)) return raw;
  if (!raw) return "";

  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    if (!/(^|\.)facebook\.com$/i.test(url.hostname) && !/(^|\.)m\.facebook\.com$/i.test(url.hostname)) {
      return "";
    }
    const profileID = url.searchParams.get("id");
    if (/^\d{5,}$/.test(String(profileID || ""))) return profileID;
    const peopleMatch = url.pathname.match(/\/people\/[^/]+\/(\d{5,})(?:\/|$)/i);
    if (peopleMatch) return peopleMatch[1];
    const numericPath = url.pathname.match(/^\/(\d{5,})(?:\/|$)/);
    return numericPath?.[1] || "";
  } catch {
    return "";
  }
}

module.exports = { parseFacebookUserID };