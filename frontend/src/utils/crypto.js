/**
 * Enhanced Web Crypto API utilities for multi-level access control
 * This module handles all cryptographic operations including time-based key expiration
 * and hierarchical access control for the document storage system
 */

// Access level constants
export const ACCESS_LEVELS = {
  OWNER: 'owner',
  FULL_ACCESS: 'full_access', 
  VIEW_ONLY: 'view_only'
};

// Time units for expiration
export const TIME_UNITS = {
  MINUTES: 60 * 1000,
  HOURS: 60 * 60 * 1000,
  DAYS: 24 * 60 * 60 * 1000
};

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
      const keyArray = Array.from(new Uint8Array(exported));
      const hexKey = keyArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hexKey;
    } catch (error) {
      console.error('Key export failed:', error);
      throw new Error('Failed to export key');
    }
  }

  /**
   * Import a key from hex string or JWK format (backward compatible)
   * @param {string} keyString - Hex string or JWK JSON string representation of the key
   * @returns {Promise<CryptoKey>} The imported CryptoKey
   */
  static async importKey(keyString) {
    try {
      const trimmedKey = keyString.trim();
      
      // Try to detect if this is a JWK format (starts with { and contains "kty")
      if (trimmedKey.startsWith('{') && trimmedKey.includes('"kty"')) {
        // This looks like a JWK format - use legacy import
        console.log('Detected JWK format key, importing as JWK');
        return await this.importKeyJWK(trimmedKey);
      } else {
        // This should be hex format
        console.log('Detected hex format key, importing as hex');
        return await this.importKeyHex(trimmedKey);
      }
    } catch (error) {
      console.error('Key import failed:', error);
      throw new Error('Failed to import key: ' + error.message);
    }
  }

  /**
   * Import a key from hex string
   * @param {string} hexString - Hex string representation of the key
   * @returns {Promise<CryptoKey>} The imported CryptoKey
   */
  static async importKeyHex(hexString) {
    const cleanHex = hexString.replace(/^0x/, ''); // Remove 0x prefix if present
    
    // Validate hex string
    if (!/^[0-9a-fA-F]+$/.test(cleanHex)) {
      throw new Error('Invalid hex format. Key should contain only hexadecimal characters (0-9, a-f, A-F).');
    }
    
    if (cleanHex.length !== 64) {
      throw new Error('Invalid key length. Expected 64 hex characters (32 bytes) for AES-256.');
    }
    
    // Convert hex to ArrayBuffer
    const keyBytes = new Uint8Array(cleanHex.match(/.{2}/g).map(byte => parseInt(byte, 16)));
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    return key;
  }

  /**
   * Import a key from JWK format (legacy support)
   * @param {string} jwkString - JSON string representation of the key (JWK format)
   * @returns {Promise<CryptoKey>} The imported CryptoKey
   */
  static async importKeyJWK(jwkString) {
    // Parse the JSON string to get JWK object
    const jwkKey = JSON.parse(jwkString);
    
    // Validate that it's a proper JWK for AES-GCM
    if (!jwkKey.kty || jwkKey.kty !== 'oct') {
      throw new Error('Invalid JWK format. Expected symmetric key (oct).');
    }
    
    if (!jwkKey.k) {
      throw new Error('Invalid JWK format. Missing key data.');
    }
    
    const key = await crypto.subtle.importKey(
      'jwk',
      jwkKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    return key;
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
   * Generate a hierarchical key for specific access level
   * @param {CryptoKey} masterKey - The master encryption key
   * @param {string} accessLevel - Access level (owner, full_access, view_only)
   * @param {string} userId - User identifier
   * @param {number} expirationTime - Expiration timestamp (0 for permanent)
   * @returns {Promise<CryptoKey>} Derived key for the specific access level
   */
  static async generateHierarchicalKey(masterKey, accessLevel, userId, expirationTime = 0) {
    try {
      // Create derivation material combining access level, user ID, and expiration
      const derivationData = new TextEncoder().encode(
        `${accessLevel}:${userId}:${expirationTime}`
      );
      
      // Export master key for derivation
      const masterKeyData = await crypto.subtle.exportKey('raw', masterKey);
      
      // Use PBKDF2 to derive a new key
      const salt = await crypto.subtle.digest('SHA-256', derivationData);
      
      // Import master key as base for derivation
      const baseKey = await crypto.subtle.importKey(
        'raw',
        masterKeyData,
        'PBKDF2',
        false,
        ['deriveKey']
      );
      
      // Derive the hierarchical key
      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      
      return derivedKey;
    } catch (error) {
      console.error('Hierarchical key generation failed:', error);
      throw new Error('Failed to generate hierarchical key');
    }
  }

  /**
   * Create time-locked encryption key
   * @param {CryptoKey} baseKey - Base key to time-lock
   * @param {number} expirationTime - Expiration timestamp in milliseconds
   * @returns {Promise<{key: CryptoKey, timelock: Object}>} Time-locked key with metadata
   */
  static async createTimeLockKey(baseKey, expirationTime) {
    try {
      // Export base key
      const keyData = await crypto.subtle.exportKey('raw', baseKey);
      
      // Create time-lock metadata
      const timeLock = {
        expirationTime,
        createdAt: Date.now(),
        isExpired: () => Date.now() > expirationTime
      };
      
      // Create time-locked key data by XORing with time-based salt
      const timeSalt = new Uint8Array(await crypto.subtle.digest('SHA-256', 
        new TextEncoder().encode(expirationTime.toString())
      ));
      
      const originalKey = new Uint8Array(keyData);
      const timeLockedData = new Uint8Array(originalKey.length);
      
      for (let i = 0; i < originalKey.length; i++) {
        timeLockedData[i] = originalKey[i] ^ timeSalt[i % timeSalt.length];
      }
      
      // Import the time-locked key
      const timeLockedKey = await crypto.subtle.importKey(
        'raw',
        timeLockedData,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      
      return { key: timeLockedKey, timelock: timeLock };
    } catch (error) {
      console.error('Time-lock key creation failed:', error);
      throw new Error('Failed to create time-locked key');
    }
  }

  /**
   * Validate and unlock time-locked key
   * @param {CryptoKey} timeLockedKey - Time-locked key
   * @param {number} expirationTime - Original expiration time
   * @returns {Promise<CryptoKey>} Unlocked key if not expired
   */
  static async unlockTimeLockKey(timeLockedKey, expirationTime) {
    try {
      // Check if key has expired
      if (Date.now() > expirationTime) {
        throw new Error('Key has expired and cannot be used');
      }
      
      // Export time-locked key
      const timeLockedData = await crypto.subtle.exportKey('raw', timeLockedKey);
      
      // Recreate the time salt
      const timeSalt = new Uint8Array(await crypto.subtle.digest('SHA-256',
        new TextEncoder().encode(expirationTime.toString())
      ));
      
      // Unlock by XORing with the same salt
      const lockedKey = new Uint8Array(timeLockedData);
      const unlockedData = new Uint8Array(lockedKey.length);
      
      for (let i = 0; i < lockedKey.length; i++) {
        unlockedData[i] = lockedKey[i] ^ timeSalt[i % timeSalt.length];
      }
      
      // Import the unlocked key
      const unlockedKey = await crypto.subtle.importKey(
        'raw',
        unlockedData,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      
      return unlockedKey;
    } catch (error) {
      console.error('Time-lock key unlock failed:', error);
      throw new Error('Failed to unlock time-locked key: ' + error.message);
    }
  }

  /**
   * Encrypt data with view-only protection
   * @param {ArrayBuffer} data - Data to encrypt
   * @param {CryptoKey} key - Encryption key
   * @param {boolean} isViewOnly - Whether this is view-only access
   * @returns {Promise<ArrayBuffer>} Encrypted data with protection flags
   */
  static async encryptWithAccessLevel(data, key, isViewOnly = false) {
    try {
      const encryptedData = await this.encrypt(data, key);
      
      if (isViewOnly) {
        // Add view-only protection by embedding access level metadata
        const metadata = new TextEncoder().encode(`VIEW_ONLY:${Date.now()}`);
        const metadataLength = new Uint32Array([metadata.length]);
        
        // Combine metadata length + metadata + encrypted data
        const combined = new Uint8Array(
          metadataLength.byteLength + metadata.length + encryptedData.byteLength
        );
        
        combined.set(new Uint8Array(metadataLength.buffer), 0);
        combined.set(metadata, metadataLength.byteLength);
        combined.set(new Uint8Array(encryptedData), metadataLength.byteLength + metadata.length);
        
        return combined.buffer;
      }
      
      return encryptedData;
    } catch (error) {
      console.error('Access level encryption failed:', error);
      throw new Error('Failed to encrypt with access level protection');
    }
  }

  /**
   * Decrypt data with access level validation
   * @param {ArrayBuffer} combinedData - Encrypted data with potential metadata
   * @param {CryptoKey} key - Decryption key
   * @param {string} requiredAccessLevel - Required access level
   * @returns {Promise<{data: ArrayBuffer, accessLevel: string}>} Decrypted data and access info
   */
  static async decryptWithAccessLevel(combinedData, key, requiredAccessLevel) {
    try {
      const data = new Uint8Array(combinedData);
      
      // Check if this has view-only metadata
      if (data.length > 4) {
        const metadataLength = new Uint32Array(data.slice(0, 4).buffer)[0];
        
        if (metadataLength > 0 && metadataLength < 1000) { // Reasonable metadata size
          const metadata = new TextDecoder().decode(
            data.slice(4, 4 + metadataLength)
          );
          
          if (metadata.startsWith('VIEW_ONLY:')) {
            const encryptedData = data.slice(4 + metadataLength);
            
            // Check access level permissions
            if (requiredAccessLevel === ACCESS_LEVELS.FULL_ACCESS || 
                requiredAccessLevel === ACCESS_LEVELS.OWNER) {
              // Can only view, not download for view-only protected data
              throw new Error('This content is view-only and cannot be downloaded');
            }
            
            const decryptedData = await this.decrypt(encryptedData.buffer, key);
            return { 
              data: decryptedData, 
              accessLevel: ACCESS_LEVELS.VIEW_ONLY,
              isViewOnly: true 
            };
          }
        }
      }
      
      // No special metadata, decrypt normally
      const decryptedData = await this.decrypt(combinedData, key);
      return { 
        data: decryptedData, 
        accessLevel: ACCESS_LEVELS.FULL_ACCESS,
        isViewOnly: false 
      };
      
    } catch (error) {
      console.error('Access level decryption failed:', error);
      throw new Error('Failed to decrypt with access level validation: ' + error.message);
    }
  }

  /**
   * Store key securely in IndexedDB with access metadata
   * @param {string} keyId - Identifier for the key
   * @param {CryptoKey} key - The key to store
   * @param {Object} metadata - Access control metadata
   */
  static async storeKeyInDB(keyId, key, metadata = {}) {
    try {
      const db = await this.initDB();
      const transaction = db.transaction(['encryptionKeys'], 'readwrite');
      const store = transaction.objectStore('encryptionKeys');
      
      return new Promise((resolve, reject) => {
        const keyData = {
          key: key,
          metadata: {
            accessLevel: metadata.accessLevel || ACCESS_LEVELS.FULL_ACCESS,
            expirationTime: metadata.expirationTime || 0,
            userId: metadata.userId || 'unknown',
            createdAt: Date.now(),
            ...metadata
          }
        };
        
        const request = store.put(keyData, keyId);
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
   * Retrieve key from IndexedDB with metadata validation
   * @param {string} keyId - Identifier for the key
   * @returns {Promise<{key: CryptoKey, metadata: Object}>} The retrieved key and metadata
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
            const keyData = request.result;
            
            // Check if this is new format with metadata
            if (keyData.key && keyData.metadata) {
              // Validate expiration
              if (keyData.metadata.expirationTime > 0 && 
                  Date.now() > keyData.metadata.expirationTime) {
                reject(new Error('Key has expired'));
                return;
              }
              
              resolve(keyData);
            } else {
              // Legacy format - just the key
              resolve({ 
                key: keyData, 
                metadata: { 
                  accessLevel: ACCESS_LEVELS.FULL_ACCESS,
                  expirationTime: 0,
                  userId: 'legacy',
                  createdAt: 0
                }
              });
            }
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