const socket = io();
const chess = new Chess();

let boardElement = null;
let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

/* =========================
   SAFE INIT (NO BREAK)
========================= */
function initBoard() {
  boardElement = document.querySelector(".chessboard");
  if (!boardElement) return;
  renderBoard();
}

/* =========================
   UNICODE PIECES
========================= */
const getPieceUnicode = (piece) => {
  const map = {
    wp: "♙", wr: "♖", wn: "♘", wb: "♗", wq: "♕", wk: "♔",
    bp: "♟", br: "♜", bn: "♞", bb: "♝", bq: "♛", bk: "♚",
  };
  return map[piece.color + piece.type];
};

/* =========================
   RENDER BOARD
========================= */
const renderBoard = () => {
  if (!boardElement) return;

  const board = chess.board();
  boardElement.innerHTML = "";

  board.forEach((row, r) => {
    row.forEach((square, c) => {
      const squareEl = document.createElement("div");
      const isLight = (r + c) % 2 === 0;

      squareEl.className = `square ${isLight ? "light" : "dark"}`;
      squareEl.dataset.row = r;
      squareEl.dataset.col = c;

      if (square) {
        const pieceEl = document.createElement("div");
        pieceEl.className = `piece ${square.color === "w" ? "white" : "black"}`;
        pieceEl.innerText = getPieceUnicode(square);

        const isMyTurn = chess.turn() === playerRole;
        pieceEl.draggable = isMyTurn && square.color === playerRole;

        pieceEl.addEventListener("dragstart", () => {
          draggedPiece = pieceEl;
          sourceSquare = { row: r, col: c };
        });

        pieceEl.addEventListener("dragend", () => {
          draggedPiece = null;
          sourceSquare = null;
        });

        squareEl.appendChild(pieceEl);
      }

      squareEl.addEventListener("dragover", e => e.preventDefault());

      squareEl.addEventListener("drop", () => {
        if (!draggedPiece || !sourceSquare) return;

        handleMove(sourceSquare, {
          row: Number(squareEl.dataset.row),
          col: Number(squareEl.dataset.col),
        });
      });

      boardElement.appendChild(squareEl);
    });
  });

  boardElement.classList.toggle("flipped", playerRole === "b");
};

/* =========================
   MOVE HANDLING
========================= */
const handleMove = (from, to) => {
  socket.emit("move", {
    from: `${String.fromCharCode(97 + from.col)}${8 - from.row}`,
    to: `${String.fromCharCode(97 + to.col)}${8 - to.row}`,
    promotion: "q",
  });
};

/* =========================
   SOCKET EVENTS (ORIGINAL)
========================= */
socket.on("playerRole", role => {
  playerRole = role;

  /* 🔹 ADD: match started status */
  const status = document.getElementById("matchStatus");
  if (status) status.innerText = "Match started";

  renderBoard();
});

socket.on("boardState", fen => {
  chess.load(fen);
  renderBoard();
});

socket.on("move", move => {
  chess.move(move);
  renderBoard();
});

socket.on("invalidMove", () => {
  renderBoard();
});

/* =========================
   🔹 ADDED SOCKET STATUS
   (NO LOGIC CHANGE)
========================= */
socket.on("waiting", () => {
  const status = document.getElementById("matchStatus");
  if (status) status.innerText = "Waiting for opponent…";
});

/* =========================
   PAGE & GAME START HOOKS
========================= */
document.addEventListener("DOMContentLoaded", () => {
  initBoard();
});

/* called after login / guest */
window.startChessGame = () => {
  const status = document.getElementById("matchStatus");
  if (status) status.innerText = "Connecting…";
  setTimeout(initBoard, 50);
};
