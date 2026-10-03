import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Rocket, Pencil, Trash2, Boxes, Search, ExternalLink, Loader2 } from "lucide-react";
import api from "../api/axios.js";
import { useToast } from "../context/ToastContext.jsx";
import PageTransition from "../components/PageTransition.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorState from "../components/ErrorState.jsx";
import Modal from "../components/Modal.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import ApplicationForm from "../components/ApplicationForm.jsx";
import { ListSkeleton } from "../components/Skeletons.jsx";
import { repoLabel, timeAgo } from "../utils/format.js";

const GRID = "md:grid-cols-[minmax(0,1.6fr)_110px_130px_70px_90px_112px]";

const Applications = () => {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [env, setEnv] = useState("all");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [triggeringId, setTriggeringId] = useState(null);
  const toast = useToast();

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) { setLoading(true); setError(""); }
    try {
      const res = await api.get("/applications");
      setApps(res.data);
    } catch (err) {
      if (!silent) setError(err.response?.data?.message || "Could not load applications.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll while a run is active so the status column reflects progress.
  const running = triggeringId !== null || apps.some((a) => a.deploymentStatus === "in_progress");
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => load({ silent: true }), 1000);
    return () => clearInterval(t);
  }, [running, load]);

  const closeCreate = useCallback(() => setCreating(false), []);
  const closeEdit = useCallback(() => setEditing(null), []);
  const closeDelete = useCallback(() => setPendingDelete(null), []);

  const handleCreate = async (form) => {
    await api.post("/applications", form);
    toast.success(`"${form.name.trim()}" was created`);
    setCreating(false);
    load({ silent: true });
  };

  const handleEdit = async (form) => {
    await api.put(`/applications/${editing._id}`, form);
    toast.success(`"${form.name.trim()}" was updated`);
    setEditing(null);
    load({ silent: true });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/applications/${pendingDelete._id}`);
      setApps((prev) => prev.filter((a) => a._id !== pendingDelete._id));
      toast.success(`"${pendingDelete.name}" was deleted`);
      setPendingDelete(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete application");
    } finally {
      setDeleting(false);
    }
  };

  const handleTrigger = async (app) => {
    setTriggeringId(app._id);
    try {
      await api.post(`/deployments/${app._id}/trigger`);
      toast.success(`Pipeline finished for "${app.name}"`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to trigger deployment");
    } finally {
      setTriggeringId(null);
      load({ silent: true });
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return apps.filter(
      (a) =>
        (env === "all" || a.environment === env) &&
        (!q || a.name.toLowerCase().includes(q) || (a.repoUrl || "").toLowerCase().includes(q))
    );
  }, [apps, query, env]);

  const newButton = (
    <button onClick={() => setCreating(true)} className="btn-primary">
      <Plus size={15} aria-hidden="true" /> New application
    </button>
  );

  return (
    <PageTransition>
      <PageHeader title="Applications" description="Repositories you deploy, and the state of their latest run." actions={apps.length > 0 && newButton} />

      {error ? (
        <div className="panel"><ErrorState title="Applications unavailable" message={error} onRetry={() => load()} /></div>
      ) : loading ? (
        <div className="panel"><ListSkeleton rows={5} label="Loading applications" /></div>
      ) : apps.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={Boxes}
            title="No applications yet"
            description="Add an application with its repository URL, then run its pipeline."
            action={newButton}
          />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <label htmlFor="app-search" className="sr-only">Search applications</label>
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" aria-hidden="true" />
              <input id="app-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or repository" className="input-field !pl-9" />
            </div>
            <div>
              <label htmlFor="env-filter" className="sr-only">Filter by environment</label>
              <select id="env-filter" value={env} onChange={(e) => setEnv(e.target.value)} className="input-field w-auto">
                <option value="all">All environments</option>
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </select>
            </div>
          </div>

          <div className="panel">
            <div className={`hidden md:grid ${GRID} gap-x-4 px-4 border-b border-line bg-raised/40 rounded-t-lg`}>
              <span className="th !px-0">Name</span>
              <span className="th !px-0">Environment</span>
              <span className="th !px-0">Status</span>
              <span className="th !px-0">Version</span>
              <span className="th !px-0">Updated</span>
              <span className="th !px-0 text-right">Actions</span>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No matching applications"
                description="Try a different search or environment."
                action={<button onClick={() => { setQuery(""); setEnv("all"); }} className="btn-secondary">Clear filters</button>}
              />
            ) : (
              <ul>
                {filtered.map((a) => {
                  const busy = triggeringId === a._id;
                  const active = a.deploymentStatus === "in_progress";
                  return (
                    <li key={a._id} className={`grid grid-cols-[1fr_auto] ${GRID} items-center gap-x-4 gap-y-1 px-4 py-3 border-b border-line last:border-0`}>
                      <div className="min-w-0">
                        <Link to={`/applications/${a._id}`} className="text-sm font-medium text-fg hover:text-accent truncate block">{a.name}</Link>
                        {a.repoUrl ? (
                          <a href={a.repoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg max-w-full">
                            <span className="truncate">{repoLabel(a.repoUrl)}</span>
                            <ExternalLink size={11} className="shrink-0" aria-hidden="true" />
                            <span className="sr-only">(opens in a new tab)</span>
                          </a>
                        ) : (
                          <span className="text-xs text-subtle">No repository set</span>
                        )}
                      </div>
                      <span className="md:hidden justify-self-end"><StatusBadge status={a.deploymentStatus} /></span>
                      <span className="hidden md:block text-[13px] text-muted capitalize">{a.environment}</span>
                      <span className="hidden md:block"><StatusBadge status={a.deploymentStatus} /></span>
                      <span className="hidden md:block text-[13px] text-muted font-mono tabular">{a.lastVersion ? `v${a.lastVersion}` : "-"}</span>
                      <span className="hidden md:block text-[13px] text-muted tabular">{timeAgo(a.updatedAt)}</span>
                      <div className="col-span-2 md:col-span-1 flex items-center gap-1 md:justify-end">
                        <button onClick={() => handleTrigger(a)} disabled={busy || active} className="btn-icon" aria-label={`Deploy ${a.name}`} title="Run pipeline">
                          {busy || active ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Rocket size={15} aria-hidden="true" />}
                        </button>
                        <button onClick={() => setEditing(a)} className="btn-icon" aria-label={`Edit ${a.name}`} title="Edit">
                          <Pencil size={15} aria-hidden="true" />
                        </button>
                        <button onClick={() => setPendingDelete(a)} className="btn-icon hover:!text-bad" aria-label={`Delete ${a.name}`} title="Delete">
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}

      <Modal open={creating} onClose={closeCreate} title="New application">
        <ApplicationForm onSubmit={handleCreate} onCancel={closeCreate} submitLabel="Create application" busyLabel="Creating..." />
      </Modal>

      <Modal open={!!editing} onClose={closeEdit} title="Edit application">
        {editing && (
          <ApplicationForm
            key={editing._id}
            initial={{
              name: editing.name,
              description: editing.description || "",
              repoUrl: editing.repoUrl || "",
              environment: editing.environment,
              slackWebhookUrl: editing.slackWebhookUrl || "",
            }}
            onSubmit={handleEdit}
            onCancel={closeEdit}
            submitLabel="Save changes"
            busyLabel="Saving..."
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={closeDelete}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete application"
        confirmLabel="Delete"
        description={pendingDelete ? `"${pendingDelete.name}" and all of its deployment history will be permanently deleted.` : ""}
      />
    </PageTransition>
  );
};

export default Applications;
