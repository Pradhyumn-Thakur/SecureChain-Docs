import React, { useState, useEffect, useCallback } from 'react';
import mammoth from 'mammoth';
import { FileText, Download, Copy, Maximize2, Loader2 } from 'lucide-react';

const WordViewer = ({ documentData, fileName, onError, allowDownload, onDownload }) => {
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const convertDocxToHtml = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let arrayBuffer;
      if (documentData instanceof Uint8Array) {
        arrayBuffer = documentData.buffer.slice(documentData.byteOffset, documentData.byteOffset + documentData.byteLength);
      } else if (documentData instanceof ArrayBuffer) {
        arrayBuffer = documentData;
      } else {
        throw new Error('Invalid document data format');
      }

      const result = await mammoth.convertToHtml({ arrayBuffer });
      setHtmlContent(result.value);
    } catch (err) {
      setError('Failed to convert Word document: ' + err.message);
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  }, [documentData, onError]);

  useEffect(() => { convertDocxToHtml(); }, [convertDocxToHtml]);

  const copyContent = async () => {
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      await navigator.clipboard.writeText(tempDiv.textContent || tempDiv.innerText || '');
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-accent-400 animate-spin mb-2" />
        <p className="text-xs text-slate-400">Converting Word document...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="w-12 h-12 text-slate-600 mb-3" />
        <p className="text-sm text-slate-300 font-medium">Conversion Failed</p>
        <p className="text-xs text-slate-500 mt-1">{error}</p>
        {allowDownload && (
          <button onClick={onDownload} className="btn-primary mt-4 text-xs">
            <Download className="w-3.5 h-3.5" /> Download Original
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${isFullscreen ? 'fixed inset-0 z-50 bg-surface-900 p-6' : ''}`}>
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-accent-400" />
          <span className="badge-cyan text-[10px]">DOCX</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={copyContent} className="btn-ghost text-xs" title="Copy Text">
            <Copy className="w-3 h-3" /> Copy
          </button>
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="btn-ghost text-xs" title="Fullscreen">
            <Maximize2 className="w-3 h-3" />
          </button>
          {allowDownload && (
            <button onClick={onDownload} className="btn-secondary text-xs py-1.5" title="Download">
              <Download className="w-3 h-3" /> Download
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[60vh] overflow-auto rounded-lg bg-white border border-white/[0.06] p-6">
        <div
          className="prose prose-sm max-w-none text-slate-800 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_p]:text-sm [&_p]:leading-relaxed [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_td]:text-xs [&_th]:border [&_th]:border-slate-300 [&_th]:p-2 [&_th]:text-xs [&_th]:bg-slate-100 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    </div>
  );
};

export default WordViewer;
