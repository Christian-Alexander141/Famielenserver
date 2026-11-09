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
      const file = selectedFiles[0];
      // @ts-ignore - webkitRelativePath exists on File in some browsers
      return file.webkitRelativePath || file.name;
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
        
        // @ts-ignore - webkitRelativePath exists on File in some browsers
        const filePath = file.webkitRelativePath || file.name;
        formData.append("file", file, filePath);

        if (devMode) {
          // In Entwicklungsmodus: simulierter Upload
          await new Promise(resolve => setTimeout(resolve, 200));
          return { success: true, filename: filePath };
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
      
      // Reset file input
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

  return (
    <div className="space-y-4">
      {/* File input and buttons in a row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* File input - visible so user can see it's clickable */}
        <input
          type="file"
          ref={fileInputRef}
          id="fileInput"
          onChange={handleFileChange}
          multiple
          // Use webkitdirectory for directory selection (Chrome, Edge, Opera, Safari)
          // Note: Firefox does not support directory selection
          webkitdirectory=""
          className="block w-full max-w-md text-sm text-gray-400"
          accept="*"
        />
        
        {/* Upload button - disabled only when no files selected or uploading */}
        <button
          onClick={handleUpload}
          className="ios-button flex-shrink-0"
          disabled={!selectedFiles || uploading}
        >
          {uploading ? (
            <span>⬆️ Hochladen... {uploadProgress}%</span>
          ) : (
            <span>⬆️ Hochladen</span>
          )}
        </button>
      </div>

      {/* Selected files display */}
      {selectedFiles && selectedFiles.length > 0 && (
        <div className="text-sm text-gray-400">
          {getFileNameDisplay()}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="text-red-500 text-sm">
          {error}
        </div>
      )}
      
      {/* Upload progress */}
      {uploading && (
        <div className="text-green-500 text-sm">
          {uploadProgress < 100 ? `Lade hoch: ${uploadProgress}%` : "Fertig!"}
        </div>
      )}

      {/* Browser compatibility notice */}
      <div className="text-xs text-gray-500">
        <p>
          💡 <strong>Hinweis:</strong> 
          In Chrome, Edge, Opera und Safari können Sie ganze Ordner auswählen. 
          In Firefox können nur einzelne Dateien hochgeladen werden.
        </p>
      </div>
    </div>
  );
}
