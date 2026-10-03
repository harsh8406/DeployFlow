import React from "react";
import { Check, X, Loader2 } from "lucide-react";
import { formatDuration } from "../utils/format.js";

const ORDER = ["commit", "build", "test", "deploy"];
const LABEL = { commit: "Commit", build: "Build", test: "Test", deploy: "Deploy" };

/**
 * Commit -> Build -> Test -> Deploy, from the stage results the backend records.
 * A stage with no result is "skipped" once an earlier stage failed or the run has
 * finished, and "running" if it is the next stage of a run still in progress.
 */
export const resolveStages = (stages = [], active = false) => {
  const byName = Object.fromEntries(stages.map((s) => [s.stage, s]));
  let blocked = false;
  let runningAssigned = false;
  return ORDER.map((key) => {
    const s = byName[key];
    if (s && !blocked) {
      if (s.status === "failed") blocked = true;
      return { key, status: s.status, durationMs: s.durationMs };
    }
    if (!blocked && active && !runningAssigned) {
      runningAssigned = true;
      return { key, status: "running", durationMs: null };
    }
    return { key, status: "skipped", durationMs: null };
  });
};

const COLOR = {
  success: "bg-ok",
  failed: "bg-bad",
  running: "bg-warn animate-stage-pulse",
  skipped: "bg-line",
};

const summary = (resolved) => resolved.map((s) => `${LABEL[s.key]} ${s.status}`).join(", ");

const PipelineStages = ({ stages, active = false, compact = false }) => {
  const resolved = resolveStages(stages, active);

  if (compact) {
    return (
      <div className="flex items-center gap-1" role="img" aria-label={summary(resolved)}>
        {resolved.map((s) => (
          <span key={s.key} title={`${LABEL[s.key]}: ${s.status}`} className={`h-1.5 w-6 rounded-full ${COLOR[s.status]}`} />
        ))}
      </div>
    );
  }

  return (
    <ol className="grid grid-cols-4" aria-label={summary(resolved)}>
      {resolved.map((s, i) => {
        const prev = resolved[i - 1];
        const lineDone = prev && prev.status === "success";
        return (
          <li key={s.key} className="relative">
            <div className="flex items-center">
              <span className={`h-px flex-1 ${i === 0 ? "bg-transparent" : lineDone ? "bg-ok/60" : "bg-line"}`} />
              <span
                className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center border ${
                  s.status === "success" ? "bg-ok/15 border-ok/50 text-ok"
                  : s.status === "failed" ? "bg-bad/15 border-bad/50 text-bad"
                  : s.status === "running" ? "bg-warn/15 border-warn/50 text-warn"
                  : "bg-surface border-line border-dashed text-subtle"
                }`}
              >
                {s.status === "success" && <Check size={13} strokeWidth={3} aria-hidden="true" />}
                {s.status === "failed" && <X size={13} strokeWidth={3} aria-hidden="true" />}
                {s.status === "running" && <Loader2 size={13} strokeWidth={2.5} className="animate-spin" aria-hidden="true" />}
              </span>
              <span className={`h-px flex-1 ${i === resolved.length - 1 ? "bg-transparent" : s.status === "success" ? "bg-ok/60" : "bg-line"}`} />
            </div>
            <div className="mt-2 text-center">
              <p className={`text-[13px] font-medium ${s.status === "skipped" ? "text-subtle" : "text-fg"}`}>{LABEL[s.key]}</p>
              <p className="text-xs text-muted tabular">
                {s.status === "skipped" ? "Skipped" : s.status === "running" ? "Running" : formatDuration(s.durationMs)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default PipelineStages;
