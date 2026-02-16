import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Database, Keyboard, Lock
} from 'lucide-react';
import { useWeb3 } from '../../contexts/Web3Context';
import ipfsService from '../../utils/ipfs';

/* Animated counter that counts up from 0 */
function AnimatedValue({ value, isText = false }) {
  const [display, setDisplay] = useState(isText ? '' : '0');
  const ref = useRef(null);

  useEffect(() => {
    if (isText) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const target = String(value);
      let iteration = 0;
      const interval = setInterval(() => {
        setDisplay(
          target
            .split('')
            .map((char, i) => (i < iteration ? char : chars[Math.floor(Math.random() * chars.length)]))
            .join('')
        );
        iteration += 1 / 2;
        if (iteration >= target.length) {
          setDisplay(target);
          clearInterval(interval);
        }
      }, 40);
      return () => clearInterval(interval);
    }
  }, [value, isText]);

  if (isText) return <span>{display}</span>;
  return <span>{value}</span>;
}

const StatCard = ({ icon: Icon, label, value, accent, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
    className="card card-tilt p-4 flex items-center justify-between group hover:border-accent-500/20 transition-all duration-500 relative overflow-hidden"
  >
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-accent-500/5 to-transparent pointer-events-none" />
    <div className="relative z-10">
      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-medium mb-0.5">{label}</p>
      <p className={`text-xl font-display font-bold ${accent || 'text-white'}`}>
        <AnimatedValue value={value} isText={true} />
      </p>
    </div>
    <div className="relative z-10 w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.06] group-hover:border-accent-500/20 transition-all duration-300">
      <Icon className={`w-4 h-4 ${accent || 'text-slate-400'} group-hover:scale-110 transition-transform duration-300`} />
    </div>
  </motion.div>
);

/* Animated vault graphic — compact */
function VaultGraphic() {
  return (
    <div className="relative w-full h-52 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.6, rotate: -30 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
        className="absolute w-36 h-36 rounded-full border border-accent-500/20 animate-[spin_20s_linear_infinite]"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent-400 shadow-glow-amber" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        className="absolute w-24 h-24 border border-cyber-500/15 rotate-45 rounded-2xl animate-float"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-500/20 to-accent-600/10 border border-accent-500/30 flex items-center justify-center shadow-glow-amber animate-float"
        style={{ animationDelay: '0.5s' }}
      >
        <Shield className="w-7 h-7 text-accent-400" />
      </motion.div>

      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{ delay: 0.6 + i * 0.2, duration: 3, repeat: Infinity, repeatDelay: i * 0.5 }}
          className="absolute w-1 h-1 rounded-full bg-accent-400"
          style={{
            top: `${20 + Math.sin(i * 1.3) * 30}%`,
            left: `${20 + Math.cos(i * 1.3) * 30}%`,
          }}
        />
      ))}

      <div className="absolute top-2 right-2 w-8 h-8 border-t border-r border-accent-500/10 rounded-tr-lg" />
      <div className="absolute bottom-2 left-2 w-8 h-8 border-b border-l border-cyber-500/10 rounded-bl-lg" />
    </div>
  );
}

