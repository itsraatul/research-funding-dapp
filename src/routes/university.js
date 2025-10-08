// src/routes/university.js
import express from "express";
import Project from "../models/Project.js";
import User from "../models/User.js";
import multer from "multer";
import path from "path";

import { ensureAuth, ensureRole } from "../middleware/auth.js";
import { approveMilestone } from "../services/chain.js";

const router = express.Router();
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/idcards"),
    filename: (req, file, cb) =>
      cb(null, Date.now() + path.extname(file.originalname)),
  }),
});

// 📌 University dashboard → list pending + funded projects
router.get(
  "/dashboard",
  ensureAuth,
  ensureRole("university"),
  async (req, res) => {
    try {
      const projects = await Project.find({
        status: { $in: ["pending", "funded"] },
      })
        .populate("owner")
        .sort({ createdAt: -1 });

      res.render("university/dashboard", { projects });
    } catch (err) {
      console.error("❌ University dashboard error:", err);
      res.status(500).send("Failed to load university dashboard");
    }
  }
);

router.post(
  "/verify/:id/approve",
  ensureAuth,
  ensureRole("university"),
  async (req, res) => {
    try {
      const student = await User.findById(req.params.id);
      if (!student) return res.status(404).send("Student not found");

      student.isVerified = true;
      student.verifiedBy = req.session.user._id;
      student.verifiedAt = new Date();
      await student.save();

      res.redirect("/university/verify-students");
    } catch (err) {
      console.error("❌ Error approving student:", err);
      res.status(500).send("Verification failed");
    }
  }
);

router.post(
  "/verify/:id/reject",
  ensureAuth,
  ensureRole("university"),
  async (req, res) => {
    try {
      const student = await User.findById(req.params.id);
      if (!student) return res.status(404).send("Student not found");

      // Optional: mark as rejected or remove from DB
      await User.findByIdAndDelete(req.params.id);

      res.redirect("/university/verify-students");
    } catch (err) {
      console.error("❌ Error rejecting student:", err);
      res.status(500).send("Rejection failed");
    }
  }
);

router.get(
  "/verify-students",
  ensureAuth,
  ensureRole("university"),
  async (req, res) => {
    try {
      const pendingStudents = await User.find({
        role: "student",
        isVerified: false,
      }).sort({ createdAt: -1 });

      res.render("university/verify-students", { students: pendingStudents });
    } catch (err) {
      console.error("❌ Error loading verification list:", err);
      res.status(500).send("Failed to load verification list");
    }
  }
);

// 📌 Approve project → verified (companies can see & fund)
router.post(
  "/approve/:id",
  ensureAuth,
  ensureRole("university"),
  async (req, res) => {
    try {
      await Project.findByIdAndUpdate(req.params.id, { status: "verified" });
      res.redirect("/university/dashboard");
    } catch (err) {
      console.error("❌ Project approval error:", err);
      res.status(500).send("Project approval failed");
    }
  }
);

// 📌 Reject project
router.post(
  "/reject/:id",
  ensureAuth,
  ensureRole("university"),
  async (req, res) => {
    try {
      await Project.findByIdAndUpdate(req.params.id, { status: "rejected" });
      res.redirect("/university/dashboard");
    } catch (err) {
      console.error("❌ Project rejection error:", err);
      res.status(500).send("Project rejection failed");
    }
  }
);

// 📌 Approve milestone → release ETH on-chain
router.post(
  "/:id/milestone/:index/approve",
  ensureAuth,
  ensureRole("university"),
  async (req, res) => {
    try {
      const project = await Project.findById(req.params.id);
      if (!project || !project.escrowAddress) {
        return res.status(400).send("❌ Escrow not available");
      }

      const milestoneIndex = Math.min(
        parseInt(req.params.index, 10),
        project.milestones.length - 1
      );
      const milestone = project.milestones[milestoneIndex];
      if (!milestone) return res.status(400).send("Invalid milestone index");

      // ✅ Call blockchain contract
      const txHash = await approveMilestone(
        project.escrowAddress,
        milestoneIndex
      );

      // ✅ Update DB milestone
      milestone.status = "approved";
      milestone.released = true;
      await project.save();

      console.log(`✅ Milestone ${milestoneIndex} released. Tx: ${txHash}`);
      res.redirect("/university/dashboard");
    } catch (err) {
      console.error("❌ Milestone approval error:", err);
      res.status(500).send("Milestone approval failed");
    }
  }
);

// 📌 Reject milestone
router.post(
  "/:id/milestone/:index/reject",
  ensureAuth,
  ensureRole("university"),
  async (req, res) => {
    try {
      const project = await Project.findById(req.params.id);
      if (!project) return res.status(404).send("❌ Project not found");

      const milestoneIndex = Math.min(
        parseInt(req.params.index, 10),
        project.milestones.length - 1
      );
      const milestone = project.milestones[milestoneIndex];
      if (!milestone) return res.status(400).send("Invalid milestone index");

      milestone.status = "rejected";
      await project.save();

      res.redirect("/university/dashboard");
    } catch (err) {
      console.error("❌ Reject error:", err);
      res.status(500).send("Rejection failed");
    }
  }
);

export default router;
