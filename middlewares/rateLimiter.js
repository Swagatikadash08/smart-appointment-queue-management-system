// middlewares/rateLimiter.js
const rateLimit = require("express-rate-limit");

exports.loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20,                 // max 20 login attempts
  message: "Too many login attempts, try again later",
  standardHeaders: true,
  legacyHeaders: false,
});
