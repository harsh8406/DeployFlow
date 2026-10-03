const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Application name is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    repoUrl: {
      type: String,
      default: "",
      trim: true,
    },
    environment: {
      type: String,
      enum: ["development", "staging", "production"],
      default: "development",
    },
    deploymentStatus: {
      type: String,
      enum: ["not_deployed", "in_progress", "success", "failed"],
      default: "not_deployed",
    },
    // Monotonic version counter; incremented atomically on every new run
    lastVersion: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Optional per-app Slack/Teams incoming webhook (falls back to SLACK_WEBHOOK_URL env var)
    slackWebhookUrl: {
      type: String,
      default: "",
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    department: {
      type: String,
      default: "General",
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Application", applicationSchema);