export default function Dashboard({ setActiveTab }) {
  const { account, isConnected, isConnecting, getNetworkName, connectWallet } = useWeb3();
  const [ipfsConnected, setIpfsConnected] = useState(false);

  useEffect(() => {
    const checkIpfs = async () => {
      if (ipfsService.isInitialized()) {
        setIpfsConnected(true);
        return;
      }
      try {
        const initialized = await ipfsService.initialize();
        setIpfsConnected(initialized);
      } catch {
        setIpfsConnected(false);
      }
    };
    checkIpfs();
  }, []);

  return (
    <div className="flex flex-col h-full gap-6 overflow-hidden">
      {/* Hero — Asymmetric layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center">
        {/* Left — 60% */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="lg:col-span-3 space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="h-[1px] w-8 bg-accent-500/40" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-accent-500 font-medium">
              {isConnected ? 'Vault Active' : 'Blockchain Vault'}
            </span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white leading-[1.1]">
            {isConnected ? (
              <>Welcome <span className="text-accent-400">back</span></>
            ) : (
              <>Secure Document <span className="text-accent-400">Vault</span></>
            )}
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-lg leading-relaxed">
            {isConnected
              ? 'Your encrypted documents are safe on the blockchain. AES-256 encryption with IPFS distributed storage.'
              : 'Military-grade encryption meets decentralized storage. Connect your wallet to begin.'}
          </p>
          {!isConnected && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <button
                className="btn-primary px-6 py-2.5 mt-1"
                onClick={() => connectWallet()}
                disabled={isConnecting}
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* Right — 40% */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="lg:col-span-2 hidden lg:block"
        >
          <VaultGraphic />
        </motion.div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          icon={Shield}
          label="Wallet"
          value={isConnected ? 'Connected' : 'Disconnected'}
          accent={isConnected ? 'text-emerald-400' : 'text-slate-500'}
          delay={0.1}
        />
        <StatCard
          icon={Database}
          label="Network"
          value={isConnected ? getNetworkName() : '--'}
          accent="text-cyber-400"
          delay={0.18}
        />
        <StatCard
          icon={Database}
          label="IPFS"
          value={ipfsConnected ? 'Online' : 'Offline'}
          accent={ipfsConnected ? 'text-accent-400' : 'text-slate-500'}
          delay={0.26}
        />
      </div>

      {/* How it works + Keyboard shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0 min-w-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-4 relative overflow-hidden scanline-overlay min-w-0"
        >
          <h3 className="font-display font-semibold text-white text-sm mb-4 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-accent-500" />
            How It Works
          </h3>
          <div className="relative">
            <div className="absolute left-[9px] top-3 bottom-3 w-[2px] bg-gradient-to-b from-accent-500/30 via-cyber-500/20 to-accent-500/30 rounded-full">
              <motion.div
                className="w-full bg-accent-400 rounded-full"
                initial={{ height: '0%' }}
                animate={{ height: '100%' }}
                transition={{ delay: 0.5, duration: 1.5, ease: 'easeInOut' }}
              />
            </div>

            <div className="space-y-3.5">
              {[
                { step: '01', title: 'Generate Key', desc: 'Create an AES-256 encryption key', color: 'text-accent-400 border-accent-500/30 bg-accent-500/10' },
                { step: '02', title: 'Upload & Encrypt', desc: 'Select a file and encrypt it client-side', color: 'text-cyber-400 border-cyber-500/30 bg-cyber-500/10' },
                { step: '03', title: 'Store on Chain', desc: 'Upload to IPFS and record hash on Polygon', color: 'text-violet-400 border-violet-500/30 bg-violet-500/10' },
                { step: '04', title: 'Retrieve Anytime', desc: 'Decrypt and download using your key', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-center gap-3 min-w-0"
                >
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-mono font-bold shrink-0 ${item.color}`}>
                    {item.step}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 leading-tight truncate">{item.title}</p>
                    <p className="text-[11px] text-slate-500 truncate">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Keyboard className="w-3.5 h-3.5 text-slate-500" />
            <h3 className="font-display font-semibold text-white text-sm">Keyboard Shortcuts</h3>
          </div>
          <div className="space-y-2">
            {[
              { key: 'D', desc: 'Dashboard' },
              { key: 'U', desc: 'Upload' },
              { key: 'R', desc: 'Retrieve' },
              { key: 'A', desc: 'Access Management' },
              { key: 'B', desc: 'Toggle Sidebar' },
            ].map((shortcut, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
                className="flex items-center justify-between"
              >
                <span className="text-xs text-slate-400">{shortcut.desc}</span>
                <kbd className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-[11px] text-slate-300 font-mono shadow-inner-glow">
                  {shortcut.key}
                </kbd>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
