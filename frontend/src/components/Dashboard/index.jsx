import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Database, Keyboard, Lock, ExternalLink, Copy, Check, FileCheck2
} from 'lucide-react';
import { useWeb3 } from '../../contexts/Web3Context';
import ipfsService from '../../utils/ipfs';
import contractAddress from '../../contracts/contract-address.json';

const StatCard = ({ icon: Icon, label, value, positive, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.3, ease: 'easeOut' }}
    className="card p-4 flex items-center justify-between"
  >
    <div>
      <p className="text-[11px] uppercase tracking-[0.08em] text-ink-400 font-medium mb-0.5">{label}</p>
      <p className={`text-base font-semibold ${positive ? 'text-accent-600' : 'text-ink-800'}`}>
        {value}
      </p>
    </div>
    <div className="w-8 h-8 rounded-md flex items-center justify-center bg-paper-100 border border-ink-100">
      <Icon className={`w-4 h-4 ${positive ? 'text-accent-600' : 'text-ink-400'}`} />
    </div>
  </motion.div>
);

/**
 * The registry record: instead of decorative graphics, the dashboard
 * presents verifiable facts — the contract address, the network, and
 * exactly where encryption happens. Every line can be checked.
 */
function RegistryRecord() {
  const { network, getNetworkName, isConnected } = useWeb3();
  const [copied, setCopied] = useState(false);

  const address = contractAddress.DocumentRegistry;
  const chainId = network ? Number(network.chainId) : null;
  const explorerBase =
    chainId === 137 ? 'https://polygonscan.com/address/'
    : chainId === 80002 ? 'https://amoy.polygonscan.com/address/'
    : null;

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-ink-100 bg-paper-100 flex items-center gap-2.5">
        <FileCheck2 className="w-4 h-4 text-accent-600" />
        <h3 className="font-display font-semibold text-ink-900 text-sm">Registry record</h3>
        <span className="ml-auto text-[10px] uppercase tracking-[0.1em] text-ink-400 font-medium">verifiable</span>
      </div>
      <div className="px-5 py-1">
        <div className="evidence-row">
          <span className="evidence-label">Smart contract</span>
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="evidence-value">{address.slice(0, 10)}…{address.slice(-8)}</span>
            <button onClick={copyAddress} className="text-ink-300 hover:text-ink-700 transition-colors shrink-0" title="Copy address">
              {copied ? <Check className="w-3.5 h-3.5 text-accent-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            {explorerBase && (
              <a
                href={explorerBase + address}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyber-500 hover:text-cyber-700 transition-colors shrink-0"
                title="View on block explorer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </span>
        </div>
        <div className="evidence-row">
          <span className="evidence-label">Network</span>
          <span className="evidence-value">{isConnected ? getNetworkName() : 'Connect wallet to verify'}</span>
        </div>
        <div className="evidence-row">
          <span className="evidence-label">Encryption</span>
          <span className="evidence-value">AES-256-GCM, in this browser</span>
        </div>
        <div className="evidence-row">
          <span className="evidence-label">Key custody</span>
          <span className="evidence-value">Your device only — never sent</span>
        </div>
        <div className="evidence-row">
          <span className="evidence-label">File storage</span>
          <span className="evidence-value">IPFS (encrypted before upload)</span>
        </div>
      </div>
      <div className="px-5 py-3 border-t border-ink-100 bg-paper-100">
        <p className="text-[11px] text-ink-400 leading-relaxed">
          Access permissions are recorded on a public blockchain. Anyone can audit who was
          granted or revoked access, and when — including you.
        </p>
      </div>
    </div>
  );
}

