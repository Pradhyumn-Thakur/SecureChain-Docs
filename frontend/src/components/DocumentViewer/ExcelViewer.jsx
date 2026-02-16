import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Table, Download, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import './ExcelViewer.css';

const ExcelViewer = ({ documentData, fileName, onError, allowDownload, onDownload }) => {
  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [currentSheet, setCurrentSheet] = useState(0);
  const [sheetData, setSheetData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    parseExcelFile();
  }, [documentData]);

  useEffect(() => {
    if (workbook && sheetNames.length > 0) {
      loadSheetData(currentSheet);
    }
  }, [workbook, currentSheet, sheetNames]);

  const parseExcelFile = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('Parsing Excel file, data type:', typeof documentData, 'length:', documentData?.length);

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

      // Parse Excel file
      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      
      console.log('Excel workbook parsed:', {
        sheetNames: wb.SheetNames,
        sheetCount: wb.SheetNames.length
      });

      setWorkbook(wb);
      setSheetNames(wb.SheetNames);
      setCurrentSheet(0);
      setLoading(false);

    } catch (err) {
      console.error('Excel parsing error:', err);
      setError('Failed to parse Excel file: ' + err.message);
      setLoading(false);
      if (onError) {
        onError(err.message);
      }
    }
  };

  const loadSheetData = (sheetIndex) => {
    if (!workbook || !sheetNames[sheetIndex]) return;

    try {
      const worksheet = workbook.Sheets[sheetNames[sheetIndex]];
      
      // Convert sheet to JSON with header row
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '',
        blankrows: false
      });

      console.log('Sheet data loaded:', {
        sheetName: sheetNames[sheetIndex],
        rows: jsonData.length,
        columns: jsonData[0]?.length || 0
      });

      setSheetData(jsonData);
    } catch (err) {
      console.error('Sheet loading error:', err);
      setError('Failed to load sheet data: ' + err.message);
    }
  };

  const goToPrevSheet = () => {
    setCurrentSheet(prev => Math.max(0, prev - 1));
  };

  const goToNextSheet = () => {
    setCurrentSheet(prev => Math.min(sheetNames.length - 1, prev + 1));
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const exportToCSV = () => {
    if (!workbook || !sheetNames[currentSheet]) return;

    try {
      const worksheet = workbook.Sheets[sheetNames[currentSheet]];
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sheetNames[currentSheet]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV export error:', err);
      alert('Failed to export CSV');
    }
  };

  const formatCellValue = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') {
      // Format numbers with appropriate precision
      return value % 1 === 0 ? value.toString() : value.toFixed(2);
    }
    return String(value);
  };

  if (loading) {
    return (
      <div className="excel-viewer-loading">
        <div className="spinner"></div>
        <p>Parsing Excel file...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="excel-viewer-error">
        <Table className="h-16 w-16 text-red-400" />
        <h3>Parsing Failed</h3>
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
    <div className={`excel-viewer ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Excel Controls */}
      <div className="excel-controls">
        <div className="sheet-navigation">
          <button 
            onClick={goToPrevSheet} 
            disabled={currentSheet <= 0}
            className="sheet-nav-btn"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <span className="sheet-info">
            {sheetNames[currentSheet]} ({currentSheet + 1} of {sheetNames.length})
          </span>
          
          <button 
            onClick={goToNextSheet} 
            disabled={currentSheet >= sheetNames.length - 1}
            className="sheet-nav-btn"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="excel-actions">
          <button onClick={exportToCSV} className="excel-tool-btn" title="Export as CSV">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          
          <button onClick={toggleFullscreen} className="excel-tool-btn" title="Fullscreen">
            <Maximize2 className="h-4 w-4" />
            Fullscreen
          </button>
          
          {allowDownload && (
            <button onClick={onDownload} className="excel-tool-btn download" title="Download">
              <Download className="h-4 w-4" />
              Download
            </button>
          )}
        </div>
      </div>

      {/* Excel Sheet Content */}
      <div className="excel-content-container">
        <div className="excel-table-wrapper">
          <table className="excel-table">
            <tbody>
              {sheetData.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex === 0 ? 'header-row' : ''}>
                  <td className="row-number">{rowIndex + 1}</td>
                  {row.map((cell, cellIndex) => (
                    <td 
                      key={cellIndex} 
                      className={rowIndex === 0 ? 'header-cell' : 'data-cell'}
                    >
                      {formatCellValue(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="excel-footer">
        <span>
          {sheetData.length} rows × {sheetData[0]?.length || 0} columns
        </span>
      </div>
    </div>
  );
};

export default ExcelViewer;
