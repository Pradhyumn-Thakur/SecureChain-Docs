import React, { useState, useCallback } from 'react';
import { Wallet, LogOut, AlertCircle } from 'lucide-react';
import { useWeb3 } from '../../contexts/Web3Context';
import './WalletConnect.css';

// Address validation helper
const isValidAddress = (address) => /^0x[a-fA-F0-9]{40}$/.test(address);

const WalletConnect = () => {
  const { 
    account, 
    isConnecting, 
    error, 
    connectWallet, 
    disconnectWallet, 
    formatAddress,
    getNetworkName 
  } = useWeb3();
  
  const [manualAddress, setManualAddress] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  
  const handleManualConnect = useCallback(async () => {
    const trimmedAddress = manualAddress.trim();
    if (!trimmedAddress || !isValidAddress(trimmedAddress)) return;
    
    try {
      await connectWallet(trimmedAddress);
      setManualAddress('');
      setShowManualInput(false);
    } catch (err) {
      console.error('Manual connection failed:', err);
    }
  }, [manualAddress, connectWallet]);

  const handleNormalConnect = useCallback(async () => {
    try {
      await connectWallet();
    } catch (err) {
      console.error('Connection failed:', err);
    }
  }, [connectWallet]);

  return (
    <div className="wallet-connect">
      <div className="wallet-container">
        {!account ? (
          <>
            <button 
              className="connect-button"
              onClick={handleNormalConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <div className="spinner" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4" />
                  <span>Connect Wallet</span>
                </>
              )}
            </button>
            
            <div className="manual-connect">
              <button 
                className="manual-toggle-button"
                onClick={() => setShowManualInput(!showManualInput)}
                type="button"
              >
                {showManualInput ? 'Hide Manual Input' : 'Or Enter Address Manually'}
              </button>
              
              {showManualInput && (
                <div className="manual-input-container">
                  <div className="manual-input-row">
                    <input
                      type="text"
                      placeholder="Paste your MetaMask address (0x...)"
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleManualConnect()}
                      className={`manual-address-input ${!isValidAddress(manualAddress) && manualAddress ? 'invalid' : ''}`}
                    />
                    <button
                      className="manual-connect-button"
                      onClick={handleManualConnect}
                      disabled={!isValidAddress(manualAddress) || isConnecting}
                    >
                      Connect
                    </button>
                  </div>
                  {manualAddress && !isValidAddress(manualAddress) && (
                    <div className="validation-error">
                      Please enter a valid MetaMask wallet address
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {error && (
              <div className="error-message">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="wallet-info">
              <div className="account-details">
                <div className="network-badge">
                  {getNetworkName()}
                </div>
                <div className="address">
                  <Wallet className="h-4 w-4" />
                  {formatAddress(account)}
                </div>
              </div>
              
              <button 
                className="disconnect-button"
                onClick={disconnectWallet}
                title="Disconnect wallet"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WalletConnect;