import React from "react";

const PageHeader = ({ title, description, actions }) => (
  <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
    <div className="min-w-0">
      <h1 className="text-xl font-semibold text-fg">{title}</h1>
      {description && <p className="text-sm text-muted mt-1">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

export default PageHeader;
