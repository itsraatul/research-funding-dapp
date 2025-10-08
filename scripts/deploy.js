// scripts/deploy.js
import pkg from "hardhat";
import dotenv from "dotenv";

dotenv.config();

const { ethers } = pkg;

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("🚀 Deploying MilestoneEscrow contract");
  console.log("   → Deployer (company):", deployer.address);

  const MilestoneEscrow = await ethers.getContractFactory("MilestoneEscrow");

  // Addresses (replace if needed)
  const student = "0x152151B381dA335a4756EfD536712351dA176363";
  const university = "0xe921e4d5f38fD8D78b03DCa7d2c8c71150221E93";

  // Milestone structure
  const amounts = [ethers.parseEther("0.001"), ethers.parseEther("0.002")];
  const total = amounts.reduce((a, b) => a + b, 0n);

  // Deploy contract
  const escrow = await MilestoneEscrow.deploy(student, university, amounts, {
    value: total,
  });

  await escrow.waitForDeployment();

  console.log("✅ Deployed successfully!");
  console.log("   Contract Address:", escrow.target);
  console.log("   Student:", student);
  console.log("   University:", university);
  console.log("   Total Funding:", ethers.formatEther(total), "ETH");

  console.log("🔍 Checking on-chain state...");
  console.log("   Student:", await escrow.student());
  console.log("   University:", await escrow.university());
  console.log("   Company:", await escrow.company());
  console.log("   Milestones:", await escrow.getMilestones());
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
