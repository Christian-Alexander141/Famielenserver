"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type Kind = "success" | "error" | "info";
type Notify = (kind: Kind, text: string) => void;

interface Toast {
  id: number;
  kind: Kind;
  text: string;
}

const ToastContext = createContext<Notify>(() => {});

const STYLE: Record<Kind, string> = {
  success: "border-green-700 bg-green-950/90 text-green-300",
  error: "border-red-700 bg-red-950/90 text-red-300",
  info: "border-blue-700 bg-blue-950/90 text-blue-200",
};
const ICON: Record<Kind, string> = { success: "✅", error: "❌", info: "ℹ️" };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const notify = useCallback<Notify>(
    (kind, text) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-3), { id, kind, text }]);
      setTimeout(() => dismiss(id), kind === "error" ? 7000 : 3500);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <button
            key={t.id}
            onClick={() => dismiss(t.id)}
            className={`pointer-events-auto max-w-lg rounded-xl border px-4 py-2 text-left text-sm shadow-lg ${STYLE[t.kind]}`}
            title="Schließen"
          >
            {ICON[t.kind]} {t.text}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Notify {
  return useContext(ToastContext);
}
