import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Table, Download, ChevronLeft, ChevronRight, Maximize2, Loader2 } from 'lucide-react';

const ExcelViewer = ({ documentData, fileName, onError, allowDownload, onDownload }) => {
  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [currentSheet, setCurrentSheet] = useState(0);
  const [sheetData, setSheetData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => { parseExcelFile(); }, [documentData]);

  useEffect(() => {
    if (workbook && sheetNames.length > 0) loadSheetData(currentSheet);
  }, [workbook, currentSheet, sheetNames]);

  const parseExcelFile = async () => {
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
      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      setWorkbook(wb);
      setSheetNames(wb.SheetNames);
      setCurrentSheet(0);
    } catch (err) {
      setError('Failed to parse Excel file: ' + err.message);
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSheetData = (sheetIndex) => {
    if (!workbook || !sheetNames[sheetIndex]) return;
    try {
      const worksheet = workbook.Sheets[sheetNames[sheetIndex]];
      setSheetData(XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', blankrows: false }));
    } catch (err) {
      setError('Failed to load sheet data: ' + err.message);
    }
  };

  const exportToCSV = () => {
    if (!workbook || !sheetNames[currentSheet]) return;
    try {
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetNames[currentSheet]]);
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sheetNames[currentSheet]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const formatCell = (v) => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return v % 1 === 0 ? v.toString() : v.toFixed(2);
    return String(v);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-accent-400 animate-spin mb-2" />
        <p className="text-xs text-slate-400">Parsing Excel file...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Table className="w-12 h-12 text-slate-600 mb-3" />
        <p className="text-sm text-slate-300 font-medium">Parsing Failed</p>
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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <button onClick={() => setCurrentSheet(s => Math.max(0, s - 1))} disabled={currentSheet <= 0} className="btn-ghost p-1.5 disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-400 min-w-[120px] text-center">
            {sheetNames[currentSheet]} ({currentSheet + 1}/{sheetNames.length})
          </span>
          <button onClick={() => setCurrentSheet(s => Math.min(sheetNames.length - 1, s + 1))} disabled={currentSheet >= sheetNames.length - 1} className="btn-ghost p-1.5 disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={exportToCSV} className="btn-ghost text-xs" title="Export as CSV">
            <Download className="w-3 h-3" /> CSV
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

      {/* Table */}
      <div className="max-h-[60vh] overflow-auto rounded-lg border border-white/[0.06]">
        <table className="w-full border-collapse text-xs">
          <tbody>
            {sheetData.map((row, ri) => (
              <tr key={ri} className={ri === 0 ? 'bg-surface-800 sticky top-0 z-10' : ri % 2 === 0 ? 'bg-surface-950' : 'bg-surface-900'}>
                <td className="px-2 py-1.5 text-[10px] text-slate-600 border-r border-white/[0.06] w-10 text-center font-mono sticky left-0 bg-inherit">
                  {ri + 1}
                </td>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`px-3 py-1.5 border-r border-b border-white/[0.06] whitespace-nowrap ${
                      ri === 0 ? 'font-semibold text-slate-200' : 'text-slate-400'
                    }`}
                  >
                    {formatCell(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="text-[10px] text-slate-600 text-right">
        {sheetData.length} rows x {sheetData[0]?.length || 0} columns
      </div>
    </div>
  );
};

export default ExcelViewer;
