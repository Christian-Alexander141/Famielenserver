"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "./dialogs";
import { useToast } from "./Toast";
import { apiGet, apiPost, errorMessage } from "../lib/api";
import { KIND_ICON, fileKind, formatDate, formatSize, parentPath } from "../lib/files";

interface TrashItem {
  id: string;
  name: string;
  original_path: string;
  type: "file" | "directory";
  size: number;
  deleted_at: number;
}

interface TrashProps {
  /** Ändert sich, wenn woanders etwas gelöscht wurde – dann neu laden */
  refreshToken: number;
  onRestored: () => void;
}

type Confirm = { type: "delete"; item: TrashItem } | { type: "empty" } | null;

export default function Trash({ refreshToken, onRestored }: TrashProps) {
  const notify = useToast();
  const [data, setData] = useState<{ items: TrashItem[]; days: number; error?: string } | null>(null);
  const [localToken, setLocalToken] = useState(0);
  const [confirm, setConfirm] = useState<Confirm>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<{ items: TrashItem[]; retention_days: number }>("/api/trash")
      .then((res) => {
        if (!cancelled) setData({ items: res.items, days: res.retention_days });
      })
      .catch((err) => {
        if (!cancelled) setData({ items: [], days: 0, error: errorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [refreshToken, localToken]);

  const reload = () => setLocalToken((t) => t + 1);

  const restore = async (item: TrashItem) => {
    try {
      const res = await apiPost<{ path: string }>("/api/trash/restore", { id: item.id });
      notify("success", `„${item.name}“ wiederhergestellt nach /${parentPath(res.path) || ""}`);
      onRestored();
    } catch (err) {
      notify("error", errorMessage(err));
    }
    reload();
  };

  if (!data) return <p className="text-sm text-gray-400">Lade Papierkorb …</p>;
  if (data.error) return <p className="text-sm text-red-400">❌ {data.error}</p>;

  return (
    <div>
      <p className="mb-3 text-sm text-gray-400">
        {data.days > 0
          ? `Gelöschte Dateien bleiben ${data.days} Tage im Papierkorb und werden danach automatisch entfernt.`
          : "Gelöschte Dateien bleiben im Papierkorb, bis er geleert wird."}
      </p>
      {data.items.length === 0 ? (
        <p className="py-4 text-center italic text-gray-500">Der Papierkorb ist leer.</p>
      ) : (
        <>
          <ul className="space-y-1">
            {data.items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl px-2 py-2 hover:bg-gray-800">
                <span className="text-2xl" aria-hidden>
                  {KIND_ICON[fileKind({ type: item.type, extension: item.name.split(".").pop()?.toLowerCase() ?? "" })]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate">{item.name}</p>
                  <p className="truncate text-xs text-gray-500">
                    aus /{parentPath(item.original_path)} · {formatSize(item.size)} · gelöscht {formatDate(item.deleted_at)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => restore(item)} className="ios-button ios-button-secondary py-1.5 text-sm">
                    ↩️ Wiederherstellen
                  </button>
                  <button onClick={() => setConfirm({ type: "delete", item })} className="ios-button ios-button-secondary py-1.5 text-sm text-red-300">
                    Endgültig löschen
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <button onClick={() => setConfirm({ type: "empty" })} className="ios-button mt-4 w-full bg-red-600 hover:bg-red-700">
            🗑️ Papierkorb leeren ({data.items.length})
          </button>
        </>
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.type === "empty" ? "Papierkorb leeren?" : "Endgültig löschen?"}
          message={
            confirm.type === "empty" ? (
              <p>Alle {data.items.length} Elemente werden unwiderruflich gelöscht.</p>
            ) : (
              <p>
                <strong>{confirm.item.name}</strong> wird unwiderruflich gelöscht.
              </p>
            )
          }
          confirmLabel="Endgültig löschen"
          danger
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            if (confirm.type === "empty") await apiPost("/api/trash/empty");
            else await apiPost("/api/trash/delete", { id: confirm.item.id });
            notify("success", "Endgültig gelöscht");
            reload();
          }}
        />
      )}
    </div>
  );
}
