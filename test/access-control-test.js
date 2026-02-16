/**
 * Comprehensive test suite for multi-level access control system
 * Tests encryption, blockchain permissions, and time-based expiration
 */

import CryptoUtils, { ACCESS_LEVELS, TIME_UNITS } from '../frontend/src/utils/crypto.js';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { webcrypto } from 'node:crypto';

// Polyfill crypto for Node.js testing
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

describe('Multi-Level Access Control System', () => {
  let masterKey;
  let testDocument;
  let owner = 'owner123';
  let user1 = 'user1';
  let user2 = 'user2';
  let user3 = 'user3';

  beforeEach(async () => {
    // Generate a master key for testing
    masterKey = await CryptoUtils.generateKey();
    testDocument = new TextEncoder().encode('This is a test document with sensitive information.');
  });

  describe('Hierarchical Key Generation', () => {
    it('should generate unique keys for different users', async () => {
      const ownerKey = await CryptoUtils.generateHierarchicalKey(
        masterKey, ACCESS_LEVELS.OWNER, owner, 0
      );
      const user1Key = await CryptoUtils.generateHierarchicalKey(
        masterKey, ACCESS_LEVELS.FULL_ACCESS, user1, 0
      );
      const user2Key = await CryptoUtils.generateHierarchicalKey(
        masterKey, ACCESS_LEVELS.VIEW_ONLY, user2, 0
      );

      // Export keys to compare
      const ownerHex = await CryptoUtils.exportKey(ownerKey);
      const user1Hex = await CryptoUtils.exportKey(user1Key);
      const user2Hex = await CryptoUtils.exportKey(user2Key);

      // All keys should be different
      assert.notEqual(ownerHex, user1Hex, 'Owner and user1 keys should be different');
      assert.notEqual(user1Hex, user2Hex, 'User1 and user2 keys should be different');
      assert.notEqual(ownerHex, user2Hex, 'Owner and user2 keys should be different');
    });

    it('should generate same key for same parameters', async () => {
      const key1 = await CryptoUtils.generateHierarchicalKey(
        masterKey, ACCESS_LEVELS.FULL_ACCESS, user1, 0
      );
      const key2 = await CryptoUtils.generateHierarchicalKey(
        masterKey, ACCESS_LEVELS.FULL_ACCESS, user1, 0
      );

      const key1Hex = await CryptoUtils.exportKey(key1);
      const key2Hex = await CryptoUtils.exportKey(key2);

      assert.equal(key1Hex, key2Hex, 'Same parameters should generate same key');
    });

    it('should generate different keys for different expiration times', async () => {
      const permanentKey = await CryptoUtils.generateHierarchicalKey(
        masterKey, ACCESS_LEVELS.FULL_ACCESS, user1, 0
      );
      const expiringKey = await CryptoUtils.generateHierarchicalKey(
        masterKey, ACCESS_LEVELS.FULL_ACCESS, user1, Date.now() + TIME_UNITS.DAYS
      );

      const permanentHex = await CryptoUtils.exportKey(permanentKey);
      const expiringHex = await CryptoUtils.exportKey(expiringKey);

      assert.notEqual(permanentHex, expiringHex, 'Different expiration should generate different keys');
    });
  });

  describe('Time-Based Key Expiration', () => {
    it('should create and unlock time-locked keys successfully', async () => {
      const baseKey = await CryptoUtils.generateHierarchicalKey(
        masterKey, ACCESS_LEVELS.FULL_ACCESS, user1, 0
      );
      
      // Create time lock for 1 second in the future
      const expirationTime = Date.now() + 1000;
      const timeLocked = await CryptoUtils.createTimeLockKey(baseKey, expirationTime);

      // Should be able to unlock immediately
      const unlockedKey = await CryptoUtils.unlockTimeLockKey(
        timeLocked.key, expirationTime
      );

      // Keys should be functionally equivalent
      const originalData = new TextEncoder().encode('test data');
      const encryptedWithOriginal = await CryptoUtils.encrypt(originalData, baseKey);
      const decryptedWithUnlocked = await CryptoUtils.decrypt(encryptedWithOriginal, unlockedKey);

      const decryptedText = new TextDecoder().decode(decryptedWithUnlocked);
      assert.equal(decryptedText, 'test data', 'Unlocked key should decrypt data encrypted with original key');
    });

    it('should reject expired time-locked keys', async () => {
      const baseKey = await CryptoUtils.generateHierarchicalKey(
        masterKey, ACCESS_LEVELS.FULL_ACCESS, user1, 0
      );
      
      // Create time lock that has already expired
      const expirationTime = Date.now() - 1000;
      const timeLocked = await CryptoUtils.createTimeLockKey(baseKey, expirationTime);

      // Should throw error when trying to unlock expired key
      await assert.rejects(
        async () => {
          await CryptoUtils.unlockTimeLockKey(timeLocked.key, expirationTime);
        },
        /Key has expired/,
        'Should reject expired keys'
      );
    });
  });

  describe('Access Level Encryption', () => {
    it('should encrypt data with view-only protection', async () => {
      const userKey = await CryptoUtils.generateHierarchicalKey(
        masterKey, ACCESS_LEVELS.VIEW_ONLY, user2, 0
      );

      const encryptedData = await CryptoUtils.encryptWithAccessLevel(
        testDocument, userKey, true
      );

      // Should be larger than normal encryption due to metadata
      const normalEncrypted = await CryptoUtils.encrypt(testDocument, userKey);
      assert(encryptedData.byteLength > normalEncrypted.byteLength, 
        'View-only encryption should include additional metadata');
    });

    it('should prevent full access operations on view-only data', async () => {
      const userKey = await CryptoUtils.generateHierarchicalKey(
        masterKey, ACCESS_LEVELS.VIEW_ONLY, user2, 0
      );

      const encryptedData = await CryptoUtils.encryptWithAccessLevel(
        testDocument, userKey, true
      );

      // Should throw error when trying full access on view-only data
      await assert.rejects(
        async () => {
          await CryptoUtils.decryptWithAccessLevel(
            encryptedData, userKey, ACCESS_LEVELS.FULL_ACCESS
          );
        },
        /view-only and cannot be downloaded/,
        'Should prevent full access to view-only content'
      );
    });

    it('should allow view-only operations on view-only data', async () => {
      const userKey = await CryptoUtils.generateHierarchicalKey(
        masterKey, ACCESS_LEVELS.VIEW_ONLY, user2, 0
      );

      const encryptedData = await CryptoUtils.encryptWithAccessLevel(
        testDocument, userKey, true
      );

      const result = await CryptoUtils.decryptWithAccessLevel(
        encryptedData, userKey, ACCESS_LEVELS.VIEW_ONLY
      );

      assert.equal(result.accessLevel, ACCESS_LEVELS.VIEW_ONLY, 'Should identify as view-only');
      assert.equal(result.isViewOnly, true, 'Should be marked as view-only');
      
      const decryptedText = new TextDecoder().decode(result.data);
      assert.equal(decryptedText, 'This is a test document with sensitive information.',
        'Should decrypt content correctly');
    });
  });

  describe('Key Storage and Retrieval', () => {
    it('should store and retrieve keys with metadata', async () => {
      const userKey = await CryptoUtils.generateHierarchicalKey(
        masterKey, ACCESS_LEVELS.FULL_ACCESS, user1, 0
      );

      const metadata = {
        accessLevel: ACCESS_LEVELS.FULL_ACCESS,
        userId: user1,
        expirationTime: 0,
        documentHash: 'test-doc-hash'
      };

      await CryptoUtils.storeKeyInDB('test-key-id', userKey, metadata);
      const retrieved = await CryptoUtils.getKeyFromDB('test-key-id');

      assert.equal(retrieved.metadata.accessLevel, ACCESS_LEVELS.FULL_ACCESS,
        'Should retrieve correct access level');
      assert.equal(retrieved.metadata.userId, user1, 'Should retrieve correct user ID');
      assert.equal(retrieved.metadata.documentHash, 'test-doc-hash',
        'Should retrieve correct document hash');

      // Test that the key still works
      const encryptedData = await CryptoUtils.encrypt(testDocument, userKey);
      const decryptedData = await CryptoUtils.decrypt(encryptedData, retrieved.key);
      const decryptedText = new TextDecoder().decode(decryptedData);
      
      assert.equal(decryptedText, 'This is a test document with sensitive information.',
        'Retrieved key should work for encryption/decryption');
    });

    it('should reject retrieval of expired keys', async () => {
      const userKey = await CryptoUtils.generateHierarchicalKey(
        masterKey, ACCESS_LEVELS.FULL_ACCESS, user1, 0
      );

      const metadata = {
        accessLevel: ACCESS_LEVELS.FULL_ACCESS,
        userId: user1,
        expirationTime: Date.now() - 1000, // Expired 1 second ago
        documentHash: 'test-doc-hash'
      };

      await CryptoUtils.storeKeyInDB('expired-key-id', userKey, metadata);

      await assert.rejects(
        async () => {
          await CryptoUtils.getKeyFromDB('expired-key-id');
        },
        /Key has expired/,
        'Should reject expired keys'
      );
    });
  });

  describe('Complete Access Control Workflow', () => {
    it('should demonstrate complete owner -> users workflow', async () => {
      // 1. Owner encrypts document
      const ownerKey = await CryptoUtils.generateHierarchicalKey(
        masterKey, ACCESS_LEVELS.OWNER, owner, 0
      );
      const encryptedDocument = await CryptoUtils.encrypt(testDocument, ownerKey);

      // 2. Generate user-specific keys
      const user1Key = await CryptoUtils.generateHierarchicalKey(
        masterKey, ACCESS_LEVELS.VIEW_ONLY, user1, 0
      );
      const user2ExpirationTime = Date.now() + (2 * TIME_UNITS.DAYS);
      const user2Key = await CryptoUtils.generateHierarchicalKey(
        masterKey, ACCESS_LEVELS.FULL_ACCESS, user2, user2ExpirationTime
      );
      const user3Key = await CryptoUtils.generateHierarchicalKey(
        masterKey, ACCESS_LEVELS.FULL_ACCESS, user3, 0
      );

      // 3. Encrypt data for each user with their access level
      const user1Data = await CryptoUtils.encryptWithAccessLevel(
        testDocument, user1Key, true
      );
      const user2Data = await CryptoUtils.encryptWithAccessLevel(
        testDocument, user2Key, false
      );
      const user3Data = await CryptoUtils.encryptWithAccessLevel(
        testDocument, user3Key, false
      );

      // 4. Test user1 (view-only, permanent)
      const user1Result = await CryptoUtils.decryptWithAccessLevel(
        user1Data, user1Key, ACCESS_LEVELS.VIEW_ONLY
      );
      assert.equal(user1Result.isViewOnly, true, 'User1 should have view-only access');

      // 5. Test user2 (full access, 2-day expiration)
      const user2Result = await CryptoUtils.decryptWithAccessLevel(
        user2Data, user2Key, ACCESS_LEVELS.FULL_ACCESS
      );
      assert.equal(user2Result.isViewOnly, false, 'User2 should have full access');

      // 6. Test user3 (full access, permanent)
      const user3Result = await CryptoUtils.decryptWithAccessLevel(
        user3Data, user3Key, ACCESS_LEVELS.FULL_ACCESS
      );
      assert.equal(user3Result.isViewOnly, false, 'User3 should have full access');

      // 7. Verify all decrypted content is correct
      const originalText = 'This is a test document with sensitive information.';
      assert.equal(new TextDecoder().decode(user1Result.data), originalText,
        'User1 should decrypt correct content');
      assert.equal(new TextDecoder().decode(user2Result.data), originalText,
        'User2 should decrypt correct content');
      assert.equal(new TextDecoder().decode(user3Result.data), originalText,
        'User3 should decrypt correct content');

      console.log('✅ Complete access control workflow test passed');
    });
  });

  afterEach(() => {
    // Clean up any test data if needed
  });
});

