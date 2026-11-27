"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiPost, downloadUrl, errorMessage, startDownload, zipUrl } from "../lib/api";
import { KIND_ICON, fileKind, formatSize, parentPath, type FileItem } from "../lib/files";

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
  results?: FileItem[];
}

interface ChatInterfaceProps {
  /** Öffnet einen Ordner im Dateibrowser */
  onOpenFolder: (path: string) => void;
}

const EXAMPLES = ["Urlaub", "PDFs von 2024", "Bilder vom Geburtstag", "Videos"];

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
      add({ sender: "bot", text: `❌ ${errorMessage(err)}` });
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
      <div className="max-h-[500px] min-h-[240px] overflow-y-auto rounded-xl border border-gray-700 p-4">
        {messages.length === 0 ? (
          <div className="py-6 text-center text-gray-400">
            <p>👋 Hallo! Ich suche in allen Ordnern nach Dateien.</p>
            <p className="mt-1 text-sm">Frag z. B. nach einem Namen, einem Jahr oder einer Dateiart:</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {EXAMPLES.map((example) => (
                <button key={example} onClick={() => ask(example)} className="rounded-full bg-gray-700 px-3 py-1 text-sm hover:bg-gray-600">
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] rounded-2xl px-4 py-2 ${message.sender === "user" ? "bg-blue-600" : "bg-gray-700"}`}>
                  <p className="whitespace-pre-wrap">{message.text}</p>
                  {message.results && message.results.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {message.results.map((item) => {
                        const isDir = item.type === "directory";
                        const folder = isDir ? item.path : parentPath(item.path);
                        return (
                          <li key={item.path} className="flex items-center gap-2 rounded-lg bg-gray-800 px-2 py-1.5 text-sm">
                            <span aria-hidden>{KIND_ICON[fileKind(item)]}</span>
                            <button
                              onClick={() => onOpenFolder(folder)}
                              className="min-w-0 flex-1 text-left"
                              title={isDir ? "Ordner öffnen" : "Ordner mit dieser Datei öffnen"}
                            >
                              <span className="block truncate font-medium">{item.name}</span>
                              <span className="block truncate text-xs text-gray-400">
                                /{folder}
                                {!isDir && ` · ${formatSize(item.size)}`}
                              </span>
                            </button>
                            <button
                              onClick={() => startDownload(isDir ? zipUrl([item.path]) : downloadUrl(item.path))}
                              className="icon-button"
                              title="Herunterladen"
                            >
                              ⬇️
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-gray-400">
                <div className="loading-spinner" /> Suche …
              </div>
            )}
            <div ref={end} />
          </div>
        )}
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Wonach suchst du? z. B. „Rechnungen März“"
          className="ios-input flex-1"
          aria-label="Suche"
        />
        <button type="submit" className="ios-button" disabled={!input.trim() || loading}>
          Suchen
        </button>
      </form>
    </div>
  );
}
