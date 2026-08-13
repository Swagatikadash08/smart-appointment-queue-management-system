// models/Service.js
const mongoose = require("mongoose");

const ServiceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true
    },
    description: {
      type: String,
      default: ""
    },
    avgHandleTime: {
      type: Number,
      default: 20   // minutes per appointment
    },
    dailyLimit: {
      type: Number,
      default: 50   // per day
    },
    branches: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch"
    }]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", ServiceSchema);
