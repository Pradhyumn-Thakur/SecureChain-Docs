import React, { useState, useContext, lazy, Suspense } from 'react';
import { Download, Search, Key, FileText, AlertCircle, Loader2, Eye, X } from 'lucide-react';
import { ethers } from 'ethers';
import { useWeb3 } from '../../contexts/Web3Context';
import { useEncryption } from '../../hooks/useEncryption';
import { AppContext } from '../../App';
import ipfsService from '../../utils/ipfs';
import CryptoUtils from '../../utils/crypto';

const DocumentViewer = lazy(() => import('../DocumentViewer'));

const DocumentRetrieval = () => {
  const { contract, account } = useWeb3();
  const { decryptFile } = useEncryption();
  const { addNotification } = useContext(AppContext);

  const [documentHash, setDocumentHash] = useState('');
  const [encryptionKey, setEncryptionKey] = useState('');
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [error, setError] = useState('');
  const [retrievedDocument, setRetrievedDocument] = useState(null);
  const [progress, setProgress] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [accessLevel, setAccessLevel] = useState('full_access');

  const handleRetrieve = async () => {
    if (!contract || !account) { addNotification('Connect your wallet first', 'error'); return; }
    if (!documentHash.trim()) { setError('Please enter a document hash'); return; }
    if (!encryptionKey.trim()) { setError('Please enter the encryption key'); return; }
    if (!ipfsService.isInitialized()) { addNotification('Configure IPFS storage first', 'error'); return; }

    setIsRetrieving(true);
    setError('');
    setRetrievedDocument(null);
    setProgress('');
    setShowPreview(false);

    try {
      setProgress('Verifying document on blockchain...');
      const originalFileHash = documentHash.startsWith('0x') ? documentHash : '0x' + documentHash;
      const userScopedHash = ethers.keccak256(ethers.solidityPacked(['address', 'bytes32'], [account, originalFileHash]));

      const exists = await contract.verifyDocument(userScopedHash);
      if (!exists) throw new Error('Document not found. Check the hash and try again.');

      const details = await contract.getDocument(userScopedHash);
      addNotification('Document found on blockchain', 'success');

      setProgress('Downloading from IPFS...');
      const ipfsResult = await ipfsService.retrieveEncryptedFile(details.ipfsCID);
      addNotification('Downloaded from IPFS', 'success');

      setProgress('Decrypting...');
      let cryptoKey;
      try { cryptoKey = await CryptoUtils.importKey(encryptionKey); }
      catch (e) { throw new Error('Invalid encryption key: ' + e.message); }

      const decryptedResult = await decryptFile(
        { encryptedData: ipfsResult.data, originalHash: details.documentHash, fileName: details.fileName },
        cryptoKey
      );

      setRetrievedDocument({ ...decryptedResult, ipfsCID: details.ipfsCID, blockchainHash: userScopedHash, metadata: ipfsResult.metadata });
      setProgress('');
      addNotification('Document decrypted successfully', 'success');
    } catch (err) {
      console.error('Retrieval error:', err);
      setError(err.message || 'Failed to retrieve document');
      addNotification(err.message || 'Retrieval failed', 'error');
      setProgress('');
    } finally { setIsRetrieving(false); }
  };

  const handleDownload = () => {
    if (!retrievedDocument) return;
    const blob = new Blob([retrievedDocument.decryptedData], { type: retrievedDocument.mimeType || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = retrievedDocument.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addNotification('File downloaded', 'success');
  };

  const clearForm = () => {
    setDocumentHash('');
    setEncryptionKey('');
    setError('');
    setRetrievedDocument(null);
    setProgress('');
    setShowPreview(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white mb-1">Retrieve Document</h1>
        <p className="text-sm text-slate-400">Download and decrypt a previously stored document.</p>
      </div>

      {!account ? (
        <div className="card p-8 text-center">
          <Download className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Connect your wallet to retrieve documents</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Privacy notice */}
          <div className="flex gap-3 p-4 rounded-lg bg-cyber-500/5 border border-cyber-500/10">
            <Key className="w-4 h-4 text-cyber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-400">
              <p className="font-medium text-cyber-400">Privacy-focused retrieval</p>
              <p className="mt-0.5">You can only retrieve documents you uploaded. Each user's documents are private and isolated.</p>
            </div>
          </div>

          {/* Form */}
          <div className="card p-6 space-y-5">
            <div className="space-y-1.5">
              <label className="label-text">
                <Search className="w-3.5 h-3.5" /> Original File Hash
              </label>
              <input
                type="text"
                value={documentHash}
                onChange={(e) => setDocumentHash(e.target.value)}
                placeholder="Enter the original file hash from upload"
                className="input-field font-mono text-xs"
                disabled={isRetrieving}
              />
              <p className="text-[10px] text-slate-600">The hash shown during encryption (before upload)</p>
            </div>

            <div className="space-y-1.5">
              <label className="label-text">
                <Key className="w-3.5 h-3.5" /> Encryption Key
              </label>
              <textarea
                value={encryptionKey}
                onChange={(e) => setEncryptionKey(e.target.value)}
                placeholder="Paste your encryption key (64-character hex)"
                className="input-field font-mono text-xs resize-none"
                rows="2"
                disabled={isRetrieving}
              />
            </div>

            {/* Progress */}
            {progress && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-cyber-500/5 border border-cyber-500/10">
                <Loader2 className="w-4 h-4 text-cyber-400 animate-spin" />
                <span className="text-xs text-cyber-300">{progress}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleRetrieve}
                disabled={isRetrieving || !documentHash.trim() || !encryptionKey.trim()}
                className="btn-primary flex-1"
              >
                {isRetrieving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Retrieving...</>
                ) : (
                  <><Search className="w-4 h-4" /> Retrieve Document</>
                )}
              </button>
              {(documentHash || encryptionKey || retrievedDocument) && (
                <button onClick={clearForm} disabled={isRetrieving} className="btn-secondary">
                  Clear
                </button>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/10">
                <p className="text-xs text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
                </p>
              </div>
            )}
          </div>

          {/* Retrieved document */}
          {retrievedDocument && (
            <div className="card p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-400">Document Retrieved</p>
                  <p className="text-xs text-slate-500">{retrievedDocument.fileName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Size</p>
                  <p className="text-sm text-slate-200 font-medium mt-0.5">{(retrievedDocument.decryptedData.byteLength / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">IPFS CID</p>
                  <p className="text-xs text-cyber-400 font-mono mt-0.5 truncate">{retrievedDocument.ipfsCID}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowPreview(true)} className="btn-secondary flex-1">
                  <Eye className="w-4 h-4" /> Preview
                </button>
                <button onClick={handleDownload} className="btn-primary flex-1">
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Document viewer modal */}
      {showPreview && retrievedDocument && (
        <Suspense fallback={
          <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-accent-400 animate-spin" />
          </div>
        }>
          <DocumentViewer
            documentData={retrievedDocument.decryptedData}
            fileName={retrievedDocument.fileName}
            accessLevel={accessLevel}
            allowDownload={accessLevel !== 'view_only'}
            onClose={() => setShowPreview(false)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default DocumentRetrieval;
