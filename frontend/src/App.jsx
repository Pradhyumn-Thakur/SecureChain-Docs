import React, { useState, createContext, useCallback } from 'react';
import FileUpload from './components/FileUpload';
import EncryptionModule from './components/EncryptionModule';
import KeyManagement from './components/KeyManagement';
import { Shield } from 'lucide-react';
import './App.css';

// Create context for sharing state
export const AppContext = createContext();

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [encryptedData, setEncryptedData] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
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
    <AppContext.Provider value={{ addNotification }}>
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <div className="logo">
              <Shield className="h-8 w-8 text-blue-600" />
              <h1>Secure Document Storage</h1>
            </div>
            <p className="tagline">Encrypt and store your documents on the blockchain</p>
          </div>
        </header>

        <main className="app-main">
          <div className="container">
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
                <div className="next-steps">
                  <h3>Ready for Upload</h3>
                  <p>Your file has been encrypted and is ready for:</p>
                  <ul>
                    <li>✓ Upload to IPFS</li>
                    <li>✓ Store hash on blockchain</li>
                    <li>✓ Secure decentralized storage</li>
                  </ul>
                  <div className="encrypted-info">
                    <p><strong>Original Hash:</strong> <code>{encryptedData.originalHash}</code></p>
                    <p><strong>Encrypted Size:</strong> {(encryptedData.encryptedSize / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>

        <div className="notifications">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`notification notification-${notification.type}`}
            >
              {notification.message}
            </div>
          ))}
        </div>
      </div>
    </AppContext.Provider>
  );
}

export default App;