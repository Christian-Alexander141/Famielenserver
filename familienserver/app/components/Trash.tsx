"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";
import { ConfirmDialog } from "./dialogs";
import { useToast } from "./Toast";
import { EmptyState, ErrorText, FileIcon, Loading } from "./ui";
import { apiGet, apiPost, errorMessage } from "../lib/api";
import { fileKind, formatDate, formatSize, parentPath } from "../lib/files";

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

  if (!data) return <Loading className="py-4">Lade Papierkorb …</Loading>;
  if (data.error) return <ErrorText>{data.error}</ErrorText>;

  return (
    <div>
      <p className="mb-3 flex items-start gap-2 text-sm text-muted">
        <Icon name="info" className="mt-0.5 text-subtle" />
        {data.days > 0
          ? `Gelöschte Dateien bleiben ${data.days} Tage im Papierkorb und werden danach automatisch entfernt.`
          : "Gelöschte Dateien bleiben im Papierkorb, bis er geleert wird."}
      </p>
      {data.items.length === 0 ? (
        <EmptyState icon="trash" title="Der Papierkorb ist leer" />
      ) : (
        <>
          <ul className="-mx-2 flex flex-col gap-0.5">
            {data.items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl px-2 py-2 hover:bg-fg/4">
                <FileIcon kind={fileKind({ type: item.type, extension: item.name.split(".").pop()?.toLowerCase() ?? "" })} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="truncate text-xs text-subtle">
                    aus /{parentPath(item.original_path)} · {formatSize(item.size)} · gelöscht {formatDate(item.deleted_at)}
                  </p>
                </div>
                <div className="flex basis-full gap-1.5 pl-[3.25rem] sm:basis-auto sm:pl-0">
                  <button type="button" onClick={() => restore(item)} className="btn btn-secondary btn-sm">
                    <Icon name="rotate-ccw" />
                    Wiederherstellen
                  </button>
                  <button type="button" onClick={() => setConfirm({ type: "delete", item })} className="btn btn-ghost btn-sm text-danger-text hover:bg-danger/10">
                    Endgültig löschen
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-end border-t border-line pt-3">
            <button type="button" onClick={() => setConfirm({ type: "empty" })} className="btn btn-danger-soft btn-sm">
              <Icon name="trash" />
              Papierkorb leeren ({data.items.length})
            </button>
          </div>
        </>
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.type === "empty" ? "Papierkorb leeren?" : "Endgültig löschen?"}
          message={
            confirm.type === "empty" ? (
              <p>
                Alle <strong className="font-semibold text-fg">{data.items.length} Elemente</strong> werden unwiderruflich gelöscht.
              </p>
            ) : (
              <p>
                <strong className="font-semibold text-fg">{confirm.item.name}</strong> wird unwiderruflich gelöscht.
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
