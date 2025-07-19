import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';
import './FileUpload.css';

const FileUpload = ({ onFileSelect }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file
      if (file.size === 0) {
        alert('Error: Selected file is empty (0 bytes)');
        return;
      }

      setSelectedFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }
      
      if (onFileSelect) {
        onFileSelect(file);
      }
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      // Validate file
      if (file.size === 0) {
        alert('Error: Dropped file is empty (0 bytes)');
        return;
      }

      setSelectedFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }
      
      if (onFileSelect) {
        onFileSelect(file);
      }
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onFileSelect) {
      onFileSelect(null);
    }
  };

  const selectDifferentFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = () => {
    if (!selectedFile) return <Upload className="h-12 w-12 text-gray-400" />;
    
    if (selectedFile.type.startsWith('image/')) {
      return <ImageIcon className="h-12 w-12 text-blue-500" />;
    }
    return <FileText className="h-12 w-12 text-gray-500" />;
  };

  return (
    <div className="file-upload-container">
      <h3>Upload Document</h3>
      
      {!selectedFile ? (
        <div
          className="upload-area"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="upload-icon" />
          <p>Drag and drop your file here, or click to browse</p>
          <span className="file-types">Supported: All file types</span>
        </div>
      ) : (
        <div className="file-selected">
          <div className="file-preview">
            {preview ? (
              <img src={preview} alt="Preview" className="image-preview" />
            ) : (
              getFileIcon()
            )}
          </div>
          
          <div className="file-details">
            <h4>{selectedFile.name}</h4>
            <p>{formatFileSize(selectedFile.size)}</p>
            <p className="file-type">{selectedFile.type || 'Unknown type'}</p>
          </div>
          
          <button className="remove-file" onClick={removeFile}>
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      
      {selectedFile && (
        <button className="select-different" onClick={selectDifferentFile}>
          Select Different File
        </button>
      )}
    </div>
  );
};

export default FileUpload;