import React, { useState } from "react";
import { AlertCircle } from "lucide-react";

export const EMPTY_APP = { name: "", description: "", repoUrl: "", environment: "development", slackWebhookUrl: "" };

const ApplicationForm = ({ initial = EMPTY_APP, onSubmit, onCancel, submitLabel, busyLabel }) => {
  const [form, setForm] = useState({ ...EMPTY_APP, ...initial });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save the application. Please try again.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate={false}>
      {error && (
        <div role="alert" className="flex items-start gap-2 p-3 rounded-md border border-bad/30 bg-bad/10 text-sm text-bad">
          <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> {error}
        </div>
      )}
      <div>
        <label htmlFor="app-name" className="field-label">Name</label>
        <input id="app-name" required value={form.name} onChange={set("name")} placeholder="payments-service" className="input-field" />
      </div>
      <div>
        <label htmlFor="app-repo" className="field-label">Repository URL</label>
        <input id="app-repo" type="url" value={form.repoUrl} onChange={set("repoUrl")} placeholder="https://github.com/org/repo" className="input-field" />
        <p className="field-hint">Optional. The commit stage validates this URL.</p>
      </div>
      <div>
        <label htmlFor="app-env" className="field-label">Environment</label>
        <select id="app-env" value={form.environment} onChange={set("environment")} className="input-field">
          <option value="development">Development</option>
          <option value="staging">Staging</option>
          <option value="production">Production</option>
        </select>
      </div>
      <div>
        <label htmlFor="app-desc" className="field-label">Description</label>
        <textarea id="app-desc" rows={2} value={form.description} onChange={set("description")} placeholder="What does this service do?" className="input-field" />
      </div>
      <div>
        <label htmlFor="app-hook" className="field-label">Notification webhook</label>
        <input id="app-hook" type="url" value={form.slackWebhookUrl} onChange={set("slackWebhookUrl")} placeholder="https://hooks.slack.com/services/..." className="input-field" />
        <p className="field-hint">Optional. Slack or Teams incoming webhook, notified when a run finishes.</p>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={busy} className="btn-primary">{busy ? busyLabel : submitLabel}</button>
      </div>
    </form>
  );
};

export default ApplicationForm;
