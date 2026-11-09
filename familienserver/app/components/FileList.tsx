"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";

interface FileItem {
  name: string;
  path: string;
  size: number;
  type: 'file' | 'directory';
  extension?: string;
  children?: FileItem[];
}

interface FileListProps {
  files: FileItem[];
  apiBaseUrl: string;
  onDelete: (path: string) => void;
  onRefresh: () => void;
  devMode: boolean;
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

export default function FileList({ 
  files: initialFiles, 
  apiBaseUrl, 
  onDelete, 
  onRefresh,
  devMode,
  currentPath = "",
  onNavigate
}: FileListProps) {
  const [items, setItems] = useState<FileItem[]>(initialFiles);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<string | null>(null);
  const [showCreateDir, setShowCreateDir] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState<string | null>(null);
  const [showRenameDialog, setShowRenameDialog] = useState<string | null>(null);
  const [newDirName, setNewDirName] = useState("");
  const [moveSource, setMoveSource] = useState<string | null>(null);
  const [moveDestination, setMoveDestination] = useState<string>("");
  const [renameName, setRenameName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Aktualisiere Items wenn Props ändern
  useEffect(() => {
    setItems(initialFiles);
  }, [initialFiles]);

  // Schließe Dialoge wenn geklickt wird
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        setShowCreateDir(false);
        setShowMoveDialog(null);
        setShowRenameDialog(null);
      }
    };
    
