import React, { useState, useCallback, createContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Upload, Download, Users, LayoutDashboard,
  Menu, X, Sun, Moon, ChevronRight
} from 'lucide-react';
import WalletConnect from './components/WalletConnect';
import IPFSStatus from './components/IPFSStatus';
import Dashboard from './components/Dashboard';
import UploadFlow from './components/UploadFlow';
import DocumentRetrieval from './components/DocumentRetrieval';
import AccessManagementPage from './components/AccessManagementPage';
import { Web3Provider, useWeb3 } from './contexts/Web3Context';

export const AppContext = createContext();

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, shortcut: 'D' },
  { id: 'upload', label: 'Upload', icon: Upload, shortcut: 'U' },
  { id: 'retrieve', label: 'Retrieve', icon: Download, shortcut: 'R' },
  { id: 'access', label: 'Access', icon: Users, shortcut: 'A' },
];

function Notifications({ notifications, removeNotification }) {
  const typeStyles = {
    success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    error: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
    info: 'border-cyber-500/40 bg-cyber-500/10 text-cyber-300',
    warning: 'border-accent-500/40 bg-accent-500/10 text-accent-300',
  };

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-3 max-w-sm">
      <AnimatePresence>
        {notifications.map(n => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 80, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.95 }}
            className={`px-4 py-3 rounded-lg border backdrop-blur-md cursor-pointer text-sm font-medium flex items-center justify-between gap-3 ${typeStyles[n.type] || typeStyles.info}`}
            onClick={() => removeNotification(n.id)}
          >
            <span>{n.message}</span>
            <button
              className="text-current opacity-50 hover:opacity-100 transition-opacity shrink-0"
              onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Sidebar({ activeTab, setActiveTab, collapsed, setCollapsed }) {
  const { account, formatAddress } = useWeb3();

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full z-50 flex flex-col bg-surface-900/95 backdrop-blur-xl border-r border-white/[0.06] transition-all duration-300 ease-out
          ${collapsed ? '-translate-x-full lg:translate-x-0 lg:w-20' : 'translate-x-0 w-64'}`}
      >
        {/* Logo with pulse-glow */}
        <div className={`flex items-center gap-3 px-5 h-16 border-b border-white/[0.06] shrink-0 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-glow-amber shrink-0 animate-pulse-glow">
            <Shield className="w-5 h-5 text-surface-950" />
          </div>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden">
              <h1 className="font-display font-bold text-lg text-white tracking-tight">Vault</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Secure Storage</p>
            </motion.div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto lg:hidden p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation with active glow bar */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); if (window.innerWidth < 1024) setCollapsed(true); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative
                  ${isActive
                    ? 'bg-accent-500/10 text-accent-400 border border-accent-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
                  }
                  ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                {/* Glowing amber bar on active */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-accent-400 shadow-glow-amber"
                    style={{ boxShadow: '0 0 12px rgba(245, 158, 11, 0.6), 0 0 4px rgba(245, 158, 11, 0.8)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <item.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-accent-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && isActive && (
                  <ChevronRight className="w-4 h-4 ml-auto text-accent-500/60" />
                )}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-surface-800 rounded-md text-xs text-slate-200 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap hidden lg:block border border-white/[0.08]">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        {!collapsed && (
          <div className="p-4 border-t border-white/[0.06] space-y-3">
            <IPFSStatus />
            {account && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-slate-400 font-mono">{formatAddress(account)}</span>
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [darkMode, setDarkMode] = useState(true);

  // Sync dark class on <html> element
  React.useEffect(() => {
    const html = document.documentElement;
    if (darkMode) {
      html.classList.add('dark');
      document.body.style.background = '#0B0F19';
    } else {
      html.classList.remove('dark');
      document.body.style.background = '#f4f5f7';
    }
  }, [darkMode]);

  // Shared state for upload flow
  const [selectedFile, setSelectedFile] = useState(null);
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [encryptedData, setEncryptedData] = useState(null);
  const [documentHash, setDocumentHash] = useState(null);
  const [isDocumentOwner, setIsDocumentOwner] = useState(false);
  const [ipfsConfigured, setIpfsConfigured] = useState(false);

  const addNotification = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const handleFileSelect = useCallback((file) => {
    setSelectedFile(file);
    setEncryptedData(null);
  }, []);

  const handleKeyGenerated = useCallback((key) => {
    if (key !== encryptionKey) {
      setEncryptionKey(key);
      if (key && !encryptionKey) {
        addNotification('Encryption key loaded', 'success');
      }
    }
  }, [encryptionKey, addNotification]);

  const handleEncrypted = useCallback((result) => {
    setEncryptedData(result);
    if (result.originalHash) {
      setDocumentHash(result.originalHash);
      setIsDocumentOwner(true);
    }
    addNotification('File encrypted successfully', 'success');
  }, [addNotification]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.ctrlKey || e.metaKey) return;

      switch (e.key.toLowerCase()) {
        case 'd': setActiveTab('dashboard'); break;
        case 'u': setActiveTab('upload'); break;
        case 'r': setActiveTab('retrieve'); break;
        case 'a': setActiveTab('access'); break;
        case 'b': setSidebarCollapsed(c => !c); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const pageVariants = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  };

  return (
    <AppContext.Provider value={{ addNotification, removeNotification }}>
      <div className="h-screen bg-surface-950 relative overflow-hidden overscroll-none">
        {/* Noise texture overlay */}
        <div className="noise-overlay" />

        {/* Animated gradient mesh background */}
        <div className="fixed inset-0 gradient-mesh pointer-events-none" />

        {/* Hex pattern overlay */}
        <div className="fixed inset-0 hex-pattern pointer-events-none opacity-40" />

        {/* Ambient background glows — stronger, animated */}
        <div className="ambient-glow bg-accent-500 top-[-200px] right-[-200px]" />
        <div className="ambient-glow bg-cyber-500 bottom-[-200px] left-[-200px]" />
        <div className="ambient-glow bg-violet-500 top-[40%] left-[30%]" style={{ width: 400, height: 400, opacity: 0.06 }} />

        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />

        {/* Main content */}
        <div className={`h-screen flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
          {/* Top bar with animated gradient bottom border */}
          <header className="shrink-0 z-30 h-16 flex items-center justify-between px-4 md:px-8 bg-surface-950/80 backdrop-blur-xl border-b border-white/[0.04] relative">
            {/* Animated gradient bottom border */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent-500/30 to-transparent animate-gradient-shift" style={{ backgroundSize: '200% 100%' }} />

            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarCollapsed(c => !c)}
                className="p-2 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h2 className="font-display font-semibold text-white text-base">
                  {NAV_ITEMS.find(i => i.id === activeTab)?.label}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors"
                title="Toggle theme"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <WalletConnect />
            </div>
          </header>

          {/* Page content */}
          <main className="p-4 md:px-8 md:py-6 max-w-7xl relative z-10 flex-1 overflow-y-auto overflow-x-hidden flex flex-col w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="flex-1 flex flex-col"
              >
                {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
                {activeTab === 'upload' && (
                  <UploadFlow
                    selectedFile={selectedFile}
                    encryptionKey={encryptionKey}
                    encryptedData={encryptedData}
                    onFileSelect={handleFileSelect}
                    onKeyGenerated={handleKeyGenerated}
                    onEncrypted={handleEncrypted}
                  />
                )}
                {activeTab === 'retrieve' && <DocumentRetrieval />}
                {activeTab === 'access' && (
                  <AccessManagementPage
                    documentHash={documentHash}
                    isDocumentOwner={isDocumentOwner}
                    encryptionKey={encryptionKey}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        {/* Notifications */}
        <Notifications notifications={notifications} removeNotification={removeNotification} />
      </div>
    </AppContext.Provider>
  );
}

export default function App() {
  return (
    <Web3Provider>
      <AppContent />
    </Web3Provider>
  );
}
