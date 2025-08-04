import React, { useState, useContext } from 'react';
import { Download, Search, Key, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { ethers } from 'ethers';
import { useWeb3 } from '../../contexts/Web3Context';
import { useEncryption } from '../../hooks/useEncryption';
import { AppContext } from '../../App';
import ipfsService from '../../utils/ipfs';
import CryptoUtils from '../../utils/crypto';
import './DocumentRetrieval.css';

const DocumentRetrieval = () => {
  const { contract, account } = useWeb3();
  const { decryptFile } = useEncryption();
  const { addNotification } = useContext(AppContext);
  
  const [documentHash, setDocumentHash] = useState('');
  const [encryptionKey, setEncryptionKey] = useState('');
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [error, setError] = useState('');
  const [retrievedDocument, setRetrievedDocument] = useState(null);
  const [progress, setProgress] = useState('');

  const handleRetrieve = async () => {
    if (!contract || !account) {
      addNotification('Please connect your wallet first', 'error');
      return;
    }

    if (!documentHash.trim()) {
      setError('Please enter a document hash');
      return;
    }

    if (!encryptionKey.trim()) {
      setError('Please enter the encryption key');
      return;
    }

    if (!ipfsService.isInitialized()) {
      addNotification('Please configure IPFS storage first', 'error');
      return;
    }

    setIsRetrieving(true);
    setError('');
    setRetrievedDocument(null);

    try {
      // Step 1: Create user-scoped hash and verify document exists
      setProgress('Verifying document on blockchain...');
      
      const originalFileHash = documentHash.startsWith('0x') ? documentHash : '0x' + documentHash;
      
      // Create user-scoped document hash for privacy-focused retrieval
      const userScopedHash = ethers.keccak256(
        ethers.solidityPacked(['address', 'bytes32'], [account, originalFileHash])
      );
      
      // Check if document exists for this user
      const documentExists = await contract.verifyDocument(userScopedHash);
      if (!documentExists) {
        throw new Error('Document not found in your uploads. Make sure you entered the correct original file hash.');
      }

      // Get document details using user-scoped hash
      const documentDetails = await contract.getDocument(userScopedHash);
      const ipfsCID = documentDetails.ipfsCID;
      
      addNotification('Document found on blockchain!', 'success');

      // Step 2: Retrieve encrypted file from IPFS
      setProgress('Downloading encrypted file from IPFS...');
      
      const ipfsResult = await ipfsService.retrieveEncryptedFile(ipfsCID);
      
      addNotification('File downloaded from IPFS!', 'success');

      // Step 3: Decrypt the file
      setProgress('Decrypting file...');
      
      // Parse the encryption key using CryptoUtils
      let cryptoKey;
      try {
        cryptoKey = await CryptoUtils.importKey(encryptionKey);
      } catch (keyError) {
        throw new Error('Invalid encryption key format: ' + keyError.message);
      }

      // Prepare encrypted data structure for decryption
      const encryptedDataForDecrypt = {
        encryptedData: ipfsResult.data,
        iv: ipfsResult.metadata.keyvalues?.iv || ipfsResult.metadata.iv,
        originalHash: documentDetails.documentHash,
        fileName: documentDetails.fileName
      };

      const decryptedResult = await decryptFile(encryptedDataForDecrypt, cryptoKey);
      
      setRetrievedDocument({
        ...decryptedResult,
        ipfsCID,
        blockchainHash: userScopedHash,
        metadata: ipfsResult.metadata
      });

      setProgress('');
      addNotification('Document decrypted successfully!', 'success');

    } catch (err) {
      console.error('Document retrieval error:', err);
      const errorMessage = err.message || 'Failed to retrieve document';
      setError(errorMessage);
      addNotification(errorMessage, 'error');
      setProgress('');
    } finally {
      setIsRetrieving(false);
    }
  };

  const handleDownload = () => {
    if (!retrievedDocument) return;

    const blob = new Blob([retrievedDocument.decryptedData], {
      type: retrievedDocument.mimeType || 'application/octet-stream'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = retrievedDocument.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addNotification('File downloaded successfully!', 'success');
  };

  const clearForm = () => {
    setDocumentHash('');
    setEncryptionKey('');
    setError('');
    setRetrievedDocument(null);
    setProgress('');
  };

  return (
    <div className="document-retrieval">
      <div className="retrieval-header">
        <h3>
          <Download className="h-5 w-5" />
          Retrieve Document
        </h3>
      </div>

      {!account ? (
        <div className="connect-prompt">
          <p>Connect your wallet to retrieve documents</p>
        </div>
      ) : (
        <div className="retrieval-content">
          <div className="privacy-notice">
            <h4>🔒 Privacy Notice</h4>
            <p>You can only retrieve documents that you uploaded yourself. Each user's documents are completely private and isolated.</p>
          </div>
          
          <div className="input-section">
            <div className="input-group">
              <label htmlFor="document-hash">
                <Search className="h-4 w-4" />
                Original File Hash
              </label>
              <input
                id="document-hash"
                type="text"
                value={documentHash}
                onChange={(e) => setDocumentHash(e.target.value)}
                placeholder="Enter the original file hash from when you uploaded"
                className="hash-input"
                disabled={isRetrieving}
              />
              <small className="input-help">
                This is the hash shown during file encryption (before upload)
              </small>
            </div>

            <div className="input-group">
              <label htmlFor="encryption-key">
                <Key className="h-4 w-4" />
                Encryption Key
              </label>
              <textarea
                id="encryption-key"
                value={encryptionKey}
                onChange={(e) => setEncryptionKey(e.target.value)}
                placeholder="Paste your encryption key (64-character hex string, e.g., a1b2c3d4e5f6...)"
                className="key-input"
                rows="2"
                disabled={isRetrieving}
              />
              <small className="input-help">
                This should be the hex key you copied during file encryption (64 characters)
              </small>
            </div>
          </div>

          {progress && (
            <div className="progress-info">
              <Loader2 className="animate-spin h-4 w-4" />
              <span>{progress}</span>
            </div>
          )}

          <div className="action-buttons">
            <button
              onClick={handleRetrieve}
              disabled={isRetrieving || !documentHash.trim() || !encryptionKey.trim()}
              className="retrieve-button"
            >
              {isRetrieving ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  Retrieving...
                </>
              ) : (
                <>
                  <Search className="h-5 w-5" />
                  Retrieve Document
                </>
              )}
            </button>

            {(documentHash || encryptionKey || retrievedDocument) && (
              <button
                onClick={clearForm}
                disabled={isRetrieving}
                className="clear-button"
              >
                Clear
              </button>
            )}
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {retrievedDocument && (
            <div className="retrieved-document">
              <div className="document-info">
                <h4>
                  <FileText className="h-5 w-5" />
                  Document Retrieved Successfully
                </h4>
                <div className="document-details">
                  <p><strong>File Name:</strong> {retrievedDocument.fileName}</p>
                  <p><strong>File Size:</strong> {(retrievedDocument.decryptedData.byteLength / 1024 / 1024).toFixed(2)} MB</p>
                  <p><strong>IPFS CID:</strong> <code>{retrievedDocument.ipfsCID}</code></p>
                  <p><strong>Blockchain Hash:</strong> <code>{retrievedDocument.blockchainHash}</code></p>
                  {retrievedDocument.metadata?.keyvalues?.uploadedAt && (
                    <p><strong>Uploaded:</strong> {new Date(retrievedDocument.metadata.keyvalues.uploadedAt).toLocaleString()}</p>
                  )}
                </div>
              </div>

              <button
                onClick={handleDownload}
                className="download-button"
              >
                <Download className="h-5 w-5" />
                Download File
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentRetrieval;