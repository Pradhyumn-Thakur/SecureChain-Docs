/**
 * Web Crypto API utilities for AES-256-GCM encryption
 * This module handles all cryptographic operations for the document storage system
 */

class CryptoUtils {
  /**
   * Generate a new AES-256 encryption key
   * @returns {Promise<CryptoKey>} A new AES-256 key
   */
  static async generateKey() {
    try {
      const key = await crypto.subtle.generateKey(
        {
          name: "AES-GCM",
          length: 256
        },
        true, // extractable - set to false in production for better security
        ["encrypt", "decrypt"]
      );
      return key;
    } catch (error) {
      console.error('Key generation failed:', error);
      throw new Error('Failed to generate encryption key');
    }
  }

  /**
   * Export a CryptoKey to hex string for storage/display
   * @param {CryptoKey} key - The key to export
   * @returns {Promise<string>} Hex string representation of the key
   */
  static async exportKey(key) {
    try {
      const exported = await crypto.subtle.exportKey('raw', key);
      const hexKey = Array.from(new Uint8Array(exported))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return hexKey;
    } catch (error) {
      console.error('Key export failed:', error);
      throw new Error('Failed to export key');
    }
  }

  /**
   * Import a key from hex string
   * @param {string} hexKey - Hex string representation of the key
   * @returns {Promise<CryptoKey>} The imported CryptoKey
   */
  static async importKey(hexKey) {
    try {
      // Remove any whitespace and validate hex string
      hexKey = hexKey.trim();
      if (!/^[0-9a-fA-F]{64}$/.test(hexKey)) {
        throw new Error('Invalid key format. Expected 64 hex characters.');
      }
      
      const keyData = new Uint8Array(
        hexKey.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
      );
      
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      return key;
    } catch (error) {
      console.error('Key import failed:', error);
      throw new Error('Failed to import key: ' + error.message);
    }
  }

  /**
   * Calculate SHA-256 hash of a file
   * @param {File|ArrayBuffer} data - The data to hash
   * @returns {Promise<string>} Hex string of the hash with 0x prefix
   */
  static async calculateHash(data) {
    try {
      let buffer;
      if (data instanceof File) {
        buffer = await data.arrayBuffer();
      } else {
        buffer = data;
      }
      
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return '0x' + hashHex;
    } catch (error) {
      console.error('Hash calculation failed:', error);
      throw new Error('Failed to calculate hash');
    }
  }

  /**
   * Encrypt data using AES-GCM
   * @param {ArrayBuffer} data - The data to encrypt
   * @param {CryptoKey} key - The encryption key
   * @returns {Promise<ArrayBuffer>} Encrypted data with IV prepended
   */
  static async encrypt(data, key) {
    try {
      const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
      
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        data
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedData.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encryptedData), iv.length);
      
      return combined.buffer;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data using AES-GCM
   * @param {ArrayBuffer} combinedData - The encrypted data with IV prepended
   * @param {CryptoKey} key - The decryption key
   * @returns {Promise<ArrayBuffer>} Decrypted data
   */
  static async decrypt(combinedData, key) {
    try {
      const data = new Uint8Array(combinedData);
      
      // Extract IV and encrypted data
      const iv = data.slice(0, 12);
      const encryptedData = data.slice(12);
      
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encryptedData
      );
      
      return decryptedData;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data - invalid key or corrupted data');
    }
  }

  /**
   * Encrypt a file with progress callback
   * @param {File} file - The file to encrypt
   * @param {CryptoKey} key - The encryption key
   * @param {Function} onProgress - Progress callback (0-100)
   * @returns {Promise<Blob>} Encrypted file as Blob
   */
  static async encryptFile(file, key, onProgress = () => {}) {
    try {
      // Validate file
      if (!file || file.size === 0) {
        throw new Error('Invalid file: File is empty or corrupted');
      }

      const chunkSize = 1024 * 1024; // 1MB chunks for better memory management
      const totalChunks = Math.ceil(file.size / chunkSize);
      const encryptedChunks = [];
      
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        
        const arrayBuffer = await chunk.arrayBuffer();
        const encryptedChunk = await this.encrypt(arrayBuffer, key);
        encryptedChunks.push(new Uint8Array(encryptedChunk));
        
        const progress = ((i + 1) / totalChunks) * 100;
        onProgress(progress);
        
        // Allow UI to update
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      // Combine all chunks
      const totalLength = encryptedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of encryptedChunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      
      return new Blob([combined], { type: 'application/octet-stream' });
    } catch (error) {
      console.error('File encryption failed:', error);
      throw new Error('Failed to encrypt file: ' + error.message);
    }
  }

  /**
   * Initialize IndexedDB
   * @returns {Promise<IDBDatabase>}
   */
  static async initDB() {
    const dbName = 'DocumentStorageDB';
    const storeName = 'encryptionKeys';
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);
      
      request.onerror = () => reject(new Error('Failed to open database'));
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      };
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
    });
  }

  /**
   * Store key securely in IndexedDB
   * @param {string} keyId - Identifier for the key
   * @param {CryptoKey} key - The key to store
   */
  static async storeKeyInDB(keyId, key) {
    try {
      const db = await this.initDB();
      const transaction = db.transaction(['encryptionKeys'], 'readwrite');
      const store = transaction.objectStore('encryptionKeys');
      
      return new Promise((resolve, reject) => {
        const request = store.put(key, keyId);
        request.onsuccess = () => {
          db.close();
          resolve();
        };
        request.onerror = () => {
          db.close();
          reject(new Error('Failed to store key'));
        };
      });
    } catch (error) {
      console.error('Store key error:', error);
      throw error;
    }
  }

  /**
   * Retrieve key from IndexedDB
   * @param {string} keyId - Identifier for the key
   * @returns {Promise<CryptoKey>} The retrieved key
   */
  static async getKeyFromDB(keyId) {
    try {
      const db = await this.initDB();
      const transaction = db.transaction(['encryptionKeys'], 'readonly');
      const store = transaction.objectStore('encryptionKeys');
      
      return new Promise((resolve, reject) => {
        const request = store.get(keyId);
        request.onsuccess = () => {
          db.close();
          if (request.result) {
            resolve(request.result);
          } else {
            reject(new Error('Key not found'));
          }
        };
        request.onerror = () => {
          db.close();
          reject(new Error('Failed to retrieve key'));
        };
      });
    } catch (error) {
      console.error('Get key error:', error);
      throw error;
    }
  }
}

export default CryptoUtils;