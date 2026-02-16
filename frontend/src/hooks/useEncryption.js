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
        encryptedData: encryptedBlob,  // Changed from encryptedBlob to encryptedData
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

  const decryptFile = useCallback(async (encryptedData, key) => {
    try {
      console.log('Decryption input:', {
        dataType: typeof encryptedData.encryptedData,
        dataLength: encryptedData.encryptedData?.length,
        hasIV: !!encryptedData.iv,
        ivLength: encryptedData.iv?.length
      });

      // Convert base64 data back to buffer
      let dataBuffer;
      if (typeof encryptedData.encryptedData === 'string') {
        // Base64 string from IPFS - convert to binary
        const binaryString = atob(encryptedData.encryptedData);
        dataBuffer = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          dataBuffer[i] = binaryString.charCodeAt(i);
        }
      } else {
        dataBuffer = new Uint8Array(encryptedData.encryptedData);
      }

      console.log('Converted data buffer length:', dataBuffer.length);

      // The IV is already embedded in the encrypted data by CryptoUtils.encrypt()
      // No need to reconstruct - just use the data as-is
      console.log('Using encrypted data as-is (IV already embedded)');

      // Decrypt the data - IV is already embedded at the beginning
      const decryptedBuffer = await CryptoUtils.decrypt(dataBuffer.buffer, key);
      
      return {
        decryptedData: new Uint8Array(decryptedBuffer),
        fileName: encryptedData.fileName,
        originalHash: encryptedData.originalHash
      };
    } catch (err) {
      console.error('Decryption error details:', err);
      setError(err.message);
      throw new Error('Failed to decrypt file: ' + err.message);
    }
  }, []);

  return {
    encryptFile,
    generateKey,
    calculateFileHash,
    decryptFile,
    isEncrypting,
    encryptionProgress,
    error
  };
};