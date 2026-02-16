import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Upload, Download, Users, Shield, Database,
  ArrowUpRight, FileText, Clock, Wifi, WifiOff, Keyboard, Lock, Hexagon
} from 'lucide-react';
import { useWeb3 } from '../../contexts/Web3Context';
import ipfsService from '../../utils/ipfs';

/* Animated counter that counts up from 0 */
function AnimatedValue({ value, isText = false }) {
  const [display, setDisplay] = useState(isText ? '' : '0');
  const ref = useRef(null);

  useEffect(() => {
    if (isText) {
      // Scramble text effect
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
    initial={{ opacity: 0, y: 24, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
    className="card card-tilt p-5 flex items-start justify-between group hover:border-accent-500/20 transition-all duration-500 relative overflow-hidden"
  >
    {/* Hover glow effect */}
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-accent-500/5 to-transparent pointer-events-none" />
    <div className="relative z-10">
      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-medium mb-2">{label}</p>
      <p className={`text-2xl font-display font-bold ${accent || 'text-white'}`}>
        <AnimatedValue value={value} isText={true} />
      </p>
    </div>
    <div className={`relative z-10 w-10 h-10 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.06] group-hover:border-accent-500/20 transition-all duration-300`}>
      <Icon className={`w-5 h-5 ${accent || 'text-slate-400'} group-hover:scale-110 transition-transform duration-300`} />
    </div>
  </motion.div>
);

const QuickAction = ({ icon: Icon, label, description, onClick, delay = 0, offset = 0 }) => (
  <motion.button
    initial={{ opacity: 0, y: 32 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
    onClick={onClick}
    className="card-hover card-tilt p-5 text-left group w-full"
    style={{ marginTop: offset }}
  >
    <div className="flex items-start gap-4">
      <div className="w-11 h-11 rounded-xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center shrink-0 group-hover:bg-accent-500/20 group-hover:shadow-glow-amber transition-all duration-300">
        <Icon className="w-5 h-5 text-accent-400 group-hover:scale-110 transition-transform duration-300" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-semibold text-white text-sm">{label}</h3>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
        </div>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  </motion.button>
);

/* Animated vault graphic with overlapping geometric shapes */
function VaultGraphic() {
  return (
    <div className="relative w-full h-64 md:h-80 flex items-center justify-center">
      {/* Outer ring */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6, rotate: -30 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
        className="absolute w-48 h-48 md:w-56 md:h-56 rounded-full border border-accent-500/20 animate-[spin_20s_linear_infinite]"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-accent-400 shadow-glow-amber" />
      </motion.div>

      {/* Middle hexagon shape */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        className="absolute w-32 h-32 md:w-40 md:h-40 border border-cyber-500/15 rotate-45 rounded-2xl animate-float"
      />

      {/* Inner shield */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-accent-500/20 to-accent-600/10 border border-accent-500/30 flex items-center justify-center shadow-glow-amber animate-float"
        style={{ animationDelay: '0.5s' }}
      >
        <Shield className="w-8 h-8 md:w-10 md:h-10 text-accent-400" />
      </motion.div>

      {/* Floating particles */}
      {[...Array(5)].map((_, i) => (
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

      {/* Corner accent lines */}
      <div className="absolute top-4 right-4 w-12 h-12 border-t border-r border-accent-500/10 rounded-tr-lg" />
      <div className="absolute bottom-4 left-4 w-12 h-12 border-b border-l border-cyber-500/10 rounded-bl-lg" />
    </div>
  );
}

export default function Dashboard({ setActiveTab }) {
  const { account, isConnected, getNetworkName } = useWeb3();
  const [ipfsConnected, setIpfsConnected] = useState(false);

  useEffect(() => {
    setIpfsConnected(ipfsService.isInitialized());
  }, []);

  return (
    <div className="space-y-10">
      {/* Hero — Asymmetric layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
        {/* Left — 60% width: big welcome text */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="lg:col-span-3 space-y-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="h-[1px] w-8 bg-accent-500/40" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-accent-500 font-medium">
              {isConnected ? 'Vault Active' : 'Blockchain Vault'}
            </span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1]">
            {isConnected ? (
              <>Welcome <span className="text-accent-400">back</span></>
            ) : (
              <>Secure Document <span className="text-accent-400">Vault</span></>
            )}
          </h1>
          <p className="text-slate-400 text-base md:text-lg max-w-lg leading-relaxed">
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
              <button className="btn-primary text-base px-8 py-3 mt-2">
                Connect Wallet
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* Right — 40% width: animated vault graphic */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="lg:col-span-2"
        >
          <VaultGraphic />
        </motion.div>
      </div>

      {/* Status Cards — staggered entrance with glow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          icon={isConnected && ipfsConnected ? Wifi : WifiOff}
          label="IPFS"
          value={ipfsConnected ? 'Online' : 'Offline'}
          accent={ipfsConnected ? 'text-accent-400' : 'text-slate-500'}
          delay={0.26}
        />
        <StatCard
          icon={FileText}
          label="Encryption"
          value="AES-256"
          accent="text-violet-400"
          delay={0.34}
        />
      </div>

      {/* Quick Actions — staggered with offset heights */}
      <div>
        <h2 className="font-display font-semibold text-white text-base mb-5 flex items-center gap-3">
          <div className="w-1 h-5 rounded-full bg-accent-500" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <QuickAction
            icon={Upload}
            label="Upload Document"
            description="Encrypt and store a new document on IPFS + blockchain"
            onClick={() => setActiveTab('upload')}
            delay={0.15}
            offset={0}
          />
          <QuickAction
            icon={Download}
            label="Retrieve Document"
            description="Download and decrypt a previously stored document"
            onClick={() => setActiveTab('retrieve')}
            delay={0.22}
            offset={window.innerWidth >= 768 ? 16 : 0}
          />
          <QuickAction
            icon={Users}
            label="Manage Access"
            description="Grant or revoke access to your encrypted documents"
            onClick={() => setActiveTab('access')}
            delay={0.29}
            offset={window.innerWidth >= 768 ? 32 : 0}
          />
        </div>
      </div>

      {/* How it works + Keyboard shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6 relative overflow-hidden scanline-overlay"
        >
          <h3 className="font-display font-semibold text-white text-sm mb-6 flex items-center gap-3">
            <Lock className="w-4 h-4 text-accent-500" />
            How It Works
          </h3>
          <div className="relative">
            {/* Animated connecting line */}
            <div className="absolute left-[11px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-accent-500/30 via-cyber-500/20 to-accent-500/30 rounded-full">
              <motion.div
                className="w-full bg-accent-400 rounded-full"
                initial={{ height: '0%' }}
                animate={{ height: '100%' }}
                transition={{ delay: 0.5, duration: 1.5, ease: 'easeInOut' }}
              />
            </div>

            <div className="space-y-6">
              {[
                { step: '01', title: 'Generate Key', desc: 'Create an AES-256 encryption key', color: 'text-accent-400 border-accent-500/30 bg-accent-500/10' },
                { step: '02', title: 'Upload & Encrypt', desc: 'Select a file and encrypt it client-side', color: 'text-cyber-400 border-cyber-500/30 bg-cyber-500/10' },
                { step: '03', title: 'Store on Chain', desc: 'Upload to IPFS and record the hash on Polygon', color: 'text-violet-400 border-violet-500/30 bg-violet-500/10' },
                { step: '04', title: 'Retrieve Anytime', desc: 'Decrypt and download using your key', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.12 }}
                  className="flex items-start gap-4 pl-0"
                >
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${item.color}`}>
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{item.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <Keyboard className="w-4 h-4 text-slate-500" />
            <h3 className="font-display font-semibold text-white text-sm">Keyboard Shortcuts</h3>
          </div>
          <div className="space-y-3">
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
                transition={{ delay: 0.4 + i * 0.06 }}
                className="flex items-center justify-between py-1"
              >
                <span className="text-sm text-slate-400">{shortcut.desc}</span>
                <kbd className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-xs text-slate-300 font-mono shadow-inner-glow">
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
