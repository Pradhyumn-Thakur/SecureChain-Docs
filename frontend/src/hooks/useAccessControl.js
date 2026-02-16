import { useState, useCallback } from 'react';
import CryptoUtils, { ACCESS_LEVELS } from '../utils/crypto';

const useAccessControl = (web3Context) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateUserKey = useCallback(async (masterKey, userId, accessLevel, expirationTime = 0) => {
    try {
      setLoading(true);
      setError(null);

      // Generate hierarchical key for the user
      const userKey = await CryptoUtils.generateHierarchicalKey(
        masterKey,
        accessLevel,
        userId,
        expirationTime
      );

      // If expiration is set, create time-locked version
      if (expirationTime > 0) {
        const timeLocked = await CryptoUtils.createTimeLockKey(userKey, expirationTime);
        return {
          key: timeLocked.key,
          timelock: timeLocked.timelock,
          accessLevel,
          userId,
          expirationTime
        };
      }

      return {
        key: userKey,
        timelock: null,
        accessLevel,
        userId,
        expirationTime: 0
      };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const grantUserAccess = useCallback(async (documentHash, userAddress, accessLevel, duration = 0) => {
    try {
      setLoading(true);
      setError(null);

      if (!web3Context?.contract || !web3Context?.account) {
        throw new Error('Web3 context not available');
      }

      // Calculate expiration timestamp
      let expirationTime = 0;
      if (duration > 0) {
        expirationTime = Math.floor((Date.now() + duration) / 1000);
      }

      // Convert access level to contract enum
      let accessLevelEnum;
      switch (accessLevel) {
        case ACCESS_LEVELS.VIEW_ONLY:
          accessLevelEnum = 1;
          break;
        case ACCESS_LEVELS.FULL_ACCESS:
          accessLevelEnum = 2;
          break;
        default:
          throw new Error('Invalid access level');
      }

      // Grant access on blockchain
      const tx = await web3Context.contract.methods
        .grantAccess(documentHash, userAddress, accessLevelEnum, expirationTime)
        .send({ from: web3Context.account });

      return {
        transactionHash: tx.transactionHash,
        userAddress,
        accessLevel,
        expirationTime
      };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [web3Context]);

  const revokeUserAccess = useCallback(async (documentHash, userAddress) => {
    try {
      setLoading(true);
      setError(null);

      if (!web3Context?.contract || !web3Context?.account) {
        throw new Error('Web3 context not available');
      }

      const tx = await web3Context.contract.methods
        .revokeAccess(documentHash, userAddress)
        .send({ from: web3Context.account });

      return {
        transactionHash: tx.transactionHash,
        userAddress
      };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [web3Context]);

  const checkUserAccess = useCallback(async (documentHash, userAddress) => {
    try {
      if (!web3Context?.contract) {
        throw new Error('Web3 context not available');
      }

      const access = await web3Context.contract.methods
        .getUserAccess(documentHash, userAddress)
        .call();

      return {
        level: parseInt(access.level),
        expirationTime: access.expirationTime,
        grantedAt: access.grantedAt,
        isActive: access.isActive,
        isExpired: access.isExpired
      };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [web3Context]);

  const validateKeyAccess = useCallback(async (keyId) => {
    try {
      const keyData = await CryptoUtils.getKeyFromDB(keyId);
      
      if (!keyData) {
        throw new Error('Key not found');
      }

      // Check if key has expired
      if (keyData.metadata.expirationTime > 0 && Date.now() > keyData.metadata.expirationTime) {
        throw new Error('Key has expired');
      }

      return {
        key: keyData.key,
        metadata: keyData.metadata,
        isValid: true
      };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const unlockTimedKey = useCallback(async (timeLockedKey, expirationTime) => {
    try {
      setLoading(true);
      setError(null);

      const unlockedKey = await CryptoUtils.unlockTimeLockKey(timeLockedKey, expirationTime);
      return unlockedKey;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const encryptForAccessLevel = useCallback(async (data, key, accessLevel) => {
    try {
      setLoading(true);
      setError(null);

      const isViewOnly = accessLevel === ACCESS_LEVELS.VIEW_ONLY;
      const encryptedData = await CryptoUtils.encryptWithAccessLevel(data, key, isViewOnly);
      
      return encryptedData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const decryptWithAccessLevel = useCallback(async (encryptedData, key, requiredAccessLevel) => {
    try {
      setLoading(true);
      setError(null);

      const result = await CryptoUtils.decryptWithAccessLevel(
        encryptedData,
        key,
        requiredAccessLevel
      );
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getDocumentAccessList = useCallback(async (documentHash) => {
    try {
      if (!web3Context?.contract || !web3Context?.account) {
        throw new Error('Web3 context not available');
      }

      const addresses = await web3Context.contract.methods
        .getDocumentAccessList(documentHash)
        .call({ from: web3Context.account });

      // Get detailed access information for each address
      const accessDetails = await Promise.all(
        addresses.map(async (address) => {
          const access = await web3Context.contract.methods
            .getUserAccess(documentHash, address)
            .call();
          
          return {
            address,
            level: parseInt(access.level),
            expirationTime: access.expirationTime,
            grantedAt: access.grantedAt,
            isActive: access.isActive,
            isExpired: access.isExpired
          };
        })
      );

      return accessDetails;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [web3Context]);

  const cleanupExpiredAccess = useCallback(async (documentHash, userAddress) => {
    try {
      setLoading(true);
      setError(null);

      if (!web3Context?.contract || !web3Context?.account) {
        throw new Error('Web3 context not available');
      }

      const tx = await web3Context.contract.methods
        .cleanupExpiredAccess(documentHash, userAddress)
        .send({ from: web3Context.account });

      return {
        transactionHash: tx.transactionHash,
        userAddress
      };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [web3Context]);

  return {
    // State
    loading,
    error,
    
    // Key management
    generateUserKey,
    validateKeyAccess,
    unlockTimedKey,
    
    // Blockchain access control
    grantUserAccess,
    revokeUserAccess,
    checkUserAccess,
    getDocumentAccessList,
    cleanupExpiredAccess,
    
    // Encryption with access control
    encryptForAccessLevel,
    decryptWithAccessLevel
  };
};

export default useAccessControl;