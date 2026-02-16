import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Eye, 
  Download, 
  X, 
  FileText, 
  Image as ImageIcon, 
  File,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Copy,
  Lock
} from 'lucide-react';
import PDFViewer from './PDFViewer';
import WordViewer from './WordViewer';
import ExcelViewer from './ExcelViewer';
import './DocumentViewer.css';

const DocumentViewer = ({ 
  documentData, 
  fileName, 
  onClose, 
  accessLevel = 'full_access',
  allowDownload = true 
}) => {
  console.log('DocumentViewer component mounted with props:', {
    hasDocumentData: !!documentData,
    fileName,
    accessLevel,
    allowDownload
  });
  const [viewMode, setViewMode] = useState('preview');
  const [imageScale, setImageScale] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [textContent, setTextContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dataURL, setDataURL] = useState(null);

  // Define helper functions first
  const getMimeType = (extension) => {
    const mimeTypes = {
      // Images
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'bmp': 'image/bmp',
      'ico': 'image/x-icon',
      
      // Documents
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      
      // Text files
      'txt': 'text/plain',
      'md': 'text/markdown',
      'json': 'application/json',
      'xml': 'application/xml',
      'csv': 'text/csv',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'text/javascript',
      'jsx': 'text/jsx',
      'ts': 'text/typescript',
      'tsx': 'text/tsx',
      'py': 'text/python',
      'java': 'text/java',
      'cpp': 'text/cpp',
      'c': 'text/c',
      'php': 'text/php',
      'sql': 'text/sql',
      'yaml': 'text/yaml',
      'yml': 'text/yaml',
      
      // Archives
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      
      // Audio/Video
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'mp4': 'video/mp4',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime'
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
  };

  const getFileCategory = (extension) => {
    const categories = {
      image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'],
      document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
      text: ['txt', 'md', 'json', 'xml', 'csv', 'html', 'css', 'yaml', 'yml'],
      code: ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'php', 'sql'],
      archive: ['zip', 'rar', '7z'],
      audio: ['mp3', 'wav', 'ogg'],
      video: ['mp4', 'avi', 'mov', 'mkv']
    };
    
    for (const [category, extensions] of Object.entries(categories)) {
      if (extensions.includes(extension)) {
        return category;
      }
    }
    return 'unknown';
  };

  // Determine file type from extension
  const fileInfo = useMemo(() => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const mimeType = getMimeType(extension);
    const category = getFileCategory(extension);
    
    return {
      extension,
      mimeType,
      category,
      name: fileName,
      size: documentData?.length || 0
    };
  }, [fileName, documentData]);

  // Define data URL functions before useEffects
  const createDataURLWithoutState = useCallback(() => {
    if (!documentData) {
      console.log('No document data available');
      return null;
    }
    
    console.log('Creating data URL for:', {
      dataType: typeof documentData,
      dataConstructor: documentData?.constructor?.name,
      dataLength: documentData?.length,
      mimeType: fileInfo.mimeType
    });
    
    try {
      let bytes;
      
      if (documentData instanceof Uint8Array) {
        // Already in the correct format
        bytes = documentData;
      } else if (typeof documentData === 'string') {
        // Base64 string - convert to bytes
        const binaryString = atob(documentData);
        bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
      } else {
        // Fallback - try to convert to Uint8Array
        console.warn('Unexpected data type, attempting conversion');
        bytes = new Uint8Array(documentData);
      }
      
      console.log('Creating blob with', bytes.length, 'bytes, type:', fileInfo.mimeType);
      const blob = new Blob([bytes], { type: fileInfo.mimeType });
      const newDataURL = URL.createObjectURL(blob);
      console.log('Created data URL:', newDataURL);
      return newDataURL;
    } catch (err) {
      console.error('Failed to create data URL:', err);
      return null;
    }
  }, [documentData, fileInfo.mimeType]);

  const createDataURL = useCallback(() => {
    const newDataURL = createDataURLWithoutState();
    if (newDataURL) {
      // Revoke previous data URL to prevent memory leaks
      setDataURL(prevDataURL => {
        if (prevDataURL) {
          URL.revokeObjectURL(prevDataURL);
        }
        return newDataURL;
      });
    }
    return newDataURL;
  }, [createDataURLWithoutState]);

  useEffect(() => {
    if (documentData) {
      processDocument();
    }
  }, [documentData, fileInfo]);

  // Create data URL when needed
  useEffect(() => {
    if (documentData && !loading && !error && fileInfo.category === 'image') {
      createDataURL();
    }
    
    // Cleanup function to revoke object URLs
    return () => {
      if (dataURL) {
        URL.revokeObjectURL(dataURL);
      }
    };
  }, [documentData, fileInfo.category, loading, error, createDataURL]);
  
  useEffect(() => {
    // Cleanup data URL when component unmounts or dataURL changes
    return () => {
      if (dataURL) {
        URL.revokeObjectURL(dataURL);
      }
    };
  }, [dataURL]);

  const processDocument = async () => {
    setLoading(true);
    setError('');
    
    console.log('DocumentViewer processDocument:', {
      fileName,
      dataType: typeof documentData,
      dataConstructor: documentData?.constructor?.name,
      dataLength: documentData?.length,
      fileCategory: fileInfo.category,
      fileExtension: fileInfo.extension
    });
    
    try {
      // Process based on file category
      switch (fileInfo.category) {
        case 'text':
        case 'code':
          // For text files, decode the binary data to text
          let textData;
          if (documentData instanceof Uint8Array) {
            textData = new TextDecoder('utf-8').decode(documentData);
          } else if (typeof documentData === 'string') {
            textData = documentData;
          } else {
            textData = String(documentData);
          }
          console.log('Setting text content, length:', textData.length);
          setTextContent(textData);
          break;
          
        case 'image':
          // Images will be handled by createDataURL - binary data should be preserved
          console.log('Image detected, will use createDataURL');
          break;
          
        case 'document':
          console.log('Document detected, will be handled by renderPreview');
          // Document preview will be handled in renderPreview function
          break;
          
        default:
          setError('Preview not available for this file type');
      }
      
    } catch (err) {
      console.error('Document processing error:', err);
      setError('Failed to process document: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!allowDownload) {
      alert('Download is not allowed for your access level');
      return;
    }
    
    // Create a temporary data URL for download without setting state
    const downloadDataURL = createDataURLWithoutState();
    if (downloadDataURL) {
      const a = document.createElement('a');
      a.href = downloadDataURL;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(downloadDataURL);
    }
  };

  const handleImageZoom = (factor) => {
    setImageScale(prev => Math.max(0.1, Math.min(5, prev * factor)));
  };

  const handleImageRotate = () => {
    setImageRotation(prev => (prev + 90) % 360);
  };

  const copyToClipboard = async () => {
    if (fileInfo.category === 'text' || fileInfo.category === 'code') {
      try {
        await navigator.clipboard.writeText(textContent);
        alert('Content copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const renderPreview = () => {
    console.log('renderPreview called:', { loading, error, fileCategory: fileInfo.category });
    
    if (loading) {
      console.log('Showing loading state');
      return (
        <div className="preview-loading">
          <div className="spinner"></div>
          <p>Processing document...</p>
        </div>
      );
    }

    if (error) {
      console.log('Showing error state:', error);
      return (
        <div className="preview-error">
          <File className="h-16 w-16 text-gray-400" />
          <h3>Preview Not Available</h3>
          <p>{error}</p>
          {allowDownload && (
            <button className="download-btn" onClick={handleDownload}>
              <Download className="h-4 w-4" />
              Download to View
            </button>
          )}
        </div>
      );
    }

    console.log('Switch statement, category:', fileInfo.category, 'dataURL:', dataURL ? 'available' : 'null');

    switch (fileInfo.category) {
      case 'image':
        if (!dataURL) {
          console.error('No dataURL available for image');
          return (
            <div className="preview-error">
              <File className="h-16 w-16 text-gray-400" />
              <h3>Image Load Error</h3>
              <p>Failed to create image data URL</p>
            </div>
          );
        }
        
        console.log('Rendering image with dataURL');
        return (
          <div className="image-preview">
            <div className="image-controls">
              <button onClick={() => handleImageZoom(1.2)} title="Zoom In">
                <ZoomIn className="h-4 w-4" />
              </button>
              <button onClick={() => handleImageZoom(0.8)} title="Zoom Out">
                <ZoomOut className="h-4 w-4" />
              </button>
              <button onClick={handleImageRotate} title="Rotate">
                <RotateCw className="h-4 w-4" />
              </button>
              <button onClick={toggleFullscreen} title="Fullscreen">
                <Maximize2 className="h-4 w-4" />
              </button>
              <span className="zoom-level">{Math.round(imageScale * 100)}%</span>
            </div>
            <div className="image-container">
              <img
                src={dataURL}
                alt={fileName}
                style={{
                  transform: `scale(${imageScale}) rotate(${imageRotation}deg)`,
                  maxWidth: '100%',
                  maxHeight: '100%'
                }}
                onError={(e) => {
                  console.error('Image load error:', e);
                  setError('Failed to load image');
                }}
                onLoad={() => console.log('Image loaded successfully')}
              />
            </div>
          </div>
        );

      case 'text':
      case 'code':
        console.log('Rendering text/code, textContent length:', textContent?.length);
        if (!textContent || textContent.length === 0) {
          console.warn('No text content available');
          return (
            <div className="preview-error">
              <FileText className="h-16 w-16 text-gray-400" />
              <h3>No Content</h3>
              <p>Text content is empty or failed to process</p>
            </div>
          );
        }
        
        return (
          <div className="text-preview">
            <div className="text-controls">
              <button onClick={copyToClipboard} title="Copy to Clipboard">
                <Copy className="h-4 w-4" />
                Copy
              </button>
              <button onClick={toggleFullscreen} title="Fullscreen">
                <Maximize2 className="h-4 w-4" />
              </button>
              <span className="file-type">{fileInfo.extension.toUpperCase()}</span>
            </div>
            <div className="text-container">
              <pre className={`text-content ${fileInfo.category}`}>
                <code>{textContent}</code>
              </pre>
            </div>
          </div>
        );

      case 'document':
        if (fileInfo.extension === 'pdf') {
          console.log('Rendering PDF with PDFViewer');
          return (
            <PDFViewer
              documentData={documentData}
              fileName={fileName}
              onError={(error) => setError(error)}
            />
          );
        } else if (['doc', 'docx'].includes(fileInfo.extension)) {
          console.log('Rendering Word document with WordViewer');
          console.log('WordViewer component:', WordViewer);
          try {
            return (
              <WordViewer
                documentData={documentData}
                fileName={fileName}
                onError={(error) => setError(error)}
                allowDownload={allowDownload}
                onDownload={handleDownload}
              />
            );
          } catch (err) {
            console.error('WordViewer rendering error:', err);
            setError('Failed to load Word viewer: ' + err.message);
            return renderError();
          }
        } else if (['xls', 'xlsx'].includes(fileInfo.extension)) {
          console.log('Rendering Excel document with ExcelViewer');
          return (
            <ExcelViewer
              documentData={documentData}
              fileName={fileName}
              onError={(error) => setError(error)}
              allowDownload={allowDownload}
              onDownload={handleDownload}
            />
          );
        } else {
          // Handle other office documents (.pptx, etc.)
          const docTypeMap = {
            'ppt': 'PowerPoint Presentation',
            'pptx': 'PowerPoint Presentation'
          };
          
          const docType = docTypeMap[fileInfo.extension] || 'Office Document';
          
          return (
            <div className="pdf-preview">
              <div className="pdf-notice">
                <FileText className="h-16 w-16 text-blue-500" />
                <h3>{docType}</h3>
                <p>This document type is not yet supported for preview. Download the file to view it in the appropriate application.</p>
                {allowDownload && (
                  <button className="download-btn" onClick={handleDownload}>
                    <Download className="h-4 w-4" />
                    Download {fileInfo.extension.toUpperCase()}
                  </button>
                )}
              </div>
            </div>
          );
        }

      default:
        console.log('Rendering default/error case for unknown file type');
        return renderError();
    }
  };

  const renderError = () => (
    <div className="preview-error">
      <File className="h-16 w-16 text-gray-400" />
      <h3>Preview Not Available</h3>
      <p>This file type cannot be previewed in the browser.</p>
      {allowDownload && (
        <button className="download-btn" onClick={handleDownload}>
          <Download className="h-4 w-4" />
          Download File
        </button>
      )}
    </div>
  );

  const getFileIcon = () => {
    switch (fileInfo.category) {
      case 'image':
        return <ImageIcon className="h-5 w-5" />;
      case 'document':
        return <FileText className="h-5 w-5" />;
      default:
        return <File className="h-5 w-5" />;
    }
  };

  console.log('DocumentViewer rendering, fileName:', fileName, 'category:', fileInfo.category);
  
  return (
    <div className={`document-viewer ${isFullscreen ? 'fullscreen' : ''}`}>
      <div className="viewer-header">
        <div className="file-info">
          {getFileIcon()}
          <div className="file-details">
            <h3 className="file-name">{fileName}</h3>
            <div className="file-metadata">
              <span className="file-type">{fileInfo.extension.toUpperCase()}</span>
              <span className="file-category">{fileInfo.category}</span>
              {accessLevel === 'view_only' && (
                <span className="access-badge">
                  <Lock className="h-3 w-3" />
                  View Only
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="viewer-actions">
          {allowDownload && (
            <button 
              className="action-btn download-btn" 
              onClick={handleDownload}
              title="Download"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          )}
          <button 
            className="action-btn close-btn" 
            onClick={onClose}
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="viewer-content">
        {renderPreview()}
      </div>

      {!allowDownload && (
        <div className="access-restriction-notice">
          <Lock className="h-4 w-4" />
          <span>Download restricted by access permissions</span>
        </div>
      )}
    </div>
  );
};

export default DocumentViewer;