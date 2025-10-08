import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // 🔹 Common fields
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    // 🔹 User roles
    role: {
      type: String,
      enum: ["student", "university", "company"],
      required: true,
    },

    // 🔹 Wallet for funding / payment (students only)
    walletAddress: {
      type: String,
      required: function () {
        return this.role === "student";
      },
    },

    /* -----------------------------------------
       🧾 Identity Verification (for Students)
    ----------------------------------------- */
    universityRegNo: {
      type: String,
      required: function () {
        return this.role === "student";
      },
    },

    idCardPath: {
      type: String, // local path (uploads/idcards/...) or IPFS hash later
      required: function () {
        return this.role === "student";
      },
    },

    // ✅ Verified only after university approval
    isVerified: {
      type: Boolean,
      default: function () {
        // University and company accounts are auto-verified
        return this.role !== "student";
      },
    },

    // ✅ Who approved the student (university reference)
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // refers to university account
      default: null,
    },

    // ✅ When verification occurred
    verifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
