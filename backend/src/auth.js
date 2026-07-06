import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { verifyMessage, isAddress, getAddress } from 'ethers';

const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const TOKEN_TTL_SECONDS = 60 * 60; // 1 hour
const AUDIENCE = 'docstore-api';

/**
 * SIWE-style wallet authentication.
 *
 * Flow: client requests a nonce for its address, signs the canonical message
 * with its wallet, and exchanges {address, signature} for a JWT whose `sub`
 * is the verified address. Every protected route then trusts req.userAddress
 * instead of client-supplied parameters.
 *
 * The nonce store is in-memory and single-use — fine for a single instance;
 * would need Redis (or similar) if the backend is ever scaled horizontally.
 */
export function createAuthService({ jwtSecret, chainId }) {
  const nonces = new Map(); // address (lowercase) -> { nonce, issuedAt }

  function buildMessage(address, nonce, issuedAt) {
    return (
      'BlockchainDocumentStorage wants you to sign in with your wallet.\n' +
      `Address: ${address}\n` +
      `Chain ID: ${chainId}\n` +
      `Nonce: ${nonce}\n` +
      `Issued At: ${issuedAt}`
    );
  }

  function createNonce(address) {
    if (!address || !isAddress(address)) {
      return { error: 'Invalid wallet address' };
    }
    const checksummed = getAddress(address);
    const nonce = crypto.randomBytes(16).toString('hex');
    const issuedAt = new Date().toISOString();
    nonces.set(checksummed.toLowerCase(), { nonce, issuedAt });
    return { message: buildMessage(checksummed, nonce, issuedAt) };
  }

  function verifySignatureAndIssueToken(address, signature) {
    if (!address || !isAddress(address) || !signature) {
      return { error: 'Address and signature are required' };
    }
    const checksummed = getAddress(address);
    const key = checksummed.toLowerCase();

    const entry = nonces.get(key);
    if (!entry) {
      return { error: 'No pending nonce for this address. Request a new one.' };
    }
    nonces.delete(key); // single-use, even on failure

    if (Date.now() - Date.parse(entry.issuedAt) > NONCE_TTL_MS) {
      return { error: 'Nonce expired. Request a new one.' };
    }

    const message = buildMessage(checksummed, entry.nonce, entry.issuedAt);
    let recovered;
    try {
      recovered = verifyMessage(message, signature);
    } catch {
      return { error: 'Malformed signature' };
    }
    if (recovered.toLowerCase() !== key) {
      return { error: 'Signature does not match address' };
    }

    const token = jwt.sign(
      { sub: key, aud: AUDIENCE },
      jwtSecret,
      { algorithm: 'HS256', expiresIn: TOKEN_TTL_SECONDS }
    );
    return { token, expiresIn: TOKEN_TTL_SECONDS, address: checksummed };
  }

  // Express middleware: verifies the JWT and exposes the wallet address
  function requireWalletAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    try {
      const decoded = jwt.verify(authHeader.substring(7), jwtSecret, { audience: AUDIENCE });
      req.userAddress = decoded.sub;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  return { createNonce, verifySignatureAndIssueToken, requireWalletAuth };
}
