"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Dialog, { BusyLabel, DialogActions } from "../ui/Dialog";
import Icon from "../ui/Icon";
import { ErrorText } from "../ui/feedback";
import { apiGet, errorMessage } from "../../lib/api";
import { isSameOrInside, nameProblem, parentPath, type FileItem, type Listing } from "../../lib/files";

// ------------------------------------------------------------ Name eingeben

interface NameDialogProps {
  title: string;
  initial?: string;
  confirmLabel: string;
  /** Bei Dateien wird nur der Teil vor der Endung markiert */
  selectStem?: boolean;
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
}

export function NameDialog({ title, initial = "", confirmLabel, selectStem, onSubmit, onClose }: NameDialogProps) {
  const [name, setName] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.focus();
    const dot = initial.lastIndexOf(".");
    el.setSelectionRange(0, selectStem && dot > 0 ? dot : initial.length);
  }, [initial, selectStem]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const problem = nameProblem(name);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    try {
      await onSubmit(name);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Dialog title={title} onClose={onClose}>
      <form onSubmit={submit}>
        <input
          ref={input}
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          className="input"
          aria-label="Name"
          aria-invalid={!!error}
          maxLength={200}
        />
        {error && <ErrorText className="mt-3">{error}</ErrorText>}
        <DialogActions>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Abbrechen
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            <BusyLabel busy={busy} label={confirmLabel} />
          </button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------- Verschieben

interface MoveDialogProps {
  paths: string[];
  startPath: string;
  onMove: (destination: string) => Promise<void>;
  onClose: () => void;
}

/** Zielordner per Klick auswählen statt Pfade einzutippen. */
export function MoveDialog({ paths, startPath, onMove, onClose }: MoveDialogProps) {
  const [browse, setBrowse] = useState(startPath);
  const [listing, setListing] = useState<{ path: string; folders: FileItem[]; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<Listing>("/api/files", { path: browse })
      .then((res) => {
        if (!cancelled) setListing({ path: browse, folders: res.items.filter((i) => i.type === "directory") });
      })
      .catch((err) => {
        if (!cancelled) setListing({ path: browse, folders: [], error: errorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [browse]);

  const loading = !listing || listing.path !== browse;
  const blocked = (folder: string) => paths.some((p) => isSameOrInside(folder, p));
  const alreadyHere = paths.every((p) => parentPath(p) === browse);
  const label = paths.length === 1 ? `„${paths[0].split("/").pop()}“` : `${paths.length} Elemente`;

  const move = async () => {
    setBusy(true);
    try {
      await onMove(browse);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Dialog title={`${label} verschieben`} onClose={onClose}>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-subtle">Zielordner</p>
      <p className="mb-3 flex min-w-0 items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm font-medium">
        <Icon name={browse ? "folder" : "house"} className="text-muted" />
        <span className="truncate">{browse ? `/${browse}` : "Hauptordner"}</span>
      </p>
      <div className="max-h-72 overflow-auto rounded-xl border border-line p-1">
        {browse && (
          <button
            type="button"
            onClick={() => setBrowse(parentPath(browse))}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-fg/5 hover:text-fg"
          >
            <Icon name="corner-left-up" />
            Übergeordneter Ordner
          </button>
        )}
        {loading ? (
          <p className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted">
            <span className="spinner size-4 text-accent-text" />
            Lade Ordner …
          </p>
        ) : listing.error ? (
          <ErrorText className="px-3 py-2.5">{listing.error}</ErrorText>
        ) : listing.folders.length === 0 ? (
          <p className="px-3 py-2.5 text-sm text-subtle">Keine Unterordner</p>
        ) : (
          listing.folders.map((folder) => (
            <button
              type="button"
              key={folder.path}
              onClick={() => setBrowse(folder.path)}
              disabled={blocked(folder.path)}
              className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-fg/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="folder" className="text-amber-600 dark:text-amber-400" />
              <span className="min-w-0 flex-1 truncate">{folder.name}</span>
              <Icon name="chevron-right" className="text-subtle" />
            </button>
          ))
        )}
      </div>
      {error && <ErrorText className="mt-3">{error}</ErrorText>}
      <DialogActions>
        <button type="button" onClick={onClose} className="btn btn-secondary">
          Abbrechen
        </button>
        <button type="button" onClick={move} className="btn btn-primary" disabled={busy || loading || alreadyHere || blocked(browse)}>
          <BusyLabel busy={busy} label="Hierher verschieben" />
        </button>
      </DialogActions>
    </Dialog>
  );
}
