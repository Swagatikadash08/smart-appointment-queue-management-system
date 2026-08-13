// routes/branchRoutes.js
const express = require("express");
const router = express.Router();

const {
  addBranch,
  getBranches,
  deleteBranch
} = require("../controllers/branchController");

const { protect, authorize } = require("../middlewares/authMiddleware");

// Public
router.get("/", getBranches);

// Admin only
router.post("/", protect, authorize("admin"), addBranch);
router.delete("/:id", protect, authorize("admin"), deleteBranch);

module.exports = router;
