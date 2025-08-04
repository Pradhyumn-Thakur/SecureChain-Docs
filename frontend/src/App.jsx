import React, { useState, createContext, useCallback } from 'react';
import FileUpload from './components/FileUpload';
import EncryptionModule from './components/EncryptionModule';
import KeyManagement from './components/KeyManagement';
import WalletConnect from './components/WalletConnect';
import BlockchainStorage from './components/BlockchainStorage';
import IPFSStatus from './components/IPFSStatus';
import DocumentRetrieval from './components/DocumentRetrieval';
import { Web3Provider } from './contexts/Web3Context';
import { Shield, Upload, Download } from 'lucide-react';
import './App.css';

// Create context for sharing state
export const AppContext = createContext();

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [encryptedData, setEncryptedData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [ipfsConfigured, setIpfsConfigured] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');

  const addNotification = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random(); // Better unique ID
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
    // Only update if key actually changed
    if (key !== encryptionKey) {
      setEncryptionKey(key);
      // Only show notification for new key generation, not loading from storage
      if (key && !encryptionKey) {
        addNotification('Encryption key loaded', 'success');
      }
    }
  }, [encryptionKey, addNotification]);

  const handleEncrypted = useCallback((result) => {
    setEncryptedData(result);
    addNotification('File encrypted successfully', 'success');
  }, [addNotification]);

  return (
    <Web3Provider>
      <AppContext.Provider value={{ addNotification, removeNotification }}>
        <div className="app">
          <header className="app-header">
            <div className="header-content">
              <div className="header-title-row">
                <div className="logo">
                  <Shield className="h-8 w-8 text-blue-600" />
                  <div className="title-content">
                    <h1>Secure Document Storage</h1>
                    <p className="tagline">Encrypt and store your documents on blockchain safely.</p>
                  </div>
                </div>
              </div>
              <div className="header-controls-row">
                <IPFSStatus onConfigured={setIpfsConfigured} />
                <WalletConnect />
              </div>
            </div>
          </header>

          <main className="app-main">
            <div className="container">
              {/* Tab Navigation */}
              <div className="tab-navigation">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`}
                >
                  <Upload className="h-4 w-4" />
                  Upload Document
                </button>
                <button
                  onClick={() => setActiveTab('retrieve')}
                  className={`tab-button ${activeTab === 'retrieve' ? 'active' : ''}`}
                >
                  <Download className="h-4 w-4" />
                  Retrieve Document
                </button>
              </div>

              {/* Upload Tab */}
              {activeTab === 'upload' && (
                <>
                  <section className="step-section">
                    <div className="step-number">1</div>
                    <KeyManagement onKeyGenerated={handleKeyGenerated} />
                  </section>

                  <section className="step-section">
                    <div className="step-number">2</div>
                    <FileUpload onFileSelect={handleFileSelect} />
                  </section>

                  {selectedFile && (
                    <section className="step-section">
                      <div className="step-number">3</div>
                      <EncryptionModule 
                        file={selectedFile} 
                        encryptionKey={encryptionKey}
                        onEncrypted={handleEncrypted}
                      />
                    </section>
                  )}

                  {encryptedData && (
                    <section className="step-section">
                      <div className="step-number">4</div>
                      <BlockchainStorage encryptedData={encryptedData} />
                    </section>
                  )}
                </>
              )}

              {/* Retrieve Tab */}
              {activeTab === 'retrieve' && (
                <>
                  <section className="step-section">
                    <div className="step-number">1</div>
                    <DocumentRetrieval />
                  </section>
                </>
              )}
            </div>
          </main>

          <div className="notifications">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={`notification notification-${notification.type}`}
                onClick={() => removeNotification(notification.id)}
                title="Click to dismiss"
              >
                <span>{notification.message}</span>
                <button 
                  className="notification-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNotification(notification.id);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </AppContext.Provider>
    </Web3Provider>
  );
}

export default App;