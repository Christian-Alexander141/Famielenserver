"use client";

import { useEffect, type ReactNode } from "react";
import Icon from "./Icon";

interface DialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}

/** Modales Fenster: schließt mit Escape, Klick auf den Hintergrund oder das X. */
export default function Dialog({ title, onClose, children, wide = false }: DialogProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-3 backdrop-blur-[2px] animate-fade-in motion-reduce:animate-none sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`card flex max-h-[calc(100dvh-1.5rem)] w-full flex-col shadow-[var(--shadow-lg)] animate-pop-in motion-reduce:animate-none sm:max-h-[calc(100dvh-3rem)] ${
          wide ? "max-w-5xl" : "max-w-md"
        }`}
      >
        <div className="flex items-center justify-between gap-4 py-3 pl-5 pr-3">
          <h3 className="truncate text-base font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="Schließen" title="Schließen">
            <Icon name="x" className="size-5" />
          </button>
        </div>
        <div className="min-h-0 overflow-auto px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}

/** Schaltflächen am Fuß eines Dialogs – auf dem Handy untereinander, die Hauptaktion oben. */
export function DialogActions({ children }: { children: ReactNode }) {
  return <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{children}</div>;
}

/** Beschriftung einer Schaltfläche, die während der Aktion einen Ladekreis zeigt. */
export function BusyLabel({ busy, label }: { busy: boolean; label: string }) {
  return (
    <>
      {busy && <span className="spinner size-4" />}
      {label}
    </>
  );
}
