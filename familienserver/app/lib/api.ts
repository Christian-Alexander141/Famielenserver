// Zugriff auf das Flask-Backend. Frontend und API laufen unter derselben Adresse,
// daher reichen relative URLs – egal ob am PC, Handy oder Tablet.

import type { FileItem } from "./files";

/** Ohne diesen Header lehnt das Backend ändernde Anfragen ab (Schutz vor fremden Webseiten). */
const CSRF_HEADER = { "X-Familienserver": "1" };

/** Wird ausgelöst, wenn die Sitzung abgelaufen ist – die Seite zeigt dann wieder die Anmeldung. */
export const UNAUTHORIZED_EVENT = "familienserver:unauthorized";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unbekannter Fehler";
}

function handleFailure(status: number, data: unknown): never {
  if (status === 401) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
  const message =
    data && typeof data === "object" && "error" in data && typeof data.error === "string"
      ? data.error
      : `Serverfehler (${status})`;
  throw new ApiError(message, status);
}

async function request<T>(url: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { credentials: "same-origin", ...init });
  } catch {
    throw new ApiError("Server nicht erreichbar", 0);
  }
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // keine JSON-Antwort
  }
  if (!response.ok) {
    handleFailure(response.status, data);
  }
  return data as T;
}

export function apiGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const query = params ? `?${new URLSearchParams(params)}` : "";
  return request<T>(`${path}${query}`, { cache: "no-store" });
}

export function apiPost<T>(path: string, body: unknown = {}): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { ...CSRF_HEADER, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ------------------------------------------------------------------ URLs

export function downloadUrl(path: string, inline = false): string {
  const params = new URLSearchParams({ path });
  if (inline) params.set("inline", "1");
  return `/api/download?${params}`;
}

export function zipUrl(paths: string[]): string {
  const params = new URLSearchParams();
  paths.forEach((p) => params.append("path", p));
  return `/api/zip?${params}`;
}

export function thumbnailUrl(item: FileItem): string {
  return `/api/thumbnail?${new URLSearchParams({ path: item.path, v: String(item.modified) })}`;
}

/** Startet einen Download, ohne die Seite zu verlassen. */
export function startDownload(url: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

// ---------------------------------------------------------------- Upload

export interface UploadResult {
  path: string;
  name: string;
  renamed: boolean;
}

/** Lädt eine Datei hoch. XMLHttpRequest statt fetch, weil nur so echter Fortschritt messbar ist. */
export function uploadFile(
  file: File,
  name: string,
  dir: string,
  onProgress: (loadedBytes: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/upload?${new URLSearchParams({ dir, name })}`);
    xhr.setRequestHeader("X-Familienserver", "1");
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.upload.onprogress = (event) => onProgress(event.loaded);
    xhr.onload = () => {
      let data: unknown = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // keine JSON-Antwort
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as UploadResult);
      } else {
        try {
          handleFailure(xhr.status, data);
        } catch (error) {
          reject(error);
        }
      }
    };
    xhr.onerror = () => reject(new ApiError("Verbindung zum Server unterbrochen", 0));
    xhr.send(file);
  });
}
