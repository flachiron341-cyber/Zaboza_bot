"use strict";

async function leaveGroup(api, threadID, botID) {
  const selfID = String(botID || api.getCurrentUserID());
  await api.sendMessage("وداعا👋", String(threadID));
  await new Promise((resolve) => setTimeout(resolve, 500));

  const result = await api.gcmember("remove", selfID, String(threadID));
  if (result?.type === "error_gc") throw new Error(result.error || "تعذر خروج البوت من القروب.");
  return result;
}

module.exports = { leaveGroup };
