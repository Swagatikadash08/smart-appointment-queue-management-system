const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/authMiddleware");
const ActivityLog = require("../models/ActivityLog");
const Appointment = require("../models/Appointment");

router.post("/", async (req, res) => {
  try {
    const { dateFilter, status, service } = req.body;

    const match = {};

    // Date filter
    if (dateFilter === "today") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const end = new Date();
      end.setHours(23, 59, 59, 999);

      match.ts = { $gte: start, $lte: end };
    }

    let logs = await ActivityLog.find(match)
      .populate({
        path: "appointment",
        populate: { path: "service" }
      })
      .sort({ ts: -1 });

    // Status filter
    if (status && status !== "all") {
      logs = logs.filter(
        l => l.appointment && l.appointment.status === status
      );
    }

    // Service filter
    if (service && service !== "all") {
      logs = logs.filter(
        l => l.appointment && l.appointment.service?.name === service
      );
    }

    res.json({
  success: true,
  logs
});

  } catch (err) {
    res.status(500).json({ error: "Failed to load activity log" });
  }
});

module.exports = router;


// Admin only
// router.get("/", protect, authorize("admin"), async (req, res) => {
//   const logs = await ActivityLog.find()
//     .sort({ createdAt: -1 })
//     .limit(50);

//   res.json({ success: true, logs });
// });

// module.exports = router;
