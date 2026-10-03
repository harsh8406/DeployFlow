import React, { useCallback, useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Rocket, Pencil, Trash2, Github, Loader2 } from "lucide-react";
import api from "../api/axios.js";
import { useToast } from "../context/ToastContext.jsx";
import PageTransition from "../components/PageTransition.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import PipelineStages from "../components/PipelineStages.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorState from "../components/ErrorState.jsx";
import Modal from "../components/Modal.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import ApplicationForm from "../components/ApplicationForm.jsx";
import DeploymentRun, { RunTableHead } from "../components/DeploymentRun.jsx";
import { PageSpinner } from "../components/Skeletons.jsx";
import { repoLabel, fullDate } from "../utils/format.js";

const Meta = ({ label, children }) => (
  <div className="px-5 py-3.5">
    <dt className="text-xs text-muted">{label}</dt>
    <dd className="text-sm text-fg mt-0.5 min-w-0 break-words">{children}</dd>
  </div>
);

const ApplicationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [application, setApplication] = useState(null);
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [triggering, setTriggering] = useState(false);
  const [rollingBackId, setRollingBackId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) { setLoading(true); setError(""); }
      try {
        const [appRes, depRes] = await Promise.all([api.get(`/applications/${id}`), api.get(`/deployments/${id}`)]);
        setApplication(appRes.data);
        setDeployments(depRes.data);
      } catch (err) {
        if (!silent) setError(err.response?.data?.message || "Could not load this application.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => { fetchData(); }, [fetchData]);

  // Poll while a run is active (started here or elsewhere) so stage progress updates live.
  const running = triggering || rollingBackId !== null || application?.deploymentStatus === "in_progress";
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => fetchData({ silent: true }), 1000);
    return () => clearInterval(t);
  }, [running, fetchData]);

  const closeEdit = useCallback(() => setEditing(false), []);
  const closeDelete = useCallback(() => setConfirmDelete(false), []);

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await api.post(`/deployments/${id}/trigger`);
      toast.success("Pipeline finished running");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to trigger deployment");
    } finally {
      setTriggering(false);
      fetchData({ silent: true });
    }
  };

  const handleRollback = async (deployment) => {
    setRollingBackId(deployment._id);
    try {
      await api.post(`/deployments/${id}/rollback/${deployment._id}`);
      toast.success(`Redeployed v${deployment.version}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to roll back");
    } finally {
      setRollingBackId(null);
      fetchData({ silent: true });
    }
  };

  const handleEdit = async (form) => {
    const res = await api.put(`/applications/${id}`, form);
    setApplication((prev) => ({ ...prev, ...res.data }));
    toast.success("Changes saved");
    setEditing(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/applications/${id}`);
      toast.success(`"${application.name}" was deleted`);
      navigate("/applications", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete application");
      setDeleting(false);
    }
  };

  if (loading) return <PageSpinner label="Loading application" />;

  if (error || !application) {
    return (
      <PageTransition>
        <Link to="/applications" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg mb-4">
          <ArrowLeft size={14} aria-hidden="true" /> Applications
        </Link>
        <div className="panel"><ErrorState title="Application unavailable" message={error} onRetry={() => fetchData()} /></div>
      </PageTransition>
    );
  }

  const latest = deployments[0];
  const busy = running;

  return (
    <PageTransition>
      <Link to="/applications" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg mb-4">
        <ArrowLeft size={14} aria-hidden="true" /> Applications
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-xl font-semibold text-fg break-all">{application.name}</h1>
            <StatusBadge status={application.deploymentStatus} />
          </div>
          <p className="text-sm text-muted mt-1 max-w-prose">{application.description || "No description."}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(true)} className="btn-secondary"><Pencil size={14} aria-hidden="true" /> Edit</button>
          <button onClick={() => setConfirmDelete(true)} className="btn-danger" aria-label="Delete application"><Trash2 size={14} aria-hidden="true" /> Delete</button>
          <button onClick={handleTrigger} disabled={busy} className="btn-primary">
            {busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Rocket size={15} aria-hidden="true" />}
            {busy ? "Running..." : "Run pipeline"}
          </button>
        </div>
      </div>

      <dl className="panel grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-line mb-6">
        <Meta label="Environment"><span className="capitalize">{application.environment}</span></Meta>
        <Meta label="Current version">{application.lastVersion ? <span className="font-mono">v{application.lastVersion}</span> : "None yet"}</Meta>
        <Meta label="Repository">
          {application.repoUrl ? (
            <a href={application.repoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-accent hover:underline">
              <Github size={13} aria-hidden="true" /> {repoLabel(application.repoUrl)}
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : "Not set"}
        </Meta>
        <Meta label="Notifications">{application.slackWebhookUrl ? "Webhook configured" : "No webhook"}</Meta>
      </dl>

      {latest && (
        <section aria-labelledby="latest-run" className="panel p-5 mb-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
            <h2 id="latest-run" className="text-sm font-semibold text-fg">
              Latest run <span className="font-mono text-muted font-normal">v{latest.version}</span>
            </h2>
            <span className="text-xs text-muted">{fullDate(latest.createdAt)}</span>
          </div>
          <div className="max-w-xl mx-auto">
            <PipelineStages stages={latest.stages} active={latest.status === "in_progress"} />
          </div>
        </section>
      )}

      <section aria-labelledby="history">
        <h2 id="history" className="text-sm font-semibold text-fg mb-3">
          Deployment history <span className="text-muted font-normal">({deployments.length})</span>
        </h2>
        <div className="panel">
          {deployments.length === 0 ? (
            <EmptyState
              icon={Rocket}
              title="No deployments yet"
              description="Run the pipeline to build, test and deploy this application."
              action={<button onClick={handleTrigger} disabled={busy} className="btn-primary"><Rocket size={15} aria-hidden="true" /> Run pipeline</button>}
            />
          ) : (
            <>
              <RunTableHead />
              {deployments.map((d, i) => (
                <DeploymentRun key={d._id} deployment={d} defaultOpen={i === 0} onRollback={handleRollback} rollingBack={rollingBackId !== null || busy} />
              ))}
            </>
          )}
        </div>
      </section>

      <Modal open={editing} onClose={closeEdit} title="Edit application">
        <ApplicationForm
          initial={{
            name: application.name,
            description: application.description || "",
            repoUrl: application.repoUrl || "",
            environment: application.environment,
            slackWebhookUrl: application.slackWebhookUrl || "",
          }}
          onSubmit={handleEdit}
          onCancel={closeEdit}
          submitLabel="Save changes"
          busyLabel="Saving..."
        />
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={closeDelete}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete application"
        confirmLabel="Delete"
        description={`"${application.name}" and all of its deployment history will be permanently deleted.`}
      />
    </PageTransition>
  );
};

export default ApplicationDetail;
