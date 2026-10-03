import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Boxes, Plus, ArrowRight, Rocket } from "lucide-react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import PageTransition from "../components/PageTransition.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorState from "../components/ErrorState.jsx";
import DeploymentRun, { RunTableHead } from "../components/DeploymentRun.jsx";
import { ListSkeleton } from "../components/Skeletons.jsx";
import { timeAgo } from "../utils/format.js";

const Stat = ({ label, value, hint, loading }) => (
  <div className="px-5 py-4">
    <p className="text-[13px] text-muted">{label}</p>
    {loading ? (
      <div className="skeleton h-7 w-16 mt-1.5" aria-hidden="true" />
    ) : (
      <p className="text-2xl font-semibold text-fg tabular mt-1">{value}</p>
    )}
    {hint && !loading && <p className="text-xs text-muted mt-0.5">{hint}</p>}
  </div>
);

// Real proportions from the stats endpoint: succeeded / failed / still running or unfinished.
const OutcomeBar = ({ success, failed, total }) => {
  if (!total) return null;
  const other = Math.max(total - success - failed, 0);
  const pct = (n) => `${(n / total) * 100}%`;
  return (
    <div className="px-5 pb-4">
      <div
        className="flex h-1.5 rounded-full overflow-hidden bg-raised"
        role="img"
        aria-label={`${success} succeeded, ${failed} failed, ${other} in progress out of ${total} runs`}
      >
        <span className="bg-ok" style={{ width: pct(success) }} />
        <span className="bg-bad" style={{ width: pct(failed) }} />
        <span className="bg-warn" style={{ width: pct(other) }} />
      </div>
    </div>
  );
};

const STATUS_RANK = { failed: 0, in_progress: 1, success: 2, not_deployed: 3 };

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) { setLoading(true); setError(""); }
    try {
      const [s, a] = await Promise.all([api.get("/deployments/stats/dashboard"), api.get("/applications")]);
      setStats(s.data);
      setApps(a.data);
    } catch (err) {
      if (!silent) setError(err.response?.data?.message || "Could not load the dashboard.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Refresh while any pipeline is running so status stays current.
  const running = apps.some((a) => a.deploymentStatus === "in_progress");
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => load({ silent: true }), 2000);
    return () => clearInterval(t);
  }, [running, load]);

  const firstName = (user?.name || "").split(" ")[0];
  const sortedApps = [...apps].sort(
    (a, b) => (STATUS_RANK[a.deploymentStatus] ?? 9) - (STATUS_RANK[b.deploymentStatus] ?? 9)
  );

  return (
    <PageTransition>
      <PageHeader
        title="Overview"
        description={firstName ? `Welcome back, ${firstName}.` : undefined}
        actions={
          <Link to="/applications" className="btn-primary">
            <Plus size={15} aria-hidden="true" /> New application
          </Link>
        }
      />

      {error ? (
        <div className="panel"><ErrorState title="Dashboard unavailable" message={error} onRetry={() => load()} /></div>
      ) : (
        <>
          <section aria-label="Summary" className="panel mb-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-line">
              <Stat loading={loading} label="Applications" value={stats?.totalApplications} />
              <Stat loading={loading} label="Total runs" value={stats?.totalDeployments} />
              <Stat
                loading={loading} label="Success rate"
                value={stats?.totalDeployments ? `${stats.successRate}%` : "-"}
                hint={stats?.totalDeployments ? `${stats.successfulDeployments} of ${stats.totalDeployments} runs` : "No runs yet"}
              />
              <Stat loading={loading} label="Failed runs" value={stats?.failedDeployments} />
            </div>
            {!loading && stats && (
              <div className="border-t border-line pt-4">
                <OutcomeBar success={stats.successfulDeployments} failed={stats.failedDeployments} total={stats.totalDeployments} />
              </div>
            )}
          </section>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
            <section aria-labelledby="recent-runs">
              <div className="flex items-center justify-between mb-3">
                <h2 id="recent-runs" className="text-sm font-semibold text-fg">Recent runs</h2>
                <Link to="/deployments" className="text-[13px] text-muted hover:text-fg inline-flex items-center gap-1">
                  View all <ArrowRight size={13} aria-hidden="true" />
                </Link>
              </div>
              <div className="panel">
                {loading ? (
                  <ListSkeleton rows={4} label="Loading recent runs" />
                ) : stats?.recentDeployments?.length ? (
                  <>
                    <RunTableHead showApp />
                    {stats.recentDeployments.map((d) => (
                      <DeploymentRun key={d._id} deployment={d} showApp />
                    ))}
                  </>
                ) : (
                  <EmptyState
                    icon={Rocket}
                    title="No deployments yet"
                    description="Open an application and run its pipeline to see runs here."
                    action={<Link to="/applications" className="btn-secondary">Go to applications</Link>}
                  />
                )}
              </div>
            </section>

            <section aria-labelledby="app-status">
              <h2 id="app-status" className="text-sm font-semibold text-fg mb-3">Application status</h2>
              <div className="panel">
                {loading ? (
                  <ListSkeleton rows={3} label="Loading applications" />
                ) : sortedApps.length ? (
                  <ul>
                    {sortedApps.slice(0, 8).map((a) => (
                      <li key={a._id} className="border-b border-line last:border-0">
                        <Link to={`/applications/${a._id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-raised/50 transition-colors">
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-fg truncate">{a.name}</span>
                            <span className="block text-xs text-muted capitalize">{a.environment}{a.lastVersion ? `, v${a.lastVersion}` : ""} · {timeAgo(a.updatedAt)}</span>
                          </span>
                          <StatusBadge status={a.deploymentStatus} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    icon={Boxes}
                    title="No applications"
                    description="Add an application to start deploying."
                    action={<Link to="/applications" className="btn-primary">Add application</Link>}
                  />
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </PageTransition>
  );
};

export default Dashboard;
