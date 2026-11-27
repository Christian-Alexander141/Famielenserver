import type { ReactNode } from "react";
import Icon, { type IconName } from "./Icon";

/** Fehlermeldung mit Symbol – wird von Screenreadern sofort vorgelesen. */
export function ErrorText({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p role="alert" className={`flex items-start gap-2 text-sm text-danger-text ${className}`}>
      <Icon name="circle-alert" className="mt-0.5 size-4" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

export function Loading({ children, className = "py-8" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-2.5 text-sm text-muted ${className}`}>
      <span className="spinner size-4 text-accent-text" />
      {children}
    </div>
  );
}

/** Hinweis für leere Listen, z. B. „Dieser Ordner ist leer“. */
export function EmptyState({ icon, title, children }: { icon: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <span className="mb-3 grid size-12 place-items-center rounded-2xl bg-surface-2 text-subtle">
        <Icon name={icon} className="size-6" strokeWidth={1.75} />
      </span>
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-muted">{children}</div>}
    </div>
  );
}
