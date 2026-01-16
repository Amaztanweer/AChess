console.log("🚀 app.js file loaded");

process.on("exit", code => {
  console.log("❌ Process exiting with code:", code);
});

process.on("uncaughtException", err => {
  console.error("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", err => {
  console.error("❌ Unhandled Rejection:", err);
});

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { Chess } = require("chess.js");
const path = require("path");
const mongoose = require("mongoose");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

mongoose
  .connect("mongodb+srv://shadtanweer6_db_user:EqqunPm0ksfQ5Y7w@cluster1.hxmquae.mongodb.net/chessDB")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

/* ================= USER MODEL ================= */
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  email: { type: String, unique: true },
  password: String,
});

const User = mongoose.model("User", UserSchema);

/* ================= ROUTES ================= */

app.get("/", (req, res) => {
  res.render("index");
});

app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const userExists = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (userExists) {
      return res.json({ message: "Username or Email already exists" });
    }

    await User.create({ username, email, password });
    res.json({ message: "Registered successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error registering user" });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });

  if (!user || user.password !== password) {
    return res.status(401).json({ message: "Invalid username or password" });
  }

  res.json({ message: "Login successful" });
});

/* ================= GAME ================= */

const waitingQueue = [];
const games = {};

function createGame(p1, p2) {
  const roomId = `game_${p1.id}_${p2.id}`;
  games[roomId] = {
    chess: new Chess(),
    players: { white: p1.id, black: p2.id },
  };

  p1.join(roomId);
  p2.join(roomId);

  p1.emit("playerRole", "w");
  p2.emit("playerRole", "b");

  io.to(roomId).emit("boardState", games[roomId].chess.fen());
}

io.on("connection", socket => {
  if (waitingQueue.length) {
    createGame(waitingQueue.shift(), socket);
  } else {
    waitingQueue.push(socket);
  }

  socket.on("move", move => {
    const roomId = [...socket.rooms].find(r => r !== socket.id);
    if (!games[roomId]) return;

    const game = games[roomId];
    const chess = game.chess;

    try {
      chess.move(move);
      io.to(roomId).emit("boardState", chess.fen());
      io.to(roomId).emit("move", move);
    } catch {}
  });

  socket.on("disconnect", () => {
    for (const room in games) {
      if (
        games[room].players.white === socket.id ||
        games[room].players.black === socket.id
      ) {
        delete games[room];
        io.to(room).emit("gameOver");
      }
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
