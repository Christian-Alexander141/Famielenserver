"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import FileUpload from "@/app/components/FileUpload";
import FileList from "@/app/components/FileList";
import SystemMonitor from "@/app/components/SystemMonitor";
import ChatInterface from "@/app/components/ChatInterface";

export default function Home() {
  const [devMode, setDevMode] = useState(true);
  const [files, setFiles] = useState<Array<{ name: string; path: string; size: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [systemInfo, setSystemInfo] = useState({
    cpu: 0,
    ram_used: 0,
    disk_used: 0,
  });
  const [serverOnline, setServerOnline] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const apiBaseUrl = devMode ? "http://localhost:5000" : "";

  // Prüfe Server-Verbindung
  const checkServerConnection = useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/files`, { cache: "no-cache" });
      if (response.ok) {
        setDevMode(false);
        setServerOnline(true);
        await fetchFiles();
        await fetchSystemInfo();
      } else {
        throw new Error("Server nicht erreichbar");
      }
    } catch {
      setDevMode(true);
      setServerOnline(false);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  // Dateien abrufen
  const fetchFiles = useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/files`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Dateien:", error);
      setFiles([]);
    }
  }, [apiBaseUrl]);

  // Systeminformationen abrufen
  const fetchSystemInfo = useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/systeminfo`);
      if (response.ok) {
        const data = await response.json();
        setSystemInfo(data);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Systeminformationen:", error);
      // Mock-Daten für Entwicklungsmodus
      setSystemInfo({
        cpu: Math.random() * 100,
        ram_used: 40 + Math.random() * 40,
        disk_used: 30 + Math.random() * 60,
      });
    }
  }, [apiBaseUrl]);

  // Modus wechseln
  const toggleMode = useCallback(() => {
    setDevMode(!devMode);
    if (!devMode) {
      setServerOnline(false);
    } else {
      checkServerConnection();
    }
  }, [devMode, checkServerConnection]);

  // Handle file upload
  const handleUploadSuccess = useCallback(() => {
    if (!devMode) {
      fetchFiles();
    }
  }, [devMode, fetchFiles]);

  // Handle file deletion
  const handleDelete = useCallback(async (filename: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/delete/${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });
      if (response.ok) {
        await fetchFiles();
      }
    } catch (error) {
      console.error("Fehler beim Löschen der Datei:", error);
    }
  }, [apiBaseUrl, fetchFiles]);

  // Initial load
  useEffect(() => {
    checkServerConnection();
    
    // Auto-refresh system info
    const interval = setInterval(() => {
      if (!devMode || serverOnline) {
        fetchSystemInfo();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [checkServerConnection, fetchSystemInfo, devMode, serverOnline]);

  // Mock System Info für Entwicklungsmodus
  useEffect(() => {
    if (devMode && !serverOnline) {
      const mockInterval = setInterval(() => {
        setSystemInfo({
          cpu: Math.random() * 100,
          ram_used: 40 + Math.random() * 40,
          disk_used: 30 + Math.random() * 60,
        });
      }, 5000);
      return () => clearInterval(mockInterval);
    }
  }, [devMode, serverOnline]);

  return (
    <div className="container mx-auto max-w-2xl px-6 py-6">
      <h1 className="text-center text-xl font-medium mb-6 relative">
        🗂️ Familienserver
        <button
          onClick={toggleMode}
          className="mode-toggle"
        >
          {serverOnline ? "✅ Produktivmodus" : devMode ? "🧪 Entwicklungsmodus" : "🔄 Modus wechseln"}
        </button>
      </h1>

      {/* Hauptfunktionen */}
      <div className="ios-card">
        <h2 className="text-lg font-medium mb-4">📤 Dateien/Ordner hochladen</h2>
        <FileUpload
          apiBaseUrl={apiBaseUrl}
          onUploadSuccess={handleUploadSuccess}
          devMode={devMode}
        />
      </div>

      <div className="ios-card">
        <h2 className="text-lg font-medium mb-4">📁 Dateien im Server</h2>
        {loading ? (
          <div className="text-center py-4">
            <div className="loading-spinner mx-auto mb-2"></div>
            <p className="text-gray-400">Lade Dateien...</p>
          </div>
        ) : (
          <FileList
            files={files}
            apiBaseUrl={apiBaseUrl}
            onDelete={handleDelete}
            devMode={devMode}
          />
        )}
      </div>

      <div className="ios-card">
        <h2 className="text-lg font-medium mb-4">📊 Systemauslastung</h2>
        <SystemMonitor systemInfo={systemInfo} />
      </div>

      {/* Chatbot Section */}
      <div className="ios-card">
        <h2 className="text-lg font-medium mb-4 flex items-center justify-between">
          🤖 Chatbot
          <button
            onClick={() => setShowChat(!showChat)}
            className="ios-button text-sm"
          >
            {showChat ? "Verbergen" : "Öffnen"}
          </button>
        </h2>
        {showChat && (
          <ChatInterface
            apiBaseUrl={apiBaseUrl}
            devMode={devMode}
          />
        )}
      </div>

      <div className="text-center mt-8 text-sm text-gray-500">
        <p>Familienserver v1.0 - Dokumentenverwaltung für das Heimnetzwerk</p>
      </div>
    </div>
  );
}
