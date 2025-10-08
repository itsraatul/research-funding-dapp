# ResearchFunding DApp – Transparent Milestone-Based Research Funding

**ResearchFunding DApp** is a blockchain-powered decentralized platform that ensures **transparency, traceability, and accountability** in research and innovation funding.  
It connects **students**, **universities**, and **industry funders** through a **smart-contract-backed escrow system** that releases funds based on verified milestones, reducing fraud and ensuring trust at every stage.


## Tech Stack Used

**Backend:** Node.js + Express.js  
**Frontend:** EJS + TailwindCSS  
**Database:** MongoDB (via Mongoose ODM)  
**Blockchain:** Ethereum (Sepolia Testnet)  
**Wallet:** MetaMask  
**Smart Contracts:** Solidity (Milestone Escrow Contract deployed via Hardhat)

## ⚙️ Setup Instructions

### 1️⃣ Clone this Repository
git clone https://github.com/itsraatul/research-funding-dapp.git
cd research-funding-dapp
### 2️⃣ Install Dependencies
npm install
### 3️⃣ Configure Environmment Variables
MONGO_URI=mongodb://localhost:27017/researchfunding
SESSION_SECRET=your-secret-key
UNIVERSITY_ADDRESS=0xYourUniversityWalletAddress
INFURA_API_KEY=your-infura-api-key
PRIVATE_KEY=your-wallet-private-key
### 4️⃣ Start the Application
npm start

### Smart Contract Details
Contract Name: MilestoneEscrow
Language: Solidity
Network: Ethereum (Sepolia Testnet)
Functionality:

-Deploys escrow contracts dynamically per funded project.
-Holds ETH securely until each milestone is verified by a university.
-Releases funds automatically upon milestone approval.

# How the Platform Works

# # For Students
-Register with university registration number and ID card upload.
-Wait for university verification before participating.
-Submit project proposals and milestone proofs via IPFS.
-Receive milestone-based funds directly to your MetaMask wallet.

# # For Universities
-Verify student identities and approve legitimate research projects.
-Review milestone submissions and trigger on-chain fund releases.
-Maintain institutional transparency and reputation in funding cycles.

# # For Companies / Funders
-Browse verified research projects.
-Fund projects in INR (auto-converted to ETH) via MetaMask popup.
-Track milestone completion, proof uploads, and release history.


# Key Features

-Identity Verification System
-Smart Contract Escrow
-Milestone-Based Funding
-INR to ETH Conversion
-IPFS Integration
-Multi-Role Dashboards

# Developed By
# #Arunangshu Mojumder Raatul
M.Tech in Information Security & Cyber Forensics
SRM Institute of Science and Technology
