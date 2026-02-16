import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import AccessManagement from '../AccessManagement';
import { FileText, Users, Calendar, ChevronDown, ChevronUp, ArrowLeft, RefreshCw, Loader2, Search } from 'lucide-react';

const DocumentManager = () => {
  const { account, contract, isConnected } = useWeb3();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [expandedDocuments, setExpandedDocuments] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isConnected && account && contract) loadUserDocuments();
  }, [isConnected, account, contract]);

  const loadUserDocuments = async () => {
    setLoading(true);
    setError('');
    try {
      let count = 0;
      try {
        const result = await contract.getUserDocumentCount(account);
        count = parseInt(result.toString());
      } catch { count = 0; }

      if (count === 0) { setDocuments([]); setLoading(false); return; }

      const results = await Promise.all(
        Array.from({ length: count }, (_, i) =>
          contract.getDocumentByIndex(account, i).catch(() => null)
        )
      );

      const docs = results
        .filter(Boolean)
        .map((doc, index) => {
          const [documentHash, ipfsCID, timestamp, fileName] = doc;
          return {
            index,
            documentHash,
            ipfsCID,
            timestamp: new Date(parseInt(timestamp.toString()) * 1000),
            fileName: fileName || `Document ${index + 1}`,
            metadata: { accessCount: 1 }
          };
        })
        .sort((a, b) => b.timestamp - a.timestamp);

      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load documents:', err);
      setError('Failed to load documents');
    } finally { setLoading(false); }
  };

  const filteredDocs = documents.filter(d =>
    d.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.documentHash.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date) => date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <Users className="w-10 h-10 text-slate-700 mx-auto mb-3" />
        <p className="text-sm text-slate-400 font-medium">Connect your wallet</p>
        <p className="text-xs text-slate-500 mt-1">to view and manage your documents.</p>
      </div>
    );
  }

  if (selectedDocument) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedDocument(null)} className="btn-ghost p-2">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h3 className="font-display font-semibold text-white text-sm">{selectedDocument.fileName}</h3>
            <p className="text-xs text-slate-500">{formatDate(selectedDocument.timestamp)}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Hash</p>
            <p className="text-xs text-cyber-400 font-mono mt-0.5 truncate">{selectedDocument.documentHash}</p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">IPFS CID</p>
            <p className="text-xs text-cyber-400 font-mono mt-0.5 truncate">{selectedDocument.ipfsCID}</p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Index</p>
            <p className="text-sm text-slate-200 font-medium mt-0.5">#{selectedDocument.index}</p>
          </div>
        </div>

        <AccessManagement
          documentHash={selectedDocument.documentHash}
          isOwner={true}
          onAccessGranted={(addr, level, exp) => console.log('Granted:', addr)}
          onAccessRevoked={(addr) => console.log('Revoked:', addr)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-white text-sm">Your Documents</h3>
        <button onClick={loadUserDocuments} disabled={loading} className="btn-ghost text-xs">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Search */}
      {documents.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-9 text-xs"
          />
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/10">
          <p className="text-xs text-rose-400">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-8 justify-center">
          <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
          <span className="text-sm text-slate-500">Loading documents...</span>
        </div>
      )}

      {!loading && documents.length === 0 && (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-medium">No documents yet</p>
          <p className="text-xs text-slate-500 mt-1">Upload a document first, then manage access here.</p>
        </div>
      )}

      {!loading && filteredDocs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">
            {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}
            {searchTerm && ` matching "${searchTerm}"`}
          </p>

          {filteredDocs.map((doc) => (
            <div key={doc.documentHash} className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <div className="flex items-center gap-3 p-3">
                <div className="w-9 h-9 rounded-lg bg-accent-500/10 border border-accent-500/20 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-accent-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 font-medium truncate">{doc.fileName}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" /> {formatDate(doc.timestamp)}
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Users className="w-2.5 h-2.5" /> {doc.metadata.accessCount}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setSelectedDocument(doc)} className="btn-ghost text-xs py-1.5 px-2.5">
                    <Users className="w-3 h-3" /> Manage
                  </button>
                  <button
                    onClick={() => setExpandedDocuments(prev => ({ ...prev, [doc.documentHash]: !prev[doc.documentHash] }))}
                    className="btn-ghost p-1.5"
                  >
                    {expandedDocuments[doc.documentHash] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {expandedDocuments[doc.documentHash] && (
                <div className="px-3 pb-3 pt-0 border-t border-white/[0.04]">
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Document Hash</p>
                      <p className="text-xs text-cyber-400 font-mono mt-0.5 break-all">{doc.documentHash}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">IPFS CID</p>
                      <p className="text-xs text-cyber-400 font-mono mt-0.5 break-all">{doc.ipfsCID}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentManager;
