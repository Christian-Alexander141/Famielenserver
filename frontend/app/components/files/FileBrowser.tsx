"use client";

import { useCallback, useMemo, useState } from "react";
import Breadcrumbs from "./Breadcrumbs";
import FileEntry, { type EntryHandlers } from "./FileEntry";
import PreviewDialog from "./PreviewDialog";
import { MoveDialog, NameDialog } from "./dialogs";
import ConfirmDialog from "../ui/ConfirmDialog";
import Icon from "../ui/Icon";
import { useToast } from "../ui/Toast";
import { EmptyState, ErrorText, Loading } from "../ui/feedback";
import { apiPost, downloadUrl, errorMessage, startDownload, zipUrl } from "../../lib/api";
import {
  DRAG_TYPE,
  canPreview,
  draggedPaths,
  isExternalFileDrag,
  isInternalDrag,
  isSameOrInside,
  type FileItem,
} from "../../lib/files";

export type SortKey = "name" | "modified" | "size";
export interface SortState {
  key: SortKey;
  descending: boolean;
}
export type ViewMode = "list" | "grid";

type DialogState =
  | { type: "mkdir" }
  | { type: "rename"; item: FileItem }
  | { type: "move"; paths: string[] }
  | { type: "delete"; paths: string[] }
  | { type: "preview"; index: number }
  | null;

interface FileBrowserProps {
  path: string;
  items: FileItem[] | null;
  error: string | null;
  thumbnails: boolean;
  trashDays: number;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  onNavigate: (path: string) => void;
  onChanged: () => void;
  onExternalDrop: (dataTransfer: DataTransfer, dir: string) => void;
}

const collator = new Intl.Collator("de", { numeric: true, sensitivity: "base" });

/** Führt eine Aktion für mehrere Pfade nacheinander aus und sammelt Fehler. */
async function forEachPath(paths: string[], action: (path: string) => Promise<unknown>): Promise<string[]> {
  const errors: string[] = [];
  for (const p of paths) {
    try {
      await action(p);
    } catch (err) {
      errors.push(`${p.split("/").pop()}: ${errorMessage(err)}`);
    }
  }
  return errors;
}

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
  { value: "modified-desc", label: "Neueste zuerst" },
  { value: "modified-asc", label: "Älteste zuerst" },
  { value: "size-desc", label: "Größte zuerst" },
  { value: "size-asc", label: "Kleinste zuerst" },
];

