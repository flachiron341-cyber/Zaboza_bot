const state = require("../state");
const { success, error, info } = require("../utils/brand");

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function parseCell(value) {
  const normalized = String(value || "")
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
  const cell = Number(normalized);
  return Number.isInteger(cell) && cell >= 1 && cell <= 9 ? cell - 1 : -1;
}

function boardText(board) {
  const cells = board.map((cell, index) => cell || String(index + 1));
  return `${cells[0]} | ${cells[1]} | ${cells[2]}\n---------\n${cells[3]} | ${cells[4]} | ${cells[5]}\n---------\n${cells[6]} | ${cells[7]} | ${cells[8]}`;
}

function winner(board) {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return board.every(Boolean) ? "draw" : null;
}

function clearMatch(threadID, match) {
  if (match?.timer) clearTimeout(match.timer);
  state.xoGames.delete(String(threadID));
}

module.exports = {
  config: {
    name: "xo",
    aliases: ["اكسو", "tic"],
    description: "لعبة XO بين لاعبين",
    usage: "!xo | !xo انضم (أو !xo للاعب الثاني) | !xo 5 | !xo الغاء",
    cooldown: 0,
    adminOnly: false,
  },

  async run({ api, event, args }) {
    const threadID = String(event.threadID);
    const senderID = String(event.senderID);
    const action = String(args[0] || "").toLocaleLowerCase("ar");
    let match = state.xoGames.get(threadID);

    if (["الغاء", "إلغاء", "cancel"].includes(action)) {
      if (!match) return api.sendMessage(info("لا توجد مباراة XO", ["لا توجد مباراة نشطة في هذا القروب."]), threadID);
      if (![match.playerX, match.playerO].includes(senderID)) {
        return api.sendMessage(error("لا يمكن الإلغاء", ["يمكن لأحد لاعبي المباراة إلغاؤها فقط."]), threadID);
      }
      clearMatch(threadID, match);
      return api.sendMessage(success("تم إلغاء مباراة XO", ["يمكنكم بدء مباراة جديدة بكتابة !xo."]), threadID);
    }

    if (!match) {
      if (action === "انضم") {
        return api.sendMessage(error("لا توجد مباراة", ["اكتب !xo لإنشاء مباراة أولاً."]), threadID);
      }
      match = {
        playerX: senderID,
        playerO: null,
        board: Array(9).fill(null),
        turn: senderID,
        status: "waiting",
        createdAt: Date.now(),
      };
      match.timer = setTimeout(() => {
        if (state.xoGames.get(threadID) !== match) return;
        clearMatch(threadID, match);
        api.sendMessage(error("انتهى انتظار XO", ["لم ينضم لاعب ثانٍ في الوقت المحدد."]), threadID);
      }, 10 * 60 * 1000);
      state.xoGames.set(threadID, match);
      return api.sendMessage(
        info("مباراة XO جديدة", [
          "اللاعب X أنشأ المباراة.",
          "لاعب ثانٍ: اكتب !xo انضم",
          "بعد الانضمام، اكتب رقم الخانة من 1 إلى 9.",
          boardText(match.board),
        ]),
        threadID
      );
    }

    if (action === "انضم" || (!action && match.status === "waiting" && senderID !== match.playerX)) {
      if (match.status !== "waiting") return api.sendMessage(error("المباراة بدأت", ["لا يمكن الانضمام بعد بدء اللعب."]), threadID);
      if (senderID === match.playerX) return api.sendMessage(error("لا يمكنك الانضمام لنفسك", ["انتظر لاعباً ثانياً."]), threadID);
      if (match.timer) clearTimeout(match.timer);
      match.timer = null;
      match.playerO = senderID;
      match.status = "playing";
      match.turn = match.playerX;
      return api.sendMessage(
        info("بدأت مباراة XO", [
          `❌ اللاعب X: ${match.playerX}`,
          `⭕ اللاعب O: ${match.playerO}`,
          "الدور الآن للاعب X.",
          boardText(match.board),
          "استخدم: !xo رقم الخانة",
        ]),
        threadID
      );
    }

    if (match.status !== "playing") {
      return api.sendMessage(info("في انتظار لاعب", ["اكتب !xo انضم للانضمام إلى المباراة."]), threadID);
    }
    if (![match.playerX, match.playerO].includes(senderID)) {
      return api.sendMessage(error("المباراة مغلقة", ["هذه المباراة بين لاعبين محددين فقط."]), threadID);
    }
    if (match.turn !== senderID) {
      return api.sendMessage(info("ليس دورك", ["انتظر اللاعب الآخر حتى ينتهي من حركته."]), threadID);
    }

    const cell = parseCell(args[0]);
    if (cell < 0) return api.sendMessage(error("خانة غير صالحة", ["اختر رقماً من 1 إلى 9."]), threadID);
    if (match.board[cell]) return api.sendMessage(error("الخانة مشغولة", ["اختر خانة فارغة."]), threadID);

    const symbol = senderID === match.playerX ? "❌" : "⭕";
    match.board[cell] = symbol;
    const result = winner(match.board);
    if (result) {
      clearMatch(threadID, match);
      const title = result === "draw" ? "تعادل في XO" : "انتهت مباراة XO";
      const details = result === "draw"
        ? ["لا غالب ولا مغلوب.", boardText(match.board)]
        : [`الفائز: ${result === "❌" ? "اللاعب X" : "اللاعب O"}`, boardText(match.board)];
      return api.sendMessage(result === "draw" ? info(title, details) : success(title, details), threadID);
    }

    match.turn = senderID === match.playerX ? match.playerO : match.playerX;
    return api.sendMessage(
      info("تحديث مباراة XO", [
        boardText(match.board),
        `الدور الآن: ${match.turn === match.playerX ? "❌ اللاعب X" : "⭕ اللاعب O"}`,
      ]),
      threadID
    );
  },
};