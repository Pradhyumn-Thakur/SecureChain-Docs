import React, { useState, useContext } from 'react';
import { Database, ExternalLink, Loader2, Upload, Cloud, Copy, Check } from 'lucide-react';
import { ethers } from 'ethers';
import { useWeb3 } from '../../contexts/Web3Context';
import { AppContext } from '../../App';
import ipfsService from '../../utils/ipfs';
import './BlockchainStorage.css';

const BlockchainStorage = ({ encryptedData }) => {
  const { contract, account, network } = useWeb3();
  const { addNotification } = useContext(AppContext);
  const [isStoring, setIsStoring] = useState(false);
  const [isUploadingToIPFS, setIsUploadingToIPFS] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [ipfsCID, setIpfsCID] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');
  const [cidCopied, setCidCopied] = useState(false);

  const copyCidToClipboard = async () => {
    if (!ipfsCID) return;
    
    try {
      await navigator.clipboard.writeText(ipfsCID);
      setCidCopied(true);
      addNotification('IPFS CID copied to clipboard!', 'success');
      
      // Reset the copied state after 2 seconds
      setTimeout(() => setCidCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = ipfsCID;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setCidCopied(true);
      addNotification('IPFS CID copied to clipboard!', 'success');
      setTimeout(() => setCidCopied(false), 2000);
    }
  };

  const storeOnBlockchain = async () => {
    if (!contract || !account) {
      addNotification('Please connect your wallet first', 'error');
      return;
    }

    if (!encryptedData) {
      addNotification('No encrypted data to store', 'error');
      return;
    }

    if (!ipfsService.isInitialized()) {
      addNotification('Please configure IPFS storage first', 'error');
      return;
    }

    setIsStoring(true);
    setError(null);
    setTxHash(null);
    setIpfsCID(null);

    try {
      // Step 1: Check if this user already uploaded this file
      setProgress('Checking for existing uploads...');
      
      const originalFileHash = encryptedData.originalHash.startsWith('0x') 
        ? encryptedData.originalHash 
        : '0x' + encryptedData.originalHash;

      // Create user-scoped document hash for privacy
      const userScopedHash = ethers.keccak256(
        ethers.solidityPacked(['address', 'bytes32'], [account, originalFileHash])
      );

      const userAlreadyUploaded = await contract.verifyDocument(userScopedHash);

      if (userAlreadyUploaded) {
        // User already uploaded this file - ask if they want to reupload
        const existingDoc = await contract.getDocument(userScopedHash);
        const uploadDate = new Date(Number(existingDoc.timestamp) * 1000).toLocaleDateString();
        
        const shouldReupload = window.confirm(
          `You already uploaded this file on ${uploadDate}.\n\n` +
          `Current IPFS CID: ${existingDoc.ipfsCID}\n\n` +
          `Do you want to reupload it? This will:\n` +
          `• Create a new IPFS entry\n` +
          `• Update your blockchain record\n` +
          `• Cost additional gas fees\n\n` +
          `Click OK to proceed or Cancel to skip.`
        );

        if (!shouldReupload) {
          addNotification('Upload cancelled by user', 'info');
          setProgress('');
          return;
        }
        
        addNotification('Proceeding with reupload...', 'info', 2000);
      }

      // Step 2: Upload encrypted file to IPFS
      setIsUploadingToIPFS(true);
      setProgress('Uploading encrypted file to IPFS...');
      addNotification('Uploading encrypted file to IPFS...', 'info', 3000);

      const ipfsResult = await ipfsService.uploadEncryptedFile(encryptedData, {
        walletAddress: account,
        network: network?.name || 'unknown'
      });

      setIpfsCID(ipfsResult.cid);
      setIsUploadingToIPFS(false);
      
      // Don't show notification here - will show final success after blockchain confirmation
      
      // Step 3: Store document reference on blockchain using user-scoped hash
      setProgress('Storing document reference on blockchain...');
      addNotification('Storing document reference on blockchain...', 'info', 3000);

      // Call the smart contract with user-scoped hash for privacy
      const tx = await contract.storeDocument(
        userScopedHash,
        ipfsResult.cid,
        encryptedData.fileName,
        {
          gasLimit: 500000, // Increase gas limit
          gasPrice: ethers.parseUnits('30', 'gwei') // Set reasonable gas price for Polygon
        }
      );

      addNotification('Transaction submitted. Waiting for confirmation...', 'info', 3000);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      setTxHash(receipt.hash);
      setProgress('');
      
      if (userAlreadyUploaded) {
        addNotification('Document updated successfully!', 'success');
      } else {
        addNotification('Document uploaded successfully!', 'success');
      }
      
      console.log('Transaction receipt:', receipt);
      console.log('IPFS upload result:', ipfsResult);

    } catch (err) {
      console.error('Storage error:', err);
      
      let errorMessage = 'Failed to store document';
      
      // Handle specific blockchain errors
      if (err.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Insufficient MATIC balance for gas fees';
      } else if (err.code === 'UNPREDICTABLE_GAS_LIMIT') {
        errorMessage = 'Transaction may fail - check contract parameters';
      } else if (err.code === 'NETWORK_ERROR') {
        errorMessage = 'Network connection error - please try again';
      } else if (err.code === 'UNKNOWN_ERROR') {
        errorMessage = 'Blockchain transaction failed - check your network connection and MATIC balance';
      } else if (err.message && err.message.includes('execution reverted')) {
        errorMessage = 'Smart contract execution failed - please try again';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      addNotification(errorMessage, 'error');
      setProgress('');
    } finally {
      setIsStoring(false);
      setIsUploadingToIPFS(false);
    }
  };

  const getExplorerUrl = () => {
    if (!txHash || !network) return '';
    
    const baseUrl = network.chainId === 137n 
      ? 'https://polygonscan.com/tx/'
      : 'https://www.oklink.com/amoy/tx/';
    
    return baseUrl + txHash;
  };

  return (
    <div className="blockchain-storage">
      <div className="storage-header">
        <h3>Blockchain Storage</h3>
        <Database className="h-5 w-5 text-gray-400" />
      </div>

      {!account ? (
        <div className="connect-prompt">
          <p>Connect your wallet to store documents on the blockchain</p>
        </div>
      ) : (
        <div className="storage-content">
          <div className="document-summary">
            <h4>Document Ready for Storage</h4>
            <div className="summary-details">
              <p><strong>File:</strong> {encryptedData?.fileName}</p>
              <p><strong>Hash:</strong> <code>{encryptedData?.originalHash?.slice(0, 10)}...</code></p>
              <p><strong>Size:</strong> {(encryptedData?.encryptedSize / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            
            {!ipfsService.isInitialized() && (
              <div className="ipfs-warning">
                <Cloud className="h-4 w-4" />
                <span>IPFS storage not configured. Please set up Pinata credentials above.</span>
              </div>
            )}
          </div>

          {progress && (
            <div className="progress-info">
              <Loader2 className="animate-spin h-4 w-4" />
              <span>{progress}</span>
            </div>
          )}

          <button
            onClick={storeOnBlockchain}
            disabled={isStoring || !encryptedData || !ipfsService.isInitialized()}
            className="store-button"
          >
            {isUploadingToIPFS ? (
              <>
                <Upload className="animate-pulse h-5 w-5" />
                Uploading to IPFS...
              </>
            ) : isStoring ? (
              <>
                <Loader2 className="animate-spin h-5 w-5" />
                Storing on Blockchain...
              </>
            ) : (
              <>
                <Database className="h-5 w-5" />
                Store on IPFS + Blockchain
              </>
            )}
          </button>

          {ipfsCID && (
            <div className="ipfs-info">
              <h4>📁 Uploaded to IPFS</h4>
              <div className="cid-container">
                <p><strong>IPFS CID:</strong></p>
                <div className="cid-display">
                  <code className="cid-value">{ipfsCID}</code>
                  <button
                    onClick={copyCidToClipboard}
                    className={`copy-button ${cidCopied ? 'copied' : ''}`}
                    title="Copy CID to clipboard"
                  >
                    {cidCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <a 
                href={`https://gateway.pinata.cloud/ipfs/${ipfsCID}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="ipfs-link"
              >
                View on IPFS <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}

          {txHash && (
            <div className="success-message">
              <h4>✅ Successfully Stored!</h4>
              <p>Your document has been encrypted, uploaded to IPFS, and the reference stored on the Polygon blockchain.</p>
              <div className="success-links">
                <a 
                  href={getExplorerUrl()} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="explorer-link"
                >
                  View Transaction <ExternalLink className="h-4 w-4" />
                </a>
                {ipfsCID && (
                  <a 
                    href={`https://gateway.pinata.cloud/ipfs/${ipfsCID}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ipfs-link"
                  >
                    View on IPFS <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BlockchainStorage;