"use client";

import { useRef, useState } from "react";
import Icon from "./Icon";
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
  const target = currentPath ? currentPath.split("/").pop() : "Hauptordner";

  const onPicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      uploader.upload(entriesFromFileList(files), currentPath);
    }
    event.target.value = "";
  };

  const percent = state && state.bytesTotal > 0 ? Math.round((state.bytesDone / state.bytesTotal) * 100) : 0;
  const hasErrors = !!state && state.failed.length > 0;

  return (
    <section
      aria-labelledby="upload-title"
      onDragOver={(e) => {
        if (!isExternalFileDrag(e)) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false);
      }}
      onDrop={async (e) => {
        if (!isExternalFileDrag(e)) return;
        e.preventDefault();
        setDragOver(false);
        uploader.upload(await entriesFromDataTransfer(e.dataTransfer), currentPath);
      }}
      className={`card transition-colors ${dragOver ? "border-accent bg-accent/5 ring-2 ring-accent" : ""}`}
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent-text">
            <Icon name="cloud-upload" className="size-[22px]" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 id="upload-title" className="font-semibold">
              Hochladen
            </h2>
            <p className="text-sm text-muted">
              <span className="hidden pointer-fine:inline">{dragOver ? "Loslassen zum Hochladen in " : "Hierher ziehen oder auswählen · Ziel: "}</span>
              <span className="pointer-fine:hidden">Ziel: </span>
              <span className="inline-flex max-w-full items-center gap-1 align-bottom font-medium text-fg">
                <Icon name={currentPath ? "folder" : "house"} className="size-3.5 text-subtle" />
                <span className="truncate">{target}</span>
              </span>
            </p>
          </div>
        </div>
        <div className="grid gap-2 sm:flex">
          <button type="button" onClick={() => fileInput.current?.click()} className="btn btn-primary" disabled={state?.running}>
            <Icon name="upload" />
            Dateien auswählen
          </button>
          <button type="button" onClick={() => folderInput.current?.click()} className="btn btn-secondary" disabled={state?.running}>
            <Icon name="folder" />
            Ordner auswählen
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
        <div className="border-t border-line px-4 py-3.5 text-sm sm:px-5">
          <div className="mb-2 flex items-center gap-2.5">
            {state.running ? (
              <span className="spinner size-4 text-accent-text" />
            ) : hasErrors ? (
              <Icon name="triangle-alert" className="text-warning-text" />
            ) : (
              <Icon name="circle-check" className="text-success-text" />
            )}
            <span className="min-w-0 flex-1 truncate font-medium">
              {state.running ? (state.current ?? "…") : hasErrors ? "Upload abgeschlossen mit Fehlern" : "Upload abgeschlossen"}
            </span>
            <span className="shrink-0 tabular-nums text-muted">{percent} %</span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-surface-3"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Upload-Fortschritt"
          >
            <div
              className={`h-full rounded-full transition-[width] duration-300 ${
                state.running ? "bg-accent" : hasErrors ? "bg-warning" : "bg-success"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-2 text-xs tabular-nums text-subtle">
            {state.done} von {state.total} {state.total === 1 ? "Datei" : "Dateien"} · {formatSize(state.bytesDone)} von{" "}
            {formatSize(state.bytesTotal)}
          </p>
          {state.renamed.length > 0 && (
            <details className="mt-2 text-muted">
              <summary className="text-xs">{state.renamed.length} Datei(en) umbenannt, weil der Name schon vergeben war</summary>
              <ul className="mt-1 list-inside list-disc text-xs">
                {state.renamed.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </details>
          )}
          {state.failed.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-danger-text">
              {state.failed.map((f) => (
                <li key={f.name} className="flex items-start gap-1.5">
                  <Icon name="circle-x" className="mt-px size-3.5" />
                  <span className="min-w-0">
                    {f.name}: {f.error}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {!state.running && (
            <button type="button" onClick={uploader.dismiss} className="btn btn-ghost btn-sm -ml-3 mt-1.5">
              Ausblenden
            </button>
          )}
        </div>
      )}
    </section>
  );
}
