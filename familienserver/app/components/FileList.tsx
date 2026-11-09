"use client";

import { useState } from "react";

interface FileItem {
  name: string;
  path: string;
  size: number;
}

interface FileListProps {
  files: FileItem[];
  apiBaseUrl: string;
  onDelete: (filename: string) => void;
  devMode: boolean;
}

export default function FileList({ files, apiBaseUrl, onDelete, devMode }: FileListProps) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<string | null>(null);

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Get file icon based on extension
  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    const documentExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md'];
    const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
    const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a'];
    const archiveExtensions = ['zip', 'rar', '7z', 'tar', 'gz'];
    
    if (imageExtensions.includes(extension || '')) return "🖼️";
    if (documentExtensions.includes(extension || '')) return "📄";
    if (videoExtensions.includes(extension || '')) return "🎥";
    if (audioExtensions.includes(extension || '')) return "🎵";
    if (archiveExtensions.includes(extension || '')) return "🗄️";
    if (filename.endsWith('/') || filename.includes('/')) return "📁";
    return "📎";
  };

  // Handle download
  const handleDownload = (filename: string) => {
    if (devMode) {
      alert("Download im Entwicklungsmodus nicht verfügbar. Bitte wechseln Sie zum Produktivmodus.");
      return;
    }
    
    // Open download in new tab
    const downloadUrl = `${apiBaseUrl}/api/download/${encodeURIComponent(filename)}`;
    window.open(downloadUrl, '_blank');
  };

  // Handle delete with confirmation
  const confirmDelete = (filename: string) => {
    setShowDeleteConfirmation(filename);
  };

  const executeDelete = async (filename: string) => {
    setDeleting(filename);
    setShowDeleteConfirmation(null);
    
    try {
      await onDelete(filename);
    } finally {
      setDeleting(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirmation(null);
  };

  return (
    <div>
      {files.length === 0 ? (
        <p className="text-gray-400 italic">
          {devMode ? "Keine Verbindung zum Server - Dateien werden nicht angezeigt" : "Keine Dateien hochgeladen"}
        </p>
      ) : (
        <ul className="file-list">
          {files.map((file) => (
            <li key={file.path} className="flex items-center justify-between group">
              <div className="flex items-center gap-3 flex-1 overflow-hidden">
                <span className="text-xl">{getFileIcon(file.name)}</span>
                <div className="overflow-hidden">
                  <button
                    onClick={() => handleDownload(file.path)}
                    className="text-left hover:underline text-blue-500 hover:text-blue-400 transition-colors"
                  >
                    {file.name}
                  </button>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDownload(file.path)}
                  className="text-blue-500 hover:text-blue-400 transition-colors"
                  title="Herunterladen"
                  disabled={devMode}
                >
                  ⬇️
                </button>
                <button
                  onClick={() => confirmDelete(file.path)}
                  className="text-red-500 hover:text-red-400 transition-colors"
                  title="Löschen"
                  disabled={devMode || deleting === file.path}
                >
                  {deleting === file.path ? "..." : "🗑️"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="ios-card max-w-sm mx-4">
            <h3 className="text-lg font-medium mb-4">Datei löschen</h3>
            <p className="mb-6">
              Möchten Sie wirklich <strong>{showDeleteConfirmation}</strong> löschen?
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
                className="ios-button bg-red-500 hover:bg-red-600"
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
