import React from "react";
import Modal from "./Modal.jsx";

const ConfirmDialog = ({ open, onClose, onConfirm, title, description, confirmLabel = "Confirm", loading }) => (
  <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-sm">
    <p className="text-sm text-muted leading-relaxed mb-6">{description}</p>
    <div className="flex gap-2 justify-end">
      <button onClick={onClose} className="btn-secondary">Cancel</button>
      <button onClick={onConfirm} disabled={loading} className="btn-danger">
        {loading ? "Working..." : confirmLabel}
      </button>
    </div>
  </Modal>
);

export default ConfirmDialog;
