import React, { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

const Modal = ({ open, onClose, title, children, maxWidth = "max-w-lg" }) => {
  const titleId = useId();
  const panelRef = useRef(null);
  const reduce = useReducedMotion();
  // Keep the latest onClose without re-running the focus effect on every parent render
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const onKey = (e) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => {
      panelRef.current?.querySelector("input, textarea, select, button:not([data-close])")?.focus();
    }, 30);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus?.();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center sm:px-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} aria-hidden="true"
            className="absolute inset-0 bg-black/50"
          />
          <motion.div
            ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId}
            initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={`relative w-full ${maxWidth} panel shadow-xl p-5 sm:p-6 max-h-[90dvh] overflow-y-auto rounded-b-none sm:rounded-b-lg`}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 id={titleId} className="text-base font-semibold text-fg">{title}</h2>
              <button data-close onClick={onClose} className="btn-icon -mr-2" aria-label="Close dialog">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
