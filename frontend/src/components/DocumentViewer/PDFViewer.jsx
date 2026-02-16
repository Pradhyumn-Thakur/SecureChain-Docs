import React, { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Maximize2 } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './PDFViewer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PDFViewer = ({ documentData, fileName, onError }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);

  const onDocumentLoadSuccess = useCallback(({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
    console.log('PDF loaded successfully, pages:', numPages);
  }, []);

  const onDocumentLoadError = useCallback((error) => {
    console.error('PDF load error:', error);
    setLoading(false);
    if (onError) {
      onError('Failed to load PDF: ' + error.message);
    }
  }, [onError]);

  const goToPrevPage = () => setPageNumber(page => Math.max(1, page - 1));
  const goToNextPage = () => setPageNumber(page => Math.min(numPages, page + 1));
  const zoomIn = () => setScale(scale => Math.min(3, scale + 0.2));
  const zoomOut = () => setScale(scale => Math.max(0.5, scale - 0.2));
  const rotate = () => setRotation(rotation => (rotation + 90) % 360);

  // Convert Uint8Array to ArrayBuffer for react-pdf
  const pdfData = documentData instanceof Uint8Array ? documentData.buffer : documentData;

  return (
    <div className="pdf-viewer">
      {/* PDF Controls */}
      <div className="pdf-controls">
        <div className="pdf-nav">
          <button 
            onClick={goToPrevPage} 
            disabled={pageNumber <= 1}
            className="pdf-nav-btn"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <span className="page-info">
            Page {pageNumber} of {numPages || '?'}
          </span>
          
          <button 
            onClick={goToNextPage} 
            disabled={pageNumber >= numPages}
            className="pdf-nav-btn"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="pdf-tools">
          <button onClick={zoomOut} className="pdf-tool-btn" title="Zoom Out">
            <ZoomOut className="h-4 w-4" />
          </button>
          
          <span className="zoom-level">{Math.round(scale * 100)}%</span>
          
          <button onClick={zoomIn} className="pdf-tool-btn" title="Zoom In">
            <ZoomIn className="h-4 w-4" />
          </button>
          
          <button onClick={rotate} className="pdf-tool-btn" title="Rotate">
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* PDF Document */}
      <div className="pdf-document-container">
        <Document
          file={pdfData}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="pdf-loading">
              <div className="spinner"></div>
              <p>Loading PDF...</p>
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            rotate={rotation}
            loading={
              <div className="pdf-page-loading">
                <div className="spinner"></div>
                <p>Loading page {pageNumber}...</p>
              </div>
            }
            error={
              <div className="pdf-page-error">
                <p>Failed to load page {pageNumber}</p>
              </div>
            }
          />
        </Document>
      </div>
    </div>
  );
};

export default PDFViewer;