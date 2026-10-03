const mongoose = require("mongoose");

const stageResultSchema = new mongoose.Schema(
  {
    stage: {
      type: String,
      enum: ["commit", "build", "test", "deploy"],
      required: true,
    },
    status: {
      type: String,
      enum: ["success", "failed"],
      required: true,
    },
    message: {
      type: String,
      default: "",
    },
    durationMs: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const deploymentSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    triggerType: {
      type: String,
      enum: ["manual", "rollback"],
      default: "manual",
    },
    rollbackOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Deployment",
      default: null,
    },
    status: {
      type: String,
      enum: ["success", "failed", "in_progress"],
      default: "in_progress",
    },
    stages: [stageResultSchema],
    logs: [
      {
        timestamp: { type: Date, default: Date.now },
        message: String,
      },
    ],
    startedAt: {
      type: Date,
      default: Date.now,
    },
    finishedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Deployment", deploymentSchema);
