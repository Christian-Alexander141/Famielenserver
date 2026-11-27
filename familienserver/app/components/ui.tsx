import type { ReactNode } from "react";
import Icon, { type IconName } from "./Icon";
import type { FileKind } from "../lib/files";

// ------------------------------------------------------------- Dateisymbol

/** Symbol und Farbton je Dateiart – die Farbe hilft beim Überfliegen, der Name bleibt maßgeblich. */
const KIND_STYLE: Record<FileKind, { icon: IconName; tone: string }> = {
  folder: { icon: "folder", tone: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  image: { icon: "image", tone: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  video: { icon: "film", tone: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
  audio: { icon: "music", tone: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400" },
  pdf: { icon: "file-text", tone: "bg-red-500/15 text-red-600 dark:text-red-400" },
  text: { icon: "file-text", tone: "bg-slate-500/15 text-slate-600 dark:text-slate-300" },
  document: { icon: "file-text", tone: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  spreadsheet: { icon: "file-spreadsheet", tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  presentation: { icon: "presentation", tone: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  archive: { icon: "archive", tone: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400" },
  other: { icon: "file", tone: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400" },
};

const FILE_ICON_SIZE = {
  sm: { box: "size-8 rounded-lg", glyph: "size-4", stroke: 1.75 },
  md: { box: "size-10 rounded-xl", glyph: "size-5", stroke: 1.75 },
  lg: { box: "size-16 rounded-2xl", glyph: "size-8", stroke: 1.5 },
} as const;

export function FileIcon({ kind, size = "md" }: { kind: FileKind; size?: keyof typeof FILE_ICON_SIZE }) {
  const { icon, tone } = KIND_STYLE[kind];
  const s = FILE_ICON_SIZE[size];
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center ${s.box} ${tone}`}>
      <Icon name={icon} className={s.glyph} strokeWidth={s.stroke} />
    </span>
  );
}

// ---------------------------------------------------------- Rückmeldungen

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
