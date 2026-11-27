"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import AppHeader from "./components/AppHeader";
import FileSearch from "./components/FileSearch";
import Login from "./components/Login";
import SystemMonitor from "./components/SystemMonitor";
import Trash from "./components/Trash";
import FileBrowser, { type SortState, type ViewMode } from "./components/files/FileBrowser";
import FileUpload from "./components/files/FileUpload";
import Icon from "./components/ui/Icon";
import Panel from "./components/ui/Panel";
import { ToastProvider, useToast } from "./components/ui/Toast";
import { UNAUTHORIZED_EVENT, apiGet, apiPost, errorMessage } from "./lib/api";
import type { FileItem, Listing, SessionInfo } from "./lib/files";
import { navigate, useCurrentPath } from "./lib/location";
import { entriesFromDataTransfer, useUploader } from "./lib/useUploader";

/** Die Seite nach der Anmeldung: Hochladen, Dateien, Suche, Papierkorb, Systemauslastung. */
function App({ session }: { session: SessionInfo }) {
  const notify = useToast();
  const path = useCurrentPath();
  const [listing, setListing] = useState<{ path: string; items: FileItem[]; error?: string } | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [view, setView] = useState<ViewMode>("list");
  const [sort, setSort] = useState<SortState>({ key: "name", descending: false });

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);
  const uploader = useUploader(session.max_upload_bytes, reload, notify);

  useEffect(() => {
    let cancelled = false;
    apiGet<Listing>("/api/files", { path })
      .then((res) => {
        if (!cancelled) setListing({ path, items: res.items });
      })
      .catch((err) => {
        if (!cancelled) setListing({ path, items: [], error: errorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [path, reloadToken]);

  const current = listing && listing.path === path ? listing : null;

  const { upload } = uploader;
  const uploadDropped = useCallback(
    async (dataTransfer: DataTransfer, dir: string) => upload(await entriesFromDataTransfer(dataTransfer), dir),
    [upload],
  );

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <FileUpload uploader={uploader} currentPath={path} />

      <FileBrowser
        key={path}
        path={path}
        items={current ? current.items : null}
        error={current?.error ?? null}
        thumbnails={session.thumbnails}
        trashDays={session.trash_days}
        view={view}
        onViewChange={setView}
        sort={sort}
        onSortChange={setSort}
        onNavigate={navigate}
        onChanged={reload}
        onExternalDrop={uploadDropped}
      />

      <Panel icon="search" title="Dateisuche" description="Dateien in allen Ordnern finden" collapsible>
        <FileSearch onOpenFolder={navigate} />
      </Panel>

      <Panel icon="trash" title="Papierkorb" description="Gelöschte Dateien wiederherstellen" collapsible>
        <Trash refreshToken={reloadToken} onRestored={reload} />
      </Panel>

      <Panel icon="activity" title="Systemauslastung" description="Live-Werte des Servers">
        <SystemMonitor />
      </Panel>

      <footer className="pb-4 pt-2 text-center text-xs text-subtle">Familienserver v2.0 · Dokumente für das Heimnetzwerk</footer>
    </div>
  );
}

export default function Home() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [offline, setOffline] = useState<string | null>(null);
  const [token, setToken] = useState(0);
  const recheck = useCallback(() => setToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    apiGet<SessionInfo>("/api/session")
      .then((info) => {
        if (cancelled) return;
        setSession(info);
        setOffline(null);
      })
      .catch((err) => {
        if (!cancelled) setOffline(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Sitzung abgelaufen (z. B. Passwort geändert) → zurück zur Anmeldung
  useEffect(() => {
    const onUnauthorized = () => setSession((s) => (s ? { ...s, authenticated: false } : s));
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const logout = async () => {
    try {
      await apiPost("/api/logout");
    } finally {
      recheck();
    }
  };

  let body: ReactNode;
  if (offline && !session) {
    body = (
      <div className="card mx-auto mt-8 max-w-md p-6 text-center sm:mt-16 sm:p-8">
        <span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-warning/15 text-warning-text">
          <Icon name="triangle-alert" className="size-6" strokeWidth={1.75} />
        </span>
        <h1 className="text-lg font-semibold tracking-tight">Keine Verbindung zum Server</h1>
        <p className="mt-1.5 text-sm text-muted">
          {offline}. Läuft der Familienserver? Starte ihn mit <code>./start.sh</code>.
        </p>
        <button type="button" onClick={recheck} className="btn btn-secondary mt-5">
          <Icon name="refresh" />
          Erneut versuchen
        </button>
      </div>
    );
  } else if (!session) {
    body = (
      <div className="flex flex-col items-center gap-3 py-24 text-sm text-muted">
        <span className="spinner size-6 text-accent-text" />
        Verbinde …
      </div>
    );
  } else if (!session.authenticated) {
    body = <Login onLoggedIn={recheck} />;
  } else {
    body = <App session={session} />;
  }

  return (
    <ToastProvider>
      <AppHeader onLogout={session?.authenticated ? logout : undefined} />
      <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8">{body}</main>
    </ToastProvider>
  );
}
