/**
 * Real GitHub integration: after a successful deployment, commits an updated
 * deployment-status section to the application's README.md on GitHub.
 *
 * Requires:
 * - Application.repoUrl pointing at a github.com repository
 * - GITHUB_TOKEN env var (Personal Access Token with Contents read/write)
 *
 * The platform owns a marked section of the README (between START/END
 * comment markers) so it updates itself in place without clobbering
 * human-written content.
 *
 * Never throws - a Git push failure must never fail a deployment.
 */

const DEPLOY_SECTION_START = "<!-- CICD-PLATFORM:DEPLOYMENTS:START -->";
const DEPLOY_SECTION_END = "<!-- CICD-PLATFORM:DEPLOYMENTS:END -->";

// Extracts { owner, repo } from a github.com URL, or null if not GitHub.
const parseGitHubRepo = (repoUrl) => {
  try {
    const url = new URL(repoUrl);
    if (url.hostname !== "github.com") return null;
    const [, owner, repo] = url.pathname.split("/");
    if (!owner || !repo) return null;
    return { owner, repo: repo.replace(/\.git$/, "") };
  } catch {
    return null;
  }
};

const buildDeploySection = (application, deployment) =>
  [
    DEPLOY_SECTION_START,
    "## Deployment Status",
    "",
    "| Version | Status | Trigger | Deployed At |",
    "| --- | --- | --- | --- |",
    `| v${deployment.version} | ${deployment.status} | ${deployment.triggerType} | ${new Date().toISOString()} |`,
    "",
    "_Auto-updated by the Enterprise CI/CD Platform after a successful deployment._",
    DEPLOY_SECTION_END,
  ].join("\n");

// Replaces the managed section in place, or appends it if missing.
const upsertDeploySection = (readmeContent, section) => {
  if (!readmeContent) return `${section}\n`;

  const startIdx = readmeContent.indexOf(DEPLOY_SECTION_START);
  const endIdx = readmeContent.indexOf(DEPLOY_SECTION_END);

  if (startIdx !== -1 && endIdx !== -1) {
    return (
      readmeContent.slice(0, startIdx) +
      section +
      readmeContent.slice(endIdx + DEPLOY_SECTION_END.length)
    );
  }

  return `${readmeContent.trimEnd()}\n\n${section}\n`;
};

const pushDeploymentCommit = async (application, deployment) => {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) return;

    const repoInfo = parseGitHubRepo(application.repoUrl || "");
    if (!repoInfo) return;

    const { owner, repo } = repoInfo;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    };

    // 1. Read the current README (404 is fine - we will create it)
    const getRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/README.md`,
      { headers }
    );

    let sha = null;
    let readmeContent = "";
    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
      readmeContent = Buffer.from(data.content || "", "base64").toString("utf8");
    } else if (getRes.status !== 404) {
      console.error("[GitHub] Failed to read README:", getRes.status);
      return;
    }

    // 2. Upsert the managed deployment-status section
    const newContent = upsertDeploySection(
      readmeContent,
      buildDeploySection(application, deployment)
    );

    // 3. Commit it back ([skip ci] prevents Jenkins/Webhook loops)
    const putRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/README.md`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({
          message: `chore(deploy): v${deployment.version} deployed successfully [skip ci]`,
          content: Buffer.from(newContent, "utf8").toString("base64"),
          ...(sha ? { sha } : {}),
        }),
      }
    );

    if (!putRes.ok) {
      console.error("[GitHub] Failed to commit README:", putRes.status);
      return;
    }

    console.log(`[GitHub] Pushed v${deployment.version} deployment update to ${owner}/${repo}`);
  } catch (error) {
    console.error("[GitHub] Push failed:", error.message);
  }
};

module.exports = { pushDeploymentCommit };
