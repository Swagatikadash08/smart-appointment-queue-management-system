// server.js
require("dotenv").config({ path: "./config/config.env" });

const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const xss = require("xss-clean");
const morgan = require("morgan");
const jwt = require("jsonwebtoken");

// DB
const connectDB = require("./config/db");

// Express
const app = express();
const server = http.createServer(app);

// Socket.IO
// use helmet but disable CSP for local development (avoids blocking inline scripts etc)
app.use(
  helmet({
    // disable contentSecurityPolicy for dev; in production configure a safe CSP
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

// initialize socket.io and allow local origin
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Connect database
connectDB();

// ─────────────────────────────
//  Security Middlewares
// ─────────────────────────────
app.use(helmet());
app.use(xss());

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

// Rate limiter
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false
  })
);

// ─────────────────────────────
//  Serve Public UI
// ─────────────────────────────
app.use(express.static(path.join(__dirname, "public")));

// ─────────────────────────────
//  Route Imports (defined later)
// ─────────────────────────────
const authRoutes = require("./routes/authRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const queueRoutes = require("./routes/queueRoutes");
const branchRoutes = require("./routes/branchRoutes");

// ─────────────────────────────
//  API Route Mount
// ─────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/activity", require("./routes/activityRoutes"));


// ─────────────────────────────
//  Error Handler Middleware
// ─────────────────────────────
const {errorHandler} = require("./middlewares/errorHandler");
app.use(errorHandler);

// ─────────────────────────────
//  SOCKET.IO — JWT Authentication
// ─────────────────────────────
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;

    next();
  } catch (err) {
    console.log("Socket Auth Failed:", err.message);
    next();
  }
});

// ─────────────────────────────
//  SOCKET.IO — Real-time events
// ─────────────────────────────
const queueSocket = require("./sockets/queueSocket");
queueSocket(io); // pass io instance

// ─────────────────────────────
//  Fallback Route (SPA + static)
// ─────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ─────────────────────────────
//  Start Server
// ─────────────────────────────
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
