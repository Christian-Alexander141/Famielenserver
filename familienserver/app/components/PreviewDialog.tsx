"use client";

import { useEffect, useState } from "react";
import Dialog from "./Dialog";
import { downloadUrl, errorMessage, startDownload } from "../lib/api";
import { fileKind, formatDate, formatSize, type FileItem } from "../lib/files";

interface PreviewDialogProps {
  items: FileItem[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

const MAX_TEXT_PREVIEW = 200_000;

function TextPreview({ item }: { item: FileItem }) {
  const [state, setState] = useState<{ path: string; text?: string; error?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(downloadUrl(item.path, true), { credentials: "same-origin" })
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(`Fehler ${res.status}`))))
      .then((text) => {
        if (!cancelled) setState({ path: item.path, text });
      })
      .catch((err) => {
        if (!cancelled) setState({ path: item.path, error: errorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [item.path]);

  if (!state || state.path !== item.path) return <p className="text-gray-400">Lade …</p>;
  if (state.error) return <p className="text-red-400">❌ {state.error}</p>;
  const text = state.text ?? "";
  return (
    <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-xl bg-black/40 p-4 text-sm text-gray-200">
      {text.length > MAX_TEXT_PREVIEW ? `${text.slice(0, MAX_TEXT_PREVIEW)}\n\n… (gekürzt)` : text}
    </pre>
  );
}

/** Vorschau für Bilder, Videos, Musik, PDFs und Textdateien – mit Blättern (← →). */
export default function PreviewDialog({ items, index, onIndexChange, onClose }: PreviewDialogProps) {
  const item = items[index];
  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "VIDEO", "AUDIO"].includes(event.target.tagName)) return;
      if (event.key === "ArrowLeft" && hasPrev) onIndexChange(index - 1);
      if (event.key === "ArrowRight" && hasNext) onIndexChange(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, hasPrev, hasNext, onIndexChange]);

  if (!item) return null;
  const kind = fileKind(item);
  const src = downloadUrl(item.path, true);

  return (
    <Dialog title={item.name} onClose={onClose} wide>
      <div className="relative flex min-h-[40vh] items-center justify-center">
        {kind === "image" && (
          // eslint-disable-next-line @next/next/no-img-element -- Bilder kommen vom eigenen Server, next/image geht im statischen Export nicht
          <img key={item.path} src={src} alt={item.name} className="max-h-[70vh] max-w-full rounded-lg object-contain" />
        )}
        {kind === "video" && (
          <video key={item.path} src={src} controls autoPlay className="max-h-[70vh] max-w-full rounded-lg" />
        )}
        {kind === "audio" && <audio key={item.path} src={src} controls autoPlay className="w-full" />}
        {kind === "pdf" && <iframe key={item.path} src={src} title={item.name} className="h-[70vh] w-full rounded-lg bg-white" />}
        {kind === "text" && (
          <div className="w-full">
            <TextPreview item={item} />
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => onIndexChange(index - 1)} disabled={!hasPrev} className="ios-button ios-button-secondary">
          ← Zurück
        </button>
        <div className="text-center text-xs text-gray-400">
          {formatSize(item.size)} · {formatDate(item.modified)}
          {items.length > 1 && ` · ${index + 1} von ${items.length}`}
        </div>
        <div className="flex gap-2">
          <button onClick={() => startDownload(downloadUrl(item.path))} className="ios-button ios-button-secondary">
            ⬇️ Herunterladen
          </button>
          <button onClick={() => onIndexChange(index + 1)} disabled={!hasNext} className="ios-button ios-button-secondary">
            Weiter →
          </button>
        </div>
      </div>
    </Dialog>
  );
}
