"use client";

import { useState } from "react";
import { thumbnailUrl } from "../lib/api";
import { KIND_ICON, fileKind, formatDate, formatSize, hasThumbnail, type FileItem } from "../lib/files";

export interface EntryHandlers {
  onOpen: (item: FileItem) => void;
  onToggle: (item: FileItem) => void;
  onDownload: (item: FileItem) => void;
  onRename: (item: FileItem) => void;
  onMove: (item: FileItem) => void;
  onDelete: (item: FileItem) => void;
  onDragStart: (event: React.DragEvent, item: FileItem) => void;
  onDragEnd: () => void;
  onDragOver: (event: React.DragEvent, item: FileItem) => void;
  onDragLeave: (event: React.DragEvent, item: FileItem) => void;
  onDrop: (event: React.DragEvent, item: FileItem) => void;
}

interface FileEntryProps extends EntryHandlers {
  item: FileItem;
  view: "list" | "grid";
  selected: boolean;
  dragging: boolean;
  dropTarget: boolean;
  thumbnails: boolean;
}

function Thumbnail({ item, enabled, className }: { item: FileItem; enabled: boolean; className: string }) {
  const [failed, setFailed] = useState(false);
  if (!enabled || failed || !hasThumbnail(item)) {
    return <span aria-hidden>{KIND_ICON[fileKind(item)]}</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Vorschaubilder kommen vom eigenen Server
    <img src={thumbnailUrl(item)} alt="" loading="lazy" onError={() => setFailed(true)} className={className} />
  );
}

function Actions({ item, className = "", ...h }: { item: FileItem; className?: string } & EntryHandlers) {
  const isDir = item.type === "directory";
  return (
    <div className={`flex shrink-0 items-center ${className}`}>
      <button onClick={() => h.onDownload(item)} className="icon-button" title={isDir ? "Als ZIP herunterladen" : "Herunterladen"}>
        ⬇️
      </button>
      <button onClick={() => h.onRename(item)} className="icon-button" title="Umbenennen">
        ✏️
      </button>
      <button onClick={() => h.onMove(item)} className="icon-button" title="Verschieben">
        📦
      </button>
      <button onClick={() => h.onDelete(item)} className="icon-button" title="In den Papierkorb">
        🗑️
      </button>
    </div>
  );
}

export default function FileEntry({ item, view, selected, dragging, dropTarget, thumbnails, ...handlers }: FileEntryProps) {
  const isDir = item.type === "directory";
  const meta = isDir ? formatDate(item.modified) : `${formatSize(item.size)} · ${formatDate(item.modified)}`;
  const highlight = dropTarget
    ? "ring-2 ring-green-500 bg-green-900/30"
    : selected
      ? "bg-blue-900/30"
      : "hover:bg-gray-800";

  const dragProps = {
    draggable: true,
    onDragStart: (e: React.DragEvent) => handlers.onDragStart(e, item),
    onDragEnd: handlers.onDragEnd,
    onDragOver: (e: React.DragEvent) => handlers.onDragOver(e, item),
    onDragLeave: (e: React.DragEvent) => handlers.onDragLeave(e, item),
    onDrop: (e: React.DragEvent) => handlers.onDrop(e, item),
  };

  const checkbox = (
    <input
      type="checkbox"
      checked={selected}
      onChange={() => handlers.onToggle(item)}
      aria-label={`${item.name} auswählen`}
      className="h-5 w-5 shrink-0 cursor-pointer accent-blue-500"
    />
  );

  if (view === "grid") {
    return (
      <li {...dragProps} className={`relative flex flex-col rounded-xl p-2 transition-colors ${highlight} ${dragging ? "opacity-40" : ""}`}>
        <div className="absolute left-3 top-3 z-10">{checkbox}</div>
        <button
          onClick={() => handlers.onOpen(item)}
          className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-black/30 text-5xl"
          title={item.name}
        >
          <Thumbnail item={item} enabled={thumbnails} className="h-full w-full object-cover" />
        </button>
        <p className="mt-2 truncate text-sm" title={item.name}>
          {item.name}
        </p>
        <p className="truncate text-xs text-gray-500">{isDir ? "Ordner" : formatSize(item.size)}</p>
        <Actions item={item} {...handlers} />
      </li>
    );
  }

  return (
    <li
      {...dragProps}
      className={`flex flex-wrap items-center gap-x-3 rounded-xl px-2 py-1.5 transition-colors sm:flex-nowrap ${highlight} ${dragging ? "opacity-40" : ""}`}
    >
      {checkbox}
      <button onClick={() => handlers.onOpen(item)} className="flex min-w-0 flex-1 basis-[calc(100%-2rem)] items-center gap-3 py-1 text-left sm:basis-auto">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg text-2xl">
          <Thumbnail item={item} enabled={thumbnails} className="h-10 w-10 rounded-lg object-cover" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-blue-400 hover:underline">{item.name}</span>
          <span className="block truncate text-xs text-gray-500">{dropTarget ? "Hier ablegen" : meta}</span>
        </span>
      </button>
      {/* Auf dem Handy in eigener Zeile unter dem Namen, damit der Name lesbar bleibt */}
      <Actions item={item} className="ml-auto sm:ml-0" {...handlers} />
    </li>
  );
}
