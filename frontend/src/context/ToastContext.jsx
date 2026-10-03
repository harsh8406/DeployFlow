import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X, Info } from "lucide-react";

const ToastContext = createContext(null);
const ICONS = { success: Check, error: X, info: Info };
const TONE = { success: "text-ok", error: "text-bad", info: "text-accent" };

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const notify = useCallback(
    (message, type = "info", duration = 4500) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, type }]);
      if (duration) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (m) => notify(m, "success"),
      error: (m) => notify(m, "error", 7000),
      info: (m) => notify(m, "info"),
    }),
    [notify]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 flex flex-col gap-2 sm:w-96" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.type];
            return (
              <motion.div
                key={t.id} role={t.type === "error" ? "alert" : "status"}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="panel shadow-lg flex items-start gap-3 px-4 py-3"
              >
                <Icon size={16} strokeWidth={2.25} className={`mt-0.5 shrink-0 ${TONE[t.type]}`} aria-hidden="true" />
                <p className="text-sm text-fg flex-1">{t.message}</p>
                <button onClick={() => dismiss(t.id)} className="text-muted hover:text-fg -mr-1" aria-label="Dismiss notification">
                  <X size={14} aria-hidden="true" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
};
