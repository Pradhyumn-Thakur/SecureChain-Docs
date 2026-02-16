import React, { useState, useContext } from 'react';
import { Database, ExternalLink, Loader2, Upload, Cloud, Copy, Check } from 'lucide-react';
import { ethers } from 'ethers';
import { useWeb3 } from '../../contexts/Web3Context';
import { AppContext } from '../../App';
import ipfsService from '../../utils/ipfs';

const BlockchainStorage = ({ encryptedData }) => {
  const { contract, account, network } = useWeb3();
  const { addNotification } = useContext(AppContext);
  const [isStoring, setIsStoring] = useState(false);
  const [isUploadingToIPFS, setIsUploadingToIPFS] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [ipfsCID, setIpfsCID] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');
  const [cidCopied, setCidCopied] = useState(false);

  const copyCid = async () => {
    if (!ipfsCID) return;
    try {
      await navigator.clipboard.writeText(ipfsCID);
      setCidCopied(true);
      addNotification('IPFS CID copied', 'success');
      setTimeout(() => setCidCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = ipfsCID;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCidCopied(true);
      setTimeout(() => setCidCopied(false), 2000);
    }
  };

  const storeOnBlockchain = async () => {
    if (!contract || !account) { addNotification('Connect your wallet first', 'error'); return; }
    if (!encryptedData) { addNotification('No encrypted data to store', 'error'); return; }
    if (!ipfsService.isInitialized()) { addNotification('Configure IPFS storage first', 'error'); return; }

    setIsStoring(true);
    setError(null);
    setTxHash(null);
    setIpfsCID(null);

    try {
      setProgress('Checking for existing uploads...');
      const originalFileHash = encryptedData.originalHash.startsWith('0x') ? encryptedData.originalHash : '0x' + encryptedData.originalHash;
      const userScopedHash = ethers.keccak256(ethers.solidityPacked(['address', 'bytes32'], [account, originalFileHash]));

      let userAlreadyUploaded = false;
      try { userAlreadyUploaded = await contract.verifyDocument(userScopedHash); } catch { userAlreadyUploaded = false; }

      if (userAlreadyUploaded) {
        try {
          const existingDoc = await contract.getDocument(userScopedHash);
          const uploadDate = new Date(Number(existingDoc.timestamp) * 1000).toLocaleDateString();
          const shouldReupload = window.confirm(
            `You already uploaded this file on ${uploadDate}.\nCurrent IPFS CID: ${existingDoc.ipfsCID}\n\nDo you want to reupload it?`
          );
          if (!shouldReupload) { addNotification('Upload cancelled', 'info'); setProgress(''); return; }
          addNotification('Proceeding with reupload...', 'info', 2000);
        } catch { addNotification('Proceeding with upload...', 'info', 2000); }
      }

      setIsUploadingToIPFS(true);
      setProgress('Uploading to IPFS...');
      const ipfsResult = await ipfsService.uploadEncryptedFile(encryptedData, { walletAddress: account, network: network?.name || 'unknown' });
      setIpfsCID(ipfsResult.cid);
      setIsUploadingToIPFS(false);

      setProgress('Storing on blockchain...');
      const tx = await contract.storeDocument(userScopedHash, ipfsResult.cid, encryptedData.fileName, {
        gasLimit: 500000,
        gasPrice: ethers.parseUnits('30', 'gwei')
      });
      addNotification('Transaction submitted. Waiting for confirmation...', 'info', 3000);
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      setProgress('');
      addNotification(userAlreadyUploaded ? 'Document updated!' : 'Document uploaded!', 'success');
    } catch (err) {
      console.error('Storage error:', err);
      let msg = 'Failed to store document';
      if (err.code === 'INSUFFICIENT_FUNDS') msg = 'Insufficient MATIC balance';
      else if (err.code === 'NETWORK_ERROR') msg = 'Network error - try again';
      else if (err.message?.includes('execution reverted')) msg = 'Contract execution failed';
      else if (err.message) msg = err.message;
      setError(msg);
      addNotification(msg, 'error');
      setProgress('');
    } finally { setIsStoring(false); setIsUploadingToIPFS(false); }
  };

  const getExplorerUrl = () => {
    if (!txHash || !network) return '';
    return (network.chainId === 137n ? 'https://polygonscan.com/tx/' : 'https://www.oklink.com/amoy/tx/') + txHash;
  };

  if (!account) {
    return (
      <div className="text-center py-4">
        <Database className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-500">Connect your wallet to store documents</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Document summary */}
      <div className="p-4 rounded-lg bg-surface-950/60 border border-white/[0.06] space-y-2">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Ready for storage</p>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">File</span>
            <span className="text-slate-300 truncate ml-4">{encryptedData?.fileName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Hash</span>
            <code className="text-xs text-cyber-400 font-mono">{encryptedData?.originalHash?.slice(0, 16)}...</code>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Size</span>
            <span className="text-slate-300">{(encryptedData?.encryptedSize / 1024 / 1024).toFixed(2)} MB</span>
          </div>
        </div>
        {!ipfsService.isInitialized() && (
          <div className="flex items-center gap-2 mt-2 p-2 rounded bg-accent-500/5 border border-accent-500/10">
            <Cloud className="w-3.5 h-3.5 text-accent-500" />
            <span className="text-xs text-accent-400">IPFS not configured</span>
          </div>
        )}
      </div>

      {/* Progress */}
      {progress && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-cyber-500/5 border border-cyber-500/10">
          <Loader2 className="w-4 h-4 text-cyber-400 animate-spin" />
          <span className="text-xs text-cyber-300">{progress}</span>
        </div>
      )}

      {/* Store button */}
      <button
        onClick={storeOnBlockchain}
        disabled={isStoring || !encryptedData || !ipfsService.isInitialized()}
        className="btn-primary w-full"
      >
        {isUploadingToIPFS ? (
          <><Upload className="w-4 h-4 animate-pulse" /> Uploading to IPFS...</>
        ) : isStoring ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Storing on blockchain...</>
        ) : (
          <><Database className="w-4 h-4" /> Store on IPFS + Blockchain</>
        )}
      </button>

      {/* IPFS result */}
      {ipfsCID && (
        <div className="p-4 rounded-lg bg-cyber-500/5 border border-cyber-500/10 space-y-2">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">IPFS CID</p>
          <div className="flex items-center gap-2">
            <code className="text-xs text-cyber-400 font-mono break-all flex-1">{ipfsCID}</code>
            <button onClick={copyCid} className="btn-ghost p-1.5 shrink-0">
              {cidCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* Success */}
      {txHash && (
        <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/10 space-y-3">
          <p className="text-sm font-medium text-emerald-400">Successfully Stored</p>
          <p className="text-xs text-slate-400">Your document is encrypted, stored on IPFS, and recorded on Polygon.</p>
          <div className="flex gap-3">
            <a href={getExplorerUrl()} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs text-cyber-400">
              View Transaction <ExternalLink className="w-3 h-3" />
            </a>
            {ipfsCID && (
              <a href={`https://gateway.pinata.cloud/ipfs/${ipfsCID}`} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs text-cyber-400">
                View on IPFS <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/10">
          <p className="text-xs text-rose-400">{error}</p>
        </div>
      )}
    </div>
  );
};

export default BlockchainStorage;
