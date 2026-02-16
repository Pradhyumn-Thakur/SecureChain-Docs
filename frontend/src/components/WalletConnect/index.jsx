import React, { useState, useCallback } from 'react';
import { Wallet, LogOut, AlertCircle, ChevronDown } from 'lucide-react';
import { useWeb3 } from '../../contexts/Web3Context';

const isValidAddress = (address) => /^0x[a-fA-F0-9]{40}$/.test(address);

const WalletConnect = () => {
  const {
    account, isConnecting, error,
    connectWallet, disconnectWallet, formatAddress, getNetworkName
  } = useWeb3();

  const [manualAddress, setManualAddress] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleManualConnect = useCallback(async () => {
    const trimmed = manualAddress.trim();
    if (!trimmed || !isValidAddress(trimmed)) return;
    try {
      await connectWallet(trimmed);
      setManualAddress('');
      setShowManualInput(false);
    } catch (err) { console.error('Manual connection failed:', err); }
  }, [manualAddress, connectWallet]);

  const handleNormalConnect = useCallback(async () => {
    try { await connectWallet(); } catch (err) { console.error('Connection failed:', err); }
  }, [connectWallet]);

  if (account) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-all text-sm"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="font-mono text-slate-300 text-xs">{formatAddress(account)}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
        </button>

        {showDropdown && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
            <div className="absolute right-0 mt-2 w-56 z-50 card p-3 space-y-2">
              <div className="px-2 py-1">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Network</p>
                <p className="text-sm text-cyber-400 font-medium">{getNetworkName()}</p>
              </div>
              <div className="px-2 py-1">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Address</p>
                <p className="text-xs text-slate-300 font-mono break-all">{account}</p>
              </div>
              <div className="border-t border-white/[0.06] pt-2">
                <button
                  onClick={() => { disconnectWallet(); setShowDropdown(false); }}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-rose-400 hover:bg-rose-500/10 text-sm transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Disconnect
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        className="btn-primary text-xs py-2 px-4"
        onClick={handleNormalConnect}
        disabled={isConnecting}
      >
        {isConnecting ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-surface-950/30 border-t-surface-950 rounded-full animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Wallet className="w-3.5 h-3.5" />
            Connect
          </>
        )}
      </button>

      <button
        onClick={() => setShowManualInput(!showManualInput)}
        className="btn-ghost text-xs py-2"
      >
        Manual
      </button>

      {showManualInput && (
        <div className="absolute top-full right-0 mt-2 w-80 card p-4 z-50 space-y-3">
          <p className="text-xs text-slate-400">Enter wallet address manually</p>
          <input
            type="text"
            placeholder="0x..."
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleManualConnect()}
            className="input-field text-xs font-mono"
          />
          {manualAddress && !isValidAddress(manualAddress) && (
            <p className="text-xs text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Invalid address format
            </p>
          )}
          <button
            onClick={handleManualConnect}
            disabled={!isValidAddress(manualAddress) || isConnecting}
            className="btn-primary w-full text-xs py-2"
          >
            Connect
          </button>
        </div>
      )}

      {error && !showManualInput && (
        <div className="absolute top-full right-0 mt-2 w-72 card p-3 z-50">
          <p className="text-xs text-rose-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </p>
        </div>
      )}
    </div>
  );
};

export default WalletConnect;