export default function Dashboard({ setActiveTab }) {
  const { account, isConnected, isConnecting, getNetworkName, connectWallet } = useWeb3();
  const [ipfsConnected, setIpfsConnected] = useState(false);

  // Backend auth requires a wallet signature and is initiated by Web3Context
  // after connect — poll the shared service for its status here.
  useEffect(() => {
    const sync = () => setIpfsConnected(!!ipfsService.isInitialized());
    sync();
    const interval = setInterval(sync, 2000);
    return () => clearInterval(interval);
  }, [isConnected]);

  return (
    <div className="flex flex-col h-full gap-6 overflow-hidden">
      {/* Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="lg:col-span-3 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-accent-600" />
            <span className="text-[11px] uppercase tracking-[0.16em] text-accent-700 font-semibold">
              Encrypted document registry
            </span>
          </div>
          <h1 className="font-display text-4xl md:text-[44px] font-bold text-ink-900 leading-[1.12] tracking-[-0.01em]">
            {isConnected ? (
              <>Your documents,<br />on the record.</>
            ) : (
              <>Documents, sealed<br />and on the record.</>
            )}
          </h1>
          <p className="text-ink-500 text-sm md:text-[15px] max-w-lg leading-relaxed">
            {isConnected
              ? 'Files are encrypted on your device before anything leaves it. The blockchain keeps a public, tamper-evident record of every document and every permission.'
              : 'Every file is encrypted on your device before it is stored. A public blockchain records what exists and who may read it — nothing is taken on faith.'}
          </p>
          {!isConnected && (
            <button
              className="btn-primary px-6 py-2.5"
              onClick={() => connectWallet()}
              disabled={isConnecting}
            >
              {isConnecting ? 'Connecting…' : 'Connect Wallet'}
            </button>
          )}
        </motion.div>

        {/* Evidence instead of decoration */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="lg:col-span-2 hidden lg:block"
        >
          <RegistryRecord />
        </motion.div>
      </div>

      {/* Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          icon={Shield}
          label="Wallet"
          value={isConnected ? 'Connected' : 'Not connected'}
          positive={isConnected}
          delay={0.05}
        />
        <StatCard
          icon={Database}
          label="Network"
          value={isConnected ? getNetworkName() : '—'}
          delay={0.1}
        />
        <StatCard
          icon={Database}
          label="Storage session"
          value={ipfsConnected ? 'Authenticated' : 'Awaiting wallet'}
          positive={ipfsConnected}
          delay={0.15}
        />
      </div>

      {/* How it works + Keyboard shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0 min-w-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-5 min-w-0"
        >
          <h3 className="font-display font-semibold text-ink-900 text-sm mb-4 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-accent-600" />
            How it works
          </h3>
          <div className="relative">
            <div className="absolute left-[11px] top-3 bottom-3 w-px bg-ink-100" />
            <div className="space-y-4">
              {[
                { step: '1', title: 'Generate a key', desc: 'An AES-256 key is created in your browser' },
                { step: '2', title: 'Encrypt locally', desc: 'The file is sealed before any upload happens' },
                { step: '3', title: 'Record on chain', desc: 'IPFS stores the ciphertext; Polygon records the proof' },
                { step: '4', title: 'Retrieve & share', desc: 'Access is checked against the blockchain every time' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 min-w-0 relative">
                  <div className="w-[23px] h-[23px] rounded-full bg-white border border-ink-200 flex items-center justify-center text-[10px] font-mono font-medium text-ink-600 shrink-0 relative z-10">
                    {item.step}
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-[13px] font-medium text-ink-800 leading-tight">{item.title}</p>
                    <p className="text-xs text-ink-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Keyboard className="w-3.5 h-3.5 text-ink-400" />
            <h3 className="font-display font-semibold text-ink-900 text-sm">Keyboard shortcuts</h3>
          </div>
          <div className="space-y-2.5">
            {[
              { key: 'D', desc: 'Dashboard' },
              { key: 'U', desc: 'Upload' },
              { key: 'R', desc: 'Retrieve' },
              { key: 'A', desc: 'Access management' },
              { key: 'B', desc: 'Toggle sidebar' },
            ].map((shortcut, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs text-ink-500">{shortcut.desc}</span>
                <kbd className="font-mono">{shortcut.key}</kbd>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
