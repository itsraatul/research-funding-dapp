// src/routes/student.js
import express from "express";
import Project from "../models/Project.js";
import { getMilestones } from "../services/chain.js";
import { ensureAuth, ensureRole } from "../middleware/auth.js";

const router = express.Router();

// 🔒 Student-only dashboard
router.get(
  "/dashboard",
  ensureAuth,
  ensureRole("student"),
  async (req, res) => {
    try {
      const studentId = req.session.user._id;

      const projects = await Project.find({ owner: studentId })
        .populate("owner")
        .sort({ createdAt: -1 });

      const enriched = await Promise.all(
        projects.map(async (p) => {
          let milestones = p.milestones || [];

          // ✅ If project has escrow, try fetching on-chain milestones
          if (p.escrowAddress) {
            try {
              const onChainMilestones = await getMilestones(p.escrowAddress);

              // Merge DB + on-chain (fallback to DB fields if missing)
              milestones = milestones.map((m, i) => ({
                ...(m.toObject?.() || m),
                amount: onChainMilestones[i]?.amount || m.amount,
                released: onChainMilestones[i]?.released || false,
              }));
            } catch (err) {
              console.log(
                `⚠️ Could not fetch on-chain milestones for ${p.title}:`,
                err.message
              );
            }
          }

          return { ...p.toObject(), milestones };
        })
      );

      res.render("student/dashboard", { projects: enriched });
    } catch (err) {
      console.error("❌ Student dashboard error:", err);
      res.status(500).send("Failed to load student dashboard");
    }
  }
);

export default router;
