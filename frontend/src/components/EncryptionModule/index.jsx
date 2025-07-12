import React, { useContext, useEffect, useState } from 'react';
import { Loader2, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { useEncryption } from '../../hooks/useEncryption';
import './EncryptionModule.css';

function EncryptionModule({ file, onEncrypted, encryptionKey }) {
  const { encryptFile, isEncrypting, encryptionProgress, error } = useEncryption();
  const [encryptionStatus, setEncryptionStatus] = useState('idle');
  const [fileHash, setFileHash] = useState(null);
  const [encryptionResult, setEncryptionResult] = useState(null);

  useEffect(() => {
    // Reset when file changes
    if (file) {
      setEncryptionStatus('idle');
      setFileHash(null);
      setEncryptionResult(null);
    }
  }, [file]);

  const handleEncrypt = async () => {
    if (!file || !encryptionKey) {
      alert('Please select a file and generate a key');
      return;
    }

    setEncryptionStatus('encrypting');

    try {
      const result = await encryptFile(file, encryptionKey);
      
      setFileHash(result.originalHash);
      setEncryptionResult(result);
      setEncryptionStatus('complete');
      
      // Pass the encrypted data to parent component
      if (onEncrypted) {
        onEncrypted(result);
      }

    } catch (err) {
      setEncryptionStatus('error');
      console.error('Encryption failed:', err);
    }
  };

  const getStatusIcon = () => {
    switch (encryptionStatus) {
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Lock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusMessage = () => {
    switch (encryptionStatus) {
      case 'idle':
        return 'Ready to encrypt';
      case 'encrypting':
        return `Encrypting... ${Math.round(encryptionProgress)}%`;
      case 'complete':
        return 'Encryption complete!';
      case 'error':
        return error || 'Encryption failed';
      default:
        return '';
    }
  };

  return (
    <div className="encryption-module">
      <div className="module-header">
        <h3>File Encryption</h3>
        {getStatusIcon()}
      </div>

      {!file && (
        <div className="no-file-message">
          <Lock className="h-12 w-12 text-gray-300 mx-auto mb-2" />
          <p>Select a file to encrypt</p>
        </div>
      )}

      {file && (
        <>
          <div className="file-info">
            <h4>File to Encrypt:</h4>
            <p className="file-name">{file.name}</p>
            <p className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>

          {!encryptionKey && (
            <div className="warning-message">
              <AlertCircle className="h-4 w-4" />
              <span>Generate or import an encryption key first</span>
            </div>
          )}

          {fileHash && (
            <div className="hash-display">
              <h4>Original File Hash:</h4>
              <code>{fileHash}</code>
            </div>
          )}

          <button
            onClick={handleEncrypt}
            disabled={!file || !encryptionKey || isEncrypting || encryptionStatus === 'complete'}
            className={`encrypt-button ${isEncrypting ? 'encrypting' : ''} ${encryptionStatus === 'complete' ? 'complete' : ''}`}
          >
            {isEncrypting ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Encrypting...
              </>
            ) : encryptionStatus === 'complete' ? (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Encrypted
              </>
            ) : (
              <>
                <Lock className="h-5 w-5 mr-2" />
                Encrypt File
              </>
            )}
          </button>

          {isEncrypting && (
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${encryptionProgress}%` }}
                />
              </div>
              <span className="progress-text">{Math.round(encryptionProgress)}%</span>
            </div>
          )}

          {encryptionResult && (
            <div className="encryption-result">
              <h4>Encryption Complete</h4>
              <div className="result-details">
                <p><strong>Original Size:</strong> {(encryptionResult.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                <p><strong>Encrypted Size:</strong> {(encryptionResult.encryptedSize / 1024 / 1024).toFixed(2)} MB</p>
                <p><strong>Ready for:</strong> IPFS Upload</p>
              </div>
            </div>
          )}

          <div className="status-message">
            {getStatusMessage()}
          </div>
        </>
      )}
    </div>
  );
}

export default EncryptionModule;