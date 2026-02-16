import React, { useState, useEffect } from 'react';
import './MetaMaskDebug.css';

const MetaMaskDebug = () => {
  const [debugInfo, setDebugInfo] = useState({});
  const [testResult, setTestResult] = useState('');

  useEffect(() => {
    checkMetaMaskStatus();
  }, []);

  const checkMetaMaskStatus = async () => {
    const info = {};
    
    // Check if window.ethereum exists
    info.windowEthereum = !!window.ethereum;
    info.isMetaMask = window.ethereum?.isMetaMask;
    
    // Check if MetaMask is installed
    if (window.ethereum) {
      try {
        // Get accounts without requesting
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        info.existingAccounts = accounts;
        info.accountCount = accounts.length;
        
        // Get chain ID
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        info.chainId = chainId;
        info.chainIdDecimal = parseInt(chainId, 16);
        
        // Check if MetaMask is unlocked
        info.isUnlocked = accounts.length > 0;
        
        // Get provider info
        info.networkVersion = window.ethereum.networkVersion;
        info.selectedAddress = window.ethereum.selectedAddress;
        
      } catch (error) {
        info.error = error.message;
      }
    }
    
    // Check for other common providers
    info.hasWeb3 = !!window.web3;
    info.userAgent = navigator.userAgent;
    info.isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
    info.isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
    
    setDebugInfo(info);
  };

  const testConnection = async () => {
    setTestResult('Testing...');
    
    try {
      if (!window.ethereum) {
        setTestResult('❌ MetaMask not detected');
        return;
      }

      // Test requesting accounts
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts.length === 0) {
        setTestResult('❌ No accounts returned');
        return;
      }

      setTestResult(`✅ Connection successful! Account: ${accounts[0]}`);
      
      // Refresh debug info
      await checkMetaMaskStatus();
      
    } catch (error) {
      setTestResult(`❌ Connection failed: ${error.message}`);
    }
  };

  const checkPermissions = async () => {
    if (!window.ethereum) {
      setTestResult('❌ MetaMask not detected');
      return;
    }

    try {
      const permissions = await window.ethereum.request({
        method: 'wallet_getPermissions'
      });
      
      setTestResult(`Permissions: ${JSON.stringify(permissions, null, 2)}`);
    } catch (error) {
      setTestResult(`Permission check failed: ${error.message}`);
    }
  };

  const requestPermissions = async () => {
    if (!window.ethereum) {
      setTestResult('❌ MetaMask not detected');
      return;
    }

    try {
      const permissions = await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      });
      
      setTestResult(`✅ Permissions granted: ${JSON.stringify(permissions, null, 2)}`);
      await checkMetaMaskStatus();
    } catch (error) {
      setTestResult(`Permission request failed: ${error.message}`);
    }
  };

  const switchToAmoy = async () => {
    if (!window.ethereum) {
      setTestResult('❌ MetaMask not detected');
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x13882' }], // Polygon Amoy testnet
      });
      
      setTestResult('✅ Switched to Polygon Amoy testnet');
      await checkMetaMaskStatus();
    } catch (error) {
      if (error.code === 4902) {
        // Network not added, try to add it
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x13882',
              chainName: 'Polygon Amoy Testnet',
              nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
              rpcUrls: ['https://rpc-amoy.polygon.technology/'],
              blockExplorerUrls: ['https://www.oklink.com/amoy']
            }],
          });
          setTestResult('✅ Added and switched to Polygon Amoy testnet');
          await checkMetaMaskStatus();
        } catch (addError) {
          setTestResult(`❌ Failed to add network: ${addError.message}`);
        }
      } else {
        setTestResult(`❌ Failed to switch network: ${error.message}`);
      }
    }
  };

  return (
    <div className="metamask-debug">
      <div className="debug-header">
        <h3>🔍 MetaMask Connection Debug</h3>
        <button onClick={checkMetaMaskStatus} className="refresh-btn">
          Refresh Status
        </button>
      </div>

      <div className="debug-sections">
        <div className="debug-section">
          <h4>📊 Status Information</h4>
          <div className="debug-info">
            <div className="info-row">
              <span className="label">MetaMask Detected:</span>
              <span className={debugInfo.windowEthereum ? 'success' : 'error'}>
                {debugInfo.windowEthereum ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            <div className="info-row">
              <span className="label">Is MetaMask:</span>
              <span className={debugInfo.isMetaMask ? 'success' : 'error'}>
                {debugInfo.isMetaMask ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            <div className="info-row">
              <span className="label">Account Count:</span>
              <span>{debugInfo.accountCount || 0}</span>
            </div>
            <div className="info-row">
              <span className="label">Is Unlocked:</span>
              <span className={debugInfo.isUnlocked ? 'success' : 'warning'}>
                {debugInfo.isUnlocked ? '✅ Yes' : '⚠️ No'}
              </span>
            </div>
            <div className="info-row">
              <span className="label">Chain ID:</span>
              <span>{debugInfo.chainId} ({debugInfo.chainIdDecimal})</span>
            </div>
            <div className="info-row">
              <span className="label">Selected Address:</span>
              <span className="address">{debugInfo.selectedAddress || 'None'}</span>
            </div>
            <div className="info-row">
              <span className="label">Browser:</span>
              <span>
                {debugInfo.isChrome && '🌐 Chrome'}
                {debugInfo.isFirefox && '🦊 Firefox'}
                {!debugInfo.isChrome && !debugInfo.isFirefox && '🌐 Other'}
              </span>
            </div>
          </div>
        </div>

        <div className="debug-section">
          <h4>🧪 Connection Tests</h4>
          <div className="test-buttons">
            <button onClick={testConnection} className="test-btn">
              Test Connection
            </button>
            <button onClick={checkPermissions} className="test-btn">
              Check Permissions
            </button>
            <button onClick={requestPermissions} className="test-btn">
              Request Permissions
            </button>
            <button onClick={switchToAmoy} className="test-btn">
              Switch to Amoy Testnet
            </button>
          </div>
          
          {testResult && (
            <div className="test-result">
              <h5>Test Result:</h5>
              <pre>{testResult}</pre>
            </div>
          )}
        </div>

        {debugInfo.existingAccounts && debugInfo.existingAccounts.length > 0 && (
          <div className="debug-section">
            <h4>👤 Available Accounts</h4>
            <div className="accounts-list">
              {debugInfo.existingAccounts.map((account, index) => (
                <div key={index} className="account-item">
                  <span className="account-index">#{index + 1}</span>
                  <span className="account-address">{account}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {debugInfo.error && (
          <div className="debug-section error-section">
            <h4>❌ Error Details</h4>
            <pre className="error-text">{debugInfo.error}</pre>
          </div>
        )}
      </div>

      <div className="debug-tips">
        <h4>💡 Troubleshooting Tips</h4>
        <ul>
          <li>Make sure MetaMask extension is installed and enabled</li>
          <li>Unlock your MetaMask wallet</li>
          <li>Refresh the page if MetaMask was just installed</li>
          <li>Check if you're on the correct network (Polygon Amoy testnet)</li>
          <li>Try disconnecting and reconnecting in MetaMask settings</li>
          <li>Disable other crypto wallet extensions temporarily</li>
        </ul>
      </div>
    </div>
  );
};

export default MetaMaskDebug;