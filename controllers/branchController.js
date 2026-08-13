// controllers/branchController.js
const Branch = require("../models/Branch");

const {asyncHandler} = require("../middlewares/errorHandler");

exports.addBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.create(req.body);
  res.json({ success: true, branch });
});

exports.getBranches = asyncHandler(async (req, res) => {
  const branches = await Branch.find().populate("services");
  res.json({ success: true, branches });
});

exports.deleteBranch = asyncHandler(async (req, res) => {
  await Branch.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});
