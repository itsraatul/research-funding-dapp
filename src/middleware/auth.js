// src/routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { ethers } from "ethers"; // ✅ for auto wallet generation if missing

const router = express.Router();

// ----------------------------------
// GET: Login page
// ----------------------------------
router.get("/login", (req, res) => {
  res.render("auth/login");
});

// ----------------------------------
// GET: Register page
// ----------------------------------
router.get("/register", (req, res) => {
  const { role } = req.query; // e.g. ?role=student
  res.render("auth/register", { role });
});

// ----------------------------------
// POST: Handle Register
// ----------------------------------
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, walletAddress } = req.body;

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Ensure wallet for student
    let finalWallet = walletAddress;
    if (role === "student" && !walletAddress) {
      const wallet = ethers.Wallet.createRandom();
      finalWallet = wallet.address;
      console.log(`⚡ Auto-generated wallet for ${email}: ${finalWallet}`);
    }

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      walletAddress: role === "student" ? finalWallet : null, // only students
    });

    await newUser.save();
    res.redirect("/login");
  } catch (err) {
    console.error("❌ Registration failed:", err);
    res.status(500).send("Registration failed");
  }
});

// ----------------------------------
// POST: Handle Login
// ----------------------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) return res.status(400).send("User not found");

    // Compare hashed passwords
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).send("Invalid password");

    // Save session
    req.session.user = {
      _id: user._id,
      name: user.name,
      role: user.role,
      walletAddress: user.walletAddress,
    };

    // Redirect based on role
    if (user.role === "student") return res.redirect("/student/dashboard");
    if (user.role === "university")
      return res.redirect("/university/dashboard");
    if (user.role === "company") return res.redirect("/company/dashboard");

    res.redirect("/public/dashboard");
  } catch (err) {
    console.error("❌ Login Error:", err);
    res.status(500).send("Login failed");
  }
});

// ----------------------------------
// Middleware
// ----------------------------------
export function ensureAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
}

export function ensureRole(role) {
  return (req, res, next) => {
    if (!req.session.user || req.session.user.role !== role) {
      return res.status(403).send("❌ Unauthorized: Access denied");
    }
    next();
  };
}

export default router;
