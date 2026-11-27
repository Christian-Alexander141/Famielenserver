"use client";

import { useCallback, useRef, useState } from "react";
import { ApiError, errorMessage, uploadFile } from "./api";
import { formatSize } from "./files";

export interface UploadEntry {
  file: File;
  /** Relativer Pfad inkl. Unterordnern bei Ordner-Uploads, z. B. "Urlaub/Tag 1/foto.jpg" */
  name: string;
}

export interface UploadState {
  running: boolean;
  total: number;
  done: number;
  bytesTotal: number;
  bytesDone: number;
  current: string | null;
  failed: { name: string; error: string }[];
  renamed: string[];
}

type Notify = (kind: "success" | "error" | "info", text: string) => void;

const isHiddenPath = (name: string) => name.split("/").some((part) => part.startsWith("."));

/** Dateien aus einem Drop-Ereignis holen – inklusive kompletter Ordner. */
export async function entriesFromDataTransfer(dataTransfer: DataTransfer): Promise<UploadEntry[]> {
  // Muss synchron passieren: nach dem ersten await ist das DataTransfer-Objekt leer.
  const roots = Array.from(dataTransfer.items)
    .map((item) => item.webkitGetAsEntry?.())
    .filter((entry): entry is FileSystemEntry => !!entry);
  const plainFiles = Array.from(dataTransfer.files);

  if (roots.length === 0) {
    return plainFiles.map((file) => ({ file, name: file.name }));
  }

  const result: UploadEntry[] = [];
  const walk = async (entry: FileSystemEntry, prefix: string): Promise<void> => {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
      result.push({ file, name: prefix + file.name });
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      // readEntries liefert große Ordner in Portionen
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
        if (batch.length === 0) break;
        for (const child of batch) {
          await walk(child, `${prefix}${entry.name}/`);
        }
      }
    }
  };
  for (const root of roots) {
    await walk(root, "");
  }
  return result;
}

export function entriesFromFileList(files: FileList): UploadEntry[] {
  return Array.from(files).map((file) => ({ file, name: file.webkitRelativePath || file.name }));
}

/** Lädt Dateien nacheinander hoch. Nacheinander statt parallel schont den Raspberry Pi
 *  und ergibt einen ehrlichen Fortschrittsbalken. */
export function useUploader(maxBytes: number, onUploaded: () => void, notify: Notify) {
  const [state, setState] = useState<UploadState | null>(null);
  const running = useRef(false);

  const upload = useCallback(
    async (entries: UploadEntry[], dir: string) => {
      if (running.current) {
        notify("info", "Es läuft bereits ein Upload – bitte kurz warten.");
        return;
      }
      const visible = entries.filter((e) => !isHiddenPath(e.name));
      if (visible.length === 0) return;

      running.current = true;
      const failed: UploadState["failed"] = [];
      const renamed: string[] = [];
      const bytesTotal = visible.reduce((sum, e) => sum + e.file.size, 0);
      let bytesDone = 0;
      setState({ running: true, total: visible.length, done: 0, bytesTotal, bytesDone: 0, current: null, failed, renamed });

      for (const [index, entry] of visible.entries()) {
        setState((s) => s && { ...s, current: entry.name });
        try {
          if (entry.file.size > maxBytes) {
            throw new ApiError(`Datei ist zu groß (maximal ${formatSize(maxBytes)})`, 413);
          }
          const result = await uploadFile(entry.file, entry.name, dir, (loaded) =>
            setState((s) => s && { ...s, bytesDone: bytesDone + loaded }),
          );
          if (result.renamed) renamed.push(`${entry.name} → ${result.name}`);
        } catch (error) {
          failed.push({ name: entry.name, error: errorMessage(error) });
          if (error instanceof ApiError && (error.status === 401 || error.status === 0)) break;
        }
        bytesDone += entry.file.size;
        setState((s) => s && { ...s, done: index + 1, bytesDone, failed: [...failed], renamed: [...renamed] });
      }

      running.current = false;
      setState((s) => s && { ...s, running: false, current: null });
      onUploaded();
      const ok = visible.length - failed.length;
      if (failed.length === 0) {
        notify("success", ok === 1 ? "Datei hochgeladen" : `${ok} Dateien hochgeladen`);
      } else {
        notify("error", `${failed.length} von ${visible.length} Dateien konnten nicht hochgeladen werden`);
      }
    },
    [maxBytes, onUploaded, notify],
  );

  const dismiss = useCallback(() => setState(null), []);

  return { state, upload, dismiss };
}

export type Uploader = ReturnType<typeof useUploader>;
