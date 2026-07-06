import React, { useState, useCallback, createContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Upload, Download, Users, LayoutDashboard,
  Menu, X, Sun, Moon, KeyRound, Loader2,
  CheckCircle2, AlertTriangle, Info, XCircle
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
  // Quiet, paper-colored toasts; a thin colored rule carries the status
  const typeStyles = {
    success: { bar: 'bg-accent-600', icon: CheckCircle2, iconColor: 'text-accent-600' },
    error: { bar: 'bg-red-600', icon: XCircle, iconColor: 'text-red-600' },
    info: { bar: 'bg-cyber-500', icon: Info, iconColor: 'text-cyber-500' },
    warning: { bar: 'bg-amber-500', icon: AlertTriangle, iconColor: 'text-amber-600' },
  };

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {notifications.map(n => {
          const style = typeStyles[n.type] || typeStyles.info;
          const Icon = style.icon;
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="relative overflow-hidden pl-4 pr-3 py-3 rounded-md bg-white border border-ink-100 shadow-pop cursor-pointer text-sm flex items-center justify-between gap-3"
              onClick={() => removeNotification(n.id)}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${style.bar}`} />
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${style.iconColor}`} />
                <span className="text-ink-800">{n.message}</span>
              </div>
              <button
                className="text-ink-300 hover:text-ink-700 transition-colors shrink-0"
                onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// Prompt to register the user's encryption public key on-chain.
// Without it, other users cannot share documents with this wallet.
function EncryptionKeyBanner() {
  const { isConnected, encryptionKeyRegistered, registerEncryptionKey } = useWeb3();
  const { addNotification } = React.useContext(AppContext);
  const [registering, setRegistering] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!isConnected || encryptionKeyRegistered || dismissed) return null;

  const handleRegister = async () => {
    setRegistering(true);
    try {
      await registerEncryptionKey();
      addNotification('Encryption key registered — you can now receive shared documents', 'success');
    } catch (err) {
      const msg = err.message?.includes('user rejected') || err.message?.includes('User denied')
        ? 'Registration cancelled'
        : (err.message || 'Failed to register encryption key');
      addNotification(msg, 'error');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="mx-4 md:mx-8 mt-4 flex items-center gap-3 px-4 py-3 rounded-md bg-white border border-ink-100 border-l-[3px] border-l-accent-600 shadow-card">
      <KeyRound className="w-4 h-4 text-accent-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink-900 font-medium">Register your encryption key</p>
        <p className="text-xs text-ink-500">Required to receive documents shared with you. One signature, one transaction.</p>
      </div>
      <button onClick={handleRegister} disabled={registering} className="btn-primary text-xs py-2 shrink-0">
        {registering ? <><Loader2 className="w-3 h-3 animate-spin" /> Registering…</> : 'Register'}
      </button>
      <button onClick={() => setDismissed(true)} className="btn-ghost p-1.5 shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
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
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full z-50 flex flex-col bg-white border-r border-ink-100 transition-all duration-200 ease-out
          ${collapsed ? '-translate-x-full lg:translate-x-0 lg:w-20' : 'translate-x-0 w-64'}`}
      >
        {/* Wordmark */}
        <div className={`flex items-center gap-3 px-5 h-16 border-b border-ink-100 shrink-0 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
          <div className="w-9 h-9 rounded-md bg-accent-700 flex items-center justify-center shrink-0">
            <Shield className="w-[18px] h-[18px] text-white" strokeWidth={2.2} />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="font-display font-bold text-[17px] text-ink-900 leading-tight">SecureChain</h1>
              <p className="text-[10px] text-ink-400 uppercase tracking-[0.14em] font-medium">Document Registry</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto lg:hidden p-1.5 rounded-md hover:bg-ink-900/[0.04] text-ink-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); if (window.innerWidth < 1024) setCollapsed(true); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 group relative
                  ${isActive
                    ? 'bg-accent-50 text-accent-700'
                    : 'text-ink-500 hover:text-ink-900 hover:bg-ink-900/[0.03]'
                  }
                  ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-accent-600"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <item.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-accent-600' : 'text-ink-400 group-hover:text-ink-700'}`} />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && (
                  <kbd className="ml-auto font-mono text-ink-300">{item.shortcut}</kbd>
                )}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-ink-900 rounded-md text-xs text-paper opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap hidden lg:block">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        {!collapsed && (
          <div className="p-4 border-t border-ink-100 space-y-3">
            <IPFSStatus />
            {account && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-paper-100 border border-ink-100">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-500" />
                <span className="text-xs text-ink-600 font-mono">{formatAddress(account)}</span>
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
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  // Theme: a single class on <html> flips every CSS variable
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Shared state for upload flow
  const [selectedFile, setSelectedFile] = useState(null);
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [encryptedData, setEncryptedData] = useState(null);
  const [documentHash, setDocumentHash] = useState(null);
  const [isDocumentOwner, setIsDocumentOwner] = useState(false);

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
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0 },
  };

  return (
    <AppContext.Provider value={{ addNotification, removeNotification }}>
      <div className="h-screen bg-paper relative overflow-hidden overscroll-none">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />

        {/* Main content */}
        <div className={`h-screen flex flex-col transition-all duration-200 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
          {/* Top bar */}
          <header className="shrink-0 z-30 h-16 flex items-center justify-between px-4 md:px-8 bg-paper border-b border-ink-100">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarCollapsed(c => !c)}
                className="p-2 rounded-md hover:bg-ink-900/[0.04] text-ink-400 hover:text-ink-800 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h2 className="font-display font-semibold text-ink-900 text-base">
                {NAV_ITEMS.find(i => i.id === activeTab)?.label}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setDarkMode(d => !d)}
                className="p-2 rounded-md text-ink-400 hover:text-ink-800 hover:bg-ink-900/[0.05] transition-colors"
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <WalletConnect />
            </div>
          </header>

          {/* Encryption key registration prompt */}
          <EncryptionKeyBanner />

          {/* Page content */}
          <main className="p-4 md:px-8 md:py-6 max-w-7xl relative z-10 flex-1 overflow-y-auto overflow-x-hidden flex flex-col w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.18, ease: 'easeOut' }}
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
