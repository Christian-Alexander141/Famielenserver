"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import ChatInterface from "./components/ChatInterface";
import FileBrowser, { type SortState, type ViewMode } from "./components/FileBrowser";
import FileUpload from "./components/FileUpload";
import Icon, { type IconName } from "./components/Icon";
import Login from "./components/Login";
import SystemMonitor from "./components/SystemMonitor";
import Trash from "./components/Trash";
import { ToastProvider, useToast } from "./components/Toast";
import { UNAUTHORIZED_EVENT, apiGet, apiPost, errorMessage } from "./lib/api";
import type { FileItem, Listing, SessionInfo } from "./lib/files";
import { entriesFromDataTransfer, useUploader } from "./lib/useUploader";

// ------------------------------------------------- Aktueller Ordner in der URL
// „#/Bilder/Urlaub“ – so funktionieren Zurück-Taste, Lesezeichen und Neuladen.

function readPath(): string {
  const raw = window.location.hash.replace(/^#\/?/, "");
  try {
    return decodeURIComponent(raw);
  } catch {
    return "";
  }
}

function subscribeToHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function navigate(path: string) {
  window.location.hash = path ? `/${path.split("/").map(encodeURIComponent).join("/")}` : "";
}

// ---------------------------------------------------------------- Bausteine

function Logo() {
  return (
    <span className="grid size-8 place-items-center rounded-[10px] bg-linear-to-br from-[#5b8cff] to-[#2f5be8] text-white shadow-[var(--shadow-sm)]">
      <Icon name="house" className="size-[18px]" />
    </span>
  );
}

function Header({ onLogout }: { onLogout?: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2.5 px-4 sm:px-6">
        <Logo />
        <span className="text-[15px] font-semibold tracking-tight">Familienserver</span>
        {onLogout && (
          <button type="button" onClick={onLogout} className="btn btn-ghost btn-sm ml-auto -mr-2">
            <Icon name="log-out" />
            Abmelden
          </button>
        )}
      </div>
    </header>
  );
}

interface PanelProps {
  icon: IconName;
  title: string;
  description: string;
  children: ReactNode;
  collapsible?: boolean;
}

/** Karte mit Überschrift; aufklappbare Karten laden ihren Inhalt erst beim Öffnen. */
function Panel({ icon, title, description, children, collapsible = false }: PanelProps) {
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

function App({ session }: { session: SessionInfo }) {
  const notify = useToast();
  const path = useSyncExternalStore(subscribeToHash, readPath, () => "");
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
        <ChatInterface onOpenFolder={navigate} />
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
      <Header onLogout={session?.authenticated ? logout : undefined} />
      <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8">{body}</main>
    </ToastProvider>
  );
}
