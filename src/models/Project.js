import mongoose from "mongoose";

// =========================
// Milestone Schema
// =========================
const MilestoneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  percentage: { type: Number, required: true }, // milestone percentage (out of 100)
  amount: { type: String }, // ETH allocated for this milestone
  proof: { type: String }, // ✅ IPFS hash of student-uploaded proof
  status: {
    type: String,
    enum: ["draft", "submitted", "pending", "approved", "rejected", "released"],
    default: "draft",
  },
  released: { type: Boolean, default: false }, // on-chain release flag
});

// =========================
// Project Schema
// =========================
const ProjectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    abstract: { type: String },
    ipfsHash: { type: String }, // project proposal file (IPFS)
    blockchainHash: { type: String }, // keccak256 hash of IPFS CID

    // Student who owns the project
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Company that funded the project (added now)
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // assuming your "User" model includes company accounts
    },

    // ETH amount funded by the company
    fundedAmount: {
      type: String,
      default: "0",
    },

    // Project status lifecycle
    status: {
      type: String,
      enum: ["pending", "verified", "funded", "rejected", "completed"],
      default: "pending",
    },

    // Milestones for tracking progress
    milestones: [MilestoneSchema],

    // Smart contract escrow address
    escrowAddress: { type: String },
  },
  { timestamps: true }
);

// =========================
// Model Export
// =========================
const Project = mongoose.model("Project", ProjectSchema);

export default Project;
