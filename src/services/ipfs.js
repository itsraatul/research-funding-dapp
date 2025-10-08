import fs from "fs";
import axios from "axios";
import FormData from "form-data";

export async function uploadToIPFS(filePath) {
  if (!filePath) throw new Error("❌ No file path found");

  const data = new FormData();
  data.append("file", fs.createReadStream(filePath));

  try {
    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      data,
      {
        maxBodyLength: "Infinity",
        headers: {
          ...data.getHeaders(), // ✅ This sets correct Content-Type boundary
          Authorization: `Bearer ${process.env.PINATA_JWT}`,
        },
      }
    );

    return res.data.IpfsHash;
  } catch (err) {
    console.error("❌ Pinata upload failed:", err);
    throw err;
  }
}
