import React from "react";
import { AlertCircle, RotateCw } from "lucide-react";

const ErrorState = ({ title = "Something went wrong", message, onRetry }) => (
  <div role="alert" className="flex flex-col items-center text-center py-14 px-6">
    <span className="w-10 h-10 rounded-md bg-bad/10 border border-bad/30 flex items-center justify-center mb-4 text-bad">
      <AlertCircle size={18} strokeWidth={1.75} aria-hidden="true" />
    </span>
    <h3 className="text-sm font-semibold text-fg">{title}</h3>
    {message && <p className="text-sm text-muted max-w-sm mt-1">{message}</p>}
    {onRetry && (
      <button onClick={onRetry} className="btn-secondary mt-5">
        <RotateCw size={14} aria-hidden="true" /> Try again
      </button>
    )}
  </div>
);

export default ErrorState;
