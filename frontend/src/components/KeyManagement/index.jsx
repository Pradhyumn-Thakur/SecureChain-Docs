import React, { useState, useEffect, useContext, useRef } from 'react';
import { 
  Key, 
  Eye, 
  EyeOff, 
  Copy, 
  Download, 
  Upload, 
  AlertCircle, 
  Check,
  RefreshCw 
} from 'lucide-react';
import CryptoUtils from '../../utils/crypto';
import { AppContext } from '../../App';
import './KeyManagement.css';

function KeyManagement({ onKeyGenerated }) {
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [keyString, setKeyString] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [importError, setImportError] = useState('');
  const { addNotification } = useContext(AppContext);
  const hasLoadedKey = useRef(false);

  useEffect(() => {
    // Load existing key from IndexedDB on component mount
    if (!hasLoadedKey.current) {
      hasLoadedKey.current = true;
      loadStoredKey();
    }
  }, []);

  useEffect(() => {
    // Export key to string when key changes
    if (encryptionKey) {
      CryptoUtils.exportKey(encryptionKey)
        .then(exported => {
          setKeyString(exported);
          if (onKeyGenerated) {
            onKeyGenerated(encryptionKey);
          }
        })
        .catch(err => console.error('Failed to export key:', err));
    }
  }, [encryptionKey, onKeyGenerated]);

  const loadStoredKey = async () => {
    try {
      // Try to load the most recent key
      const key = await CryptoUtils.getKeyFromDB('current');
      if (key) {
        setEncryptionKey(key);
      }
    } catch (err) {
      // No stored key, that's okay
      console.log('No stored key found');
    }
  };

  const generateKey = async () => {
    setIsGenerating(true);
    setImportError('');
    
    try {
      const key = await CryptoUtils.generateKey();
      setEncryptionKey(key);
      
      // Store as current key
      await CryptoUtils.storeKeyInDB('current', key);
      
      // Also store with timestamp for history
      const keyId = `key_${Date.now()}`;
      await CryptoUtils.storeKeyInDB(keyId, key);
      
      addNotification('Encryption key generated successfully', 'success');
      
    } catch (error) {
      console.error('Key generation error:', error);
      setImportError('Failed to generate key');
      addNotification('Failed to generate key', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyKey = () => {
    if (keyString) {
      navigator.clipboard.writeText(keyString).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      });
    }
  };

  const downloadKey = () => {
    if (keyString) {
      const blob = new Blob([keyString], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `encryption-key-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const importKey = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImportError('');

    try {
      const hexKey = await file.text();
      const key = await CryptoUtils.importKey(hexKey.trim());
      setEncryptionKey(key);
      
      // Store as current key
      await CryptoUtils.storeKeyInDB('current', key);
      
      // Reset file input
      event.target.value = '';
      
      addNotification('Key imported successfully', 'success');
      
    } catch (error) {
      console.error('Key import error:', error);
      setImportError(error.message);
      addNotification('Failed to import key: ' + error.message, 'error');
    }
  };

  return (
    <div className="key-management">
      <div className="key-header">
        <h3>Encryption Key</h3>
        <Key className="h-5 w-5 text-gray-400" />
      </div>

      {!encryptionKey ? (
        <div className="no-key-container">
          <div className="no-key-message">
            <Key className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p>No encryption key found</p>
            <span>Generate a new key or import an existing one to get started</span>
          </div>

          <div className="key-actions">
            <button
              onClick={generateKey}
              disabled={isGenerating}
              className="generate-button"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  Generate New Key
                </>
              )}
            </button>

            <label className="import-button">
              <Upload className="h-4 w-4 mr-2" />
              Import Key
              <input
                type="file"
                onChange={importKey}
                accept=".txt"
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {importError && (
            <div className="error-message">
              <AlertCircle className="h-4 w-4" />
              <span>{importError}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="key-container">
          <div className="key-display-section">
            <div className="key-label">
              <span>Your Encryption Key</span>
              <div className="key-actions-inline">
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="icon-button"
                  title={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={copyKey}
                  className="icon-button"
                  title="Copy key"
                >
                  {copySuccess ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </button>
                <button
                  onClick={downloadKey}
                  className="icon-button"
                  title="Download key"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className={`key-value ${!showKey ? 'key-hidden' : ''}`}>
              {showKey ? keyString : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
            </div>

            {copySuccess && (
              <div className="copy-success">
                <Check className="h-3 w-3" />
                <span>Copied to clipboard!</span>
              </div>
            )}
          </div>

          <div className="key-warning">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <div>
              <p><strong>Important:</strong> Save this key securely!</p>
              <p>You'll need it to decrypt your files. If you lose this key, your encrypted files cannot be recovered.</p>
            </div>
          </div>

          <div className="key-footer">
            <button onClick={generateKey} className="text-button">
              Generate new key
            </button>
            <label className="text-button">
              Import different key
              <input
                type="file"
                onChange={importKey}
                accept=".txt"
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {importError && (
            <div className="error-message">
              <AlertCircle className="h-4 w-4" />
              <span>{importError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default KeyManagement;