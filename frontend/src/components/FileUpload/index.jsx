import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileText, Scan } from 'lucide-react';

const FileUpload = ({ onFileSelect }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const processFile = (file) => {
    if (!file || file.size === 0) return;
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
    onFileSelect?.(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onFileSelect?.(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (selectedFile) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-4 p-4 rounded-lg bg-surface-950/60 border border-white/[0.06]">
          {preview ? (
            <img src={preview} alt="Preview" className="w-14 h-14 rounded-lg object-cover border border-white/[0.1]" />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-accent-500/10 border border-accent-500/20 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-accent-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{selectedFile.name}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</span>
              <span className="text-xs text-slate-600">{selectedFile.type || 'Unknown type'}</span>
            </div>
          </div>
          <button onClick={removeFile} className="btn-ghost p-2 text-slate-500 hover:text-rose-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn-ghost text-xs"
        >
          Select different file
        </button>
        <input ref={fileInputRef} type="file" onChange={(e) => processFile(e.target.files[0])} className="hidden" />
      </motion.div>
    );
  }

  return (
    <div>
      <motion.div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => fileInputRef.current?.click()}
        animate={isDragging ? { scale: 1.02 } : { scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={`relative rounded-xl p-8 text-center cursor-pointer transition-all duration-300 group overflow-hidden
          ${isDragging
            ? 'animated-dash-border-active bg-accent-500/[0.04] shadow-glow-amber'
            : 'animated-dash-border hover:bg-white/[0.02]'
          }`}
      >
        {/* Scanning effect overlay on drag */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none z-10"
            >
              <motion.div
                className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent-400/60 to-transparent"
                animate={{ top: ['0%', '100%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              />
              <div className="absolute inset-0 bg-accent-500/[0.03]" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating icon */}
        <div className={`w-14 h-14 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4 transition-all duration-300 ${isDragging ? 'border-accent-500/30 shadow-glow-sm' : 'group-hover:border-accent-500/20'}`}>
          {isDragging ? (
            <Scan className="w-6 h-6 text-accent-400 animate-pulse" />
          ) : (
            <Upload className="w-6 h-6 text-slate-500 group-hover:text-slate-400 transition-colors animate-float" />
          )}
        </div>
        <p className="text-sm text-slate-300 font-medium relative z-10">
          {isDragging ? (
            <span className="text-accent-400">Scanning... drop to upload</span>
          ) : (
            'Drag & drop your file here'
          )}
        </p>
        <p className="text-xs text-slate-500 mt-1 relative z-10">or click to browse</p>
        <p className="text-[10px] text-slate-600 mt-3 uppercase tracking-wider relative z-10">All file types supported</p>
      </motion.div>
      <input ref={fileInputRef} type="file" onChange={(e) => processFile(e.target.files[0])} className="hidden" />
    </div>
  );
};

export default FileUpload;
