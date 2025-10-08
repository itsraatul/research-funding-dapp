// src/services/chain.js
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Load ABI & Bytecode
const contractJson = JSON.parse(
  fs.readFileSync(
    path.join(
      __dirname,
      "../../artifacts/contracts/MilestoneEscrow.sol/MilestoneEscrow.json"
    ),
    "utf8"
  )
);
const MilestoneEscrowABI = contractJson.abi;
const bytecode = contractJson.bytecode;

// ✅ Provider
const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC);

// ✅ Wallets
const companyWallet = new ethers.Wallet(
  process.env.COMPANY_PRIVATE_KEY,
  provider
);

// ----------------------
// 📌 Helper: Contract instance
// ----------------------
function getEscrowInstance(escrowAddress, signer = companyWallet) {
  return new ethers.Contract(escrowAddress, MilestoneEscrowABI, signer);
}

// ----------------------
// 📌 On-chain functions
// ----------------------

// ✅ Register project (hash IPFS CID)
export async function registerProjectOnChain(ipfsCid) {
  return ethers.keccak256(ethers.toUtf8Bytes(ipfsCid));
}

// ✅ Get milestones
export async function getMilestones(escrowAddress) {
  const escrow = getEscrowInstance(escrowAddress);
  const milestones = await escrow.getMilestones();
  return milestones.map((m, i) => ({
    index: i,
    amount: ethers.formatEther(m.amount),
    released: m.released,
  }));
}

// ✅ Approve milestone — anyone can call
export async function approveMilestone(escrowAddress, index) {
  try {
    const escrow = getEscrowInstance(escrowAddress);

    // 🧩 Check the number of milestones on-chain first
    const milestones = await escrow.getMilestones();
    const totalMilestones = milestones.length;

    if (index >= totalMilestones) {
      console.warn(
        `⚠️ Skipping invalid on-chain milestone index ${index} (total: ${totalMilestones})`
      );
      return null;
    }

    console.log(`⏳ Approving milestone ${index} on ${escrowAddress}...`);

    // ✅ Use the same signer (anyone can call now — no restriction)
    const tx = await escrow.connect(companyWallet).approveMilestone(index);

    const receipt = await tx.wait();
    console.log(`✅ Milestone ${index} released! Tx: ${receipt.hash}`);
    return receipt.hash;
  } catch (error) {
    console.error(
      "❌ Milestone approval error:",
      error.reason || error.message
    );
    throw new Error("Failed to approve milestone");
  }
}

// ✅ Deploy escrow (company deploys)
export async function deployEscrow(
  student,
  university,
  milestoneAmounts,
  totalFunding
) {
  const factory = new ethers.ContractFactory(
    MilestoneEscrowABI,
    bytecode,
    companyWallet
  );

  const parsedAmounts = milestoneAmounts.map((amt) =>
    ethers.parseEther(amt.toString())
  );

  const contract = await factory.deploy(student, university, parsedAmounts, {
    value: ethers.parseEther(totalFunding.toString()),
  });

  await contract.waitForDeployment();

  console.log("✅ Escrow deployed at:", contract.target);
  return contract.target;
}

// ✅ Get participants
export async function getParticipants(escrowAddress) {
  const escrow = getEscrowInstance(escrowAddress);
  return {
    student: await escrow.student(),
    company: await escrow.company(),
    university: await escrow.university(),
  };
}