export default function FileBrowser(props: FileBrowserProps) {
  const { path, items, error, thumbnails, trashDays, view, sort, onNavigate, onChanged, onExternalDrop } = props;
  const notify = useToast();
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [dialog, setDialog] = useState<DialogState>(null);
  const [dragging, setDragging] = useState<string[] | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [zoneActive, setZoneActive] = useState(false);

  const visible = useMemo(() => {
    const needle = filter.trim().toLocaleLowerCase("de");
    const list = (items ?? []).filter((i) => !needle || i.name.toLocaleLowerCase("de").includes(needle));
    const direction = sort.descending ? -1 : 1;
    return list.sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      let result = 0;
      if (sort.key === "modified") result = a.modified - b.modified;
      if (sort.key === "size") result = a.size - b.size;
      if (result === 0) result = collator.compare(a.name, b.name);
      return result * direction;
    });
  }, [items, filter, sort]);

  const previewItems = useMemo(() => visible.filter(canPreview), [visible]);
  const selectedPaths = visible.filter((i) => selected.has(i.path)).map((i) => i.path);
  const clearSelection = () => setSelected(new Set());

  const finish = useCallback(
    (errors: string[], success: string) => {
      if (errors.length) notify("error", errors.join(" · "));
      else notify("success", success);
      setSelected(new Set());
      onChanged();
    },
    [notify, onChanged],
  );

  const movePaths = useCallback(
    async (paths: string[], destination: string) => {
      const errors = await forEachPath(paths, (p) => apiPost("/api/move", { path: p, destination }));
      const target = destination ? `„${destination.split("/").pop()}“` : "den Hauptordner";
      finish(errors, paths.length === 1 ? `Nach ${target} verschoben` : `${paths.length} Elemente nach ${target} verschoben`);
      if (errors.length === paths.length) throw new Error(errors[0]);
    },
    [finish],
  );

  const deletePaths = async (paths: string[]) => {
    const errors = await forEachPath(paths, (p) => apiPost("/api/delete", { path: p }));
    finish(errors, paths.length === 1 ? "In den Papierkorb verschoben" : `${paths.length} Elemente in den Papierkorb verschoben`);
    if (errors.length === paths.length) throw new Error(errors[0]);
  };

  // ---------------------------------------------------------- Drag & Drop

  const canDropInto = (folder: FileItem) =>
    folder.type === "directory" && !!dragging && !dragging.some((p) => isSameOrInside(folder.path, p));

  const handlers: EntryHandlers = {
    onOpen: (item) => {
      if (item.type === "directory") onNavigate(item.path);
      else if (canPreview(item)) setDialog({ type: "preview", index: previewItems.indexOf(item) });
      else startDownload(downloadUrl(item.path));
    },
    onToggle: (item) =>
      setSelected((current) => {
        const next = new Set(current);
        if (next.has(item.path)) next.delete(item.path);
        else next.add(item.path);
        return next;
      }),
    onDownload: (item) => startDownload(item.type === "directory" ? zipUrl([item.path]) : downloadUrl(item.path)),
    onRename: (item) => setDialog({ type: "rename", item }),
    onMove: (item) => setDialog({ type: "move", paths: [item.path] }),
    onDelete: (item) => setDialog({ type: "delete", paths: [item.path] }),
    onDragStart: (event, item) => {
      const paths = selected.has(item.path) ? selectedPaths : [item.path];
      event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(paths));
      event.dataTransfer.effectAllowed = "move";
      setDragging(paths);
    },
    onDragEnd: () => {
      setDragging(null);
      setDropTarget(null);
    },
    onDragOver: (event, item) => {
      if (item.type !== "directory") return;
      if ((isInternalDrag(event) && canDropInto(item)) || isExternalFileDrag(event)) {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = isInternalDrag(event) ? "move" : "copy";
        setDropTarget(item.path);
        setZoneActive(false);
      }
    },
    onDragLeave: (event, item) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null) && dropTarget === item.path) {
        setDropTarget(null);
      }
    },
    onDrop: (event, item) => {
      if (item.type !== "directory") return;
      event.preventDefault();
      event.stopPropagation();
      setDropTarget(null);
      setZoneActive(false);
      if (isInternalDrag(event)) {
        const paths = draggedPaths(event).filter((p) => !isSameOrInside(item.path, p));
        setDragging(null);
        if (paths.length) movePaths(paths, item.path).catch(() => {});
      } else if (isExternalFileDrag(event)) {
        onExternalDrop(event.dataTransfer, item.path);
      }
    },
  };

  // Dateien vom Desktop auf die Liste ziehen = in den aktuellen Ordner hochladen
  const zoneProps = {
    onDragOver: (event: React.DragEvent) => {
      if (!isExternalFileDrag(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setZoneActive(true);
    },
    onDragLeave: (event: React.DragEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setZoneActive(false);
    },
    onDrop: (event: React.DragEvent) => {
      if (!isExternalFileDrag(event)) return;
      event.preventDefault();
      setZoneActive(false);
      onExternalDrop(event.dataTransfer, path);
    },
  };

  // --------------------------------------------------------------- Ansicht

  const selecting = selectedPaths.length > 0;
  const allSelected = visible.length > 0 && selectedPaths.length === visible.length;
  const folderName = path ? `„${path.split("/").pop()}“` : "den Hauptordner";

  let content: React.ReactNode;
  if (error) {
    content = (
      <div className="flex flex-col items-center gap-4 px-4 py-10 text-center">
        <ErrorText>{error}</ErrorText>
        <button type="button" onClick={() => onNavigate("")} className="btn btn-secondary">
          <Icon name="house" />
          Zum Hauptordner
        </button>
      </div>
    );
  } else if (items === null) {
    content = <Loading className="py-12">Lade Dateien …</Loading>;
  } else if (visible.length === 0) {
    content =
      items.length === 0 ? (
        <EmptyState icon="folder-open" title="Dieser Ordner ist leer">
          Nutze „Hochladen“ oben oder ziehe Dateien hierher.
        </EmptyState>
      ) : (
        <EmptyState icon="search" title={`Nichts gefunden für „${filter}“`}>
          <button type="button" onClick={() => setFilter("")} className="btn btn-secondary btn-sm mt-2">
            Filter zurücksetzen
          </button>
        </EmptyState>
      );
  } else {
    content = (
      <ul
        data-selecting={selecting}
        className={view === "grid" ? "grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 sm:p-4 md:grid-cols-4" : "flex flex-col gap-0.5 p-1.5 sm:p-2"}
      >
        {visible.map((item) => (
          <FileEntry
            key={item.path}
            item={item}
            view={view}
            selected={selected.has(item.path)}
            dragging={!!dragging?.includes(item.path)}
            dropTarget={dropTarget === item.path}
            thumbnails={thumbnails}
            {...handlers}
          />
        ))}
      </ul>
    );
  }

  return (
    <section {...zoneProps} aria-labelledby="files-title" className="card relative">
      {zoneActive && (
        <div className="pointer-events-none absolute inset-0 z-30 flex justify-center rounded-2xl border-2 border-dashed border-accent bg-surface/85 backdrop-blur-sm">
          <div className="sticky top-[40vh] mt-16 flex h-fit flex-col items-center gap-2 px-4 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-accent/15 text-accent-text">
              <Icon name="upload" className="size-6" />
            </span>
            <p className="font-medium">Loslassen zum Hochladen</p>
            <p className="text-sm text-muted">in {folderName}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <h2 id="files-title" className="text-lg font-semibold tracking-tight">
            Dateien
          </h2>
          {items && !error && (
            <span
              className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium tabular-nums text-muted"
              title={`${items.length} ${items.length === 1 ? "Element" : "Elemente"}`}
            >
              {items.length}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1">
            <button type="button" onClick={onChanged} className="icon-btn" title="Aktualisieren" aria-label="Aktualisieren">
              <Icon name="refresh" />
            </button>
            <button type="button" onClick={() => setDialog({ type: "mkdir" })} className="btn btn-secondary btn-sm" disabled={!!error}>
              <Icon name="folder-plus" />
              Neuer Ordner
            </button>
          </div>
        </div>

        <Breadcrumbs
          path={path}
          dragging={dragging}
          onNavigate={onNavigate}
          onMove={(paths, dest) => movePaths(paths, dest).catch(() => {})}
          onExternalDrop={onExternalDrop}
          onDragDone={() => setDragging(null)}
        />

        {/* Werkzeugleiste */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 basis-56">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="In diesem Ordner filtern …"
              className="input pl-9"
              aria-label="Filter"
            />
          </div>
          <div className="relative">
            <select
              value={`${sort.key}-${sort.descending ? "desc" : "asc"}`}
              onChange={(e) => {
                const [key, dir] = e.target.value.split("-");
                props.onSortChange({ key: key as SortKey, descending: dir === "desc" });
              }}
              className="input w-auto"
              aria-label="Sortierung"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Icon name="chevron-down" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-subtle" />
          </div>
          <div className="flex h-10 items-center gap-0.5 rounded-xl bg-surface-2 p-1" role="group" aria-label="Ansicht">
            {(["list", "grid"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => props.onViewChange(mode)}
                aria-pressed={view === mode}
                title={mode === "list" ? "Liste" : "Kacheln"}
                className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors ${
                  view === mode ? "bg-surface text-fg shadow-[var(--shadow-sm)]" : "text-muted hover:text-fg"
                }`}
              >
                <Icon name={mode} />
                <span className="sr-only sm:not-sr-only">{mode === "list" ? "Liste" : "Kacheln"}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Auswahl-Leiste – bleibt beim Scrollen sichtbar, sobald etwas ausgewählt ist */}
      {visible.length > 0 && (
        <div
          className={`flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2 border-y border-line py-2 pl-[1.1875rem] pr-3 sm:pl-[1.3125rem] sm:pr-4 ${
            selecting ? "sticky top-14 z-20 bg-surface" : ""
          }`}
        >
          <label className="flex items-center gap-3 text-sm text-muted">
            <input
              type="checkbox"
              ref={(el) => {
                if (el) el.indeterminate = selecting && !allSelected;
              }}
              checked={allSelected}
              onChange={() => setSelected(allSelected ? new Set() : new Set(visible.map((i) => i.path)))}
              className="checkbox"
            />
            {selecting ? <span className="font-medium text-fg">{selectedPaths.length} ausgewählt</span> : "Alle auswählen"}
          </label>
          {selecting && (
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <button type="button" onClick={() => startDownload(zipUrl(selectedPaths))} className="btn btn-secondary btn-sm">
                <Icon name="download" />
                Als ZIP
              </button>
              <button type="button" onClick={() => setDialog({ type: "move", paths: selectedPaths })} className="btn btn-secondary btn-sm">
                <Icon name="folder-input" />
                Verschieben
              </button>
              <button type="button" onClick={() => setDialog({ type: "delete", paths: selectedPaths })} className="btn btn-danger-soft btn-sm">
                <Icon name="trash" />
                Löschen
              </button>
              <button type="button" onClick={clearSelection} className="icon-btn size-8" title="Auswahl aufheben" aria-label="Auswahl aufheben">
                <Icon name="x" />
              </button>
            </div>
          )}
        </div>
      )}

      {content}

      {visible.length > 0 && (
        <p className="hidden items-center gap-2 border-t border-line px-5 py-3 text-xs text-subtle pointer-fine:flex">
          <Icon name="info" className="size-3.5" />
          Tipp: Dateien und Ordner per Drag &amp; Drop auf einen Ordner oder in die Pfadleiste ziehen, um sie zu verschieben.
        </p>
      )}

      {/* Dialoge */}
      {dialog?.type === "mkdir" && (
        <NameDialog
          title="Neuer Ordner"
          confirmLabel="Erstellen"
          onClose={() => setDialog(null)}
          onSubmit={async (name) => {
            await apiPost("/api/mkdir", { parent: path, name });
            notify("success", `Ordner „${name}“ erstellt`);
            onChanged();
          }}
        />
      )}
      {dialog?.type === "rename" && (
        <NameDialog
          title={`„${dialog.item.name}“ umbenennen`}
          initial={dialog.item.name}
          selectStem={dialog.item.type === "file"}
          confirmLabel="Umbenennen"
          onClose={() => setDialog(null)}
          onSubmit={async (name) => {
            if (name === dialog.item.name) return;
            await apiPost("/api/rename", { path: dialog.item.path, name });
            notify("success", `Umbenannt in „${name}“`);
            onChanged();
          }}
        />
      )}
      {dialog?.type === "move" && (
        <MoveDialog paths={dialog.paths} startPath={path} onClose={() => setDialog(null)} onMove={(dest) => movePaths(dialog.paths, dest)} />
      )}
      {dialog?.type === "delete" && (
        <ConfirmDialog
          title="In den Papierkorb verschieben?"
          message={
            <>
              {dialog.paths.length === 1 ? (
                <p>
                  <strong className="font-semibold text-fg">{dialog.paths[0].split("/").pop()}</strong> wird in den Papierkorb verschoben.
                </p>
              ) : (
                <p>
                  <strong className="font-semibold text-fg">{dialog.paths.length} Elemente</strong> werden in den Papierkorb verschoben.
                </p>
              )}
              <p className="mt-2">
                {trashDays > 0
                  ? `Du kannst sie dort ${trashDays} Tage lang wiederherstellen.`
                  : "Du kannst sie dort wiederherstellen, bis der Papierkorb geleert wird."}
              </p>
            </>
          }
          confirmLabel="Löschen"
          danger
          onClose={() => setDialog(null)}
          onConfirm={() => deletePaths(dialog.paths)}
        />
      )}
      {dialog?.type === "preview" && (
        <PreviewDialog
          items={previewItems}
          index={dialog.index}
          onIndexChange={(index) => setDialog({ type: "preview", index })}
          onClose={() => setDialog(null)}
        />
      )}
    </section>
  );
}
