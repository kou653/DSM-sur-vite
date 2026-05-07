import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  loading = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape" && !loading) {
        onCancel();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [loading, onCancel, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="confirm-dialog-backdrop" onClick={loading ? undefined : onCancel}>
      <div
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="confirm-dialog-icon" aria-hidden="true">
          <AlertTriangle size={20} strokeWidth={2.2} />
        </div>

        <div className="confirm-dialog-content">
          <h2 id="confirm-dialog-title">{title}</h2>
          <p>{message}</p>
        </div>

        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="secondary-action"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="danger-action"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Suppression..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