    if (showCreateDir || showMoveDialog || showRenameDialog) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCreateDir, showMoveDialog, showRenameDialog]);

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "-";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Get file icon based on type and extension
  const getFileIcon = (item: FileItem) => {
    if (item.type === 'directory') return "📁";
    
    const extension = item.extension?.toLowerCase();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    const documentExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'odt', 'rtf'];
    const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
    const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'flac'];
    const archiveExtensions = ['zip', 'rar', '7z', 'tar', 'gz'];
    
    if (imageExtensions.includes(extension || '')) return "🖼️";
    if (documentExtensions.includes(extension || '')) return "📄";
    if (videoExtensions.includes(extension || '')) return "🎥";
    if (audioExtensions.includes(extension || '')) return "🎵";
    if (archiveExtensions.includes(extension || '')) return "🗄️";
    return "📎";
  };

  // Create directory
  const handleCreateDir = async () => {
    if (!newDirName.trim()) {
      setError("Bitte geben Sie einen Ordnernamen ein");
      return;
    }
    
    try {
      const path = currentPath ? `${currentPath}/${newDirName}` : newDirName;
      console.log("Creating dir with path:", path, "currentPath:", currentPath);  // Debug
      const response = await axios.post(`${apiBaseUrl}/api/mkdir`, { path });
      
      console.log("Mkdir response:", response.data);  // Debug
      
      if (response.data.success) {
        setShowCreateDir(false);
        setNewDirName("");
        setSuccess("Ordner erstellt!");
        onRefresh();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.data.error || "Fehler beim Erstellen des Ordners");
      }
    } catch (err) {
      setError("Fehler beim Erstellen des Ordners");
      console.error("Mkdir error:", err);
    }
  };

  // Move or rename item
  const handleMove = async () => {
    if (!moveSource || !moveDestination.trim()) {
      setError("Bitte geben Sie ein Ziel an");
      return;
    }
    
    try {
      const response = await axios.post(`${apiBaseUrl}/api/move`, {
        source: moveSource,
        destination: currentPath ? `${currentPath}/${moveDestination}` : moveDestination
      });
      
      if (response.data.success) {
        setShowMoveDialog(null);
        setMoveSource(null);
        setMoveDestination("");
        setSuccess("Datei/Ordner verschoben!");
        onRefresh();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError("Fehler beim Verschieben");
      console.error("Move error:", err);
    }
  };

  // Rename item (special case of move)
  const handleRename = async () => {
    if (!renameName.trim()) {
      setError("Bitte geben Sie einen neuen Namen ein");
      return;
    }
    
    try {
      const oldPath = showRenameDialog;
      const newPath = currentPath ? `${currentPath}/${renameName}` : renameName;
      
      const response = await axios.post(`${apiBaseUrl}/api/move`, {
        source: oldPath,
        destination: newPath
      });
      
      if (response.data.success) {
        setShowRenameDialog(null);
        setRenameName("");
        setSuccess("Umbenannt!");
        onRefresh();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError("Fehler beim Umbenennen");
      console.error("Rename error:", err);
    }
  };

  // Delete item with confirmation
  const confirmDelete = (path: string, name: string) => {
    setShowDeleteConfirmation(path);
  };

  const executeDelete = async (path: string) => {
    setDeleting(path);
    setShowDeleteConfirmation(null);
    
    try {
      await onDelete(path);
      setSuccess("Gelöscht!");
      setTimeout(() => setSuccess(null), 3000);
    } finally {
      setDeleting(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirmation(null);
  };

  // Download file
  const handleDownload = (path: string, isDirectory: boolean) => {
    if (devMode) {
      alert("Download im Entwicklungsmodus nicht verfügbar. Bitte wechseln Sie zum Produktivmodus.");
      return;
    }
    
    if (isDirectory) {
      // Download as ZIP
      window.open(`${apiBaseUrl}/api/download-zip/${encodeURIComponent(path)}`, '_blank');
    } else {
      // Download single file
      window.open(`${apiBaseUrl}/api/download/${encodeURIComponent(path)}`, '_blank');
    }
  };

  // Enter directory
  const handleEnterDir = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      console.log("Enter directory:", path);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, itemPath: string, isDirectory: boolean) => {
    if (devMode) {
      e.preventDefault();
      return;
    }
    if (!isDirectory) {
      setDraggedItem(itemPath);
      e.dataTransfer.setData('text/plain', itemPath);
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (e: React.DragEvent, itemPath: string, isDirectory: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDirectory && draggedItem && draggedItem !== itemPath) {
      setDragOverItem(itemPath);
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverItem(null);
  };

  const handleDrop = async (e: React.DragEvent, targetPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverItem(null);
    
    if (devMode || !draggedItem) return;
    
    const sourcePath = draggedItem;
    setDraggedItem(null);
    
    // Zielpfad: wenn targetPath ein Ordner ist, dann verschiebe in diesen Ordner
    // Neuer Pfad = targetPath/sourceName
    const sourceName = sourcePath.split('/').pop();
    const destinationPath = targetPath.endsWith('/') 
      ? `${targetPath}${sourceName}`
      : `${targetPath}/${sourceName}`;
    
    try {
      const response = await axios.post(`${apiBaseUrl}/api/move`, {
        source: sourcePath,
        destination: destinationPath
      });
      
      if (response.data.success) {
        setSuccess(`"${sourceName}" nach "${targetPath}" verschoben!`);
        onRefresh();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError("Fehler beim Verschieben");
      console.error("Drop move error:", err);
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  // Open move dialog
  const openMoveDialog = (path: string, name: string) => {
    setMoveSource(path);
    setMoveDestination(name);
    setShowMoveDialog(path);
  };

  // Open rename dialog
  const openRenameDialog = (path: string, name: string) => {
    setRenameName(name);
    setShowRenameDialog(path);
  };

  return (
    <div>
      {/* Erfolg/Fehler Meldungen */}
      {success && (
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-3 mb-4 text-green-400">
          ✅ {success}
        </div>
      )}
      
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-4 text-red-400">
          ❌ {error}
        </div>
      )}

      {/* Aktueller Pfad anzeigen */}
      {currentPath && (
        <div className="bg-gray-800 rounded-lg p-3 mb-4">
          <p className="text-sm text-gray-400">
            Aktueller Pfad: <code className="text-blue-400">/uploads/{currentPath}</code>
          </p>
        </div>
      )}

      {/* Dateiliste */}
      {items.length === 0 ? (
        <p className="text-gray-400 italic text-center py-4">
          {devMode ? "Keine Verbindung zum Server - Dateien werden nicht angezeigt" : "Keine Dateien im aktuellen Ordner"}
        </p>
      ) : (
        <ul className="file-list space-y-2">
          {items.map((item) => {
            const isDragging = draggedItem === item.path;
            const isDragOver = dragOverItem === item.path && item.type === 'directory';
            
            return (
              <li 
                key={item.path}
                className={`flex items-center justify-between group p-2 rounded-lg transition-colors ${
                  isDragging ? 'bg-blue-900/50 opacity-50' : ''
                } ${isDragOver ? 'bg-green-900/30 border-2 border-green-600' : 'hover:bg-gray-800'}`}
                draggable={!devMode && item.type === 'file'}
                onDragStart={(e) => handleDragStart(e, item.path, item.type === 'directory')}
                onDragOver={(e) => handleDragOver(e, item.path, item.type === 'directory')}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, item.path)}
                onDragEnd={handleDragEnd}
              >
                <div className="flex items-center gap-3 flex-1 overflow-hidden">
                  <span className="text-xl">{getFileIcon(item)}</span>
                  <div className="overflow-hidden">
                    <button
                      onClick={() => {
                        if (item.type === 'directory') {
                          handleEnterDir(item.path);
                        } else {
                          handleDownload(item.path, false);
                        }
                      }}
                      className="text-left hover:underline text-blue-400 hover:text-blue-300 transition-colors truncate"
                    >
                      {item.name}
                    </button>
                    {item.type === 'file' && (
                      <div className="text-xs text-gray-500">
                        {formatFileSize(item.size)}
                      </div>
                    )}
                    {item.type === 'directory' && isDragOver && (
                      <div className="text-xs text-green-400 mt-1">
                        Drop hier zum Verschieben
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Download Button */}
                  <button
                    onClick={() => handleDownload(item.path, item.type === 'directory')}
                    className="text-blue-500 hover:text-blue-400 transition-colors"
                    title={item.type === 'directory' ? "Ordner als ZIP herunterladen" : "Datei herunterladen"}
                    disabled={devMode}
                  >
                    ⬇️
                  </button>
                  
                  {/* Rename Button */}
                  <button
                    onClick={() => openRenameDialog(item.path, item.name)}
                    className="text-yellow-500 hover:text-yellow-400 transition-colors"
                    title="Umbenennen"
                    disabled={devMode}
                  >
                    ✏️
                  </button>
                  
                  {/* Move Button */}
                  <button
                    onClick={() => openMoveDialog(item.path, item.name)}
                    className="text-purple-500 hover:text-purple-400 transition-colors"
                    title="Verschieben"
                    disabled={devMode}
                  >
                    🔄
                  </button>
                  
                  {/* Delete Button */}
                  <button
                    onClick={() => confirmDelete(item.path, item.name)}
                    className="text-red-500 hover:text-red-400 transition-colors"
                    title="Löschen"
                    disabled={devMode || deleting === item.path}
                  >
                    {deleting === item.path ? "..." : "🗑️"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Drag & Drop Hinweis */}
      {!devMode && items.length > 0 && (
        <div className="mt-4 p-3 bg-gray-800 rounded-lg text-sm text-gray-400">
          💡 **Tipp:** Dateien können per Drag & Drop in Ordner verschoben werden
        </div>
      )}

      {/* Aktions-Buttons */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setShowCreateDir(true)}
          className="ios-button bg-green-600 hover:bg-green-700 flex-1"
          disabled={devMode}
        >
          📁 Neuer Ordner
        </button>
        <button
          onClick={onRefresh}
          className="ios-button flex-1"
        >
          🔄 Aktualisieren
        </button>
      </div>

      {/* Create Directory Dialog */}
      {showCreateDir && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div ref={dialogRef} className="ios-card max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Neuer Ordner erstellen</h3>
            <input
              type="text"
              value={newDirName}
              onChange={(e) => setNewDirName(e.target.value)}
              placeholder="Ordnername"
              className="ios-input mb-4"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateDir()}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCreateDir(false);
                  setNewDirName("");
                  setError(null);
                }}
                className="ios-button bg-gray-600 hover:bg-gray-700"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreateDir}
                className="ios-button bg-green-600 hover:bg-green-700"
              >
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Dialog */}
      {showMoveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div ref={dialogRef} className="ios-card max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Datei/Ordner verschieben</h3>
            <p className="mb-4 text-sm text-gray-400">
              Verschiebe: <strong>{moveSource?.split('/').pop()}</strong>
            </p>
            <input
              type="text"
              value={moveDestination}
              onChange={(e) => setMoveDestination(e.target.value)}
              placeholder="Zielpfad (z.B. ordner/unterordner/neuer_name)"
              className="ios-input mb-4"
              onKeyDown={(e) => e.key === 'Enter' && handleMove()}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowMoveDialog(null);
                  setMoveSource(null);
                  setMoveDestination("");
                  setError(null);
                }}
                className="ios-button bg-gray-600 hover:bg-gray-700"
              >
                Abbrechen
              </button>
              <button
                onClick={handleMove}
                className="ios-button bg-purple-600 hover:bg-purple-700"
              >
                Verschieben
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Dialog */}
      {showRenameDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div ref={dialogRef} className="ios-card max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Umbenennen</h3>
            <p className="mb-4 text-sm text-gray-400">
              Umbenennen: <strong>{showRenameDialog?.split('/').pop()}</strong>
            </p>
            <input
              type="text"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              placeholder="Neuer Name"
              className="ios-input mb-4"
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowRenameDialog(null);
                  setRenameName("");
                  setError(null);
                }}
                className="ios-button bg-gray-600 hover:bg-gray-700"
              >
                Abbrechen
              </button>
              <button
                onClick={handleRename}
                className="ios-button bg-yellow-600 hover:bg-yellow-700"
              >
                Umbenennen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="ios-card max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Löschen bestätigen</h3>
            <p className="mb-6">
              Möchtest du wirklich <strong>{showDeleteConfirmation.split('/').pop()}</strong> löschen?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDelete}
                className="ios-button bg-gray-600 hover:bg-gray-700"
              >
                Abbrechen
              </button>
              <button
                onClick={() => executeDelete(showDeleteConfirmation)}
                className="ios-button bg-red-600 hover:bg-red-700"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
