import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import ipfsService from '../../utils/ipfs';
import { useWeb3 } from '../../contexts/Web3Context';

// Backend authentication now requires a wallet signature, so the session is
// established by Web3Context right after the wallet connects. This component
// just reflects that state.
const IPFSStatus = ({ onConfigured }) => {
  const { isConnected: walletConnected, signer, account } = useWeb3();
  const [isConnected, setIsConnected] = useState(ipfsService.isInitialized());
  const [isConnecting, setIsConnecting] = useState(false);

  // Poll the singleton; auth happens asynchronously after wallet connect
  useEffect(() => {
    const sync = () => {
      const ready = !!ipfsService.isInitialized();
      setIsConnected(ready);
      onConfigured?.(ready);
    };
    sync();
    const interval = setInterval(sync, 2000);
    return () => clearInterval(interval);
  }, [onConfigured]);

  const retry = async () => {
    if (!signer || !account || isConnecting) return;
    setIsConnecting(true);
    try {
      const ok = await ipfsService.authenticate(signer, account);
      setIsConnected(ok);
      onConfigured?.(ok);
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
      ) : walletConnected ? (
        <button
          onClick={retry}
          className="flex items-center gap-1.5 text-xs text-accent-400 hover:text-accent-300 transition-colors"
        >
          <WifiOff className="w-3 h-3" />
          Connect
        </button>
      ) : (
        <div className="flex items-center gap-1.5">
          <WifiOff className="w-3 h-3 text-slate-500" />
          <span className="text-xs text-slate-500">Wallet needed</span>
        </div>
      )}
    </div>
  );
};

export default IPFSStatus;
