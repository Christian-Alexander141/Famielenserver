"use client";

import { useState, useRef, ChangeEvent } from "react";
import axios from "axios";

interface FileUploadProps {
  apiBaseUrl: string;
  onUploadSuccess: () => void;
  devMode: boolean;
}

export default function FileUpload({ apiBaseUrl, onUploadSuccess, devMode }: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFiles(files);
      setError(null);
    } else {
      setSelectedFiles(null);
    }
  };

  const getFileNameDisplay = () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      return "Keine Dateien gewählt";
    }
    
    if (selectedFiles.length === 1) {
      return selectedFiles[0].name;
    }
    
    return `${selectedFiles.length} Dateien ausgewählt`;
  };

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      setError("Bitte zuerst Dateien auswählen.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const uploadPromises = Array.from(selectedFiles).map(async (file, index) => {
        const formData = new FormData();
        formData.append("file", file, file.name);

        if (devMode) {
          await new Promise(resolve => setTimeout(resolve, 200));
          return { success: true, filename: file.name };
        }

        const response = await axios.post(`${apiBaseUrl}/api/upload`, formData, {
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              ((index + 1) / selectedFiles.length) * 100
            );
            setUploadProgress(progress);
          },
        });
        return response.data;
      });

      await Promise.all(uploadPromises);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSelectedFiles(null);
      setUploadProgress(100);
      
      onUploadSuccess();
      
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 1000);
      
    } catch (err) {
      console.error("Upload Fehler:", err);
      setError("Fehler beim Hochladen der Dateien. Bitte versuchen Sie es erneut.");
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSelectFiles = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-3">
      {/* Haupt-Button zum Datei-Auswählen */}
      <button
        onClick={handleSelectFiles}
        className="ios-button w-full"
      >
        📁 Dateien auswählen
      </button>

      {/* Versteckter File Input - wird durch Button ausgelöst */}
      <input
        type="file"
        ref={fileInputRef}
        id="fileInput"
        onChange={handleFileChange}
        multiple
        style={{ display: 'none' }}  // Versteckt, aber funktioniert mit Button
      />

      {/* Ausgewählte Dateien anzeigen */}
      {selectedFiles && selectedFiles.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-3">
          <p className="text-sm text-white">
            <strong>Ausgewählt:</strong> {getFileNameDisplay()}
          </p>
        </div>
      )}

      {/* Upload-Button - nur aktiv, wenn Dateien ausgewählt */}
      <button
        onClick={handleUpload}
        className="ios-button w-full"
        disabled={!selectedFiles || uploading}
      >
        {uploading ? (
          <span>⬆️ Hochladen... {uploadProgress}%</span>
        ) : (
          <span>⬆️ Hochladen</span>
        )}
      </button>

      {/* Fehler anzeigen */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-2 text-red-400 text-sm">
          ❌ {error}
        </div>
      )}
      
      {/* Fortschritt anzeigen */}
      {uploading && uploadProgress > 0 && (
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-2 text-green-400 text-sm">
          ✅ {uploadProgress < 100 ? `Lädt hoch: ${uploadProgress}%` : "Fertig! Aktualisiere die Seite..."}
        </div>
      )}

      {/* Browser-Hinweis */}
      <div className="text-xs text-gray-500 text-center pt-2">
        Klicken Sie auf "Dateien auswählen" um Dateien von Ihrem Computer hochzuladen
      </div>
    </div>
  );
}
