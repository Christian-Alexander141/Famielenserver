"use client";

import { useRef, useState } from "react";
import { entriesFromDataTransfer, entriesFromFileList, type Uploader } from "../lib/useUploader";
import { formatSize, isExternalFileDrag } from "../lib/files";

interface FileUploadProps {
  uploader: Uploader;
  currentPath: string;
}

export default function FileUpload({ uploader, currentPath }: FileUploadProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const { state } = uploader;
  const target = currentPath ? `„${currentPath.split("/").pop()}“` : "den Hauptordner";

  const onPicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      uploader.upload(entriesFromFileList(files), currentPath);
    }
    event.target.value = "";
  };

  const percent = state && state.bytesTotal > 0 ? Math.round((state.bytesDone / state.bytesTotal) * 100) : 0;

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          if (!isExternalFileDrag(e)) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={async (e) => {
          if (!isExternalFileDrag(e)) return;
          e.preventDefault();
          setDragOver(false);
          uploader.upload(await entriesFromDataTransfer(e.dataTransfer), currentPath);
        }}
        className={`rounded-xl border-2 border-dashed p-4 text-center transition-colors ${
          dragOver ? "border-blue-500 bg-blue-950/40" : "border-gray-700"
        }`}
      >
        <p className="mb-3 text-sm text-gray-400">
          Dateien oder Ordner hierher ziehen – sie landen in <span className="text-white">{target}</span>.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={() => fileInput.current?.click()} className="ios-button" disabled={state?.running}>
            📄 Dateien auswählen
          </button>
          <button onClick={() => folderInput.current?.click()} className="ios-button ios-button-secondary" disabled={state?.running}>
            📁 Ordner auswählen
          </button>
        </div>
        <input ref={fileInput} type="file" multiple hidden onChange={onPicked} />
        <input
          ref={folderInput}
          type="file"
          hidden
          onChange={onPicked}
          // webkitdirectory erlaubt die Auswahl ganzer Ordner (alle aktuellen Browser)
          {...{ webkitdirectory: "", directory: "" }}
        />
      </div>

      {state && (
        <div className="rounded-xl bg-gray-800 p-3 text-sm">
          <div className="mb-2 flex justify-between gap-2">
            <span className="truncate">
              {state.running ? `⬆️ ${state.current ?? "…"}` : state.failed.length ? "⚠️ Upload abgeschlossen mit Fehlern" : "✅ Upload abgeschlossen"}
            </span>
            <span className="shrink-0 text-gray-400">
              {state.done}/{state.total} · {formatSize(state.bytesDone)} von {formatSize(state.bytesTotal)}
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-gray-700"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Upload-Fortschritt"
          >
            <div className="h-full bg-blue-500 transition-[width]" style={{ width: `${percent}%` }} />
          </div>
          {state.renamed.length > 0 && (
            <details className="mt-2 text-gray-400">
              <summary className="cursor-pointer">{state.renamed.length} Datei(en) umbenannt, weil der Name schon vergeben war</summary>
              <ul className="mt-1 list-inside list-disc text-xs">
                {state.renamed.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </details>
          )}
          {state.failed.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-red-400">
              {state.failed.map((f) => (
                <li key={f.name}>
                  ❌ {f.name}: {f.error}
                </li>
              ))}
            </ul>
          )}
          {!state.running && (
            <button onClick={uploader.dismiss} className="mt-2 text-xs text-gray-400 hover:text-white">
              Ausblenden
            </button>
          )}
        </div>
      )}
    </div>
  );
}
