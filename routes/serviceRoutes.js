// routes/serviceRoutes.js
const express = require("express");
const router = express.Router();

const {
  addService,
  getServices,
  deleteService
} = require("../controllers/serviceController");

const { protect, authorize } = require("../middlewares/authMiddleware");

// Public
router.get("/", getServices);

// Admin-only
router.post("/", protect, authorize("admin"), addService);
router.delete("/:id", protect, authorize("admin"), deleteService);

module.exports = router;
