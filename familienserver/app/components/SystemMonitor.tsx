"use client";

import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import { formatSize } from "../lib/files";

interface SystemInfo {
  cpu: number | null;
  cpu_temp: number | null;
  memory: { total: number; used: number; percent: number } | null;
  disk: { total: number; used: number; free: number; percent: number } | null;
}

type Level = "ok" | "warning" | "critical";

// Die Füllung zeigt den Schweregrad; die Schiene ist eine dunkle Stufe derselben Farbe.
// Warnung und kritisch tragen immer zusätzlich Symbol + Text, nie nur Farbe.
const LEVEL: Record<Level, { fill: string; track: string; label?: string; text: string }> = {
  ok: { fill: "#0a84ff", track: "rgba(10, 132, 255, 0.22)", text: "text-gray-400" },
  warning: { fill: "#fbb315", track: "rgba(251, 179, 21, 0.22)", label: "⚠️ hoch", text: "text-yellow-300" },
  critical: { fill: "#dc3c3d", track: "rgba(220, 60, 61, 0.25)", label: "⛔ kritisch", text: "text-red-300" },
};

const level = (value: number, warn: number, crit: number): Level => (value >= crit ? "critical" : value >= warn ? "warning" : "ok");

const POLL_MS = 5000;

function Meter({ name, percent, detail, warn, crit }: { name: string; percent: number | null; detail?: string; warn: number; crit: number }) {
  if (percent === null) {
    return (
      <div className="grid grid-cols-[7rem_1fr] items-center gap-3 sm:grid-cols-[9rem_1fr_9rem]">
        <span className="text-sm">{name}</span>
        <span className="text-sm text-gray-500 sm:col-span-2">nicht verfügbar</span>
      </div>
    );
  }
  const lv = LEVEL[level(percent, warn, crit)];
  const figure = `${percent.toLocaleString("de-DE", { maximumFractionDigits: 0 })} %`;
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[9rem_1fr_9rem]">
      <span className="text-sm">
        {name}
        {lv.label && <span className={`ml-2 text-xs ${lv.text}`}>{lv.label}</span>}
      </span>
      <div
        className="order-last col-span-2 h-2 overflow-hidden rounded-full sm:order-none sm:col-span-1"
        style={{ background: lv.track }}
        role="meter"
        aria-label={name}
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        title={detail ? `${figure} · ${detail}` : figure}
      >
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, percent)}%`, background: lv.fill }} />
      </div>
      <span className="text-right text-sm tabular-nums">
        {figure}
        {detail && <span className="block text-xs text-gray-400">{detail}</span>}
      </span>
    </div>
  );
}

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
    return <p className="text-sm text-gray-400">{offline ? "❌ Server nicht erreichbar – keine Daten." : "Lade Systemdaten …"}</p>;
  }

  const temp = info.cpu_temp;
  const tempLevel = temp === null ? null : level(temp, 70, 80);

  return (
    <div className="space-y-4">
      {offline && <p className="text-sm text-red-400">❌ Verbindung verloren – die Werte sind nicht aktuell.</p>}
      <Meter name="CPU" percent={info.cpu} warn={80} crit={95} />
      <Meter
        name="Arbeitsspeicher"
        percent={info.memory?.percent ?? null}
        detail={info.memory ? `${formatSize(info.memory.used)} von ${formatSize(info.memory.total)}` : undefined}
        warn={80}
        crit={92}
      />
      <Meter
        name="Speicherplatz"
        percent={info.disk?.percent ?? null}
        detail={info.disk ? `${formatSize(info.disk.free)} frei` : undefined}
        warn={80}
        crit={92}
      />
      {temp !== null && tempLevel && (
        <div className="flex items-baseline gap-3 border-t border-gray-700 pt-3">
          <span className="text-sm">CPU-Temperatur</span>
          <span className="text-2xl font-semibold tabular-nums">{temp.toLocaleString("de-DE")} °C</span>
          <span className={`text-xs ${LEVEL[tempLevel].text}`}>{LEVEL[tempLevel].label ?? "✓ normal"}</span>
        </div>
      )}
    </div>
  );
}
