/**
 * Fires a Slack/Teams incoming-webhook notification for a finished deployment.
 *
 * - Uses the application-level webhook if set, otherwise falls back to the
 *   SLACK_WEBHOOK_URL environment variable.
 * - The plain { text } payload works for both Slack and Microsoft Teams
 *   incoming webhooks.
 * - Never throws: a notification failure must never fail a deployment.
 */

const sendDeploymentNotification = async (application, deployment) => {
  try {
    const webhookUrl = application.slackWebhookUrl || process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;

    const icon = deployment.status === "success" ? "\u2705" : "\u274C";
    const stageLines = (deployment.stages || [])
      .map((s) => `\u2022 ${s.stage}: ${s.status} (${s.durationMs}ms)`)
      .join("\n");

    const text = [
      `${icon} *${application.name}* v${deployment.version} - deployment ${deployment.status}`,
      `Environment: ${application.environment} | Trigger: ${deployment.triggerType}`,
      stageLines || "(no stage results recorded)",
    ].join("\n");

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (error) {
    console.error("[Notify] Failed to send deployment notification:", error.message);
  }
};

module.exports = { sendDeploymentNotification };
