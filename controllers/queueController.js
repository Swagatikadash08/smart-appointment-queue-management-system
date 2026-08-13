// controllers/queueController.js
const Appointment = require("../models/Appointment");
const ActivityLog = require("../models/ActivityLog");

const {asyncHandler} = require("../middlewares/errorHandler");

// GET QUEUE FOR A SERVICE + DATE + BRANCH
exports.getQueue = asyncHandler(async (req, res) => {
  try   {
  const { service, date } = req.query;
  if (!service || !date) {
      return res.json({ success: true, queue: [] });
    }
  const branch = "693cf3fdffedae9e895ee30e"; 

  const queue = await Appointment.find({
    service,
    date,
    branch,
    status: "queued"
  })
  .populate("service")
  .sort({ slot: 1 });

  res.json({ success: true, queue });
}catch (err) {
    console.error("Queue fetch error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch queue" });
  }
}); 

// REORDER QUEUE (ADMIN)
exports.reorderQueue = asyncHandler(async (req, res) => {
  const { newOrder } = req.body;

  for (let i = 0; i < newOrder.length; i++) {
    await Appointment.findByIdAndUpdate(newOrder[i], {
      slot: `reordered-${i}`
    });
  }

  res.json({ success: true });
});
