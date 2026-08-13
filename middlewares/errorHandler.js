// middlewares/errorHandler.js

// Async wrapper
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Global error handler
const errorHandler = (err, req, res, next) => {
  console.error("❌ ERROR:", err);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Server Error",
  });
};

module.exports = {
  asyncHandler,
  errorHandler
};
