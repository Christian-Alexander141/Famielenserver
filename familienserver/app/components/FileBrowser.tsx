"use client";

import { useCallback, useMemo, useState } from "react";
import FileEntry, { type EntryHandlers } from "./FileEntry";
import PreviewDialog from "./PreviewDialog";
import { ConfirmDialog, MoveDialog, NameDialog } from "./dialogs";
import { useToast } from "./Toast";
import { apiPost, downloadUrl, errorMessage, startDownload, zipUrl } from "../lib/api";
import {
  DRAG_TYPE,
  canPreview,
  draggedPaths,
  isExternalFileDrag,
  isInternalDrag,
  isSameOrInside,
  type FileItem,
} from "../lib/files";

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

interface BreadcrumbsProps {
  path: string;
  dragging: string[] | null;
  onNavigate: (path: string) => void;
  onMove: (paths: string[], destination: string) => void;
  onExternalDrop: (dataTransfer: DataTransfer, dir: string) => void;
  onDragDone: () => void;
}

/** Pfadleiste – jedes Element ist auch ein Ablageziel für Drag & Drop. */
function Breadcrumbs({ path, dragging, onNavigate, onMove, onExternalDrop, onDragDone }: BreadcrumbsProps) {
  const [over, setOver] = useState<string | null>(null);
  const parts = path ? path.split("/") : [];
  const crumbs = [{ label: "🏠 Hauptordner", target: "" }, ...parts.map((part, i) => ({ label: part, target: parts.slice(0, i + 1).join("/") }))];
  const valid = (target: string) => !!dragging && target !== path && !dragging.some((p) => isSameOrInside(target, p));

  return (
    <nav aria-label="Pfad" className="mb-3 flex flex-wrap items-center gap-1 text-sm">
      {crumbs.map((crumb, i) => (
        <span key={crumb.target} className="flex items-center gap-1">
          {i > 0 && <span className="text-gray-600">/</span>}
          <button
            onClick={() => onNavigate(crumb.target)}
            disabled={crumb.target === path}
            className={`rounded-lg px-2 py-1 ${crumb.target === path ? "font-medium text-white" : "text-blue-400 hover:bg-gray-800"} ${
              over === crumb.target ? "ring-2 ring-green-500" : ""
            }`}
            onDragOver={(e) => {
              if ((isInternalDrag(e) && valid(crumb.target)) || (isExternalFileDrag(e) && crumb.target !== path)) {
                e.preventDefault();
                e.stopPropagation();
                setOver(crumb.target);
              }
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOver(null);
              if (isInternalDrag(e)) {
                const paths = draggedPaths(e).filter((p) => !isSameOrInside(crumb.target, p));
                onDragDone();
                if (paths.length) onMove(paths, crumb.target);
              } else if (isExternalFileDrag(e)) {
                onExternalDrop(e.dataTransfer, crumb.target);
              }
            }}
          >
            {crumb.label}
          </button>
        </span>
      ))}
      {path && (
        <button onClick={() => onNavigate(parts.slice(0, -1).join("/"))} className="ml-auto rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-800 hover:text-white">
          ← Zurück
        </button>
      )}
    </nav>
  );
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

  const allSelected = visible.length > 0 && selectedPaths.length === visible.length;

  let content: React.ReactNode;
  if (error) {
    content = (
      <div className="py-6 text-center">
        <p className="mb-3 text-red-400">❌ {error}</p>
        <button onClick={() => onNavigate("")} className="ios-button">
          🏠 Zum Hauptordner
        </button>
      </div>
    );
  } else if (items === null) {
    content = (
      <div className="py-6 text-center text-gray-400">
        <div className="loading-spinner mx-auto mb-2" />
        Lade Dateien …
      </div>
    );
  } else if (visible.length === 0) {
    content = (
      <p className="py-8 text-center italic text-gray-500">
        {items.length === 0
          ? "Dieser Ordner ist leer. Ziehe Dateien hierher oder nutze „Hochladen“."
          : `Nichts gefunden für „${filter}“.`}
      </p>
    );
  } else {
    content = (
      <ul className={view === "grid" ? "grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4" : "space-y-1"}>
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
    <div {...zoneProps} className={`relative rounded-xl ${zoneActive ? "ring-2 ring-blue-500" : ""}`}>
      {zoneActive && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-blue-950/80 text-blue-200">
          ⬆️ Loslassen zum Hochladen nach {path ? `„${path.split("/").pop()}“` : "Hauptordner"}
        </div>
      )}

      <Breadcrumbs
        path={path}
        dragging={dragging}
        onNavigate={onNavigate}
        onMove={(paths, dest) => movePaths(paths, dest).catch(() => {})}
        onExternalDrop={onExternalDrop}
        onDragDone={() => setDragging(null)}
      />

      {/* Werkzeugleiste */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="In diesem Ordner filtern …"
          className="ios-input min-w-0 flex-1 basis-48"
          aria-label="Filter"
        />
        <select
          value={`${sort.key}-${sort.descending ? "desc" : "asc"}`}
          onChange={(e) => {
            const [key, dir] = e.target.value.split("-");
            props.onSortChange({ key: key as SortKey, descending: dir === "desc" });
          }}
          className="ios-input w-auto"
          aria-label="Sortierung"
        >
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
          <option value="modified-desc">Neueste zuerst</option>
          <option value="modified-asc">Älteste zuerst</option>
          <option value="size-desc">Größte zuerst</option>
          <option value="size-asc">Kleinste zuerst</option>
        </select>
        <div className="flex overflow-hidden rounded-xl border border-gray-700" role="group" aria-label="Ansicht">
          {(["list", "grid"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => props.onViewChange(mode)}
              className={`px-3 py-2 text-sm ${view === mode ? "bg-gray-700 text-white" : "text-gray-400 hover:bg-gray-800"}`}
              aria-pressed={view === mode}
            >
              {mode === "list" ? "☰ Liste" : "▦ Kacheln"}
            </button>
          ))}
        </div>
      </div>

      {/* Auswahl-Leiste */}
      {visible.length > 0 && (
        <div className="mb-2 flex min-h-10 flex-wrap items-center gap-2 px-2 text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-gray-400">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => setSelected(allSelected ? new Set() : new Set(visible.map((i) => i.path)))}
              className="h-5 w-5 accent-blue-500"
            />
            {selectedPaths.length ? `${selectedPaths.length} ausgewählt` : "Alle auswählen"}
          </label>
          {selectedPaths.length > 0 && (
            <div className="ml-auto flex flex-wrap gap-2">
              <button onClick={() => startDownload(zipUrl(selectedPaths))} className="ios-button ios-button-secondary py-1.5 text-sm">
                ⬇️ Als ZIP
              </button>
              <button onClick={() => setDialog({ type: "move", paths: selectedPaths })} className="ios-button ios-button-secondary py-1.5 text-sm">
                📦 Verschieben
              </button>
              <button
                onClick={() => setDialog({ type: "delete", paths: selectedPaths })}
                className="ios-button ios-button-secondary py-1.5 text-sm text-red-300"
              >
                🗑️ Löschen
              </button>
              <button onClick={clearSelection} className="ios-button ios-button-secondary py-1.5 text-sm">
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {content}

      <div className="mt-4 flex gap-2">
        <button onClick={() => setDialog({ type: "mkdir" })} className="ios-button flex-1 bg-green-600 hover:bg-green-700" disabled={!!error}>
          📁 Neuer Ordner
        </button>
        <button onClick={onChanged} className="ios-button ios-button-secondary flex-1">
          🔄 Aktualisieren
        </button>
      </div>
      {visible.length > 0 && (
        <p className="mt-3 text-center text-xs text-gray-500">
          💡 Tipp: Dateien und Ordner per Drag &amp; Drop auf einen Ordner oder in die Pfadleiste ziehen, um sie zu verschieben.
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
                  <strong>{dialog.paths[0].split("/").pop()}</strong> wird in den Papierkorb verschoben.
                </p>
              ) : (
                <p>
                  <strong>{dialog.paths.length} Elemente</strong> werden in den Papierkorb verschoben.
                </p>
              )}
              <p className="mt-2 text-gray-400">
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
    </div>
  );
}
