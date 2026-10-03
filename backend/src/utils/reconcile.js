const Deployment = require("../models/Deployment");
const Application = require("../models/Application");

/**
 * Startup reconciliation sweep.
 *
 * If the server dies mid-pipeline, the affected Deployment stays "in_progress"
 * and the Application stays flagged "in_progress" forever. Since nothing can
 * be running at boot time, any in_progress state found here is orphaned:
 *
 * 1. Mark every in_progress Deployment as failed, with an explanatory log line.
 * 2. Reset every Application stuck on "in_progress" that no longer has an
 *    active run back to "failed".
 */
const reconcileStaleRuns = async () => {
  try {
    const stale = await Deployment.find({ status: "in_progress" });

    for (const deployment of stale) {
      deployment.status = "failed";
      deployment.finishedAt = deployment.finishedAt || new Date();
      deployment.logs.push({
        timestamp: new Date(),
        message: "Run marked failed by server recovery - process restarted mid-pipeline",
      });
      await deployment.save();
    }

    if (stale.length > 0) {
      console.log(`[Reconcile] Marked ${stale.length} orphaned in_progress run(s) as failed`);
    }

    const activeApplications = await Deployment.distinct("application", {
      status: "in_progress",
    });

    const result = await Application.updateMany(
      { deploymentStatus: "in_progress", _id: { $nin: activeApplications } },
      { $set: { deploymentStatus: "failed" } }
    );

    if (result.modifiedCount > 0) {
      console.log(`[Reconcile] Reset ${result.modifiedCount} application(s) stuck in in_progress`);
    }
  } catch (error) {
    console.error("[Reconcile] Failed to reconcile stale runs:", error.message);
  }
};

module.exports = { reconcileStaleRuns };
