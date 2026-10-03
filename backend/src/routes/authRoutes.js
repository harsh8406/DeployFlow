const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// @route   POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "A user with this email already exists" });
    }

    const user = await User.create({ name, email, password, department });

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      department: user.department,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    return res.status(500).json({ message: "Registration failed", error: error.message });
  }
});

// @route   POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      department: user.department,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    return res.status(500).json({ message: "Login failed", error: error.message });
  }
});

// @route   GET /api/auth/me
router.get("/me", protect, async (req, res) => {
  return res.status(200).json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    department: req.user.department,
    role: req.user.role,
  });
});

module.exports = router;
