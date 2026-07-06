/**
 * Key wrapping for on-chain key distribution.
 *
 * Each user has a secp256k1 encryption keypair derived deterministically from a
 * wallet signature over a fixed message. The public key (33-byte compressed) is
 * registered on-chain in DocumentRegistry. To share a document, the owner wraps
 * the AES-256 document key to the recipient's public key (ECIES: ephemeral ECDH
 * + HKDF-SHA256 + AES-256-GCM) and stores the blob in the grantAccess call.
 * The recipient re-signs the same message to re-derive their private key and
 * unwraps locally. Keys never touch the backend or the chain in plaintext.
 *
 * Uses ethers' bundled secp256k1 (SigningKey) — no extra crypto dependencies.
 */

import { SigningKey, keccak256, getBytes, hexlify, concat, toBeHex } from 'ethers';

// secp256k1 group order
const CURVE_ORDER = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');

const WRAP_VERSION = 0x01;
const EPH_PUB_LENGTH = 33; // compressed secp256k1 point
const IV_LENGTH = 12; // AES-GCM standard
const WRAPPED_KEY_LENGTH = 1 + EPH_PUB_LENGTH + IV_LENGTH + 32 + 16; // 94 bytes
const HKDF_INFO = new TextEncoder().encode('docstore-keywrap-v1');

/**
 * FROZEN. Changing this message orphans every wrapped key ever stored on-chain,
 * because users could no longer re-derive the private keys that unwrap them.
 * Evolve the scheme by adding a v2 message + version byte instead.
 */
export function KEY_DERIVATION_MESSAGE_V1(address) {
  return (
    'BlockchainDocumentStorage encryption key v1\n\n' +
    'Sign this message to derive your document encryption key.\n' +
    'This request will not trigger a blockchain transaction or cost gas.\n\n' +
    `Address: ${address}`
  );
}

/** Map 32 bytes of entropy onto a valid non-zero secp256k1 scalar. */
function seedToPrivateKey(seedHex) {
  return toBeHex((BigInt(seedHex) % (CURVE_ORDER - 1n)) + 1n, 32);
}

/**
 * Derive the user's encryption keypair from a wallet signature.
 * Deterministic for EOAs (RFC-6979 signatures): the same wallet always yields
 * the same keypair. Smart-contract wallets (ERC-1271/4337) produce
 * non-reproducible signatures and are not supported.
 *
 * @param {import('ethers').Signer} signer
 * @param {string} address checksummed address of the signer
 * @returns {Promise<{privateKey: string, publicKey: string}>} hex; publicKey is 33-byte compressed
 */
export async function deriveEncryptionKeypair(signer, address) {
  const signature = await signer.signMessage(KEY_DERIVATION_MESSAGE_V1(address));

  if (getBytes(signature).length !== 65) {
    throw new Error(
      'Unsupported wallet: signature is not a standard 65-byte EOA signature. ' +
      'Smart-contract wallets cannot derive a deterministic encryption key.'
    );
  }

  const privateKey = seedToPrivateKey(keccak256(signature));
  const publicKey = SigningKey.computePublicKey(privateKey, true);
  return { privateKey, publicKey };
}

/** ECDH + HKDF-SHA256 -> AES-256-GCM CryptoKey shared between eph/recipient keys. */
async function deriveWrappingKey(sharedSecretHex, ephPublicKeyHex, recipientPublicKeyHex) {
  const ikm = await crypto.subtle.importKey('raw', getBytes(sharedSecretHex), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: getBytes(keccak256(concat([ephPublicKeyHex, recipientPublicKeyHex]))),
      info: HKDF_INFO,
    },
    ikm,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Wrap a raw 32-byte document key to a recipient's encryption public key.
 *
 * Blob layout (94 bytes): version(1) || ephPubCompressed(33) || iv(12) || ciphertext+tag(48)
 *
 * @param {string} recipientPublicKeyHex 33-byte compressed secp256k1 public key (hex)
 * @param {Uint8Array} rawKey the 32-byte AES document key
 * @returns {Promise<string>} hex blob safe to store on-chain
 */
export async function wrapKey(recipientPublicKeyHex, rawKey) {
  if (!(rawKey instanceof Uint8Array) || rawKey.length !== 32) {
    throw new Error('wrapKey expects a 32-byte Uint8Array document key');
  }
  const recipientPub = SigningKey.computePublicKey(recipientPublicKeyHex, true);

  // Fresh ephemeral key per wrap: same doc key wrapped twice yields unlinkable blobs
  const ephPrivate = seedToPrivateKey(hexlify(crypto.getRandomValues(new Uint8Array(32))));
  const ephSigningKey = new SigningKey(ephPrivate);
  const ephPublic = ephSigningKey.compressedPublicKey;

  const sharedSecret = ephSigningKey.computeSharedSecret(recipientPub);
  const wrappingKey = await deriveWrappingKey(sharedSecret, ephPublic, recipientPub);

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, wrappingKey, rawKey);

  return hexlify(concat([new Uint8Array([WRAP_VERSION]), ephPublic, iv, new Uint8Array(ciphertext)]));
}

/**
 * Unwrap a wrapped document key with the recipient's derived private key.
 *
 * @param {string} privateKeyHex recipient's encryption private key (from deriveEncryptionKeypair)
 * @param {string} wrappedHex the 94-byte blob from the chain
 * @returns {Promise<Uint8Array>} the raw 32-byte document key
 */
export async function unwrapKey(privateKeyHex, wrappedHex) {
  const blob = getBytes(wrappedHex);
  if (blob.length !== WRAPPED_KEY_LENGTH) {
    throw new Error(`Invalid wrapped key length: ${blob.length} (expected ${WRAPPED_KEY_LENGTH})`);
  }
  if (blob[0] !== WRAP_VERSION) {
    throw new Error(`Unsupported wrapped key version: ${blob[0]}`);
  }

  const ephPublic = hexlify(blob.slice(1, 1 + EPH_PUB_LENGTH));
  const iv = blob.slice(1 + EPH_PUB_LENGTH, 1 + EPH_PUB_LENGTH + IV_LENGTH);
  const ciphertext = blob.slice(1 + EPH_PUB_LENGTH + IV_LENGTH);

  const signingKey = new SigningKey(privateKeyHex);
  const recipientPub = signingKey.compressedPublicKey;
  const sharedSecret = signingKey.computeSharedSecret(ephPublic);
  const wrappingKey = await deriveWrappingKey(sharedSecret, ephPublic, recipientPub);

  // GCM tag verification makes tampering (or a wrong key) throw here
  const rawKey = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, wrappingKey, ciphertext);
  return new Uint8Array(rawKey);
}

export const WRAPPED_KEY_BYTES = WRAPPED_KEY_LENGTH;
