import React from "react";

export const RowSkeleton = ({ cols = 4 }) => (
  <div className="flex items-center gap-6 px-4 py-4 border-b border-line last:border-0" aria-hidden="true">
    <div className="skeleton h-4 w-40" />
    {Array.from({ length: cols - 1 }).map((_, i) => (
      <div key={i} className="skeleton h-4 w-20 hidden sm:block" />
    ))}
    <div className="skeleton h-4 w-16 ml-auto" />
  </div>
);

export const ListSkeleton = ({ rows = 5, label = "Loading" }) => (
  <div role="status" aria-live="polite">
    <span className="sr-only">{label}</span>
    {Array.from({ length: rows }).map((_, i) => (
      <RowSkeleton key={i} />
    ))}
  </div>
);

export const PageSpinner = ({ label = "Loading" }) => (
  <div role="status" className="flex items-center justify-center gap-2.5 py-24 text-sm text-muted">
    <span className="w-4 h-4 border-2 border-line border-t-accent rounded-full animate-spin" aria-hidden="true" />
    {label}
  </div>
);
