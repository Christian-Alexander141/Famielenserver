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
      setError("Bitte zuerst Dateien oder Ordner auswählen.");
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
          await new Promise(resolve => setTimeout(resolve, 500));
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

  const handleSelectFiles = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="upload-row">
      <input
        type="file"
        ref={fileInputRef}
        id="fileInput"
        onChange={handleFileChange}
        multiple
        // @ts-ignore - webkitdirectory and directory are browser-specific attributes
        webkitdirectory=""
        directory=""
        className="hidden"
      />
      
      <button
        onClick={handleSelectFiles}
        className="ios-button"
        disabled={uploading}
      >
        📁 Dateien/Ordner auswählen
      </button>
      
      <span 
        id="fileName"
        className="text-sm text-gray-400 min-w-[120px] max-w-[300px] truncate"
      >
        {getFileNameDisplay()}
      </span>
      
      <button
        onClick={handleUpload}
        className="ios-button"
        disabled={!selectedFiles || uploading}
      >
        {uploading ? (
          <span>⬆️ Hochladen... {uploadProgress}%</span>
        ) : (
          <span>⬆️ Hochladen</span>
        )}
      </button>

      {error && (
        <div className="text-red-500 text-sm mt-2 break-all">
          {error}
        </div>
      )}
      
      {uploading && (
        <div className="text-green-500 text-sm mt-2">
          {uploadProgress < 100 ? `Lade hoch: ${uploadProgress}%` : "Fertig!"}
        </div>
      )}
    </div>
  );
}
