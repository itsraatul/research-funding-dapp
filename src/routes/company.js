// src/routes/company.js
import express from "express";
import Project from "../models/Project.js";
import { ensureAuth, ensureRole } from "../middleware/auth.js";
import { deployEscrow, getMilestones } from "../services/chain.js";
import { ethers } from "ethers";

const router = express.Router();

router.get("/browse", ensureAuth, ensureRole("company"), async (req, res) => {
  try {
    const projects = await Project.find({ status: "verified" }).populate(
      "owner"
    );
    res.render("company/browse", { projects });
  } catch (err) {
    console.error("❌ Error loading verified projects:", err);
    res.status(500).send("Error loading projects");
  }
});

router.get("/fund/:id", ensureAuth, ensureRole("company"), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate("owner");
    if (!project) return res.status(404).send("Project not found");

    if (!project.owner.walletAddress) {
      return res
        .status(400)
        .send("❌ Student has not registered a wallet address yet.");
    }

    // ✅ Pass university wallet from .env
    const universityAddress = process.env.UNIVERSITY_ADDRESS;

    res.render("company/fund", { project, universityAddress });
  } catch (err) {
    console.error("❌ Error fetching project:", err);
    res.status(500).send("Error fetching project");
  }
});

/* -----------------------------------------
   📍 3. Handle escrow deployment + funding
----------------------------------------- */
router.post(
  "/fund/:id",
  ensureAuth,
  ensureRole("company"),
  async (req, res) => {
    try {
      const project = await Project.findById(req.params.id).populate("owner");
      if (!project) return res.status(404).send("❌ Project not found");

      if (!project.owner.walletAddress) {
        return res
          .status(400)
          .send("❌ Student wallet not found. Ask the student to add one.");
      }

      const totalFundingEth = req.body.totalFunding.trim();
      const percentsArray = req.body.milestones
        .split(",")
        .map((p) => parseFloat(p.trim()));

      // Convert percentages → BigInt amounts in wei
      let milestoneAmounts = percentsArray.map((p) =>
        ethers.parseEther(((parseFloat(totalFundingEth) * p) / 100).toFixed(18))
      );

      // Adjust final milestone if rounding mismatch
      const totalWei = ethers.parseEther(totalFundingEth);
      const sumWei = milestoneAmounts.reduce((a, b) => a + b, 0n);
      if (sumWei !== totalWei) {
        const diff = totalWei - sumWei;
        milestoneAmounts[milestoneAmounts.length - 1] += diff;
      }

      // Deploy contract
      const universityAddress = process.env.UNIVERSITY_ADDRESS;
      const escrowAddress = await deployEscrow(
        project.owner.walletAddress,
        universityAddress,
        milestoneAmounts,
        totalFundingEth
      );

      // Save project as funded
      project.escrowAddress = escrowAddress;
      project.status = "funded";
      await project.save();

      res.redirect("/company/dashboard");
    } catch (err) {
      console.error("❌ Funding error:", err);
      res.status(500).send("Funding failed");
    }
  }
);

router.post("/save-escrow/:id", async (req, res) => {
  try {
    const { escrowAddress } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) return res.status(404).json({ error: "Project not found" });

    project.escrowAddress = escrowAddress;
    project.status = "funded";
    await project.save();

    res.json({ success: true, escrowAddress });
  } catch (err) {
    console.error("❌ Save escrow error:", err);
    res.status(500).json({ error: "Failed to save escrow" });
  }
});

/* -----------------------------------------
   📍 4. Company Dashboard — see all funded projects
----------------------------------------- */
/* -----------------------------------------
   📍 4. Company Dashboard — see all funded projects
----------------------------------------- */
router.get(
  "/dashboard",
  ensureAuth,
  ensureRole("company"),
  async (req, res) => {
    try {
      const projects = await Project.find({
        status: { $in: ["funded", "completed"] },
      })
        .populate("owner")
        .sort({ createdAt: -1 });

      const data = [];
      let completedCount = 0;
      let totalFunded = 0;

      for (const project of projects) {
        let milestones = project.milestones || [];

        if (project.escrowAddress) {
          try {
            const onchain = await getMilestones(project.escrowAddress);
            milestones = milestones.map((m, i) => ({
              ...m.toObject(),
              amount: onchain[i]?.amount || m.amount || "0",
              released: onchain[i]?.released || m.released || false,
            }));
          } catch {
            console.warn(
              `⚠️ Could not fetch on-chain data for ${project.title}`
            );
          }
        }

        if (project.status === "completed") completedCount++;
        if (project.fundedAmount)
          totalFunded += parseFloat(project.fundedAmount || "0");

        data.push({
          _id: project._id,
          title: project.title,
          abstract: project.abstract,
          escrowAddress: project.escrowAddress || "—",
          fundedAmount: project.fundedAmount || "0",
          student: project.owner?.name || "Unknown",
          milestones,
          status: project.status,
        });
      }

      const stats = {
        totalProjects: projects.length,
        completed: completedCount,
        totalFunded,
      };

      res.render("company/dashboard", { projects: data, stats });
    } catch (err) {
      console.error("❌ Company dashboard error:", err);
      res.status(500).send("Failed to load company dashboard");
    }
  }
);

/* -----------------------------------------
   📍 5. Refund endpoint
----------------------------------------- */
/* -----------------------------------------
   📍 5. Refund endpoint
----------------------------------------- */
router.post(
  "/refund/:id",
  ensureAuth,
  ensureRole("company"),
  async (req, res) => {
    try {
      const project = await Project.findById(req.params.id);
      if (!project || !project.escrowAddress) {
        return res.status(404).send("Project or escrow not found");
      }

      await refund(project.escrowAddress);
      project.status = "refunded";
      await project.save();

      res.redirect("/company/dashboard");
    } catch (err) {
      console.error("❌ Refund error:", err);
      res.status(500).send("Refund failed");
    }
  }
);

/* -----------------------------------------
   📍 6. Redirect any legacy “browse” route to dashboard
----------------------------------------- */
router.get("/", (req, res) => res.redirect("/company/dashboard"));

export default router;
