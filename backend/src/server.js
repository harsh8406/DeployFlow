require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { reconcileStaleRuns } = require("./utils/reconcile");

const authRoutes = require("./routes/authRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const deploymentRoutes = require("./routes/deploymentRoutes");

const app = express();

connectDB();

// Recover any runs orphaned by a previous crash/restart before accepting traffic
reconcileStaleRuns();

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:8080",
      "http://127.0.0.1:8080",
    ];

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "cicd-platform-backend", time: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/deployments", deploymentRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
});

module.exports = app;
