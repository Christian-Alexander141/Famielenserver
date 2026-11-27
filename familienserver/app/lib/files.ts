export interface FileItem {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  /** Unix-Zeitstempel in Sekunden */
  modified: number;
  /** Kleingeschrieben, ohne Punkt */
  extension: string;
}

export interface Listing {
  path: string;
  items: FileItem[];
}

export interface SessionInfo {
  authenticated: boolean;
  thumbnails: boolean;
  max_upload_bytes: number;
  trash_days: number;
}

export type FileKind =
  | "folder"
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "text"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "archive"
  | "other";

const KIND_BY_EXTENSION: Record<string, FileKind> = {};
const register = (kind: FileKind, extensions: string) =>
  extensions.split(" ").forEach((ext) => (KIND_BY_EXTENSION[ext] = kind));
register("image", "jpg jpeg png gif webp svg bmp heic heif tif tiff");
register("video", "mp4 mov m4v avi mkv webm ogv");
register("audio", "mp3 wav ogg m4a flac aac");
register("pdf", "pdf");
register("text", "txt md csv log json xml yml yaml ini conf");
register("document", "doc docx odt rtf pages");
register("spreadsheet", "xls xlsx ods numbers");
register("presentation", "ppt pptx odp key");
register("archive", "zip rar 7z tar gz bz2 xz");

export function fileKind(item: Pick<FileItem, "type" | "extension">): FileKind {
  if (item.type === "directory") return "folder";
  return KIND_BY_EXTENSION[item.extension] ?? "other";
}

/** Formate, die Browser direkt anzeigen können (muss zur Liste im Backend passen). */
const PREVIEWABLE = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "bmp",
  "mp4", "webm", "mov", "m4v", "ogv",
  "mp3", "m4a", "ogg", "wav", "flac", "aac",
  "pdf",
  "txt", "md", "csv", "log", "json", "xml", "yml", "yaml", "ini", "conf",
]);

export function canPreview(item: FileItem): boolean {
  return item.type === "file" && PREVIEWABLE.has(item.extension);
}

const THUMBNAIL_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp"]);

export function hasThumbnail(item: FileItem): boolean {
  return item.type === "file" && THUMBNAIL_EXTENSIONS.has(item.extension);
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toLocaleString("de-DE", { maximumFractionDigits: value < 10 ? 1 : 0 })} ${units[unit]}`;
}

export function formatDate(seconds: number): string {
  return new Date(seconds * 1000).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

export function parentPath(path: string): string {
  const index = path.lastIndexOf("/");
  return index === -1 ? "" : path.slice(0, index);
}

export function joinPath(dir: string, name: string): string {
  return dir ? `${dir}/${name}` : name;
}

/** Liegt `target` gleich `source` oder darin? (Ordner kann nicht in sich selbst verschoben werden) */
export function isSameOrInside(target: string, source: string): boolean {
  return target === source || target.startsWith(`${source}/`);
}

/** Prüft einen neuen Namen wie das Backend – für sofortiges Feedback im Dialog. */
export function nameProblem(name: string): string | null {
  if (!name.trim()) return "Bitte einen Namen eingeben";
  if (name !== name.trim()) return "Keine Leerzeichen am Anfang oder Ende";
  if (name.startsWith(".")) return "Der Name darf nicht mit einem Punkt beginnen";
  if (/[/\\]/.test(name)) return "Der Name darf keine Schrägstriche enthalten";
  return null;
}

// ------------------------------------------------------------- Drag & Drop

/** Eigener Datentyp für internes Verschieben – unterscheidet es von Dateien vom Desktop. */
export const DRAG_TYPE = "application/x-familienserver-paths";

export function isInternalDrag(event: React.DragEvent): boolean {
  return event.dataTransfer.types.includes(DRAG_TYPE);
}

export function isExternalFileDrag(event: React.DragEvent): boolean {
  return !isInternalDrag(event) && event.dataTransfer.types.includes("Files");
}

export function draggedPaths(event: React.DragEvent): string[] {
  try {
    const value = JSON.parse(event.dataTransfer.getData(DRAG_TYPE));
    return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}
