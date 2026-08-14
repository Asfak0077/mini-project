import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, File, Image as ImageIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import apiClient from '../../services/apiClient';

interface FileUploadProps {
  onUploadComplete: (files: Array<{ filename: string; url: string }>) => void;
  maxFiles?: number;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete, maxFiles = 5 }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ filename: string; url: string }>>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFileList = (files: File[]) => {
    if (selectedFiles.length + files.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const validFiles = files.filter(file => {
      const isValid = ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type);
      const isSmall = file.size <= 5 * 1024 * 1024;
      return isValid && isSmall;
    });

    if (validFiles.length < files.length) {
      setError('Some files were rejected. Only JPG, PNG, and PDF < 5MB allowed.');
    } else {
      setError(null);
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFileList(Array.from(e.target.files));
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFileList(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;
    
    setUploading(true);
    setError(null);
    
    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      const { data } = await apiClient.post('/upload/multiple', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (data.success) {
        setUploadedFiles(data.files);
        onUploadComplete(data.files);
        setSelectedFiles([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div 
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative cursor-pointer flex flex-col items-center justify-center
          border-2 border-dashed rounded-2xl p-6 text-center
          transition-colors duration-150
          ${isDragOver
            ? 'border-[var(--primary)] bg-[var(--primary-subtle)]'
            : 'border-[var(--border)] bg-[var(--surface-secondary)] hover:border-[var(--primary-border)] hover:bg-[var(--surface-hover)]'
          }
        `}
      >
        <div className="p-3 rounded-2xl bg-[var(--primary-subtle)] mb-3 text-[var(--primary)]">
          <Upload className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-[var(--text-heading)] mb-1">
          Click to upload evidence
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          JPG, PNG or PDF up to 5 MB
        </p>
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden" 
          multiple
          accept=".jpg,.jpeg,.png,.pdf"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--danger-subtle)] border border-[var(--danger)]/30 text-[var(--danger)] text-xs font-semibold">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1">
            Selected Files ({selectedFiles.length}/{maxFiles})
          </p>
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
            <AnimatePresence>
              {selectedFiles.map((file, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-[var(--card)] border border-[var(--border)]"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    {file.type.startsWith('image/')
                      ? <ImageIcon className="h-4 w-4 text-[var(--primary)] shrink-0" />
                      : <File className="h-4 w-4 text-[var(--secondary)] shrink-0" />
                    }
                    <span className="text-xs text-[var(--text-heading)] font-medium truncate">{file.name}</span>
                  </div>
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                    className="p-1 rounded-md hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-heading)] transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <button
            type="button"
            onClick={uploadFiles}
            disabled={uploading}
            className="w-full mt-2 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider transition-colors shadow-sm"
          >
            {uploading ? 'Uploading Evidence...' : 'Attach Selected Files'}
          </button>
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--success-subtle)] border border-[var(--success)]/30 text-[var(--success)] text-xs font-semibold">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{uploadedFiles.length} file(s) attached successfully</span>
        </div>
      )}
    </div>
  );
};

export default FileUpload;

