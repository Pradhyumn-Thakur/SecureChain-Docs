import React, { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Loader2 } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

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
  }, []);

  const onDocumentLoadError = useCallback((error) => {
    setLoading(false);
    onError?.('Failed to load PDF: ' + error.message);
  }, [onError]);

  const goToPrevPage = () => setPageNumber(p => Math.max(1, p - 1));
  const goToNextPage = () => setPageNumber(p => Math.min(numPages, p + 1));
  const zoomIn = () => setScale(s => Math.min(3, s + 0.2));
  const zoomOut = () => setScale(s => Math.max(0.5, s - 0.2));
  const rotate = () => setRotation(r => (r + 90) % 360);

  const pdfData = documentData instanceof Uint8Array ? documentData.buffer : documentData;

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <button onClick={goToPrevPage} disabled={pageNumber <= 1} className="btn-ghost p-1.5 disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-400 min-w-[100px] text-center">
            Page {pageNumber} of {numPages || '?'}
          </span>
          <button onClick={goToNextPage} disabled={pageNumber >= numPages} className="btn-ghost p-1.5 disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={zoomOut} className="btn-ghost p-1.5" title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-500 min-w-[40px] text-center">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} className="btn-ghost p-1.5" title="Zoom In">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={rotate} className="btn-ghost p-1.5" title="Rotate">
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PDF Document */}
      <div className="flex items-center justify-center overflow-auto max-h-[60vh] rounded-lg bg-surface-950 border border-white/[0.06] p-4">
        <Document
          file={pdfData}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-accent-400 animate-spin mb-2" />
              <p className="text-xs text-slate-400">Loading PDF...</p>
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            rotate={rotation}
            loading={
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-accent-400 animate-spin mb-2" />
                <p className="text-xs text-slate-500">Loading page {pageNumber}...</p>
              </div>
            }
            error={
              <div className="text-center py-8">
                <p className="text-xs text-rose-400">Failed to load page {pageNumber}</p>
              </div>
            }
          />
        </Document>
      </div>
    </div>
  );
};

export default PDFViewer;
