import React, { useState, useEffect } from 'react';
import { Settings, Check, AlertCircle, ExternalLink, Shield, Loader2, RefreshCw, X } from 'lucide-react';
import ipfsService from '../../utils/ipfs';
import { useWeb3 } from '../../contexts/Web3Context';

const IPFSConfig = ({ onConfigured }) => {
  const { signer, account, isConnected: walletConnected } = useWeb3();
  const [isConfigured, setIsConfigured] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [usageStats, setUsageStats] = useState(null);

  useEffect(() => { initializeService(); }, [onConfigured, walletConnected]);

  const initializeService = async () => {
    try {
      setIsConnecting(true);
      setError('');
      // Session is normally established by Web3Context after wallet connect;
      // re-run the signature handshake here only if it's missing.
      let initialized = ipfsService.isInitialized();
      if (!initialized && signer && account) {
        initialized = await ipfsService.authenticate(signer, account);
      }
      if (initialized) {
        setIsConfigured(true);
        await loadUsageStats();
        onConfigured?.(true);
      } else if (!walletConnected) {
        throw new Error('Connect your wallet to authenticate with the secure backend');
      } else {
        throw new Error('Failed to authenticate with secure backend');
      }
    } catch (err) {
      setError(err.message?.includes('wallet')
        ? err.message
        : 'Backend service unavailable. Please ensure the server is running.');
      setIsConfigured(false);
      onConfigured?.(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const loadUsageStats = async () => {
    try {
      const stats = await ipfsService.getUsageStats();
      setUsageStats(stats);
    } catch {}
  };

  const handleDisconnect = () => {
    setIsConfigured(false);
    setUsageStats(null);
    setError('Service disconnected');
    onConfigured?.(false);
  };

  const formatUsage = (used, limit) => {
    if (!used || !limit) return 'N/A';
    const pct = ((used / limit) * 100).toFixed(1);
    return `${ipfsService.formatFileSize(used)} / ${ipfsService.formatFileSize(limit)} (${pct}%)`;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-accent-400" />
          <h3 className="font-display font-semibold text-white text-sm">IPFS Configuration</h3>
        </div>
        {isConfigured && (
          <span className="badge-emerald flex items-center gap-1">
            <Check className="w-3 h-3" /> Connected
          </span>
        )}
      </div>

      {!isConfigured ? (
        <div className="space-y-4">
          {/* Info */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-accent-400" />
              <h4 className="text-sm font-semibold text-white">Secure IPFS Storage</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              This application uses a secure backend service to handle IPFS operations through Pinata.
              Your files are encrypted client-side and stored securely without exposing API keys.
            </p>
            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Security Features</p>
              {[
                'Client-side encryption before upload',
                'Secure backend API with signed JWTs',
                'No API keys stored in browser',
                'Rate limiting and CORS protection',
                'Short-lived authentication tokens',
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="text-xs text-slate-400">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Connect button */}
          {isConnecting ? (
            <div className="flex items-center gap-2 justify-center py-3">
              <Loader2 className="w-4 h-4 text-accent-400 animate-spin" />
              <span className="text-xs text-slate-400">Connecting to secure backend...</span>
            </div>
          ) : (
            <button onClick={initializeService} className="btn-primary w-full text-xs py-2.5">
              Connect to Secure Storage
            </button>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/10 space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="text-xs text-rose-400">{error}</span>
              </div>
              {error.includes('Backend service unavailable') && (
                <div className="mt-2 p-2 rounded bg-surface-950 border border-white/[0.04]">
                  <p className="text-[10px] text-slate-500 mb-1">To start the backend:</p>
                  <code className="text-[10px] text-cyber-400 font-mono">cd backend && npm install && npm start</code>
                </div>
              )}
            </div>
          )}

          {/* Help link */}
          <div className="text-center">
            <a
              href="https://docs.pinata.cloud/docs/getting-started"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent-400 hover:text-accent-300 inline-flex items-center gap-1 transition-colors"
            >
              About IPFS Storage <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Connection status */}
          <div className="card p-4 space-y-2">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" /> Secure IPFS Storage Ready
            </h4>
            <p className="text-xs text-slate-400">Documents are encrypted client-side and stored on IPFS via the backend.</p>
          </div>

          {/* Usage stats */}
          {usageStats && (
            <div className="card p-4 space-y-2">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Storage Usage</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-lg bg-surface-950 border border-white/[0.04]">
                  <p className="text-[10px] text-slate-500">Storage</p>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">{formatUsage(usageStats.totalStorage, usageStats.storageLimit)}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-950 border border-white/[0.04]">
                  <p className="text-[10px] text-slate-500">Files</p>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">{usageStats.fileCount} / {usageStats.fileLimit}</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={initializeService} className="btn-secondary flex-1 text-xs py-2">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
            <button onClick={handleDisconnect} className="btn-danger text-xs py-2 px-4">
              <X className="w-3 h-3" /> Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IPFSConfig;
