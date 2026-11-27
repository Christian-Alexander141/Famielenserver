"use client";

import { useState } from "react";
import ActionMenu, { type MenuItem } from "./ActionMenu";
import Icon from "./Icon";
import { FileIcon } from "./ui";
import { thumbnailUrl } from "../lib/api";
import { fileKind, formatDate, formatSize, hasThumbnail, type FileItem } from "../lib/files";

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

function Thumbnail({ item, enabled, size }: { item: FileItem; enabled: boolean; size: "md" | "lg" }) {
  const [failed, setFailed] = useState(false);
  if (!enabled || failed || !hasThumbnail(item)) {
    return <FileIcon kind={fileKind(item)} size={size} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Vorschaubilder kommen vom eigenen Server
    <img
      src={thumbnailUrl(item)}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={size === "lg" ? "absolute inset-0 h-full w-full object-cover" : "size-10 shrink-0 rounded-xl object-cover"}
    />
  );
}

function actionsFor(item: FileItem, h: EntryHandlers): MenuItem[] {
  return [
    {
      label: item.type === "directory" ? "Als ZIP herunterladen" : "Herunterladen",
      icon: "download",
      onSelect: () => h.onDownload(item),
    },
    { label: "Umbenennen", icon: "pencil", onSelect: () => h.onRename(item) },
    { label: "Verschieben", icon: "folder-input", onSelect: () => h.onMove(item) },
    { label: "In den Papierkorb", icon: "trash", onSelect: () => h.onDelete(item), danger: true },
  ];
}

/** Am PC: Symbol-Schaltflächen in der Zeile, sichtbar beim Überfahren oder bei Auswahl. */
function InlineActions({ actions, name }: { actions: MenuItem[]; name: string }) {
  return (
    <div className="reveal hidden shrink-0 items-center sm:flex">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={action.onSelect}
          className={`icon-btn ${action.danger ? "icon-btn-danger" : ""}`}
          title={action.label}
          aria-label={`${action.label}: ${name}`}
        >
          <Icon name={action.icon} />
        </button>
      ))}
    </div>
  );
}

export default function FileEntry({ item, view, selected, dragging, dropTarget, thumbnails, ...handlers }: FileEntryProps) {
  const isDir = item.type === "directory";
  const actions = actionsFor(item, handlers);
  const menuLabel = `Aktionen für ${item.name}`;

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
      className="checkbox"
    />
  );

  if (view === "grid") {
    const tone = dropTarget
      ? "border-accent bg-accent/10 ring-2 ring-accent"
      : selected
        ? "border-accent bg-accent/5 ring-1 ring-accent"
        : "border-line bg-surface hover:border-line-strong hover:shadow-[var(--shadow-md)]";
    return (
      <li
        {...dragProps}
        data-active={selected || dropTarget}
        className={`group relative flex flex-col rounded-2xl border p-1.5 transition ${tone} ${dragging ? "opacity-40" : ""}`}
      >
        <button
          type="button"
          onClick={() => handlers.onOpen(item)}
          className="relative grid aspect-square w-full place-items-center overflow-hidden rounded-xl bg-surface-2"
          title={item.name}
        >
          <Thumbnail item={item} enabled={thumbnails} size="lg" />
        </button>
        <label className="reveal-check absolute left-3 top-3 grid size-8 place-items-center rounded-lg bg-surface/90 shadow-[var(--shadow-sm)] backdrop-blur">
          {checkbox}
        </label>
        <div className="flex items-center gap-1 pb-0.5 pl-1.5 pt-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" title={item.name}>
              {item.name}
            </p>
            <p className="truncate text-xs text-subtle">{dropTarget ? "Hier ablegen" : isDir ? "Ordner" : formatSize(item.size)}</p>
          </div>
          <ActionMenu label={menuLabel} items={actions} className="size-8" />
        </div>
      </li>
    );
  }

  const tone = dropTarget ? "bg-accent/10 ring-2 ring-inset ring-accent" : selected ? "bg-accent/8" : "hover:bg-fg/4";
  const meta = dropTarget
    ? "Hier ablegen"
    : isDir
      ? formatDate(item.modified)
      : `${formatSize(item.size)} · ${formatDate(item.modified)}`;

  return (
    <li
      {...dragProps}
      data-active={selected || dropTarget}
      className={`group flex items-center rounded-xl pr-1 transition-colors ${tone} ${dragging ? "opacity-40" : ""}`}
    >
      <label className="grid w-11 shrink-0 place-items-center self-stretch">{checkbox}</label>
      <button
        type="button"
        onClick={() => handlers.onOpen(item)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-2 pr-2 text-left"
      >
        <Thumbnail item={item} enabled={thumbnails} size="md" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{item.name}</span>
          <span className={`block truncate text-xs ${dropTarget ? "text-accent-text" : "text-subtle"}`}>{meta}</span>
        </span>
      </button>
      <InlineActions actions={actions} name={item.name} />
      {/* Auf dem Handy ein Menü statt vier Symbole – so bleibt der Name lesbar */}
      <ActionMenu label={menuLabel} items={actions} className="sm:hidden" />
    </li>
  );
}
