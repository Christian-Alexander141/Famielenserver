"use client";

import { useState, type ReactNode } from "react";
import Icon, { type IconName } from "./Icon";

interface PanelProps {
  icon: IconName;
  title: string;
  description: string;
  children: ReactNode;
  collapsible?: boolean;
}

/** Karte mit Überschrift; aufklappbare Karten laden ihren Inhalt erst beim Öffnen. */
export default function Panel({ icon, title, description, children, collapsible = false }: PanelProps) {
  const [open, setOpen] = useState(!collapsible);
  const heading = (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
        <Icon name={icon} className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-muted">{description}</span>
      </span>
    </>
  );
  return (
    <section className="card">
      <h2>
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            className={`flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-fg/3 sm:px-5 ${open ? "rounded-t-2xl" : "rounded-2xl"}`}
          >
            {heading}
            <Icon name="chevron-down" className={`size-5 text-subtle transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </button>
        ) : (
          <span className="flex items-center gap-3 p-4 sm:px-5">{heading}</span>
        )}
      </h2>
      {open && <div className="border-t border-line p-4 sm:p-5">{children}</div>}
    </section>
  );
}
