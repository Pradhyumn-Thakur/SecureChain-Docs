import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import ipfsService from '../../utils/ipfs';

const IPFSStatus = ({ onConfigured }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    checkConnection();
  }, [onConfigured]);

  const checkConnection = async () => {
    try {
      const connected = ipfsService.isInitialized();
      if (!connected) {
        await initializeService();
      } else {
        setIsConnected(true);
        onConfigured?.(true);
      }
    } catch {
      setIsConnected(false);
      onConfigured?.(false);
    }
  };

  const initializeService = async () => {
    try {
      setIsConnecting(true);
      const initialized = await ipfsService.initialize();
      setIsConnected(initialized);
      onConfigured?.(initialized);
    } catch {
      setIsConnected(false);
      onConfigured?.(false);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
      <span className="text-xs text-slate-500 font-medium">IPFS</span>
      {isConnected ? (
        <div className="flex items-center gap-1.5">
          <Wifi className="w-3 h-3 text-emerald-400" />
          <span className="text-xs text-emerald-400">Connected</span>
        </div>
      ) : isConnecting ? (
        <div className="flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
          <span className="text-xs text-slate-400">Connecting</span>
        </div>
      ) : (
        <button
          onClick={initializeService}
          className="flex items-center gap-1.5 text-xs text-accent-400 hover:text-accent-300 transition-colors"
        >
          <WifiOff className="w-3 h-3" />
          Connect
        </button>
      )}
    </div>
  );
};

export default IPFSStatus;
