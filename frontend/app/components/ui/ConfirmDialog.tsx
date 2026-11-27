"use client";

import { useState, type ReactNode } from "react";
import Dialog, { BusyLabel, DialogActions } from "./Dialog";
import Icon from "./Icon";
import { ErrorText } from "./feedback";
import { errorMessage } from "../../lib/api";

interface ConfirmDialogProps {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

/** Sicherheitsabfrage, z. B. vor dem Löschen. Fehler der Aktion erscheinen im Dialog. */
export default function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm, onClose }: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Dialog title={title} onClose={onClose}>
      <div className="flex gap-3.5">
        {danger && (
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-danger/12 text-danger-text">
            <Icon name="trash" className="size-5" />
          </span>
        )}
        <div className="min-w-0 pt-0.5 text-sm text-muted">{message}</div>
      </div>
      {error && <ErrorText className="mt-3">{error}</ErrorText>}
      <DialogActions>
        <button type="button" onClick={onClose} className="btn btn-secondary">
          Abbrechen
        </button>
        <button type="button" onClick={confirm} className={`btn ${danger ? "btn-danger" : "btn-primary"}`} disabled={busy} autoFocus>
          <BusyLabel busy={busy} label={confirmLabel} />
        </button>
      </DialogActions>
    </Dialog>
  );
}
