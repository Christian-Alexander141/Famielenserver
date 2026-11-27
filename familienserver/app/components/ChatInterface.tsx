"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Icon from "./Icon";
import { FileIcon } from "./ui";
import { apiPost, downloadUrl, errorMessage, startDownload, zipUrl } from "../lib/api";
import { fileKind, formatSize, parentPath, type FileItem } from "../lib/files";

interface SearchResponse {
  results: FileItem[];
  count: number;
  truncated: boolean;
  hint: string;
}

interface ChatMessage {
  id: number;
  sender: "user" | "bot";
  text: string;
  error?: boolean;
  results?: FileItem[];
}

interface ChatInterfaceProps {
  /** Öffnet einen Ordner im Dateibrowser */
  onOpenFolder: (path: string) => void;
}

const EXAMPLES = ["Urlaub", "PDFs von 2024", "Bilder vom Geburtstag", "Videos"];

function Result({ item, onOpenFolder }: { item: FileItem; onOpenFolder: (path: string) => void }) {
  const isDir = item.type === "directory";
  const folder = isDir ? item.path : parentPath(item.path);
  return (
    <li className="flex items-center gap-1 rounded-lg hover:bg-fg/5">
      <button
        type="button"
        onClick={() => onOpenFolder(folder)}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg py-1.5 pl-1.5 text-left"
        title={isDir ? "Ordner öffnen" : "Ordner mit dieser Datei öffnen"}
      >
        <FileIcon kind={fileKind(item)} size="sm" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{item.name}</span>
          <span className="block truncate text-xs text-subtle">
            /{folder}
            {!isDir && ` · ${formatSize(item.size)}`}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => startDownload(isDir ? zipUrl([item.path]) : downloadUrl(item.path))}
        className="icon-btn"
        title="Herunterladen"
        aria-label={`${item.name} herunterladen`}
      >
        <Icon name="download" />
      </button>
    </li>
  );
}

export default function ChatInterface({ onOpenFolder }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const nextId = useRef(1);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, loading]);

  const add = (message: Omit<ChatMessage, "id">) => setMessages((list) => [...list, { ...message, id: nextId.current++ }]);

  const ask = async (query: string) => {
    if (!query.trim() || loading) return;
    add({ sender: "user", text: query });
    setInput("");
    setLoading(true);
    try {
      const res = await apiPost<SearchResponse>("/api/search", { query });
      let text: string;
      if (res.count === 0) text = res.hint || `Keine Treffer für „${query}“.`;
      else if (res.truncated) text = `${res.count} Treffer – hier die ersten ${res.results.length}:`;
      else text = res.count === 1 ? "Ich habe 1 Treffer gefunden:" : `Ich habe ${res.count} Treffer gefunden:`;
      add({ sender: "bot", text, results: res.results });
    } catch (err) {
      add({ sender: "bot", text: errorMessage(err), error: true });
    } finally {
      setLoading(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    ask(input.trim());
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="max-h-[500px] min-h-[240px] overflow-y-auto rounded-xl border border-line bg-surface-2/50 p-3 sm:p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center px-2 py-6 text-center">
            <span className="mb-3 grid size-11 place-items-center rounded-2xl bg-accent/10 text-accent-text">
              <Icon name="search" className="size-5" />
            </span>
            <p className="font-medium">Ich suche in allen Ordnern nach Dateien.</p>
            <p className="mt-1 text-sm text-muted">Frag z. B. nach einem Namen, einem Jahr oder einer Dateiart:</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {EXAMPLES.map((example) => (
                <button
                  type="button"
                  key={example}
                  onClick={() => ask(example)}
                  className="rounded-full border border-line-strong bg-surface px-3 py-1 text-sm text-muted transition-colors hover:border-accent hover:text-fg"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message) =>
              message.sender === "user" ? (
                <div key={message.id} className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent px-3.5 py-2 text-sm text-white">{message.text}</p>
                </div>
              ) : (
                <div key={message.id} className="flex justify-start">
                  <div className="min-w-0 max-w-[92%] rounded-2xl rounded-bl-md border border-line bg-surface px-3.5 py-2.5 shadow-[var(--shadow-sm)]">
                    <p className={`flex items-start gap-2 whitespace-pre-wrap text-sm ${message.error ? "text-danger-text" : ""}`}>
                      {message.error && <Icon name="circle-alert" className="mt-0.5" />}
                      {message.text}
                    </p>
                    {message.results && message.results.length > 0 && (
                      <ul className="-mx-1.5 mt-2 flex flex-col gap-0.5">
                        {message.results.map((item) => (
                          <Result key={item.path} item={item} onOpenFolder={onOpenFolder} />
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ),
            )}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted">
                <span className="spinner size-4 text-accent-text" /> Suche …
              </div>
            )}
            <div ref={end} />
          </div>
        )}
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Wonach suchst du? z. B. „Rechnungen März“"
            className="input pl-9"
            aria-label="Suche"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={!input.trim() || loading}>
          Suchen
        </button>
      </form>
    </div>
  );
}
