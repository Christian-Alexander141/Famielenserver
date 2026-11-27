"use client";

import { useState } from "react";
import Icon from "../ui/Icon";
import { draggedPaths, isExternalFileDrag, isInternalDrag, isSameOrInside } from "../../lib/files";

interface BreadcrumbsProps {
  path: string;
  dragging: string[] | null;
  onNavigate: (path: string) => void;
  onMove: (paths: string[], destination: string) => void;
  onExternalDrop: (dataTransfer: DataTransfer, dir: string) => void;
  onDragDone: () => void;
}

/** Pfadleiste – jedes Element ist auch ein Ablageziel für Drag & Drop. */
export default function Breadcrumbs({ path, dragging, onNavigate, onMove, onExternalDrop, onDragDone }: BreadcrumbsProps) {
  const [over, setOver] = useState<string | null>(null);
  const parts = path ? path.split("/") : [];
  const crumbs = [{ label: "Hauptordner", target: "" }, ...parts.map((part, i) => ({ label: part, target: parts.slice(0, i + 1).join("/") }))];
  const valid = (target: string) => !!dragging && target !== path && !dragging.some((p) => isSameOrInside(target, p));

  return (
    <nav aria-label="Pfad" className="flex min-w-0 flex-wrap items-center gap-0.5 text-sm">
      {path && (
        <button
          type="button"
          onClick={() => onNavigate(parts.slice(0, -1).join("/"))}
          className="icon-btn -ml-1.5 mr-1 size-8"
          title="Eine Ebene zurück"
          aria-label="Eine Ebene zurück"
        >
          <Icon name="arrow-left" />
        </button>
      )}
      {crumbs.map((crumb, i) => {
        const current = crumb.target === path;
        return (
          <span key={crumb.target} className="flex min-w-0 items-center gap-0.5">
            {i > 0 && <Icon name="chevron-right" className="size-4 text-subtle" />}
            <button
              type="button"
              onClick={() => onNavigate(crumb.target)}
              disabled={current}
              aria-current={current ? "page" : undefined}
              className={`flex min-w-0 max-w-56 items-center gap-1.5 rounded-lg px-2 py-1 transition-colors ${
                current ? "font-semibold text-fg" : "text-muted hover:bg-fg/7 hover:text-fg"
              } ${over === crumb.target ? "bg-accent/10 text-accent-text ring-2 ring-accent" : ""}`}
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
              {i === 0 && <Icon name="house" />}
              <span className="truncate">{crumb.label}</span>
            </button>
          </span>
        );
      })}
    </nav>
  );
}
