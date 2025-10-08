import express from "express";
import Project from "../models/Project.js";
import { getMilestones } from "../services/chain.js";

const router = express.Router();

// ✅ Transparency Dashboard
router.get("/dashboard", async (req, res) => {
  try {
    const projects = await Project.find()
      .populate("owner")
      .sort({ createdAt: -1 });

    // Fetch milestones from blockchain for projects with escrow
    const enriched = await Promise.all(
      projects.map(async (p) => {
        let milestones = [];
        if (p.escrowAddress) {
          try {
            milestones = await getMilestones(); // ✅ fetch blockchain milestones
          } catch (err) {
            console.log("⚠️ Couldn’t fetch milestones for:", p.title);
          }
        }
        return { ...p.toObject(), milestones };
      })
    );

    // ✅ Fixed view path (matches src/views/dashboard.ejs)
    res.render("dashboard", { projects: enriched });
  } catch (err) {
    console.error("❌ Dashboard Error:", err);
    res.status(500).send("Failed to load dashboard");
  }
});

export default router;
