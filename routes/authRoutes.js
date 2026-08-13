// routes/authRoutes.js
const express = require("express");
const router = express.Router();

const { register, login, getMe } = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");
const { loginLimiter } = require("../middlewares/rateLimiter");

// Public
router.post("/register", register);
router.post("/login", login);
router.post("/login", loginLimiter, login);

// Private
router.get("/me", protect, getMe);

module.exports = router;
