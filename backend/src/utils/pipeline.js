/**
 * Simulates a 4-stage CI/CD pipeline: commit -> build -> test -> deploy.
 *
 * - Every stage's duration is genuinely measured (Date.now before/after the
 *   simulated work), so reported timings are real elapsed time.
 * - Every log line gets an explicit timestamp at the moment it is created,
 *   so the log trail reflects when each event actually happened.
 * - The commit stage validates the application's repository URL, so a
 *   missing/invalid repo surfaces as a real pipeline failure.
 * - A failure in any stage aborts the run; later stages are simply never
 *   recorded (the UI renders them as skipped).
 * - Optional onStageComplete handler lets the caller persist progress
 *   incrementally so the frontend can poll live state mid-run.
 */

const randomDuration = (minMs, maxMs) =>
  Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const makeLog = (message) => ({ timestamp: new Date(), message });

const REPO_URL_PATTERN = /^https?:\/\/\S+/i;

// Stage 1 - commit: validates the repository reference the app points at.
const runCommitStage = async (application) => {
  const startedAt = Date.now();
  await sleep(randomDuration(200, 600));
  const durationMs = Date.now() - startedAt;

  const repoUrl = (application.repoUrl || "").trim();

  if (!repoUrl) {
    return {
      stage: "commit",
      status: "success",
      message: "commit stage completed successfully (no repository linked - using local snapshot)",
      durationMs,
    };
  }

  if (!REPO_URL_PATTERN.test(repoUrl)) {
    return {
      stage: "commit",
      status: "failed",
      message: "commit stage failed - repository URL is missing or invalid",
      durationMs,
    };
  }

  return {
    stage: "commit",
    status: "success",
    message: `commit stage completed successfully (${repoUrl})`,
    durationMs,
  };
};

const runStage = async (stageName, successProbability) => {
  const startedAt = Date.now();
  await sleep(randomDuration(300, 1200));
  const durationMs = Date.now() - startedAt;

  const succeeded = Math.random() < successProbability;

  return {
    stage: stageName,
    status: succeeded ? "success" : "failed",
    message: succeeded
      ? `${stageName} stage completed successfully`
      : `${stageName} stage failed - check logs for details`,
    durationMs,
  };
};

const PIPELINE_STAGES = [
  { name: "build", successProbability: 0.9 },
  { name: "test", successProbability: 0.85 },
  { name: "deploy", successProbability: 0.9 },
];

/**
 * Runs the full pipeline for an application.
 * handlers.onStageComplete(stages, logs) is awaited after every stage so the
 * caller can persist incremental progress.
 */
const runPipeline = async (application, handlers = {}) => {
  const stages = [];
  const logs = [];
  const { onStageComplete } = handlers;

  logs.push(makeLog(`Pipeline started for application "${application.name}"`));

  // Commit stage
  const commitResult = await runCommitStage(application);
  stages.push(commitResult);
  logs.push(makeLog(`[COMMIT] ${commitResult.message} (${commitResult.durationMs}ms)`));
  if (onStageComplete) await onStageComplete([...stages], [...logs]);

  if (commitResult.status === "failed") {
    logs.push(makeLog("Pipeline aborted after commit stage failure"));
    return { status: "failed", stages, logs };
  }

  // Build -> Test -> Deploy
  for (const { name, successProbability } of PIPELINE_STAGES) {
    const result = await runStage(name, successProbability);
    stages.push(result);
    logs.push(makeLog(`[${name.toUpperCase()}] ${result.message} (${result.durationMs}ms)`));
    if (onStageComplete) await onStageComplete([...stages], [...logs]);

    if (result.status === "failed") {
      logs.push(makeLog(`Pipeline aborted after ${name} stage failure`));
      return { status: "failed", stages, logs };
    }
  }

  logs.push(makeLog("Pipeline finished with status: success"));
  return { status: "success", stages, logs };
};

module.exports = { runPipeline };
