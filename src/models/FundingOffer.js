import mongoose from "mongoose";

const fundingOfferSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    totalAmount: { type: Number, required: true },
    milestones: [
      {
        title: String,
        percentage: Number,
        amount: Number,
        status: {
          type: String,
          enum: ["pending", "released"],
          default: "pending",
        },
      },
    ],
    contractAddress: String, // smart contract address on blockchain
  },
  { timestamps: true }
);

export default mongoose.model("FundingOffer", fundingOfferSchema);
