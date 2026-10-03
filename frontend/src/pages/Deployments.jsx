import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Rocket, SearchX } from "lucide-react";
import api from "../api/axios.js";
import { useToast } from "../context/ToastContext.jsx";
import PageTransition from "../components/PageTransition.jsx";
import PageHeader from "../components/PageHeader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorState from "../components/ErrorState.jsx";
import DeploymentRun, { RunTableHead } from "../components/DeploymentRun.jsx";
import { ListSkeleton } from "../components/Skeletons.jsx";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "success", label: "Succeeded" },
  { key: "failed", label: "Failed" },
  { key: "in_progress", label: "Running" },
];

const Deployments = () => {
  const toast = useToast();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [rollingBackId, setRollingBackId] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) { setLoading(true); setError(""); }
    try {
      const res = await api.get("/deployments/history/all");
      setRuns(res.data);
    } catch (err) {
      if (!silent) setError(err.response?.data?.message || "Could not load deployments.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const running = rollingBackId !== null || runs.some((r) => r.status === "in_progress");
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => load({ silent: true }), 1500);
    return () => clearInterval(t);
  }, [running, load]);

  const handleRollback = async (d) => {
    const appId = d.application?._id;
    if (!appId) return;
    setRollingBackId(d._id);
    try {
      await api.post(`/deployments/${appId}/rollback/${d._id}`);
      toast.success(`Redeployed v${d.version} of ${d.application.name}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to roll back");
    } finally {
      setRollingBackId(null);
      load({ silent: true });
    }
  };

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, f.key === "all" ? runs.length : runs.filter((r) => r.status === f.key).length])),
    [runs]
  );
  const visible = filter === "all" ? runs : runs.filter((r) => r.status === filter);

  return (
    <PageTransition>
      <PageHeader
        title="Deployments"
        description="Pipeline runs and their logs across all applications. Shows the 20 most recent."
      />

      {error ? (
        <div className="panel"><ErrorState title="Deployments unavailable" message={error} onRetry={() => load()} /></div>
      ) : loading ? (
        <div className="panel"><ListSkeleton rows={6} label="Loading deployments" /></div>
      ) : runs.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={Rocket}
            title="No deployments yet"
            description="Runs appear here once you trigger a pipeline from an application."
            action={<Link to="/applications" className="btn-primary">Go to applications</Link>}
          />
        </div>
      ) : (
        <>
          <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1.5 mb-4">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
                className={`h-8 px-3 rounded-md text-[13px] font-medium border transition-colors ${
                  filter === f.key ? "bg-raised border-subtle text-fg" : "border-line text-muted hover:text-fg hover:bg-raised/60"
                }`}
              >
                {f.label} <span className="text-subtle tabular ml-1">{counts[f.key]}</span>
              </button>
            ))}
          </div>
          <div className="panel">
            {visible.length === 0 ? (
              <EmptyState icon={SearchX} title="No runs match this filter" description="Choose another status to see more runs." />
            ) : (
              <>
                <RunTableHead showApp />
                {visible.map((d) => (
                  <DeploymentRun key={d._id} deployment={d} showApp onRollback={handleRollback} rollingBack={rollingBackId !== null} />
                ))}
              </>
            )}
          </div>
        </>
      )}
    </PageTransition>
  );
};

export default Deployments;
