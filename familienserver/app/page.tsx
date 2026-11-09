"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import FileUpload from "@/app/components/FileUpload";
import FileList from "@/app/components/FileList";
import SystemMonitor from "@/app/components/SystemMonitor";
import ChatInterface from "@/app/components/ChatInterface";

export default function Home() {
  const [devMode, setDevMode] = useState(true);
  const [files, setFiles] = useState<Array<{
    name: string;
    path: string;
    size: number;
    type: 'file' | 'directory';
    extension?: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [systemInfo, setSystemInfo] = useState({
    cpu: 0,
    ram_used: 0,
    disk_used: 0,
  });
  const [serverOnline, setServerOnline] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const [pathHistory, setPathHistory] = useState<string[]>([]);

  // API Base URL - immer auf localhost:5000 setzen
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

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
    } catch (error) {
      console.error("Server-Verbindung fehlerhaft:", error);
      setDevMode(true);
      setServerOnline(false);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  // Dateien abrufen
  const fetchFiles = useCallback(async (path: string = "") => {
    try {
      const endpoint = path ? `${apiBaseUrl}/api/files/${encodeURIComponent(path)}` : `${apiBaseUrl}/api/files`;
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setFiles(data);
        setCurrentPath(path);
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
      fetchFiles(currentPath);
    }
  }, [devMode, fetchFiles, currentPath]);

  // Handle file deletion
  const handleDelete = useCallback(async (path: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/delete/${encodeURIComponent(path)}`, {
        method: "DELETE",
      });
      if (response.ok) {
        await fetchFiles(currentPath);
      }
    } catch (error) {
      console.error("Fehler beim Löschen:", error);
    }
  }, [apiBaseUrl, fetchFiles, currentPath]);

  // Handle directory navigation
  const handleEnterDir = useCallback((dirPath: string) => {
    // Prüfe, ob dirPath bereits ein absoluter Pfad ist (enthält currentPath)
    // oder ob es ein relativer Pfad (nur der Name) ist
    let newPath = dirPath;
    
    // Wenn currentPath gesetzt ist und dirPath nicht mit currentPath beginnt,
    // dann müssen wir sie kombinieren
    if (currentPath && !dirPath.startsWith(currentPath + '/') && dirPath !== currentPath) {
      newPath = `${currentPath}/${dirPath}`;
    }
    
    // Add current path to history before navigating
    if (currentPath && currentPath !== newPath) {
      setPathHistory(prev => [...prev, currentPath]);
    }
    setCurrentPath(newPath);
    fetchFiles(newPath);
  }, [currentPath, fetchFiles]);

  // Handle going back in path history
  const handleGoBack = useCallback(() => {
    if (pathHistory.length > 0) {
      const prevPath = pathHistory[pathHistory.length - 1];
      setPathHistory(prev => prev.slice(0, -1));
      fetchFiles(prevPath);
    }
  }, [pathHistory, fetchFiles]);

  // Handle going to root
  const handleGoRoot = useCallback(() => {
    setPathHistory([]);
    setCurrentPath("");
    fetchFiles("");
  }, [fetchFiles]);

  // Initial load
  useEffect(() => {
    checkServerConnection();
    
    // Auto-refresh system info
    const interval = setInterval(() => {
      fetchSystemInfo();
    }, 5000);

    return () => clearInterval(interval);
  }, [checkServerConnection, fetchSystemInfo]);

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

  // Get path display for breadcrumbs
  const getPathDisplay = () => {
    if (!currentPath) return "/";
    const parts = currentPath.split('/');
    return parts.map((part, index) => {
      const pathSoFar = parts.slice(0, index + 1).join('/');
      return (
        <span key={index}>
          <button
            onClick={() => {
              const goToPath = parts.slice(0, index + 1).join('/');
              setPathHistory(prev => {
                const currentIndex = prev.findIndex(p => p === currentPath);
                if (currentIndex > -1) {
                  return prev.slice(0, currentIndex);
                }
                return [...prev, currentPath];
              });
              fetchFiles(goToPath);
            }}
            className="text-blue-400 hover:text-blue-300"
          >
            {part}
          </button>
          {index < parts.length - 1 && " / "}
        </span>
      );
    });
  };

  return (
    <div className="container mx-auto max-w-4xl px-6 py-6">
      <h1 className="text-center text-xl font-medium mb-6 relative">
        🗂️ Familienserver
        <button
          onClick={toggleMode}
          className="mode-toggle"
        >
          {serverOnline ? "✅ Produktivmodus" : devMode ? "🔄 Server prüfen" : "🧪 Entwicklungsmodus"}
        </button>
      </h1>

      {/* Server Connection Status */}
      {!serverOnline && devMode && (
        <div className="ios-card mb-4 bg-yellow-900/20 border border-yellow-700">
          <h2 className="text-yellow-400 mb-2">⚠️ Keine Verbindung zum Server</h2>
          <p className="text-sm text-yellow-300">
            Bitte starte das Backend: <code className="bg-gray-800 px-2 py-1 rounded">python3 server.py</code>
          </p>
          <p className="text-sm text-yellow-300 mt-1">
            API-URL: <code className="bg-gray-800 px-2 py-1 rounded">{apiBaseUrl}</code>
          </p>
          <button
            onClick={checkServerConnection}
            className="ios-button mt-2 bg-yellow-600 hover:bg-yellow-700"
          >
            🔄 Verbindung erneut prüfen
          </button>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      {serverOnline && (
        <div className="ios-card mb-4">
          <nav className="flex items-center gap-2 text-sm">
            <button
              onClick={handleGoRoot}
              className="text-blue-400 hover:text-blue-300"
            >
              🏠 Root
            </button>
            {currentPath && (
              <>
                <span className="text-gray-500">/</span>
                {getPathDisplay()}
              </>
            )}
            {pathHistory.length > 0 && (
              <button
                onClick={handleGoBack}
                className="text-gray-400 hover:text-white ml-auto"
                title="Zurück"
              >
                ← Zurück
              </button>
            )}
          </nav>
        </div>
      )}

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
        <h2 className="text-lg font-medium mb-4">
          📁 Dateien im Server
          <span className="text-sm text-gray-500 ml-2">
            {files.length} Elemente
          </span>
        </h2>
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
            onRefresh={() => fetchFiles(currentPath)}
            devMode={devMode}
            currentPath={currentPath}
            onNavigate={handleEnterDir}
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
