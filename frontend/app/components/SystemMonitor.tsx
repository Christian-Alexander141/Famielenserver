"use client";

import { useEffect, useState } from "react";
import Icon, { type IconName } from "./ui/Icon";
import { ErrorText, Loading } from "./ui/feedback";
import { apiGet } from "../lib/api";
import { formatSize } from "../lib/files";

interface SystemInfo {
  cpu: number | null;
  cpu_temp: number | null;
  memory: { total: number; used: number; percent: number } | null;
  disk: { total: number; used: number; free: number; percent: number } | null;
}

type Level = "ok" | "warning" | "critical";

// Die Füllung zeigt den Schweregrad. Warnung und kritisch tragen immer zusätzlich
// Symbol + Text, nie nur Farbe.
const LEVEL: Record<Level, { fill: string; label: string; text: string; icon: IconName }> = {
  ok: { fill: "bg-accent", label: "normal", text: "text-success-text", icon: "circle-check" },
  warning: { fill: "bg-warning", label: "hoch", text: "text-warning-text", icon: "triangle-alert" },
  critical: { fill: "bg-danger", label: "kritisch", text: "text-danger-text", icon: "triangle-alert" },
};

const level = (value: number, warn: number, crit: number): Level => (value >= crit ? "critical" : value >= warn ? "warning" : "ok");

const POLL_MS = 5000;

function Badge({ lv }: { lv: Level }) {
  const { label, text, icon } = LEVEL[lv];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${text}`}>
      <Icon name={icon} className="size-3.5" />
      {label}
    </span>
  );
}

interface TileProps {
  icon: IconName;
  name: string;
  value: string | null;
  lv?: Level;
  /** 0–100 für den Balken; ohne Wert gibt es keinen Balken */
  percent?: number;
  detail?: string;
  /** Badge auch im Normalzustand zeigen (Temperatur) */
  alwaysBadge?: boolean;
  wide?: boolean;
}

/** Auf dem Handy eine Zeile (Name links, Wert rechts), ab Tablet-Breite eine Kachel. */
function Tile({ icon, name, value, lv, percent, detail, alwaysBadge, wide }: TileProps) {
  return (
    <div className={`flex min-w-0 flex-col gap-2 rounded-xl border border-line bg-surface-2/60 p-3.5 ${wide ? "sm:col-span-2 lg:col-span-1" : ""}`}>
      <div className="flex items-center gap-x-2 gap-y-1 sm:flex-col sm:items-start">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-muted">
          <Icon name={icon} />
          <span className="truncate">{name}</span>
        </div>
        {value === null ? (
          <p className="text-sm text-subtle">nicht verfügbar</p>
        ) : (
          <div className="flex flex-wrap items-baseline justify-end gap-x-2 sm:justify-start">
            {lv && (alwaysBadge || lv !== "ok") && (
              <span className="sm:order-last">
                <Badge lv={lv} />
              </span>
            )}
            <span className="text-lg font-semibold tracking-tight tabular-nums sm:text-2xl">{value}</span>
          </div>
        )}
      </div>
      {value !== null && (
        <>
          {percent !== undefined && lv && (
            <div
              className="h-1.5 overflow-hidden rounded-full bg-surface-3"
              role="meter"
              aria-label={name}
              aria-valuenow={Math.round(percent)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className={`h-full rounded-full transition-[width] duration-500 ${LEVEL[lv].fill}`} style={{ width: `${Math.min(100, percent)}%` }} />
            </div>
          )}
          {detail && <p className="truncate text-xs text-subtle">{detail}</p>}
        </>
      )}
    </div>
  );
}

const pct = (value: number) => `${value.toLocaleString("de-DE", { maximumFractionDigits: 0 })} %`;

export default function SystemMonitor() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      // Im Hintergrund-Tab nicht abfragen – schont den Pi
      if (document.visibilityState !== "visible") return;
      apiGet<SystemInfo>("/api/system")
        .then((data) => {
          if (cancelled) return;
          setInfo(data);
          setOffline(false);
        })
        .catch(() => {
          if (!cancelled) setOffline(true);
        });
    };
    load();
    const timer = setInterval(load, POLL_MS);
    document.addEventListener("visibilitychange", load);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, []);

  if (!info) {
    return offline ? <ErrorText>Server nicht erreichbar – keine Daten.</ErrorText> : <Loading className="py-4">Lade Systemdaten …</Loading>;
  }

  const { cpu, memory, disk, cpu_temp: temp } = info;
  const tiles: TileProps[] = [
    { icon: "cpu", name: "CPU", value: cpu === null ? null : pct(cpu), percent: cpu ?? undefined, lv: cpu === null ? undefined : level(cpu, 80, 95) },
    {
      icon: "memory",
      name: "Arbeitsspeicher",
      value: memory ? pct(memory.percent) : null,
      percent: memory?.percent,
      lv: memory ? level(memory.percent, 80, 92) : undefined,
      detail: memory ? `${formatSize(memory.used)} von ${formatSize(memory.total)}` : undefined,
    },
    {
      icon: "hard-drive",
      name: "Speicherplatz",
      value: disk ? pct(disk.percent) : null,
      percent: disk?.percent,
      lv: disk ? level(disk.percent, 80, 92) : undefined,
      detail: disk ? `${formatSize(disk.free)} frei von ${formatSize(disk.total)}` : undefined,
    },
  ];
  if (temp !== null) {
    tiles.push({
      icon: "thermometer",
      name: "CPU-Temperatur",
      value: `${temp.toLocaleString("de-DE", { maximumFractionDigits: 1 })} °C`,
      lv: level(temp, 70, 80),
      alwaysBadge: true,
      detail: "Warnung ab 70 °C",
    });
  }

  return (
    <div className="space-y-3">
      {offline && <ErrorText>Verbindung verloren – die Werte sind nicht aktuell.</ErrorText>}
      <div className={`grid gap-2.5 sm:grid-cols-2 sm:gap-3 ${tiles.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {tiles.map((tile, i) => (
          // Bei ungerader Anzahl füllt die letzte Kachel im 2er-Raster die ganze Zeile
          <Tile key={tile.name} {...tile} wide={tiles.length % 2 === 1 && i === tiles.length - 1} />
        ))}
      </div>
    </div>
  );
}
