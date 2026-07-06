import React, { useState, useContext, useEffect, useCallback, lazy, Suspense } from 'react';
import { Download, Search, Key, FileText, AlertCircle, Loader2, Eye, Users, RefreshCw, Clock, Lock } from 'lucide-react';
import { ethers } from 'ethers';
import { useWeb3 } from '../../contexts/Web3Context';
import { useEncryption } from '../../hooks/useEncryption';
import { AppContext } from '../../App';
import ipfsService from '../../utils/ipfs';
import CryptoUtils from '../../utils/crypto';
import { unwrapKey } from '../../utils/keywrap';

const DocumentViewer = lazy(() => import('../DocumentViewer'));

const LEVEL_NAMES = { 1: 'view_only', 2: 'full_access', 3: 'owner' };

const DocumentRetrieval = () => {
  const { contract, account, ensureEncryptionIdentity } = useWeb3();
  const { decryptFile } = useEncryption();
  const { addNotification } = useContext(AppContext);

  const [activeTab, setActiveTab] = useState('mine'); // 'mine' | 'shared'
  const [documentHash, setDocumentHash] = useState('');
  const [encryptionKey, setEncryptionKey] = useState('');
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [error, setError] = useState('');
  const [retrievedDocument, setRetrievedDocument] = useState(null);
  const [progress, setProgress] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Shared-with-me list
  const [sharedDocs, setSharedDocs] = useState([]);
  const [loadingShared, setLoadingShared] = useState(false);
  const [retrievingHash, setRetrievingHash] = useState(null);

  const loadSharedDocuments = useCallback(async () => {
    if (!contract || !account) return;
    setLoadingShared(true);
    try {
      const hashes = await contract.getSharedDocuments(account);
      const docs = await Promise.all(
        hashes.map(async (hash) => {
          try {
            const [owner, timestamp, fileName] = await contract.getDocumentMetadata(hash);
            const [level, expirationTime, grantedAt, isActive, isExpired] =
              await contract.getUserAccess(hash, account);
            return {
              hash,
              owner,
              fileName,
              timestamp: Number(timestamp),
              level: Number(level),
              expirationTime: Number(expirationTime),
              grantedAt: Number(grantedAt),
              isActive,
              isExpired,
            };
          } catch {
            return null;
          }
        })
      );
      setSharedDocs(docs.filter(Boolean));
    } catch (err) {
      console.error('Failed to load shared documents:', err);
    } finally {
      setLoadingShared(false);
    }
  }, [contract, account]);

  useEffect(() => {
    if (activeTab === 'shared') loadSharedDocuments();
  }, [activeTab, loadSharedDocuments]);

  // Resolve the AES document key for an on-chain hash: manual input first,
  // then the wrapped key stored on-chain (unwrapped with a wallet signature).
  const resolveDocumentKey = async (onChainHash, manualKey) => {
    if (manualKey?.trim()) {
      try {
        return await CryptoUtils.importKey(manualKey);
      } catch (e) {
        throw new Error('Invalid encryption key: ' + e.message);
      }
    }

    const wrapped = await contract.getEncryptedKey(onChainHash, account);
    if (!wrapped || wrapped === '0x') {
      throw new Error('No key found on-chain for this document. Paste the encryption key manually.');
    }
    setProgress('Recovering key (sign the message in MetaMask)...');
    const identity = await ensureEncryptionIdentity();
    const rawKey = await unwrapKey(identity.privateKey, wrapped);
    return CryptoUtils.importKeyHex(ethers.hexlify(rawKey));
  };

  // Shared core: backend-enforced fetch + local decrypt
  const fetchAndDecrypt = async (onChainHash, cryptoKey, accessLevel) => {
    setProgress('Downloading via access-controlled backend...');
    const content = await ipfsService.retrieveDocumentContent(onChainHash);

    setProgress('Decrypting...');
    const decryptedResult = await decryptFile(
      { encryptedData: content.data, fileName: content.fileName },
      cryptoKey
    );

    setRetrievedDocument({
      ...decryptedResult,
      ipfsCID: content.cid,
      blockchainHash: onChainHash,
      accessLevel: accessLevel || content.accessLevel,
    });
    setProgress('');
    addNotification('Document decrypted successfully', 'success');
  };

  const handleRetrieveMine = async () => {
    if (!contract || !account) { addNotification('Connect your wallet first', 'error'); return; }
    if (!documentHash.trim()) { setError('Please enter a document hash'); return; }
    if (!ipfsService.isInitialized()) { addNotification('Connect your wallet to authenticate with the backend first', 'error'); return; }

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
      addNotification('Document found on blockchain', 'success');

      const cryptoKey = await resolveDocumentKey(userScopedHash, encryptionKey);
      await fetchAndDecrypt(userScopedHash, cryptoKey, 'owner');
    } catch (err) {
      console.error('Retrieval error:', err);
      setError(err.message || 'Failed to retrieve document');
      addNotification(err.message || 'Retrieval failed', 'error');
      setProgress('');
    } finally { setIsRetrieving(false); }
  };

  const handleRetrieveShared = async (doc) => {
    if (!ipfsService.isInitialized()) { addNotification('Connect your wallet to authenticate with the backend first', 'error'); return; }
    setRetrievingHash(doc.hash);
    setError('');
    setRetrievedDocument(null);
    setShowPreview(false);

    try {
      const cryptoKey = await resolveDocumentKey(doc.hash, null);
      await fetchAndDecrypt(doc.hash, cryptoKey, LEVEL_NAMES[doc.level] || 'view_only');
    } catch (err) {
      console.error('Shared retrieval error:', err);
      setError(err.message || 'Failed to retrieve shared document');
      addNotification(err.message || 'Retrieval failed', 'error');
      setProgress('');
    } finally { setRetrievingHash(null); }
  };

  const canDownload = retrievedDocument && retrievedDocument.accessLevel !== 'view_only';

  const handleDownload = () => {
    if (!retrievedDocument || !canDownload) return;
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

  const formatExpiration = (ts) => (!ts ? 'Permanent' : new Date(ts * 1000).toLocaleString());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white mb-1">Retrieve Document</h1>
        <p className="text-sm text-slate-400">Download and decrypt your documents, or open documents shared with you.</p>
      </div>

      {!account ? (
        <div className="card p-8 text-center">
          <Download className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Connect your wallet to retrieve documents</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => { setActiveTab('mine'); setError(''); }}
              className={activeTab === 'mine' ? 'btn-primary text-xs py-2' : 'btn-secondary text-xs py-2'}
            >
              <FileText className="w-3.5 h-3.5" /> My Documents
            </button>
            <button
              onClick={() => { setActiveTab('shared'); setError(''); }}
              className={activeTab === 'shared' ? 'btn-primary text-xs py-2' : 'btn-secondary text-xs py-2'}
            >
              <Users className="w-3.5 h-3.5" /> Shared With Me
            </button>
          </div>

          {activeTab === 'mine' && (
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
                  <Key className="w-3.5 h-3.5" /> Encryption Key <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <textarea
                  value={encryptionKey}
                  onChange={(e) => setEncryptionKey(e.target.value)}
                  placeholder="Leave empty to recover the key from the blockchain with a wallet signature, or paste the 64-character hex key"
                  className="input-field font-mono text-xs resize-none"
                  rows="2"
                  disabled={isRetrieving}
                />
              </div>

              {progress && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-cyber-500/5 border border-cyber-500/10">
                  <Loader2 className="w-4 h-4 text-cyber-400 animate-spin" />
                  <span className="text-xs text-cyber-300">{progress}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleRetrieveMine}
                  disabled={isRetrieving || !documentHash.trim()}
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
            </div>
          )}

          {activeTab === 'shared' && (
            <div className="card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-white text-sm">Documents shared with you</h3>
                <button onClick={loadSharedDocuments} disabled={loadingShared} className="btn-ghost text-xs">
                  {loadingShared ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Refresh
                </button>
              </div>

              {progress && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-cyber-500/5 border border-cyber-500/10">
                  <Loader2 className="w-4 h-4 text-cyber-400 animate-spin" />
                  <span className="text-xs text-cyber-300">{progress}</span>
                </div>
              )}

              {loadingShared && sharedDocs.length === 0 && (
                <div className="flex items-center gap-2 py-6 justify-center">
                  <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                  <span className="text-xs text-slate-500">Loading shared documents...</span>
                </div>
              )}

              {!loadingShared && sharedDocs.length === 0 && (
                <div className="text-center py-6">
                  <Users className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 font-medium">Nothing shared with you yet</p>
                  <p className="text-xs text-slate-500 mt-1">When someone grants you access to a document, it will appear here.</p>
                </div>
              )}

              {sharedDocs.map((doc) => {
                const valid = doc.isActive && !doc.isExpired && doc.level > 0;
                return (
                  <div
                    key={doc.hash}
                    className={`flex items-center justify-between p-3 rounded-lg border
                      ${valid ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white/[0.01] border-white/[0.04] opacity-50'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 font-medium truncate">{doc.fileName}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] text-slate-500 font-mono">{doc.owner.slice(0, 6)}...{doc.owner.slice(-4)}</span>
                        <span className={doc.level === 2 ? 'badge-amber' : 'badge-cyan'}>
                          {doc.level === 2 ? 'Full Access' : 'View Only'}
                        </span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> {formatExpiration(doc.expirationTime)}
                        </span>
                        {doc.isExpired && <span className="badge-rose">Expired</span>}
                        {!doc.isActive && <span className="badge-slate">Revoked</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRetrieveShared(doc)}
                      disabled={!valid || retrievingHash !== null}
                      className="btn-primary text-xs py-1.5 px-3 ml-3 shrink-0"
                    >
                      {retrievingHash === doc.hash ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Opening...</>
                      ) : (
                        <><Eye className="w-3 h-3" /> Open</>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/10">
              <p className="text-xs text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
              </p>
            </div>
          )}

          {/* Retrieved document */}
          {retrievedDocument && (
            <div className="card p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-emerald-400">Document Retrieved</p>
                  <p className="text-xs text-slate-500 truncate">{retrievedDocument.fileName}</p>
                </div>
                {retrievedDocument.accessLevel === 'view_only' && (
                  <span className="badge-amber"><Lock className="w-2.5 h-2.5" /> View Only</span>
                )}
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
                {canDownload && (
                  <button onClick={handleDownload} className="btn-primary flex-1">
                    <Download className="w-4 h-4" /> Download
                  </button>
                )}
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
            accessLevel={retrievedDocument.accessLevel}
            allowDownload={canDownload}
            onClose={() => setShowPreview(false)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default DocumentRetrieval;
