import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Globe, Loader2 } from 'lucide-react';

const MetaMaskDebug = () => {
  const [debugInfo, setDebugInfo] = useState({});
  const [testResult, setTestResult] = useState('');

  useEffect(() => { checkMetaMaskStatus(); }, []);

  const checkMetaMaskStatus = async () => {
    const info = {};
    info.windowEthereum = !!window.ethereum;
    info.isMetaMask = window.ethereum?.isMetaMask;

    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        info.existingAccounts = accounts;
        info.accountCount = accounts.length;
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        info.chainId = chainId;
        info.chainIdDecimal = parseInt(chainId, 16);
        info.isUnlocked = accounts.length > 0;
        info.networkVersion = window.ethereum.networkVersion;
        info.selectedAddress = window.ethereum.selectedAddress;
      } catch (error) {
        info.error = error.message;
      }
    }

    info.hasWeb3 = !!window.web3;
    info.isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
    info.isChrome = navigator.userAgent.toLowerCase().includes('chrome');
    setDebugInfo(info);
  };

  const testConnection = async () => {
    setTestResult('Testing...');
    try {
      if (!window.ethereum) { setTestResult('MetaMask not detected'); return; }
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length === 0) { setTestResult('No accounts returned'); return; }
      setTestResult(`Connection successful! Account: ${accounts[0]}`);
      await checkMetaMaskStatus();
    } catch (error) {
      setTestResult(`Connection failed: ${error.message}`);
    }
  };

  const checkPermissions = async () => {
    if (!window.ethereum) { setTestResult('MetaMask not detected'); return; }
    try {
      const permissions = await window.ethereum.request({ method: 'wallet_getPermissions' });
      setTestResult(`Permissions: ${JSON.stringify(permissions, null, 2)}`);
    } catch (error) {
      setTestResult(`Permission check failed: ${error.message}`);
    }
  };

  const requestPermissions = async () => {
    if (!window.ethereum) { setTestResult('MetaMask not detected'); return; }
    try {
      const permissions = await window.ethereum.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] });
      setTestResult(`Permissions granted: ${JSON.stringify(permissions, null, 2)}`);
      await checkMetaMaskStatus();
    } catch (error) {
      setTestResult(`Permission request failed: ${error.message}`);
    }
  };

  const switchToAmoy = async () => {
    if (!window.ethereum) { setTestResult('MetaMask not detected'); return; }
    try {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x13882' }] });
      setTestResult('Switched to Polygon Amoy testnet');
      await checkMetaMaskStatus();
    } catch (error) {
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{ chainId: '0x13882', chainName: 'Polygon Amoy Testnet', nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }, rpcUrls: ['https://rpc-amoy.polygon.technology/'], blockExplorerUrls: ['https://www.oklink.com/amoy'] }],
          });
          setTestResult('Added and switched to Polygon Amoy testnet');
          await checkMetaMaskStatus();
        } catch (addError) {
          setTestResult(`Failed to add network: ${addError.message}`);
        }
      } else {
        setTestResult(`Failed to switch network: ${error.message}`);
      }
    }
  };

  const StatusIcon = ({ ok, warn }) => {
    if (ok) return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
    if (warn) return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
    return <XCircle className="w-3.5 h-3.5 text-rose-400" />;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-white text-sm">MetaMask Debug</h3>
        <button onClick={checkMetaMaskStatus} className="btn-ghost text-xs">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Status */}
      <div className="card p-4 space-y-2">
        <h4 className="text-xs text-slate-500 uppercase tracking-wider font-medium">Status</h4>
        <div className="space-y-1.5">
          {[
            ['MetaMask Detected', debugInfo.windowEthereum],
            ['Is MetaMask', debugInfo.isMetaMask],
            ['Unlocked', debugInfo.isUnlocked],
          ].map(([label, ok]) => (
            <div key={label} className="flex items-center justify-between py-1">
              <span className="text-xs text-slate-400">{label}</span>
              <StatusIcon ok={ok} warn={!ok && label === 'Unlocked'} />
            </div>
          ))}
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-slate-400">Accounts</span>
            <span className="text-xs text-slate-300 font-mono">{debugInfo.accountCount || 0}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-slate-400">Chain ID</span>
            <span className="text-xs text-slate-300 font-mono">{debugInfo.chainId} ({debugInfo.chainIdDecimal})</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-slate-400">Address</span>
            <span className="text-xs text-cyber-400 font-mono truncate max-w-[200px]">{debugInfo.selectedAddress || 'None'}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-slate-400">Browser</span>
            <span className="text-xs text-slate-300 flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {debugInfo.isChrome ? 'Chrome' : debugInfo.isFirefox ? 'Firefox' : 'Other'}
            </span>
          </div>
        </div>
      </div>

      {/* Tests */}
      <div className="card p-4 space-y-3">
        <h4 className="text-xs text-slate-500 uppercase tracking-wider font-medium">Connection Tests</h4>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={testConnection} className="btn-secondary text-xs py-2">Test Connection</button>
          <button onClick={checkPermissions} className="btn-secondary text-xs py-2">Check Permissions</button>
          <button onClick={requestPermissions} className="btn-secondary text-xs py-2">Request Permissions</button>
          <button onClick={switchToAmoy} className="btn-primary text-xs py-2">Switch to Amoy</button>
        </div>

        {testResult && (
          <div className="p-3 rounded-lg bg-surface-950 border border-white/[0.06]">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Result</p>
            <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-all">{testResult}</pre>
          </div>
        )}
      </div>

      {/* Accounts */}
      {debugInfo.existingAccounts?.length > 0 && (
        <div className="card p-4 space-y-2">
          <h4 className="text-xs text-slate-500 uppercase tracking-wider font-medium">Accounts</h4>
          <div className="space-y-1">
            {debugInfo.existingAccounts.map((account, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <span className="text-[10px] text-slate-600 font-mono">#{i + 1}</span>
                <span className="text-xs text-cyber-400 font-mono truncate">{account}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {debugInfo.error && (
        <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/10">
          <p className="text-[10px] text-rose-500 uppercase tracking-wider mb-1">Error</p>
          <pre className="text-xs text-rose-400 font-mono whitespace-pre-wrap">{debugInfo.error}</pre>
        </div>
      )}

      {/* Tips */}
      <div className="card p-4 space-y-2">
        <h4 className="text-xs text-slate-500 uppercase tracking-wider font-medium">Troubleshooting</h4>
        <ul className="space-y-1">
          {[
            'Make sure MetaMask extension is installed and enabled',
            'Unlock your MetaMask wallet',
            'Refresh the page if MetaMask was just installed',
            'Check if you\'re on the correct network (Polygon Amoy)',
            'Try disconnecting and reconnecting in MetaMask settings',
            'Disable other crypto wallet extensions temporarily',
          ].map((tip, i) => (
            <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
              <span className="text-slate-600 mt-0.5">-</span> {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default MetaMaskDebug;
