import { useState, useCallback } from 'react';
import CryptoUtils from '../utils/crypto';

/**
 * Custom hook for handling encryption operations
 */
export const useEncryption = () => {
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptionProgress, setEncryptionProgress] = useState(0);
  const [error, setError] = useState(null);

  const encryptFile = useCallback(async (file, key) => {
    setIsEncrypting(true);
    setError(null);
    setEncryptionProgress(0);

    try {
      // Calculate hash of original file
      const fileHash = await CryptoUtils.calculateHash(file);
      
      // Encrypt the file
      const encryptedBlob = await CryptoUtils.encryptFile(
        file,
        key,
        (progress) => setEncryptionProgress(progress)
      );

      setIsEncrypting(false);
      return {
        encryptedBlob,
        originalHash: fileHash,
        fileName: file.name,
        fileSize: file.size,
        encryptedSize: encryptedBlob.size
      };
    } catch (err) {
      setError(err.message);
      setIsEncrypting(false);
      throw err;
    }
  }, []);

  const generateKey = useCallback(async () => {
    try {
      const key = await CryptoUtils.generateKey();
      return key;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const calculateFileHash = useCallback(async (file) => {
    try {
      const hash = await CryptoUtils.calculateHash(file);
      return hash;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    encryptFile,
    generateKey,
    calculateFileHash,
    isEncrypting,
    encryptionProgress,
    error
  };
};