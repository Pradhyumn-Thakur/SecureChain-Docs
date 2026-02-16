import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import AccessManagement from '../AccessManagement';
import { FileText, Users, Calendar, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import './DocumentManager.css';

const DocumentManager = () => {
  const { account, contract, isConnected } = useWeb3();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [expandedDocuments, setExpandedDocuments] = useState({});

  useEffect(() => {
    if (isConnected && account && contract) {
      loadUserDocuments();
    }
  }, [isConnected, account, contract]);

  const loadUserDocuments = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Get user's document count
      let documentCount = 0;
      try {
        const result = await contract.getUserDocumentCount(account);
        documentCount = parseInt(result.toString());
      } catch (countError) {
        // If getUserDocumentCount fails (likely because user has no documents), treat as 0
        console.log('No documents found for user (expected for new users):', countError.message);
        documentCount = 0;
      }
      
      if (documentCount === 0) {
        setDocuments([]);
        setLoading(false);
        return;
      }

      // Fetch all documents for the user
      const documentPromises = [];
      for (let i = 0; i < documentCount; i++) {
        documentPromises.push(
          contract.getDocumentByIndex(account, i).catch(err => {
            console.warn(`Failed to fetch document at index ${i}:`, err.message);
            return null; // Return null for failed fetches
          })
        );
      }

      const documentResults = await Promise.all(documentPromises);
      // Filter out null results from failed fetches
      const validDocuments = documentResults.filter(doc => doc !== null);
      
      // Process and format documents
      const formattedDocuments = await Promise.all(
        validDocuments.map(async (doc, index) => {
          const [documentHash, ipfsCID, timestamp, fileName] = doc;
          
          // Get additional metadata if needed
          let metadata = {};
          // Note: Access list functionality requires contract upgrade
          // For now, default to owner-only access
          metadata.accessCount = 1; // At least the owner

          return {
            index,
            documentHash,
            ipfsCID,
            timestamp: new Date(parseInt(timestamp.toString()) * 1000),
            fileName: fileName || `Document ${index + 1}`,
            metadata
          };
        })
      );

      // Sort by timestamp (newest first)
      formattedDocuments.sort((a, b) => b.timestamp - a.timestamp);
      
      setDocuments(formattedDocuments);
    } catch (err) {
      console.error('Failed to load documents:', err);
      setError('Failed to load your documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleDocumentExpansion = (documentHash) => {
    setExpandedDocuments(prev => ({
      ...prev,
      [documentHash]: !prev[documentHash]
    }));
  };

  const selectDocumentForManagement = (document) => {
    setSelectedDocument(document);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatDocumentHash = (hash) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  const formatIPFSCID = (cid) => {
    return `${cid.slice(0, 12)}...${cid.slice(-8)}`;
  };

  if (!isConnected) {
    return (
      <div className="document-manager">
        <div className="connect-notice">
          <h3>🔗 Connect Your Wallet</h3>
          <p>Connect your MetaMask wallet to view and manage your documents.</p>
        </div>
      </div>
    );
  }

  if (selectedDocument) {
    return (
      <div className="document-manager">
        <div className="document-manager-header">
          <h3>🔐 Manage Access for: {selectedDocument.fileName}</h3>
          <button 
            className="back-button"
            onClick={() => setSelectedDocument(null)}
          >
            ← Back to Documents
          </button>
        </div>
        
        <div className="selected-document-info">
          <div className="document-details">
            <div className="detail-row">
              <span className="label">Document Hash:</span>
              <span className="value">{formatDocumentHash(selectedDocument.documentHash)}</span>
            </div>
            <div className="detail-row">
              <span className="label">IPFS CID:</span>
              <span className="value">{formatIPFSCID(selectedDocument.ipfsCID)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Uploaded:</span>
              <span className="value">{formatDate(selectedDocument.timestamp)}</span>
            </div>
          </div>
        </div>

        <AccessManagement
          documentHash={selectedDocument.documentHash}
          isOwner={true}
          onAccessGranted={(userAddress, accessLevel, expirationTime) => {
            console.log('Access granted to:', userAddress, accessLevel, expirationTime);
            // Optionally refresh the document list or show notification
          }}
          onAccessRevoked={(userAddress) => {
            console.log('Access revoked from:', userAddress);
            // Optionally refresh the document list or show notification
          }}
        />
      </div>
    );
  }

  return (
    <div className="document-manager">
      <div className="document-manager-header">
        <h3>📚 Your Documents</h3>
        <button 
          className="refresh-button"
          onClick={loadUserDocuments}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your documents...</p>
        </div>
      )}

      {!loading && documents.length === 0 && (
        <div className="no-documents">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h4>No Documents Found</h4>
          <p>You haven't uploaded any documents yet.</p>
          <p>Upload a document first, then return here to manage access permissions.</p>
        </div>
      )}

      {!loading && documents.length > 0 && (
        <div className="documents-list">
          <div className="documents-header">
            <span>Found {documents.length} document{documents.length !== 1 ? 's' : ''}</span>
          </div>
          
          {documents.map((document) => (
            <div key={document.documentHash} className="document-item">
              <div className="document-summary">
                <div className="document-info">
                  <div className="document-title">
                    <FileText className="h-5 w-5" />
                    <span className="file-name">{document.fileName}</span>
                  </div>
                  <div className="document-metadata">
                    <span className="upload-date">
                      <Calendar className="h-4 w-4" />
                      {formatDate(document.timestamp)}
                    </span>
                    <span className="access-count">
                      <Users className="h-4 w-4" />
                      {document.metadata.accessCount} user{document.metadata.accessCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                
                <div className="document-actions">
                  <button
                    className="manage-access-button"
                    onClick={() => selectDocumentForManagement(document)}
                  >
                    <Users className="h-4 w-4" />
                    Manage Access
                  </button>
                  <button
                    className="expand-button"
                    onClick={() => toggleDocumentExpansion(document.documentHash)}
                  >
                    {expandedDocuments[document.documentHash] ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {expandedDocuments[document.documentHash] && (
                <div className="document-details-expanded">
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Document Hash:</span>
                      <span className="detail-value">
                        <code>{document.documentHash}</code>
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">IPFS CID:</span>
                      <span className="detail-value">
                        <code>{document.ipfsCID}</code>
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Upload Time:</span>
                      <span className="detail-value">{formatDate(document.timestamp)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Blockchain Index:</span>
                      <span className="detail-value">#{document.index}</span>
                    </div>
                  </div>
                  
                  <div className="quick-actions">
                    <button
                      className="primary-action-button"
                      onClick={() => selectDocumentForManagement(document)}
                    >
                      🔐 Generate Secondary Keys
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentManager;