import React from "react";

const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center text-center py-14 px-6">
    {Icon && (
      <span className="w-10 h-10 rounded-md bg-raised border border-line flex items-center justify-center mb-4 text-muted">
        <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
      </span>
    )}
    <h3 className="text-sm font-semibold text-fg">{title}</h3>
    {description && <p className="text-sm text-muted max-w-sm mt-1">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export default EmptyState;