describe('Security Validation Tests', () => {
  it('should ensure keys cannot be derived without master key', async () => {
    const masterKey1 = await CryptoUtils.generateKey();
    const masterKey2 = await CryptoUtils.generateKey();

    const key1 = await CryptoUtils.generateHierarchicalKey(
      masterKey1, ACCESS_LEVELS.FULL_ACCESS, 'user1', 0
    );
    const key2 = await CryptoUtils.generateHierarchicalKey(
      masterKey2, ACCESS_LEVELS.FULL_ACCESS, 'user1', 0
    );

    const key1Hex = await CryptoUtils.exportKey(key1);
    const key2Hex = await CryptoUtils.exportKey(key2);

    assert.notEqual(key1Hex, key2Hex, 
      'Same user with different master keys should generate different keys');
  });

  it('should ensure time-lock provides actual security', async () => {
    const baseKey = await CryptoUtils.generateKey();
    const futureTime = Date.now() + TIME_UNITS.HOURS;
    
    const timeLocked = await CryptoUtils.createTimeLockKey(baseKey, futureTime);
    
    // The time-locked key should be different from the original
    const originalHex = await CryptoUtils.exportKey(baseKey);
    const lockedHex = await CryptoUtils.exportKey(timeLocked.key);
    
    assert.notEqual(originalHex, lockedHex, 
      'Time-locked key should be different from original');
  });
});

// Run the tests
console.log('🧪 Starting Multi-Level Access Control Tests...\n');

// Note: In a real test environment, you would use a proper test runner
// This is a simplified version for demonstration