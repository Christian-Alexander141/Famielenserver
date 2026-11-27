"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import Icon, { type IconName } from "./Icon";

type Kind = "success" | "error" | "info";
type Notify = (kind: Kind, text: string) => void;

interface Toast {
  id: number;
  kind: Kind;
  text: string;
}

const ToastContext = createContext<Notify>(() => {});

const STYLE: Record<Kind, { icon: IconName; tone: string }> = {
  success: { icon: "circle-check", tone: "text-success-text" },
  error: { icon: "circle-alert", tone: "text-danger-text" },
  info: { icon: "info", tone: "text-accent-text" },
};

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
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => dismiss(t.id)}
            className="pointer-events-auto flex max-w-md items-start gap-2.5 rounded-xl border border-line bg-surface px-4 py-3 text-left text-sm shadow-[var(--shadow-lg)] animate-pop-in motion-reduce:animate-none"
            title="Schließen"
          >
            <Icon name={STYLE[t.kind].icon} className={`mt-px size-[18px] ${STYLE[t.kind].tone}`} />
            <span className="min-w-0">{t.text}</span>
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Notify {
  return useContext(ToastContext);
}
