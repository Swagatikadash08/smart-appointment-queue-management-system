// controllers/appointmentController.js
const Appointment = require("../models/Appointment");
const Service = require("../models/Service");
const Branch = require("../models/Branch");
const ActivityLog = require("../models/ActivityLog");

const DEFAULT_BRANCH_ID = "693cf3fdffedae9e895ee30e";

const generateQR = require("../utils/generateQR");
const predictETA = require("../utils/predictETA");
const {asyncHandler} = require("../middlewares/errorHandler");

// BOOK APPOINTMENT
exports.bookAppointment = asyncHandler(async (req, res) => {
  const { name, email, service, date, slot } = req.body;

  // 1️⃣ Resolve branch (from request OR logged-in user)
  const branchId = DEFAULT_BRANCH_ID;

  if (!branchId) {
    return res.status(400).json({ message: "Branch is required" });
  }

  // 2️⃣ Check slot availability
  const exists = await Appointment.findOne({
    service,
    branch: branchId,
    date,
    slot,
    status: "queued"
  });

  if (exists) {
    return res.status(400).json({ message: "Slot already booked" });
  }

  // 3️⃣ Predict ETA
  // const eta = await predictETA(service, branchId, date);

  // 4️⃣ Generate QR
  const qrCode = await generateQR(`${branchId}-${service}-${date}-${slot}`);

  // 5️⃣ Create appointment
  const appointment = await Appointment.create({
    user: req.user?.id || null,
    name,
    email,
    service,
    branch: branchId,
    date,
    slot,
    checkInQR: qrCode
  });

  await ActivityLog.create({
  message: `Appointment booked: ${appointment.name}`,
  appointment: appointment._id,
  branch: branchId,
});


  res.json({ success: true, appointment });
});

// CANCEL
exports.cancelAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) return res.status(404).json({ message: "Not found" });

  appointment.status = "cancelled";
  await appointment.save();

  await ActivityLog.create({
  message: `Appointment cancelled: ${appointment.name}`,
  appointment: appointment._id,
  branch: appointment.branch
});


  res.json({ success: true });
});

// RESCHEDULE
exports.rescheduleAppointment = asyncHandler(async (req, res) => {
  const { date, slot } = req.body;

  if (!date || !slot) {
    return res.status(400).json({
      success: false,
      message: "Date and slot are required",
    });
  }

  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: "Appointment not found",
    });
  }

  appointment.date = date;
  appointment.slot = slot;
  appointment.status = "queued";
  appointment.createdAt = new Date(); 
  appointment.eta = await predictETA(
    appointment.service,
    appointment.branch,
    date
  );

  await appointment.save();
  await ActivityLog.create({
    message: `Appointment rescheduled: ${appointment.name}`,
    appointment: appointment._id,
    branch: appointment.branch,
  });
  res.json({ success: true, appointment });
});

// MARK SERVED
exports.markServed = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) return res.status(404).json({ message: "Not found" });

  appointment.status = "served";
  await appointment.save();

  await ActivityLog.create({
  message: `Appointment served: ${appointment.name}`,
  appointment: appointment._id,
  branch: appointment.branch
});

  res.json({ success: true });
});

// AUTO NO-SHOW
exports.autoNoShow = asyncHandler(async (req, res) => {
  const { cutoffMinutes } = req.body;

  const now = Date.now();

  const noshows = await Appointment.updateMany(
    {
      status: "queued",
      createdAt: { $lt: new Date(now - cutoffMinutes * 60000) }
    },
    { status: "noshow" }
  );

  res.json({ success: true, noshows });
});

// GET APPOINTMENTS FOR USER
exports.getMyAppointments = asyncHandler(async (req, res) => {
  const appointments = await Appointment.find({ user: req.user.id })
    .populate("service")
    .sort({ createdAt: -1 });

  res.json({ success: true, appointments });
});

