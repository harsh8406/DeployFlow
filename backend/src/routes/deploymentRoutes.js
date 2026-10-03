const express = require("express");
const Application = require("../models/Application");
const Deployment = require("../models/Deployment");
const { protect } = require("../middleware/auth");
const { runPipeline } = require("../utils/pipeline");
const { sendDeploymentNotification } = require("../utils/notify");
const { pushDeploymentCommit } = require("../utils/github");

const router = express.Router();

router.use(protect);

/**
 * Creates the Deployment record up-front as in_progress (so a crash leaves a
 * visible, reconcilable record), runs the pipeline while persisting each stage
 * as it completes, then finalizes status and fires notifications.
 * Throws if the pipeline itself crashes - callers are responsible for the 409/
 * guard cleanup, which is handled here via Application.updateOne.
 */
const runAndRecord = async ({ application, userId, version, triggerType, rollbackOf = null, initialLog }) => {
  const deployment = await Deployment.create({
    application: application._id,
    triggeredBy: userId,
    version,
    triggerType,
    rollbackOf,
    status: "in_progress",
    stages: [],
    logs: [{ timestamp: new Date(), message: initialLog }],
    startedAt: new Date(),
  });

  let result;
  try {
    result = await runPipeline(application, {
      onStageComplete: async (stages, logs) => {
        await Deployment.updateOne({ _id: deployment._id }, { $set: { stages, logs } });
      },
    });
  } catch (pipelineError) {
    await Deployment.updateOne(
      { _id: deployment._id },
      {
        $set: { status: "failed", finishedAt: new Date() },
        $push: {
          logs: { timestamp: new Date(), message: `Pipeline crashed: ${pipelineError.message}` },
        },
      }
    );
    await Application.updateOne(
      { _id: application._id },
      { $set: { deploymentStatus: "failed" } }
    );
    throw pipelineError;
  }

  const saved = await Deployment.findByIdAndUpdate(
    deployment._id,
    {
      $set: {
        status: result.status,
        stages: result.stages,
        logs: result.logs,
        finishedAt: new Date(),
      },
    },
    { new: true }
  );

  application.deploymentStatus = result.status === "success" ? "success" : "failed";
  await application.save();

  // Fire-and-forget webhook notification - never blocks or fails the response
  sendDeploymentNotification(application, saved);

  // On success, push a deployment-status commit to the app's GitHub repo
  if (saved.status === "success") {
    pushDeploymentCommit(application, saved);
  }

  return saved;
};

/**
 * Atomically claims an application for a run: flips deploymentStatus to
 * in_progress and (for manual runs) increments the version counter only if no
 * other run is active. Returns null when a run is already in progress.
 */
const claimApplication = async (applicationId, incrementVersion) => {
  const update = { $set: { deploymentStatus: "in_progress" } };
  if (incrementVersion) update.$inc = { lastVersion: 1 };

  return Application.findOneAndUpdate(
    { _id: applicationId, deploymentStatus: { $ne: "in_progress" } },
    update,
    { new: true }
  );
};

// @route   POST /api/deployments/:applicationId/trigger
// @desc    Trigger a simulated commit -> build -> test -> deploy pipeline run
router.post("/:applicationId/trigger", async (req, res) => {
  try {
    const existing = await Application.findOne({
      _id: req.params.applicationId,
      owner: req.user._id,
    });

    if (!existing) {
      return res.status(404).json({ message: "Application not found" });
    }

    const application = await claimApplication(existing._id, true);
    if (!application) {
      return res
        .status(409)
        .json({ message: "A deployment is already running for this application" });
    }

    const deployment = await runAndRecord({
      application,
      userId: req.user._id,
      version: application.lastVersion,
      triggerType: "manual",
      initialLog: `Pipeline started for application "${application.name}" (v${application.lastVersion})`,
    });

    return res.status(201).json(deployment);
  } catch (error) {
    return res.status(500).json({ message: "Failed to trigger deployment", error: error.message });
  }
});

// @route   POST /api/deployments/:applicationId/rollback/:deploymentId
// @desc    Roll back to a previous successful deployment by redeploying its version
router.post("/:applicationId/rollback/:deploymentId", async (req, res) => {
  try {
    const application = await Application.findOne({
      _id: req.params.applicationId,
      owner: req.user._id,
    });

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const target = await Deployment.findOne({
      _id: req.params.deploymentId,
      application: application._id,
      status: "success",
    });

    if (!target) {
      return res
        .status(404)
        .json({ message: "No successful deployment found to roll back to" });
    }

    const claimed = await claimApplication(application._id, false);
    if (!claimed) {
      return res
        .status(409)
        .json({ message: "A deployment is already running for this application" });
    }

    const deployment = await runAndRecord({
      application,
      userId: req.user._id,
      version: target.version,
      triggerType: "rollback",
      rollbackOf: target._id,
      initialLog: `Rollback started: redeploying v${target.version} of "${application.name}"`,
    });

    return res.status(201).json(deployment);
  } catch (error) {
    return res.status(500).json({ message: "Failed to roll back deployment", error: error.message });
  }
});

// @route   GET /api/deployments/:applicationId
// @desc    Get all deployments for a specific application
router.get("/:applicationId", async (req, res) => {
  try {
    const application = await Application.findOne({
      _id: req.params.applicationId,
      owner: req.user._id,
    });

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const deployments = await Deployment.find({ application: application._id }).sort({
      createdAt: -1,
    });

    return res.status(200).json(deployments);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch deployments", error: error.message });
  }
});

// @route   GET /api/deployments/history/all
// @desc    Get recent deployment history across all of the user's applications
router.get("/history/all", async (req, res) => {
  try {
    const applications = await Application.find({ owner: req.user._id }).select("_id");
    const applicationIds = applications.map((app) => app._id);

    const deployments = await Deployment.find({ application: { $in: applicationIds } })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("application", "name environment");

    return res.status(200).json(deployments);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch deployment history", error: error.message });
  }
});

// @route   GET /api/deployments/stats/dashboard
// @desc    Aggregate dashboard statistics for the logged-in user
router.get("/stats/dashboard", async (req, res) => {
  try {
    const applications = await Application.find({ owner: req.user._id }).select("_id");
    const applicationIds = applications.map((app) => app._id);

    const totalDeployments = await Deployment.countDocuments({ application: { $in: applicationIds } });
    const successfulDeployments = await Deployment.countDocuments({
      application: { $in: applicationIds },
      status: "success",
    });
    const failedDeployments = await Deployment.countDocuments({
      application: { $in: applicationIds },
      status: "failed",
    });

    const recentDeployments = await Deployment.find({ application: { $in: applicationIds } })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("application", "name environment");

    return res.status(200).json({
      totalApplications: applicationIds.length,
      totalDeployments,
      successfulDeployments,
      failedDeployments,
      successRate:
        totalDeployments > 0 ? Math.round((successfulDeployments / totalDeployments) * 100) : 0,
      recentDeployments,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch dashboard stats", error: error.message });
  }
});

module.exports = router;
