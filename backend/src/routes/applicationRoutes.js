const express = require("express");
const Application = require("../models/Application");
const Deployment = require("../models/Deployment");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

const REPO_URL_PATTERN = /^https?:\/\/\S+/i;
const WEBHOOK_URL_PATTERN = /^https?:\/\/\S+/i;

// Returns a cleaned { name, repoUrl, slackWebhookUrl } or an error message.
const validateFields = ({ name, repoUrl, slackWebhookUrl }) => {
  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return { error: "Application name is required" };
    }
  }
  if (repoUrl !== undefined && repoUrl !== null && String(repoUrl).trim().length > 0) {
    if (!REPO_URL_PATTERN.test(String(repoUrl).trim())) {
      return { error: "Repository URL must be a valid http(s) URL" };
    }
  }
  if (
    slackWebhookUrl !== undefined &&
    slackWebhookUrl !== null &&
    String(slackWebhookUrl).trim().length > 0
  ) {
    if (!WEBHOOK_URL_PATTERN.test(String(slackWebhookUrl).trim())) {
      return { error: "Slack webhook URL must be a valid http(s) URL" };
    }
  }
  return {};
};

// @route   POST /api/applications
router.post("/", async (req, res) => {
  try {
    const { description, environment, department } = req.body;
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const repoUrl = typeof req.body.repoUrl === "string" ? req.body.repoUrl.trim() : "";
    const slackWebhookUrl =
      typeof req.body.slackWebhookUrl === "string" ? req.body.slackWebhookUrl.trim() : "";

    const validation = validateFields({ name, repoUrl, slackWebhookUrl });
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const duplicate = await Application.findOne({ owner: req.user._id, name });
    if (duplicate) {
      return res
        .status(409)
        .json({ message: `You already have an application named "${name}"` });
    }

    const application = await Application.create({
      name,
      description,
      repoUrl,
      slackWebhookUrl,
      environment,
      department: department || req.user.department,
      owner: req.user._id,
    });

    return res.status(201).json(application);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create application", error: error.message });
  }
});

// @route   GET /api/applications
router.get("/", async (req, res) => {
  try {
    const applications = await Application.find({ owner: req.user._id })
      .sort({ createdAt: -1 })
      .populate("owner", "name email department");

    return res.status(200).json(applications);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch applications", error: error.message });
  }
});

// @route   GET /api/applications/:id
router.get("/:id", async (req, res) => {
  try {
    const application = await Application.findOne({ _id: req.params.id, owner: req.user._id }).populate(
      "owner",
      "name email department"
    );

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    return res.status(200).json(application);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch application", error: error.message });
  }
});

// @route   PUT /api/applications/:id
router.put("/:id", async (req, res) => {
  try {
    const application = await Application.findOne({ _id: req.params.id, owner: req.user._id });

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const { name, description, repoUrl, environment, deploymentStatus, department, slackWebhookUrl } =
      req.body;

    const incomingName = name !== undefined ? String(name).trim() : undefined;
    const incomingRepoUrl = repoUrl !== undefined ? String(repoUrl).trim() : undefined;
    const incomingWebhook =
      slackWebhookUrl !== undefined ? String(slackWebhookUrl).trim() : undefined;

    const validation = validateFields({
      name: incomingName,
      repoUrl: incomingRepoUrl,
      slackWebhookUrl: incomingWebhook,
    });
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    if (incomingName !== undefined && incomingName !== application.name) {
      const duplicate = await Application.findOne({
        owner: req.user._id,
        name: incomingName,
        _id: { $ne: application._id },
      });
      if (duplicate) {
        return res
          .status(409)
          .json({ message: `You already have an application named "${incomingName}"` });
      }
      application.name = incomingName;
    }
    if (description !== undefined) application.description = description;
    if (incomingRepoUrl !== undefined) application.repoUrl = incomingRepoUrl;
    if (environment !== undefined) application.environment = environment;
    if (deploymentStatus !== undefined) application.deploymentStatus = deploymentStatus;
    if (department !== undefined) application.department = department;
    if (incomingWebhook !== undefined) application.slackWebhookUrl = incomingWebhook;

    await application.save();

    return res.status(200).json(application);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update application", error: error.message });
  }
});

// @route   DELETE /api/applications/:id
router.delete("/:id", async (req, res) => {
  try {
    const application = await Application.findOne({ _id: req.params.id, owner: req.user._id });

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    await Deployment.deleteMany({ application: application._id });
    await application.deleteOne();

    return res.status(200).json({ message: "Application deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete application", error: error.message });
  }
});

module.exports = router;
