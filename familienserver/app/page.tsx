"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import ChatInterface from "./components/ChatInterface";
import FileBrowser, { type SortState, type ViewMode } from "./components/FileBrowser";
import FileUpload from "./components/FileUpload";
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

function Section({ title, children, collapsible = false }: { title: string; children: ReactNode; collapsible?: boolean }) {
  const [open, setOpen] = useState(!collapsible);
  return (
    <section className="ios-card">
      <h2 className="flex items-center justify-between text-lg font-medium">
        {title}
        {collapsible && (
          <button onClick={() => setOpen(!open)} className="ios-button ios-button-secondary py-1.5 text-sm" aria-expanded={open}>
            {open ? "Schließen" : "Öffnen"}
          </button>
        )}
      </h2>
      {open && <div className="mt-4">{children}</div>}
    </section>
  );
}

function App({ session, onLogout }: { session: SessionInfo; onLogout: () => void }) {
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
    <>
      <Section title="📤 Hochladen">
        <FileUpload uploader={uploader} currentPath={path} />
      </Section>

      <section className="ios-card">
        <h2 className="mb-3 text-lg font-medium">
          📁 Dateien
          {current && !current.error && <span className="ml-2 text-sm text-gray-500">{current.items.length} {current.items.length === 1 ? "Element" : "Elemente"}</span>}
        </h2>
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
      </section>

      <Section title="🤖 Dateisuche" collapsible>
        <ChatInterface onOpenFolder={navigate} />
      </Section>

      <Section title="🗑️ Papierkorb" collapsible>
        <Trash refreshToken={reloadToken} onRestored={reload} />
      </Section>

      <Section title="📊 Systemauslastung">
        <SystemMonitor />
      </Section>

      <div className="mt-8 flex items-center justify-center gap-4 text-sm text-gray-500">
        <span>Familienserver v2.0 – Dokumente für das Heimnetzwerk</span>
        <button onClick={onLogout} className="text-gray-400 underline hover:text-white">
          Abmelden
        </button>
      </div>
    </>
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
      <div className="ios-card border border-yellow-700 bg-yellow-900/20">
        <h2 className="mb-2 text-yellow-400">⚠️ Keine Verbindung zum Server</h2>
        <p className="text-sm text-yellow-200">{offline}. Läuft der Familienserver? Starte ihn mit ./start.sh.</p>
        <button onClick={recheck} className="ios-button mt-3 bg-yellow-600 hover:bg-yellow-700">
          🔄 Erneut versuchen
        </button>
      </div>
    );
  } else if (!session) {
    body = (
      <div className="py-10 text-center text-gray-400">
        <div className="loading-spinner mx-auto mb-2" />
        Verbinde …
      </div>
    );
  } else if (!session.authenticated) {
    body = <Login onLoggedIn={recheck} />;
  } else {
    body = <App session={session} onLogout={logout} />;
  }

  return (
    <ToastProvider>
      <main className="container mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <h1 className="mb-6 text-center text-xl font-medium">🗂️ Familienserver</h1>
        {body}
      </main>
    </ToastProvider>
  );
}
