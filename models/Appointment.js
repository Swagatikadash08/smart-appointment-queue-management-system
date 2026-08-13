// models/Appointment.js
const mongoose = require("mongoose");

const AppointmentSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    name: { type: String, required: true },
    email: { type: String },
    service: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true
    },
    date: {
      type: String,
      required: true,  // YYYY-MM-DD
    },
    slot: {
      type: String,
      required: true, // “10:00”
    },
    status: {
      type: String,
      enum: ["queued", "served", "cancelled", "noshow"],
      default: "queued"
    },
    eta: { type: Number, default: 0 }, // in minutes
    checkInQR: { type: String }, // QR Data URI (base64)
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

AppointmentSchema.index({ service: 1, date: 1 });
AppointmentSchema.index({ branch: 1 });
AppointmentSchema.index({ status: 1 });

module.exports = mongoose.model("Appointment", AppointmentSchema);
