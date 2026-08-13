// models/Branch.js
const mongoose = require("mongoose");

const BranchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    location: { type: String, required: true },
    contact: { type: String },
    services: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service"
    }]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Branch", BranchSchema);
