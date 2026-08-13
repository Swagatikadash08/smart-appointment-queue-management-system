// controllers/authController.js
const User = require("../models/User");
const {asyncHandler} = require("../middlewares/errorHandler");

exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role, branch } = req.body;

  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: "Email already used" });

  const user = await User.create({ name, email, password, role, branch });

  const token = user.getSignedToken();

  res.json({
    success: true,
    token,
    user,
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const match = await user.matchPassword(password);
  if (!match) return res.status(400).json({ message: "Invalid credentials" });

  const token = user.getSignedToken();

  res.json({
    success: true,
    token,
    user,
  });
});

exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate("branch");
  res.json({ success: true, user });
});
