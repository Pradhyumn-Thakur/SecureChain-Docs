import React, { useState, useEffect, useCallback } from 'react';
import mammoth from 'mammoth';
import { FileText, Download, Copy, Maximize2 } from 'lucide-react';
import './WordViewer.css';

const WordViewer = ({ documentData, fileName, onError, allowDownload, onDownload }) => {
  console.log('WordViewer component instantiated!', { fileName, hasData: !!documentData });
  
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const convertDocxToHtml = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      console.log('Converting DOCX to HTML, data type:', typeof documentData, 'length:', documentData?.length);

      // Ensure we have an ArrayBuffer
      let arrayBuffer;
      if (documentData instanceof Uint8Array) {
        arrayBuffer = documentData.buffer.slice(
          documentData.byteOffset,
          documentData.byteOffset + documentData.byteLength
        );
      } else if (documentData instanceof ArrayBuffer) {
        arrayBuffer = documentData;
      } else {
        throw new Error('Invalid document data format');
      }

      // Convert DOCX to HTML using mammoth
      const result = await mammoth.convertToHtml({ arrayBuffer });
      
      console.log('Mammoth conversion result:', {
        htmlLength: result.value.length,
        messages: result.messages,
        hasWarnings: result.messages.length > 0
      });

      if (result.messages.length > 0) {
        console.warn('Mammoth conversion warnings:', result.messages);
      }

      setHtmlContent(result.value);
      setLoading(false);

    } catch (err) {
      console.error('Word document conversion error:', err);
      setError('Failed to convert Word document: ' + err.message);
      setLoading(false);
      if (onError) {
        onError(err.message);
      }
    }
  }, [documentData, onError]);

  useEffect(() => {
    convertDocxToHtml();
  }, [convertDocxToHtml]);

  const copyContent = async () => {
    try {
      // Create a temporary div to extract text content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      const textContent = tempDiv.textContent || tempDiv.innerText || '';
      
      await navigator.clipboard.writeText(textContent);
      alert('Content copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy content:', err);
      alert('Failed to copy content');
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (loading) {
    return (
      <div className="word-viewer-loading">
        <div className="spinner"></div>
        <p>Converting Word document...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="word-viewer-error">
        <FileText className="h-16 w-16 text-red-400" />
        <h3>Conversion Failed</h3>
        <p>{error}</p>
        {allowDownload && (
          <button className="download-btn" onClick={onDownload}>
            <Download className="h-4 w-4" />
            Download Original File
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`word-viewer ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Word Document Controls */}
      <div className="word-controls">
        <div className="word-info">
          <FileText className="h-5 w-5" />
          <span className="doc-type">Word Document</span>
        </div>
        
        <div className="word-actions">
          <button onClick={copyContent} className="word-tool-btn" title="Copy Text">
            <Copy className="h-4 w-4" />
            Copy Text
          </button>
          
          <button onClick={toggleFullscreen} className="word-tool-btn" title="Fullscreen">
            <Maximize2 className="h-4 w-4" />
            Fullscreen
          </button>
          
          {allowDownload && (
            <button onClick={onDownload} className="word-tool-btn download" title="Download">
              <Download className="h-4 w-4" />
              Download
            </button>
          )}
        </div>
      </div>

      {/* Word Document Content */}
      <div className="word-content-container">
        <div className="word-document">
          <div 
            className="word-content"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </div>
    </div>
  );
};

export default WordViewer;