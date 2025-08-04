import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import ipfsService from '../../utils/ipfs';
import './IPFSStatus.css';

const IPFSStatus = ({ onConfigured }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    checkConnection();
  }, [onConfigured]);

  const checkConnection = async () => {
    try {
      const connected = ipfsService.isInitialized();
      if (!connected) {
        await initializeService();
      } else {
        setIsConnected(true);
        onConfigured?.(true);
      }
    } catch (err) {
      setIsConnected(false);
      onConfigured?.(false);
    }
  };

  const initializeService = async () => {
    try {
      setIsConnecting(true);
      const initialized = await ipfsService.initialize();
      setIsConnected(initialized);
      onConfigured?.(initialized);
    } catch (err) {
      setIsConnected(false);
      onConfigured?.(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnect = async () => {
    await initializeService();
  };

  return (
    <div className="ipfs-status">
      <div className="status-container">
        <h3 className="status-title">IPFS Storage</h3>
        {isConnected ? (
          <div className={`status-indicator connected`}>
            <Wifi className="h-4 w-4" />
            <span>Connected</span>
          </div>
        ) : isConnecting ? (
          <div className={`status-indicator disconnected`}>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Connecting...</span>
          </div>
        ) : (
          <button onClick={handleConnect} className="connect-button">
            <WifiOff className="h-4 w-4" />
            <span>Connect</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default IPFSStatus;