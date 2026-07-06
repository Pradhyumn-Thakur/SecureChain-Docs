/**
 * Tests for the ECIES key-wrapping layer used for on-chain key distribution.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { webcrypto } from 'node:crypto';
import { Wallet, getBytes } from 'ethers';
import {
  KEY_DERIVATION_MESSAGE_V1,
  deriveEncryptionKeypair,
  wrapKey,
  unwrapKey,
  WRAPPED_KEY_BYTES,
} from '../frontend/src/utils/keywrap.js';

// Polyfill crypto for Node.js testing
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

const newDocKey = () => crypto.getRandomValues(new Uint8Array(32));

describe('Key derivation', () => {
  it('derivation message is frozen (snapshot)', () => {
    // FROZEN: if this test fails, every wrapped key on-chain becomes unrecoverable.
    // Add a v2 message instead of editing v1.
    const addr = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    assert.strictEqual(
      KEY_DERIVATION_MESSAGE_V1(addr),
      'BlockchainDocumentStorage encryption key v1\n\n' +
        'Sign this message to derive your document encryption key.\n' +
        'This request will not trigger a blockchain transaction or cost gas.\n\n' +
        'Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
    );
  });

  it('is deterministic: same wallet derives the same keypair twice', async () => {
    const wallet = Wallet.createRandom();
    const a = await deriveEncryptionKeypair(wallet, wallet.address);
    const b = await deriveEncryptionKeypair(wallet, wallet.address);
    assert.strictEqual(a.privateKey, b.privateKey);
    assert.strictEqual(a.publicKey, b.publicKey);
  });

  it('different wallets derive different keypairs', async () => {
    const w1 = Wallet.createRandom();
    const w2 = Wallet.createRandom();
    const a = await deriveEncryptionKeypair(w1, w1.address);
    const b = await deriveEncryptionKeypair(w2, w2.address);
    assert.notStrictEqual(a.privateKey, b.privateKey);
  });

  it('produces a 33-byte compressed public key', async () => {
    const wallet = Wallet.createRandom();
    const { publicKey } = await deriveEncryptionKeypair(wallet, wallet.address);
    const bytes = getBytes(publicKey);
    assert.strictEqual(bytes.length, 33);
    assert.ok(bytes[0] === 0x02 || bytes[0] === 0x03);
  });
});

describe('Wrap / unwrap', () => {
  it('round-trips a document key', async () => {
    const wallet = Wallet.createRandom();
    const { privateKey, publicKey } = await deriveEncryptionKeypair(wallet, wallet.address);

    const docKey = newDocKey();
    const wrapped = await wrapKey(publicKey, docKey);
    const unwrapped = await unwrapKey(privateKey, wrapped);

    assert.deepStrictEqual(unwrapped, docKey);
  });

  it('produces a 94-byte blob', async () => {
    const wallet = Wallet.createRandom();
    const { publicKey } = await deriveEncryptionKeypair(wallet, wallet.address);
    const wrapped = await wrapKey(publicKey, newDocKey());
    assert.strictEqual(getBytes(wrapped).length, WRAPPED_KEY_BYTES);
    assert.strictEqual(WRAPPED_KEY_BYTES, 94);
  });

  it('wrapping the same key twice yields different blobs (fresh ephemeral keys)', async () => {
    const wallet = Wallet.createRandom();
    const { publicKey } = await deriveEncryptionKeypair(wallet, wallet.address);
    const docKey = newDocKey();
    const w1 = await wrapKey(publicKey, docKey);
    const w2 = await wrapKey(publicKey, docKey);
    assert.notStrictEqual(w1, w2);
  });

  it('a different recipient cannot unwrap the blob', async () => {
    const alice = Wallet.createRandom();
    const mallory = Wallet.createRandom();
    const aliceKeys = await deriveEncryptionKeypair(alice, alice.address);
    const malloryKeys = await deriveEncryptionKeypair(mallory, mallory.address);

    const wrapped = await wrapKey(aliceKeys.publicKey, newDocKey());
    await assert.rejects(unwrapKey(malloryKeys.privateKey, wrapped));
  });

  it('rejects tampered blobs (GCM authentication)', async () => {
    const wallet = Wallet.createRandom();
    const { privateKey, publicKey } = await deriveEncryptionKeypair(wallet, wallet.address);
    const wrapped = await wrapKey(publicKey, newDocKey());

    const tampered = getBytes(wrapped);
    tampered[tampered.length - 1] ^= 0xff; // flip a bit in the GCM tag
    const tamperedHex = '0x' + Buffer.from(tampered).toString('hex');

    await assert.rejects(unwrapKey(privateKey, tamperedHex));
  });

  it('rejects wrong blob length and unknown version', async () => {
    const wallet = Wallet.createRandom();
    const { privateKey, publicKey } = await deriveEncryptionKeypair(wallet, wallet.address);

    await assert.rejects(unwrapKey(privateKey, '0x0102'), /Invalid wrapped key length/);

    const wrapped = getBytes(await wrapKey(publicKey, newDocKey()));
    wrapped[0] = 0x02; // unknown version byte
    const badVersion = '0x' + Buffer.from(wrapped).toString('hex');
    await assert.rejects(unwrapKey(privateKey, badVersion), /Unsupported wrapped key version/);
  });

  it('rejects non-32-byte document keys', async () => {
    const wallet = Wallet.createRandom();
    const { publicKey } = await deriveEncryptionKeypair(wallet, wallet.address);
    await assert.rejects(wrapKey(publicKey, new Uint8Array(31)), /32-byte/);
  });
});
