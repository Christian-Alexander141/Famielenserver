"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Dialog from "./Dialog";
import { apiGet, errorMessage } from "../lib/api";
import { isSameOrInside, nameProblem, parentPath, type FileItem, type Listing } from "../lib/files";

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
          className="ios-input mb-3"
          aria-label="Name"
          maxLength={200}
        />
        {error && <p className="mb-3 text-sm text-red-400">❌ {error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="ios-button ios-button-secondary">
            Abbrechen
          </button>
          <button type="submit" className="ios-button" disabled={busy}>
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------- Bestätigen

interface ConfirmDialogProps {
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm, onClose }: ConfirmDialogProps) {
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
      <div className="mb-5 text-sm text-gray-300">{message}</div>
      {error && <p className="mb-3 text-sm text-red-400">❌ {error}</p>}
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="ios-button ios-button-secondary">
          Abbrechen
        </button>
        <button
          onClick={confirm}
          className={`ios-button ${danger ? "bg-red-600 hover:bg-red-700" : ""}`}
          disabled={busy}
          autoFocus
        >
          {busy ? "…" : confirmLabel}
        </button>
      </div>
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
      <p className="mb-2 text-sm text-gray-400">
        Zielordner: <span className="text-white">🏠 {browse ? `/${browse}` : "Hauptordner"}</span>
      </p>
      <div className="mb-4 max-h-72 overflow-auto rounded-xl border border-gray-700">
        {browse && (
          <button
            onClick={() => setBrowse(parentPath(browse))}
            className="flex w-full items-center gap-2 border-b border-gray-700 px-3 py-2 text-left hover:bg-gray-800"
          >
            ⬆️ <span className="text-gray-300">Übergeordneter Ordner</span>
          </button>
        )}
        {loading ? (
          <p className="px-3 py-3 text-sm text-gray-400">Lade Ordner …</p>
        ) : listing.error ? (
          <p className="px-3 py-3 text-sm text-red-400">❌ {listing.error}</p>
        ) : listing.folders.length === 0 ? (
          <p className="px-3 py-3 text-sm italic text-gray-500">Keine Unterordner</p>
        ) : (
          listing.folders.map((folder) => (
            <button
              key={folder.path}
              onClick={() => setBrowse(folder.path)}
              disabled={blocked(folder.path)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              📁 <span className="truncate">{folder.name}</span>
            </button>
          ))
        )}
      </div>
      {error && <p className="mb-3 text-sm text-red-400">❌ {error}</p>}
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="ios-button ios-button-secondary">
          Abbrechen
        </button>
        <button onClick={move} className="ios-button" disabled={busy || loading || alreadyHere || blocked(browse)}>
          {busy ? "…" : "Hierher verschieben"}
        </button>
      </div>
    </Dialog>
  );
}
