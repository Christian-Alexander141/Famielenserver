"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon, { type IconName } from "./Icon";

export interface MenuItem {
  label: string;
  icon: IconName;
  onSelect: () => void;
  danger?: boolean;
}

interface ActionMenuProps {
  /** Beschriftung für Screenreader und Tooltip, z. B. „Aktionen für Urlaub.jpg“ */
  label: string;
  items: MenuItem[];
  className?: string;
}

const WIDTH = 224;
const ITEM_HEIGHT = 40;
const PADDING = 6;
const GAP = 6;
const MARGIN = 8;

/** „⋯“-Schaltfläche mit Aufklappmenü. Das Menü liegt per Portal über allem und
 *  öffnet sich nach oben, wenn unten kein Platz mehr ist. */
export default function ActionMenu({ label, items, className = "" }: ActionMenuProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const open = position !== null;

  // Lag der Fokus im Menü, kehrt er zur Schaltfläche zurück – sonst landet er
  // beim Schließen (auch durch Scrollen) im Nichts.
  const close = useCallback((returnFocus = false) => {
    const focusInside = !!menu.current?.contains(document.activeElement);
    setPosition(null);
    if (returnFocus || focusInside) button.current?.focus({ preventScroll: true });
  }, []);

  const toggle = () => {
    if (open || !button.current) {
      close();
      return;
    }
    const rect = button.current.getBoundingClientRect();
    const height = items.length * ITEM_HEIGHT + PADDING * 2;
    const fitsBelow = rect.bottom + GAP + height <= window.innerHeight - MARGIN;
    setPosition({
      top: fitsBelow ? rect.bottom + GAP : Math.max(MARGIN, rect.top - GAP - height),
      left: Math.min(Math.max(MARGIN, rect.right - WIDTH), window.innerWidth - WIDTH - MARGIN),
    });
  };

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menu.current?.contains(target) && !button.current?.contains(target)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      close(true);
    };
    const onViewportChange = () => close();

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [open, close]);

  // Pfeiltasten bewegen den Fokus durch die Einträge, Tab verlässt das Menü
  const onMenuKeyDown = (event: React.KeyboardEvent) => {
    const entries = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const index = entries.indexOf(document.activeElement as HTMLElement);
    const focusAt = (i: number) => entries[(i + entries.length) % entries.length]?.focus();
    if (event.key === "ArrowDown") focusAt(index + 1);
    else if (event.key === "ArrowUp") focusAt(index - 1);
    else if (event.key === "Home") focusAt(0);
    else if (event.key === "End") focusAt(entries.length - 1);
    else if (event.key === "Tab") close();
    else return;
    if (event.key !== "Tab") event.preventDefault();
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={toggle}
        className={`icon-btn ${className}`}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Icon name="more" className="size-5" />
      </button>
      {position &&
        createPortal(
          <div
            ref={menu}
            role="menu"
            aria-label={label}
            onKeyDown={onMenuKeyDown}
            style={{ top: position.top, left: position.left, width: WIDTH }}
            className="fixed z-50 rounded-xl border border-line bg-surface p-1.5 shadow-[var(--shadow-lg)] animate-pop-in motion-reduce:animate-none"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  close();
                  item.onSelect();
                }}
                className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm focus-visible:-outline-offset-2 ${
                  item.danger ? "text-danger-text hover:bg-danger/10" : "text-fg hover:bg-fg/7"
                }`}
              >
                <Icon name={item.icon} className={`size-4 ${item.danger ? "" : "text-muted"}`} />
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
