import express from "express";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { ethers } from "ethers";
import multer from "multer";
import path from "path";

const router = express.Router();

/* ---------------------------------------------
📦 Multer Setup — for ID Card Uploads
--------------------------------------------- */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/idcards/"); // ✅ stored locally (can later move to IPFS)
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + "-" + file.fieldname + ext);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".pdf"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error("Only images or PDF files are allowed!"));
    }
    cb(null, true);
  },
});

/* ---------------------------------------------
📍 Render Login Form
--------------------------------------------- */
router.get("/login", (req, res) => {
  res.render("auth/login");
});

/* ---------------------------------------------
📍 Handle Login
--------------------------------------------- */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).send("❌ Invalid credentials");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).send("❌ Invalid credentials");

    // ✅ Check verification status for students
    if (user.role === "student" && user.isVerified === false) {
      return res
        .status(403)
        .send(
          "⚠️ Your student identity is pending university verification. Please wait for approval."
        );
    }

    // ✅ Store session
    req.session.user = {
      _id: user._id,
      role: user.role,
      name: user.name,
    };

    // ✅ Redirect based on role
    if (user.role === "student") return res.redirect("/student/dashboard");
    if (user.role === "university")
      return res.redirect("/university/dashboard");
    if (user.role === "company") return res.redirect("/company/dashboard");

    res.redirect("/public/dashboard");
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).send("Login failed");
  }
});

/* ---------------------------------------------
📍 Render Register Form
--------------------------------------------- */
router.get("/register", (req, res) => {
  const { role } = req.query;
  res.render("auth/register", { role });
});

/* ---------------------------------------------
📍 Handle Registration (with identity verification)
--------------------------------------------- */
router.post("/register", upload.single("idCard"), async (req, res) => {
  try {
    const { name, email, password, role, walletAddress, universityRegNo } =
      req.body;

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Auto-generate wallet if student didn’t provide one
    let finalWalletAddress = walletAddress;
    if (role === "student" && !walletAddress) {
      const wallet = ethers.Wallet.createRandom();
      finalWalletAddress = wallet.address;
      console.log("⚡ Auto-generated wallet:", wallet.address);
      console.log("⚡ Save this private key safely:", wallet.privateKey);
    }

    // ✅ Student-specific security verification
    let idCardPath = null;
    let isVerified = true; // default for non-students

    if (role === "student") {
      idCardPath = req.file ? req.file.path : null;
      isVerified = false; // 🟡 Pending until verified by university

      if (!universityRegNo || !idCardPath) {
        return res
          .status(400)
          .send("❌ University Registration Number and ID card are required.");
      }
    }

    // ✅ Create user entry
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      walletAddress: role === "student" ? finalWalletAddress : null,
      universityRegNo: role === "student" ? universityRegNo : null,
      idCardPath,
      isVerified,
    });

    await newUser.save();
    console.log(`✅ ${role} registered successfully: ${email}`);

    if (role === "student") {
      res.send(
        "✅ Registration submitted! Awaiting university verification before login."
      );
    } else {
      res.redirect("/login");
    }
  } catch (err) {
    console.error("❌ Registration failed:", err);
    res.status(500).send("Registration failed");
  }
});

/* ---------------------------------------------
📍 Logout
--------------------------------------------- */
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

export default router;
