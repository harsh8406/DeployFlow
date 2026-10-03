export const formatDuration = (ms) => {
  if (ms == null || Number.isNaN(ms)) return "-";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = ms / 1000;
  return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
};

export const runDuration = (d) =>
  d?.startedAt && d?.finishedAt ? new Date(d.finishedAt) - new Date(d.startedAt) : null;

export const timeAgo = (value) => {
  if (!value) return "-";
  const diff = Date.now() - new Date(value).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d ago` : new Date(value).toLocaleDateString();
};

export const fullDate = (value) => (value ? new Date(value).toLocaleString() : "-");

export const repoLabel = (url) => {
  if (!url) return "";
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/$/, "")}`;
  } catch {
    return url;
  }
};
