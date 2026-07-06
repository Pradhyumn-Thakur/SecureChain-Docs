import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';
import DocumentRegistryABI from '../contracts/DocumentRegistry.abi.json';
import contractAddress from '../contracts/contract-address.json';
import { deriveEncryptionKeypair } from '../utils/keywrap';
import ipfsService from '../utils/ipfs';

const Web3Context = createContext();

// Network configurations
const NETWORKS = {
  polygon: {
    chainId: '0x89',
    chainName: 'Polygon Mainnet',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: ['https://polygon-rpc.com/'],
    blockExplorerUrls: ['https://polygonscan.com/']
  },
  amoy: {
    chainId: '0x13882',
    chainName: 'Polygon Amoy Testnet',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: ['https://rpc-amoy.polygon.technology/'],
    blockExplorerUrls: ['https://www.oklink.com/amoy']
  },
  localhost: {
    chainId: '0x7a69', // 31337 — local hardhat node for development
    chainName: 'Hardhat Local',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['http://127.0.0.1:8545'],
    blockExplorerUrls: []
  }
};

export const Web3Provider = ({ children }) => {
  // Helper function to validate Ethereum address
  const isValidAddress = useCallback((address) => /^0x[a-fA-F0-9]{40}$/.test(address), []);
  // State management
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [network, setNetwork] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [connectionPromise, setConnectionPromise] = useState(null);

  // Encryption identity: signature-derived keypair used for on-chain key
  // distribution. Held in memory only — never persisted anywhere.
  const encryptionIdentityRef = useRef(null);
  const [encryptionKeyRegistered, setEncryptionKeyRegistered] = useState(false);

  // Network management
  const switchNetwork = useCallback(async (networkName = 'amoy') => {
    if (!window.ethereum) throw new Error('MetaMask not installed');
    
    const network = NETWORKS[networkName];
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: network.chainId }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [network],
        });
      } else {
        throw switchError;
      }
    }
  }, []);

  const checkNetwork = useCallback(async () => {
    if (!window.ethereum) return false;
    
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const isCorrectNetwork =
        chainId === NETWORKS.amoy.chainId ||
        chainId === NETWORKS.polygon.chainId ||
        chainId === NETWORKS.localhost.chainId;
      
      if (!isCorrectNetwork) {
        await switchNetwork('amoy');
      }
      
      return true;
    } catch (err) {
      console.error('Network check failed:', err);
      return false;
    }
  }, [switchNetwork]);

  // Account resolution helper
  const getAccounts = useCallback(async (manualAddress = null) => {
    if (manualAddress) {
      if (!isValidAddress(manualAddress)) {
        throw new Error('Invalid MetaMask wallet address format');
      }
      
      // Verify address exists in MetaMask (optional)
      try {
        const existingAccounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (!existingAccounts.includes(manualAddress)) {
          console.warn('Manual address not found in MetaMask accounts');
        }
      } catch (err) {
        console.warn('Could not verify manual address:', err);
      }
      
      return [manualAddress];
    }
    
    // Normal MetaMask flow
    try {
      const existingAccounts = await window.ethereum.request({ method: 'eth_accounts' });
      
      if (existingAccounts.length > 0) {
        return existingAccounts;
      }
      
      const newAccounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (newAccounts.length === 0) {
        throw new Error('No accounts found');
      }
      
      return newAccounts;
    } catch (error) {
      if (error.message.includes('Already processing eth_requestAccounts')) {
        throw new Error('MetaMask is busy. Please wait and try again, or refresh the page.');
      }
      throw error;
    }
  }, []);

  // Connect wallet
  const connectWallet = useCallback(async (manualAddress = null) => {
    // If already connecting, return the existing promise
    if (isConnecting && connectionPromise) {
      return connectionPromise;
    }
    
    // If already connected, return the current account
    if (account && !manualAddress) {
      return account;
    }
    
    const promise = (async () => {
      setIsConnecting(true);
      setError(null);
      
      try {
      // Check if MetaMask is installed - try multiple detection methods
      let ethereum = await detectEthereumProvider();
      
      // Fallback detection methods
      if (!ethereum) {
        ethereum = window.ethereum;
      }
      
      if (!ethereum) {
        ethereum = window.web3?.currentProvider;
      }
      
      if (!ethereum || !ethereum.isMetaMask) {
        throw new Error('Please install MetaMask to use this feature');
      }
      
      // Check network
      await checkNetwork();
      
      // Get accounts (manual or from MetaMask)
      const accounts = await getAccounts(manualAddress);
      
      // Set up provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Set up contract instance
      const contractInstance = new ethers.Contract(
        contractAddress.DocumentRegistry,
        DocumentRegistryABI,
        signer
      );
      
      // Get network info
      const network = await provider.getNetwork();
      
      // Update state
      setAccount(accounts[0]);
      setProvider(provider);
      setSigner(signer);
      setContract(contractInstance);
      setNetwork(network);
      
        return accounts[0];
      } catch (err) {
        console.error('Wallet connection failed:', err);
        setError(err.message);
        throw err;
      } finally {
        setIsConnecting(false);
        setConnectionPromise(null);
      }
    })();
    
    setConnectionPromise(promise);
    return promise;
  }, [checkNetwork, isConnecting, connectionPromise, account, getAccounts]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setContract(null);
    setNetwork(null);
    setError(null);
    setIsConnecting(false);
    setConnectionPromise(null);
    encryptionIdentityRef.current = null;
    setEncryptionKeyRegistered(false);
    ipfsService.reset();
  }, []);

  // Derive (and cache for the session) the user's encryption keypair.
  // Prompts one MetaMask signature the first time per session.
  const ensureEncryptionIdentity = useCallback(async () => {
    if (!signer || !account) throw new Error('Connect your wallet first');

    const checksummed = ethers.getAddress(account);
    const cached = encryptionIdentityRef.current;
    if (cached && cached.address === checksummed) return cached;

    const keypair = await deriveEncryptionKeypair(signer, checksummed);
    const identity = { ...keypair, address: checksummed };
    encryptionIdentityRef.current = identity;
    return identity;
  }, [signer, account]);

  // Check whether the connected account has registered its encryption
  // public key on-chain (required to receive shared documents).
  const refreshEncryptionRegistration = useCallback(async () => {
    if (!contract || !account) return false;
    try {
      const publicKey = await contract.encryptionPublicKeys(account);
      const registered = !!publicKey && publicKey !== '0x';
      setEncryptionKeyRegistered(registered);
      return registered;
    } catch (err) {
      console.warn('Could not check encryption key registration:', err);
      return false;
    }
  }, [contract, account]);

  // One-time on-chain registration of the encryption public key
  const registerEncryptionKey = useCallback(async () => {
    if (!contract) throw new Error('Connect your wallet first');
    const identity = await ensureEncryptionIdentity();
    const tx = await contract.registerEncryptionKey(identity.publicKey);
    await tx.wait();
    setEncryptionKeyRegistered(true);
    return identity;
  }, [contract, ensureEncryptionIdentity]);

  // On connect / account change: bind the session to the new account —
  // clear the old encryption identity, authenticate the backend session
  // (wallet signature), and check on-chain key registration.
  useEffect(() => {
    if (!account || !signer) return;

    const cached = encryptionIdentityRef.current;
    if (cached && cached.address.toLowerCase() !== account.toLowerCase()) {
      encryptionIdentityRef.current = null;
    }

    if (!ipfsService.isInitialized() || ipfsService.account?.toLowerCase() !== account.toLowerCase()) {
      ipfsService.reset();
      ipfsService.authenticate(signer, account).catch((err) => {
        console.warn('Backend wallet authentication failed:', err);
      });
    }

    refreshEncryptionRegistration();
  }, [account, signer, refreshEncryptionRegistration]);

  // Cleanup connection state on component mount
  useEffect(() => {
    setIsConnecting(false);
    setConnectionPromise(null);
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;
    
    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (accounts[0] !== account) {
        // Rebuild signer + contract for the new account so transactions
        // and signatures come from the right wallet
        try {
          const browserProvider = new ethers.BrowserProvider(window.ethereum);
          const newSigner = await browserProvider.getSigner();
          const contractInstance = new ethers.Contract(
            contractAddress.DocumentRegistry,
            DocumentRegistryABI,
            newSigner
          );
          setProvider(browserProvider);
          setSigner(newSigner);
          setContract(contractInstance);
        } catch (err) {
          console.warn('Failed to rebuild signer after account change:', err);
        }
        setAccount(accounts[0]);
      }
    };
    
    const handleChainChanged = () => {
      window.location.reload();
    };
    
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [account, disconnectWallet]);

  // Utility functions
  const formatAddress = useCallback((address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  const getNetworkName = useCallback(() => {
    if (!network) return 'Unknown';
    
    const chainId = '0x' + network.chainId.toString(16);
    if (chainId === NETWORKS.polygon.chainId) return 'Polygon Mainnet';
    if (chainId === NETWORKS.amoy.chainId) return 'Polygon Amoy Testnet';
    if (chainId === NETWORKS.localhost.chainId) return 'Hardhat Local';
    return 'Unknown Network';
  }, [network]);

  // Context value
  const value = {
    // State
    account,
    provider,
    signer,
    contract,
    network,
    isConnecting,
    error,
    isConnected: !!account,
    
    // Actions
    connectWallet,
    disconnectWallet,
    switchNetwork,

    // Encryption identity (on-chain key distribution)
    encryptionKeyRegistered,
    ensureEncryptionIdentity,
    registerEncryptionKey,
    refreshEncryptionRegistration,

    // Utilities
    formatAddress,
    getNetworkName,
    isValidAddress
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within Web3Provider');
  }
  return context;
};