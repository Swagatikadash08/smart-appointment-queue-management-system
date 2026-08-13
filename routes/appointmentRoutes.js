// routes/appointmentRoutes.js
const express = require("express");
const router = express.Router();

const {
  bookAppointment,
  cancelAppointment,
  markServed,
  rescheduleAppointment,
  autoNoShow,
  getMyAppointments
} = require("../controllers/appointmentController");

const { protect, optionalAuth, authorize } = require("../middlewares/authMiddleware");

// User can book without login → optionalAuth
router.post("/book", optionalAuth, bookAppointment);

// Logged-in user
router.get("/mine", protect, getMyAppointments);

// Cancel own appointment
router.post("/:id/cancel", protect, cancelAppointment);

// Reschedule own appointment
router.put(
  "/reschedule/:id",
  protect,
  authorize("user", "admin"),
  rescheduleAppointment
);


// Staff/admin only
router.put("/served/:id", protect, authorize("staff", "admin"), markServed);

// Auto no-show system (admin)
router.post("/noshow", protect, authorize("admin"), autoNoShow);

module.exports = router;
