import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Copy, History, ArrowUpRight } from "lucide-react";
import StatusBadge from "./StatusBadge.jsx";
import PipelineStages from "./PipelineStages.jsx";
import { formatDuration, runDuration, timeAgo, fullDate } from "../utils/format.js";

const lineTone = (msg = "") =>
  /fail|error|crash|abort/i.test(msg) ? "text-bad" : /success|complete/i.test(msg) ? "text-ok" : "text-muted";

const LogViewer = ({ logs = [], active, onCopy }) => (
  <div className="relative">
    <button onClick={onCopy} className="btn-ghost !h-7 !px-2 text-xs absolute top-1.5 right-1.5" aria-label="Copy logs">
      <Copy size={12} aria-hidden="true" /> Copy
    </button>
    <div className="log p-3 pr-20 max-h-64 overflow-auto" tabIndex={0} role="log" aria-label="Pipeline logs">
      {logs.length === 0 && <p>No log output recorded.</p>}
      {logs.map((l, i) => (
        <div key={i} className="whitespace-pre-wrap break-words">
          <span className="text-subtle tabular">{new Date(l.timestamp).toLocaleTimeString([], { hour12: false })}</span>{"  "}
          <span className={lineTone(l.message)}>{l.message}</span>
        </div>
      ))}
      {active && <p className="text-warn animate-stage-pulse">Waiting for next stage...</p>}
    </div>
  </div>
);

const DeploymentRun = ({ deployment: d, showApp = false, defaultOpen = false, onRollback, rollingBack }) => {
  const [open, setOpen] = useState(defaultOpen);
  const active = d.status === "in_progress";
  const app = d.application && typeof d.application === "object" ? d.application : null;

  const copyLogs = async () => {
    const text = (d.logs || []).map((l) => `${new Date(l.timestamp).toISOString()} ${l.message}`).join("\n");
    try { await navigator.clipboard.writeText(text); } catch { /* clipboard unavailable */ }
  };

  return (
    <div className="border-b border-line last:border-0">
      <button
        onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full grid grid-cols-[1fr_auto] md:grid-cols-[minmax(0,1.4fr)_120px_130px_90px_90px_20px] items-center gap-x-4 gap-y-1.5 px-4 py-3 text-left hover:bg-raised/50 transition-colors"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <span className="font-mono text-[13px] font-medium text-fg">v{d.version}</span>
          {d.triggerType === "rollback" && (
            <span className="chip"><History size={11} aria-hidden="true" /> Rollback</span>
          )}
          {showApp && <span className="text-sm text-muted truncate">{app?.name || "Deleted application"}</span>}
        </span>
        <span className="md:order-none justify-self-end md:justify-self-start"><StatusBadge status={d.status} /></span>
        <span className="hidden md:block"><PipelineStages stages={d.stages} active={active} compact /></span>
        <span className="hidden md:block text-[13px] text-muted tabular">{active ? "Running" : formatDuration(runDuration(d))}</span>
        <span className="text-[13px] text-muted tabular col-span-2 md:col-span-1" title={fullDate(d.createdAt)}>{timeAgo(d.createdAt)}</span>
        <ChevronDown size={15} aria-hidden="true" className={`hidden md:block text-subtle transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-4">
          <div className="max-w-xl mx-auto pt-2"><PipelineStages stages={d.stages} active={active} /></div>
          <LogViewer logs={d.logs} active={active} onCopy={copyLogs} />
          <div className="flex flex-wrap items-center gap-2">
            {d.status === "success" && onRollback && (
              <button onClick={() => onRollback(d)} disabled={rollingBack} className="btn-secondary !h-8 text-[13px]">
                <History size={13} aria-hidden="true" />
                {rollingBack ? "Rolling back..." : `Redeploy v${d.version}`}
              </button>
            )}
            {showApp && app?._id && (
              <Link to={`/applications/${app._id}`} className="btn-ghost !h-8 text-[13px]">
                View application <ArrowUpRight size={13} aria-hidden="true" />
              </Link>
            )}
            <span className="text-xs text-subtle ml-auto">{fullDate(d.createdAt)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export const RunTableHead = ({ showApp = false }) => (
  <div className="hidden md:grid grid-cols-[minmax(0,1.4fr)_120px_130px_90px_90px_20px] gap-x-4 px-4 border-b border-line bg-raised/40 rounded-t-lg">
    <span className="th !px-0">{showApp ? "Version / Application" : "Version"}</span>
    <span className="th !px-0">Status</span>
    <span className="th !px-0">Stages</span>
    <span className="th !px-0">Duration</span>
    <span className="th !px-0">Started</span>
    <span />
  </div>
);

export default DeploymentRun;
