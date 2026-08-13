// models/ActivityLog.js
const mongoose = require("mongoose");

const ActivityLogSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment"
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch"
    },
    ts: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ActivityLog", ActivityLogSchema);
