"use client";

import { useEffect, type ReactNode } from "react";

interface DialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}

/** Modales Fenster: schließt mit Escape, Klick auf den Hintergrund oder ✕. */
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`ios-card mb-0 flex max-h-[92vh] w-full flex-col ${wide ? "max-w-5xl" : "max-w-md"}`}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="truncate text-lg font-medium">{title}</h3>
          <button onClick={onClose} className="icon-button text-gray-400" aria-label="Schließen">
            ✕
          </button>
        </div>
        <div className="min-h-0 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
