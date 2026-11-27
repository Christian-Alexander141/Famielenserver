import Icon, { type IconName } from "../ui/Icon";
import type { FileKind } from "../../lib/files";

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

const SIZES = {
  sm: { box: "size-8 rounded-lg", glyph: "size-4", stroke: 1.75 },
  md: { box: "size-10 rounded-xl", glyph: "size-5", stroke: 1.75 },
  lg: { box: "size-16 rounded-2xl", glyph: "size-8", stroke: 1.5 },
} as const;

export default function FileIcon({ kind, size = "md" }: { kind: FileKind; size?: keyof typeof SIZES }) {
  const { icon, tone } = KIND_STYLE[kind];
  const s = SIZES[size];
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center ${s.box} ${tone}`}>
      <Icon name={icon} className={s.glyph} strokeWidth={s.stroke} />
    </span>
  );
}
