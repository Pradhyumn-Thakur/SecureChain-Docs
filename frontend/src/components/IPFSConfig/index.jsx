import React, { useState, useEffect } from 'react';
import { Settings, Check, AlertCircle, ExternalLink, Shield } from 'lucide-react';
import ipfsService, { testIPFSConnection } from '../../utils/ipfs';
import './IPFSConfig.css';

const IPFSConfig = ({ onConfigured }) => {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [usageStats, setUsageStats] = useState(null);

  // Check if backend is available and initialize on mount
  useEffect(() => {
    initializeService();
  }, [onConfigured]);

  const initializeService = async () => {
    try {
      setIsConnecting(true);
      setError('');
      
      const initialized = await ipfsService.initialize();
      if (initialized) {
        setIsConfigured(true);
        await loadUsageStats();
        onConfigured?.(true);
      } else {
        throw new Error('Failed to authenticate with secure backend');
      }
    } catch (err) {
      setError('Backend service unavailable. Please ensure the server is running.');
      setIsConfigured(false);
      onConfigured?.(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const loadUsageStats = async () => {
    try {
      const stats = await ipfsService.getUsageStats();
      setUsageStats(stats);
    } catch (err) {
      console.warn('Could not load usage stats:', err);
    }
  };

  const handleReconnect = async () => {
    await initializeService();
  };

  const handleDisconnect = () => {
    setIsConfigured(false);
    setUsageStats(null);
    setError('Service disconnected');
    onConfigured?.(false);
  };

  const formatUsage = (used, limit) => {
    if (!used || !limit) return 'N/A';
    const percentage = ((used / limit) * 100).toFixed(1);
    return `${ipfsService.formatFileSize(used)} / ${ipfsService.formatFileSize(limit)} (${percentage}%)`;
  };

  return (
    <div className="ipfs-config">
      <div className="config-header">
        <h3>
          <Settings className="h-5 w-5" />
          IPFS Configuration
        </h3>
        {isConfigured && (
          <div className="status-badge connected">
            <Check className="h-4 w-4" />
            Connected
          </div>
        )}
      </div>

      {!isConfigured ? (
        <div className="config-form">
          <div className="info-section">
            <h4><Shield className="h-5 w-5 inline mr-2" />Secure IPFS Storage</h4>
            <p>
              This application uses a secure backend service to handle IPFS operations through Pinata. 
              Your files are encrypted client-side and stored securely without exposing API keys.
            </p>
            <div className="security-features">
              <h5>Security Features:</h5>
              <ul>
                <li>✅ Client-side encryption before upload</li>
                <li>✅ Secure backend API with signed JWTs</li>
                <li>✅ No API keys stored in browser</li>
                <li>✅ Rate limiting and CORS protection</li>
                <li>✅ Short-lived authentication tokens</li>
              </ul>
            </div>
          </div>

          {isConnecting ? (
            <div className="connecting-status">
              <div className="spinner" />
              <span>Connecting to secure backend...</span>
            </div>
          ) : (
            <button
              onClick={handleReconnect}
              className="connect-button"
            >
              Connect to Secure Storage
            </button>
          )}

          {error && (
            <div className="error-message">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
              {error.includes('Backend service unavailable') && (
                <div className="setup-help">
                  <p>To start the backend service:</p>
                  <code>cd backend && npm install && npm start</code>
                </div>
              )}
            </div>
          )}

          <div className="help-links">
            <a 
              href="https://docs.pinata.cloud/docs/getting-started" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              About IPFS Storage <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      ) : (
        <div className="config-status">
          <div className="connection-info">
            <h4>✅ Secure IPFS Storage Ready</h4>
            <p>Your documents will be encrypted client-side and stored securely on IPFS via our backend service.</p>
          </div>

          {usageStats && (
            <div className="usage-stats">
              <h5>Storage Usage</h5>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Storage:</span>
                  <span className="stat-value">
                    {formatUsage(usageStats.totalStorage, usageStats.storageLimit)}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Files:</span>
                  <span className="stat-value">
                    {usageStats.fileCount} / {usageStats.fileLimit}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="config-actions">
            <button onClick={handleReconnect} className="reconnect-button">
              Refresh Connection
            </button>
            <button onClick={handleDisconnect} className="disconnect-button">
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IPFSConfig;