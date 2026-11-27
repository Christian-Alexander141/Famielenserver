import { useSyncExternalStore } from "react";

// Der geöffnete Ordner steht in der Adresse hinter „#“, z. B. „#/Bilder/Urlaub“.
// So funktionieren Zurück-Taste, Lesezeichen und Neuladen wie gewohnt.

function readPath(): string {
  const raw = window.location.hash.replace(/^#\/?/, "");
  try {
    return decodeURIComponent(raw);
  } catch {
    return "";
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

/** Aktuell geöffneter Ordner, z. B. "Bilder/Urlaub" – leer für den Hauptordner. */
export function useCurrentPath(): string {
  return useSyncExternalStore(subscribe, readPath, () => "");
}

/** Öffnet einen Ordner, indem nur der #-Teil der Adresse geändert wird. */
export function navigate(path: string): void {
  window.location.hash = path ? `/${path.split("/").map(encodeURIComponent).join("/")}` : "";
}
