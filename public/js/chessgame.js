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
  initTouchSupport();
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

        // DESKTOP DRAG EVENTS
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

      // DESKTOP DROP EVENTS
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
   SOCKET EVENTS
========================= */
socket.on("playerRole", role => {
  playerRole = role;

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

socket.on("waiting", () => {
  const status = document.getElementById("matchStatus");
  if (status) status.innerText = "Waiting for opponent…";
});

/* =========================
   TOUCH SUPPORT FOR MOBILE
========================= */
let touchStartSquare = null;

function initTouchSupport() {
  if (!boardElement) return;

  boardElement.addEventListener("touchstart", e => {
    const target = e.target.closest(".piece, .square");
    if (!target) return;

    const squareEl = target.classList.contains("square") ? target : target.parentElement;
    const row = Number(squareEl.dataset.row);
    const col = Number(squareEl.dataset.col);

    const piece = target.classList.contains("piece") ? target : null;

    // Only allow touching your own pieces
    if (piece && piece.classList.contains(playerRole === "w" ? "white" : "black")) {
      touchStartSquare = { row, col };
    }
  });

  boardElement.addEventListener("touchend", e => {
    if (!touchStartSquare) return;

    const touch = e.changedTouches[0];
    const dropEl = document.elementFromPoint(touch.clientX, touch.clientY);
    const squareEl = dropEl.closest(".square");
    if (!squareEl) return;

    const to = { row: Number(squareEl.dataset.row), col: Number(squareEl.dataset.col) };
    handleMove(touchStartSquare, to);
    touchStartSquare = null;
  });
}

/* =========================
   PAGE & GAME START HOOKS
========================= */
document.addEventListener("DOMContentLoaded", () => {
  initBoard();
});

window.startChessGame = () => {
  const status = document.getElementById("matchStatus");
  if (status) status.innerText = "Connecting…";
  setTimeout(initBoard, 50);
};
