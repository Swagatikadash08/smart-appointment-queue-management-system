// controllers/serviceController.js
const Service = require("../models/Service");
const {asyncHandler} = require("../middlewares/errorHandler");

exports.addService = asyncHandler(async (req, res) => {
  const service = await Service.create(req.body);
  res.json({ success: true, service });
});

exports.getServices = asyncHandler(async (req, res) => {
  const services = await Service.find().populate("branches");
  res.json({ success: true, services });
});

exports.deleteService = asyncHandler(async (req, res) => {
  await Service.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});
