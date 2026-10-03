import React from "react";
import { Check, X, Loader2, Minus } from "lucide-react";

const CONFIG = {
  success: { label: "Succeeded", icon: Check, cls: "text-ok" },
  failed: { label: "Failed", icon: X, cls: "text-bad" },
  in_progress: { label: "Running", icon: Loader2, cls: "text-warn" },
  not_deployed: { label: "Not deployed", icon: Minus, cls: "text-muted" },
};

const StatusBadge = ({ status }) => {
  const cfg = CONFIG[status] || CONFIG.not_deployed;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[13px] font-medium ${cfg.cls}`}>
      <Icon size={14} strokeWidth={2.25} className={status === "in_progress" ? "animate-spin" : ""} aria-hidden="true" />
      {cfg.label}
    </span>
  );
};

export default StatusBadge;
