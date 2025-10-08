import express from "express";
import mongoose from "mongoose";
import session from "express-session";
import MongoStore from "connect-mongo";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import projectRoutes from "./routes/projects.js";
import universityRoutes from "./routes/university.js";
import companyRoutes from "./routes/company.js";
import publicRoutes from "./routes/public.js";
import studentRoutes from "./routes/student.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Make session available in all EJS views
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});
// ✅ Check for Mongo URI
if (!process.env.MONGO_URI) {
  console.error("❌ ERROR: MONGO_URI is missing in your .env file");
  process.exit(1);
}
// ✅ Serve static JSON configs like contract.json
app.use("/config", express.static(path.join(__dirname, "config")));

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB Error:", err);
    process.exit(1);
  });

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

// Sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecretkey",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
    }),
  })
);

// Set EJS as template engine
app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "src", "views"));

// Routes
app.use("/", authRoutes);
app.use("/projects", projectRoutes);
app.use("/university", universityRoutes);
app.use("/company", companyRoutes);
app.use("/public", publicRoutes);
app.use("/student", studentRoutes);

// ✅ Default route → Landing page
app.get("/", (req, res) => {
  res.render("landing");
});

// ✅ Role-based redirect after login
app.get("/redirect", (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  const { role } = req.session.user;
  if (role === "student") return res.redirect("/student/dashboard");
  if (role === "university") return res.redirect("/university/dashboard");
  if (role === "company") return res.redirect("/company/dashboard");

  res.redirect("/public/dashboard"); // fallback
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
