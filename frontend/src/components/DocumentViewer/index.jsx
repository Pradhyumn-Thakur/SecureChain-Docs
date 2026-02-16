import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Eye, Download, X, FileText, Image as ImageIcon, File, ZoomIn, ZoomOut, RotateCw, Maximize2, Copy, Lock, Loader2 } from 'lucide-react';
import PDFViewer from './PDFViewer';
import WordViewer from './WordViewer';
import ExcelViewer from './ExcelViewer';

const DocumentViewer = ({ documentData, fileName, onClose, accessLevel = 'full_access', allowDownload = true }) => {
  const [imageScale, setImageScale] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [textContent, setTextContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dataURL, setDataURL] = useState(null);

  const getMimeType = (ext) => {
    const m = { jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml',bmp:'image/bmp',pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',txt:'text/plain',md:'text/markdown',json:'application/json',xml:'application/xml',csv:'text/csv',html:'text/html',css:'text/css',js:'text/javascript',jsx:'text/jsx',ts:'text/typescript',tsx:'text/tsx',py:'text/python' };
    return m[ext] || 'application/octet-stream';
  };

  const getCategory = (ext) => {
    const c = { image:['jpg','jpeg','png','gif','webp','svg','bmp','ico'], document:['pdf','doc','docx','xls','xlsx','ppt','pptx'], text:['txt','md','json','xml','csv','html','css','yaml','yml'], code:['js','jsx','ts','tsx','py','java','cpp','c','php','sql'] };
    for (const [cat, exts] of Object.entries(c)) if (exts.includes(ext)) return cat;
    return 'unknown';
  };

  const fileInfo = useMemo(() => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return { extension: ext, mimeType: getMimeType(ext), category: getCategory(ext), name: fileName, size: documentData?.length || 0 };
  }, [fileName, documentData]);

  const makeDataURL = useCallback(() => {
    if (!documentData) return null;
    try {
      let bytes = documentData instanceof Uint8Array ? documentData : typeof documentData === 'string' ? Uint8Array.from(atob(documentData), c => c.charCodeAt(0)) : new Uint8Array(documentData);
      return URL.createObjectURL(new Blob([bytes], { type: fileInfo.mimeType }));
    } catch { return null; }
  }, [documentData, fileInfo.mimeType]);

  useEffect(() => { if (documentData) processDocument(); }, [documentData, fileInfo]);

  useEffect(() => {
    if (documentData && !loading && !error && fileInfo.category === 'image') {
      const url = makeDataURL();
      if (url) setDataURL(prev => { if (prev) URL.revokeObjectURL(prev); return url; });
    }
    return () => { if (dataURL) URL.revokeObjectURL(dataURL); };
  }, [documentData, fileInfo.category, loading, error, makeDataURL]);

  const processDocument = async () => {
    setLoading(true);
    setError('');
    try {
      if (fileInfo.category === 'text' || fileInfo.category === 'code') {
        const text = documentData instanceof Uint8Array ? new TextDecoder('utf-8').decode(documentData) : typeof documentData === 'string' ? documentData : String(documentData);
        setTextContent(text);
      }
    } catch (err) { setError('Failed to process: ' + err.message); }
    finally { setLoading(false); }
  };

  const handleDownload = () => {
    if (!allowDownload) return;
    const url = makeDataURL();
    if (url) { const a = document.createElement('a'); a.href = url; a.download = fileName; a.click(); URL.revokeObjectURL(url); }
  };

  const renderPreview = () => {
    if (loading) return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-accent-400 animate-spin mb-3" />
        <p className="text-sm text-slate-400">Processing document...</p>
      </div>
    );

    if (error) return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <File className="w-12 h-12 text-slate-600 mb-3" />
        <p className="text-sm text-slate-300 font-medium">Preview unavailable</p>
        <p className="text-xs text-slate-500 mt-1">{error}</p>
        {allowDownload && <button onClick={handleDownload} className="btn-primary mt-4 text-xs"><Download className="w-3.5 h-3.5" /> Download</button>}
      </div>
    );

    switch (fileInfo.category) {
      case 'image':
        return dataURL ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 justify-center">
              <button onClick={() => setImageScale(s => Math.min(5, s * 1.2))} className="btn-ghost p-1.5"><ZoomIn className="w-4 h-4" /></button>
              <button onClick={() => setImageScale(s => Math.max(0.1, s * 0.8))} className="btn-ghost p-1.5"><ZoomOut className="w-4 h-4" /></button>
              <button onClick={() => setImageRotation(r => (r + 90) % 360)} className="btn-ghost p-1.5"><RotateCw className="w-4 h-4" /></button>
              <span className="text-xs text-slate-500 ml-2">{Math.round(imageScale * 100)}%</span>
            </div>
            <div className="flex items-center justify-center overflow-auto max-h-[60vh]">
              <img src={dataURL} alt={fileName} style={{ transform: `scale(${imageScale}) rotate(${imageRotation}deg)` }} className="max-w-full max-h-full object-contain transition-transform" onError={() => setError('Failed to load image')} />
            </div>
          </div>
        ) : (
          <div className="text-center py-12"><p className="text-sm text-slate-500">Failed to load image</p></div>
        );

      case 'text':
      case 'code':
        return textContent ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="badge-cyan">{fileInfo.extension.toUpperCase()}</span>
              <button onClick={async () => { await navigator.clipboard.writeText(textContent); }} className="btn-ghost text-xs"><Copy className="w-3 h-3" /> Copy</button>
            </div>
            <div className="max-h-[60vh] overflow-auto rounded-lg bg-surface-950 border border-white/[0.06] p-4">
              <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-words">{textContent}</pre>
            </div>
          </div>
        ) : (
          <div className="text-center py-12"><p className="text-sm text-slate-500">No content</p></div>
        );

      case 'document':
        if (fileInfo.extension === 'pdf') return <PDFViewer documentData={documentData} fileName={fileName} onError={setError} />;
        if (['doc', 'docx'].includes(fileInfo.extension)) return <WordViewer documentData={documentData} fileName={fileName} onError={setError} allowDownload={allowDownload} onDownload={handleDownload} />;
        if (['xls', 'xlsx'].includes(fileInfo.extension)) return <ExcelViewer documentData={documentData} fileName={fileName} onError={setError} allowDownload={allowDownload} onDownload={handleDownload} />;
        return (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-300">Preview not available for this format</p>
            {allowDownload && <button onClick={handleDownload} className="btn-primary mt-4 text-xs"><Download className="w-3.5 h-3.5" /> Download</button>}
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <File className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-300">Cannot preview this file type</p>
            {allowDownload && <button onClick={handleDownload} className="btn-primary mt-4 text-xs"><Download className="w-3.5 h-3.5" /> Download</button>}
          </div>
        );
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center ${isFullscreen ? '' : 'p-4 md:p-8'}`}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-surface-900 border border-white/[0.08] rounded-xl shadow-2xl flex flex-col overflow-hidden ${isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-4xl max-h-[90vh]'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="w-4 h-4 text-accent-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{fileName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="badge-cyan text-[10px]">{fileInfo.extension.toUpperCase()}</span>
                {accessLevel === 'view_only' && <span className="badge-amber text-[10px]"><Lock className="w-2.5 h-2.5" /> View Only</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setIsFullscreen(!isFullscreen)} className="btn-ghost p-1.5"><Maximize2 className="w-4 h-4" /></button>
            {allowDownload && <button onClick={handleDownload} className="btn-secondary text-xs py-1.5"><Download className="w-3.5 h-3.5" /> Download</button>}
            <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-rose-400"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          {renderPreview()}
        </div>

        {!allowDownload && (
          <div className="flex items-center gap-2 px-5 py-2 border-t border-white/[0.06] bg-accent-500/5">
            <Lock className="w-3 h-3 text-accent-500" />
            <span className="text-xs text-accent-400">Download restricted by access permissions</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentViewer;
