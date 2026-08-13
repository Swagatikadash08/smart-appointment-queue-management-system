// routes/queueRoutes.js
const express = require("express");
const router = express.Router();

const { getQueue, reorderQueue } = require("../controllers/queueController");
const { protect, authorize } = require("../middlewares/authMiddleware");

// Anyone can view queue
router.get("/", getQueue);

// Only admin/staff can reorder
router.post("/reorder", protect, authorize("admin", "staff"), reorderQueue);

module.exports = router;
