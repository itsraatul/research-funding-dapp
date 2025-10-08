import express from "express";
import multer from "multer";
import fs from "fs";
import Project from "../models/Project.js";
import { uploadToIPFS } from "../services/ipfs.js";
import { deployEscrow, getMilestones } from "../services/chain.js";
import { ethers } from "ethers";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// -----------------------------------------
// 🧩 Student views milestone submission page
// -----------------------------------------
router.get("/:id/milestone", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate("owner");
    if (!project) {
      return res.status(404).send("❌ Project not found");
    }
    res.render("projects/milestone", {
      project,
      milestones: project.milestones || [],
    });
  } catch (err) {
    console.error("❌ Error loading project milestone page:", err);
    res.status(500).send("Error loading milestone page");
  }
});

// -----------------------------------------
// Student submits a NEW milestone (initial proof upload)
// -----------------------------------------
router.post("/:id/milestone", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) throw new Error("No proof uploaded");

    // Upload proof file to IPFS
    const ipfsCid = await uploadToIPFS(req.file.path);

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).send("❌ Project not found");

    // Push new milestone entry
    const newMilestone = {
      title: req.body.title,
      description: req.body.description,
      percentage: req.body.percentage,
      proof: ipfsCid,
      status: "submitted",
      released: false,
    };

    project.milestones.push(newMilestone);
    await project.save();

    console.log(`✅ New milestone submitted for project ${project.title}`);

    res.redirect(`/projects/${req.params.id}/milestones`);
  } catch (err) {
    console.error("❌ Milestone submission failed:", err);
    res.status(500).send("Milestone submission failed");
  } finally {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});

// -----------------------------------------
// 🧩 View milestones (merged with blockchain data if available)
// -----------------------------------------
router.get("/:id/milestones", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate("owner");
    if (!project) return res.status(404).send("❌ Project not found");

    let milestones = project.milestones || [];

    // Merge with on-chain milestone data if escrow exists
    if (project.escrowAddress) {
      try {
        const onchainMilestones = await getMilestones(project.escrowAddress);
        milestones = milestones.map((m, i) => ({
          ...m.toObject(),
          amount: onchainMilestones[i]?.amount || m.amount || "0",
          released: onchainMilestones[i]?.released || m.released || false,
        }));
      } catch (err) {
        console.warn("⚠️ Could not fetch on-chain milestones:", err.message);
      }
    }

    res.render("projects/milestone", { project, milestones });
  } catch (err) {
    console.error("❌ Error loading milestones:", err);
    res.status(500).send("Could not load milestones");
  }
});

// -----------------------------------------
// 🧩 Create new project
// -----------------------------------------
router.get("/create", (req, res) => {
  res.render("projects/create");
});

router.post("/create", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) throw new Error("No file uploaded");

    const ipfsCid = await uploadToIPFS(req.file.path);

    const newProject = new Project({
      title: req.body.title,
      abstract: req.body.abstract,
      ipfsHash: ipfsCid, // proposal file
      owner: req.session.user._id,
      status: "pending",
    });

    await newProject.save();
    res.redirect("/student/dashboard");
  } catch (err) {
    console.error("❌ Project creation failed:", err);
    res.status(500).send("Error creating project");
  } finally {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});

// -----------------------------------------
// 🧩 Company funds project → Deploy escrow
// -----------------------------------------
router.post("/:id/fund", async (req, res) => {
  try {
    const { totalAmount, milestonePercents } = req.body;
    const percentsArray = milestonePercents
      .split(",")
      .map((p) => parseFloat(p.trim()));

    const project = await Project.findById(req.params.id).populate("owner");
    if (!project || !project.owner.walletAddress) {
      return res.status(400).send("❌ Student wallet not available");
    }

    // Convert percentages into ETH amounts
    const milestoneAmounts = percentsArray.map((p) =>
      ((parseFloat(totalAmount) * p) / 100).toFixed(6)
    );

    // Get university wallet from .env
    const universityAddress = process.env.UNIVERSITY_ADDRESS;
    if (!universityAddress)
      throw new Error("❌ UNIVERSITY_ADDRESS missing in .env");

    // ✅ Deploy escrow with student, university, milestones, totalFunding
    const escrowAddress = await deployEscrow(
      project.owner.walletAddress,
      universityAddress,
      milestoneAmounts,
      totalAmount
    );

    project.escrowAddress = escrowAddress;
    project.status = "funded";
    await project.save();

    res.redirect(`/projects/${req.params.id}/milestones`);
  } catch (err) {
    console.error("❌ Funding error:", err);
    res.status(500).send("Could not fund project");
  }
});

export default router;
