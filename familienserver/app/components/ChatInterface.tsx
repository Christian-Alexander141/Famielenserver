"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import axios from "axios";

interface FileResult {
  name: string;
  path: string;
  size: number;
  download_url: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  results?: FileResult[];
  timestamp: Date;
}

interface ChatInterfaceProps {
  apiBaseUrl: string;
  devMode: boolean;
}

export default function ChatInterface({ apiBaseUrl, devMode }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Handle sending message
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setError(null);
    setIsLoading(true);

    try {
      if (devMode) {
        // Mock response in dev mode
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        const mockResults: FileResult[] = [
          {
            name: "Urlaub_2024.jpg",
            path: "Bilder/Urlaub_2024.jpg",
            size: 2048576,
            download_url: "/api/download/Bilder/Urlaub_2024.jpg",
          },
          {
            name: "Rechnung.pdf",
            path: "Dokumente/Rechnung.pdf",
            size: 524288,
            download_url: "/api/download/Dokumente/Rechnung.pdf",
          },
        ];

        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: `Ich habe ${mockResults.length} Dateien zu Ihrer Suche "${inputValue.trim()}" gefunden:`,
          results: mockResults,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, botMessage]);
      } else {
        // Real API call
        const response = await axios.post(`${apiBaseUrl}/api/chat`, {
          query: inputValue.trim(),
        });

        const data = response.data;
        const results: FileResult[] = data.results || [];

        let botText = "";
        if (results.length > 0) {
          botText = `Ich habe ${results.length} Dateien zu Ihrer Suche "${inputValue.trim()}" gefunden:`;
        } else {
          botText = `Keine Dateien zu "${inputValue.trim()}" gefunden.`;
        }

        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: botText,
          results: results,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, botMessage]);
      }
    } catch (err) {
      console.error("Chat API Fehler:", err);
      setError("Fehler bei der Suche. Bitte versuchen Sie es erneut.");
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle key down (Enter to send)
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle download from chat results
  const handleDownload = (downloadUrl: string) => {
    window.open(downloadUrl, "_blank");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="border border-gray-700 rounded-lg p-4 flex-1 min-h-[300px] max-h-[500px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>👋 Hallo! Ich bin Ihr Familienserver-Chatbot.</p>
            <p className="mt-2">Fragen Sie mich nach Dateien, und ich helfe Ihnen, sie zu finden.</p>
            <p className="mt-2 text-sm">Beispiel: "Suche nach Urlaub" oder "Zeige mir alle PDFs"</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.sender === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-white"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.text}</p>
                  
                  {/* File results */}
                  {message.results && message.results.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-gray-400 mb-2">Gefundene Dateien:</p>
                      {message.results.map((file) => (
                        <div
                          key={file.path}
                          className="bg-gray-800 rounded-lg p-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span>📄</span>
                            <div className="flex-1">
                              <p className="font-medium truncate">{file.name}</p>
                              <p className="text-gray-500 text-xs">{formatFileSize(file.size)}</p>
                            </div>
                            <button
                              onClick={() => handleDownload(file.download_url)}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              ⬇️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-700 rounded-2xl px-4 py-2 max-w-[80%]">
                <div className="flex items-center gap-2">
                  <div className="loading-spinner"></div>
                  <span>Denke nach...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      )}

      {error && (
        <div className="text-red-500 text-sm text-center">{error}</div>
      )}
    </div>

    <div className="flex gap-2">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={devMode ? "Suche nach Dateien (Demo-Modus)..." : "Suche nach Dateien..."}
        className="ios-input flex-1"
        disabled={isLoading}
      />
      <button
        onClick={handleSendMessage}
        className="ios-button"
        disabled={!inputValue.trim() || isLoading}
      >
        {isLoading ? "..." : "Senden"}
      </button>
    </div>
  </div>
  );
}
