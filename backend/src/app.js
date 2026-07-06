import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';

const DOCUMENT_HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/;

/**
 * Build the Express app with injected services. server.js wires real services
 * from env; tests inject a real chain service (local hardhat node) and a fake
 * storage service.
 *
 * @param {object} deps
 * @param {object} deps.authService createAuthService(...)
 * @param {object} deps.chainService createChainService(...)
 * @param {object} deps.storageService createStorageService(...) or a test fake
 * @param {string} [deps.corsOrigin]
 * @param {object} [deps.rateLimitOptions]
 */
export function createApp({ authService, chainService, storageService, corsOrigin, rateLimitOptions }) {
  const app = express();
  const { requireWalletAuth } = authService;

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: corsOrigin || 'http://localhost:5173',
    credentials: true,
    optionsSuccessStatus: 200,
  }));

  app.use(rateLimit({
    windowMs: rateLimitOptions?.windowMs || 15 * 60 * 1000,
    max: rateLimitOptions?.max || 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB — encrypted blobs
  });

  // ───────────────────────── Health ─────────────────────────

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ─────────────────── Wallet authentication ───────────────────

  // Step 1: request a single-use nonce message to sign
  app.post('/api/auth/nonce', (req, res) => {
    const result = authService.createNonce(req.body?.address);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ message: result.message });
  });

  // Step 2: exchange the signature for an address-bound JWT
  app.post('/api/auth/verify', (req, res) => {
    const { address, signature } = req.body || {};
    const result = authService.verifySignatureAndIssueToken(address, signature);
    if (result.error) {
      return res.status(401).json({ error: result.error });
    }
    res.json({ token: result.token, expiresIn: result.expiresIn, address: result.address, type: 'Bearer' });
  });

  // ───────────────────────── IPFS ─────────────────────────

  app.get('/api/ipfs/test', requireWalletAuth, async (req, res) => {
    try {
      const data = await storageService.testConnection();
      res.json({ success: true, message: 'Pinata connection successful', data });
    } catch (error) {
      console.error('Pinata test failed:', error);
      res.status(500).json({ success: false, error: `Failed to connect to Pinata: ${error.message}` });
    }
  });

  // Upload an encrypted file. The owner is the authenticated wallet — any
  // client-supplied ownerAddress is ignored.
  app.post('/api/ipfs/upload', requireWalletAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      let parsedMetadata = {};
      if (req.body.metadata) {
        try {
          parsedMetadata = JSON.parse(req.body.metadata);
        } catch {
          return res.status(400).json({ error: 'Invalid metadata format' });
        }
      }

      const keyvalues = {
        fileName: req.file.originalname,
        uploadedAt: new Date().toISOString(),
        fileSize: req.file.size.toString(),
        ownerAddress: req.userAddress, // verified by signature, not self-claimed
        algorithm: parsedMetadata?.algorithm || 'AES-256-GCM',
        originalHash: parsedMetadata?.originalHash || '',
      };

      const result = await storageService.uploadFile({
        buffer: req.file.buffer,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        keyvalues,
      });

      res.json({
        success: true,
        cid: result.cid,
        ipfsHash: result.cid,
        size: result.size,
        timestamp: result.timestamp,
      });
    } catch (error) {
      console.error('IPFS upload failed:', error);
      res.status(500).json({ success: false, error: `Failed to upload to IPFS: ${error.message}` });
    }
  });

  // ─────────────── Document retrieval (the enforcement core) ───────────────
  //
  // Files are addressed by on-chain document hash, never by raw CID: the
  // contract is the only authority on who may read what. The flow is:
  //   1. resolve the document on-chain (404 if unknown)
  //   2. authorize: owner, or hasAccess() — which enforces revocation and
  //      expiration at the current block — (403 otherwise)
  //   3. only then fetch the encrypted blob from IPFS and return it
  app.get('/api/documents/:documentHash/content', requireWalletAuth, async (req, res) => {
    try {
      const { documentHash } = req.params;
      if (!DOCUMENT_HASH_PATTERN.test(documentHash)) {
        return res.status(400).json({ error: 'Invalid document hash format' });
      }

      const doc = await chainService.getDocument(documentHash);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found on-chain' });
      }

      const isOwner = doc.owner.toLowerCase() === req.userAddress;
      if (!isOwner && !(await chainService.hasAccess(documentHash, req.userAddress))) {
        return res.status(403).json({ error: 'Access denied: no active on-chain grant for this document' });
      }

      const fileBuffer = await storageService.fetchByCid(doc.ipfsCID);
      if (!fileBuffer) {
        return res.status(404).json({ error: 'File not found on IPFS', cid: doc.ipfsCID });
      }

      const access = isOwner
        ? { level: 'owner', expirationTime: 0 }
        : await chainService.getUserAccess(documentHash, req.userAddress);

      res.json({
        success: true,
        data: fileBuffer.toString('base64'),
        cid: doc.ipfsCID,
        fileName: doc.fileName,
        owner: doc.owner,
        accessLevel: access.level,
        expirationTime: access.expirationTime,
      });
    } catch (error) {
      console.error('Document retrieval failed:', error);
      res.status(500).json({ success: false, error: `Failed to retrieve document: ${error.message}` });
    }
  });

  // ───────────────────── Access validation ─────────────────────

  // Real on-chain validation. The address comes from the verified JWT —
  // clients cannot ask about (or claim) someone else's access.
  app.post('/api/access/validate', requireWalletAuth, async (req, res) => {
    try {
      const { documentHash } = req.body || {};
      if (!documentHash || !DOCUMENT_HASH_PATTERN.test(documentHash)) {
        return res.status(400).json({ error: 'Valid documentHash is required' });
      }

      const doc = await chainService.getDocument(documentHash);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found on-chain' });
      }

      const isOwner = doc.owner.toLowerCase() === req.userAddress;
      const access = await chainService.getUserAccess(documentHash, req.userAddress);
      const isValid = isOwner || await chainService.hasAccess(documentHash, req.userAddress);

      res.json({
        success: true,
        isValid,
        isOwner,
        level: isOwner ? 'owner' : access.level,
        expirationTime: access.expirationTime,
        isExpired: access.isExpired,
      });
    } catch (error) {
      console.error('Access validation failed:', error);
      res.status(500).json({ success: false, error: `Failed to validate access: ${error.message}` });
    }
  });

  // ───────────────────── Pinata management ─────────────────────

  app.get('/api/ipfs/files', requireWalletAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const result = await storageService.listFiles(limit);
      res.json({ success: true, files: result.files, count: result.count });
    } catch (error) {
      console.error('Failed to list files:', error);
      res.status(500).json({ success: false, error: `Failed to list files: ${error.message}` });
    }
  });

  app.get('/api/ipfs/usage', requireWalletAuth, async (req, res) => {
    try {
      const usage = await storageService.getUsage();
      res.json({ success: true, usage, ...(usage ? {} : { message: 'Usage statistics temporarily unavailable' }) });
    } catch {
      res.json({ success: true, usage: null, message: 'Usage statistics temporarily unavailable' });
    }
  });

  app.delete('/api/ipfs/files/:cid', requireWalletAuth, async (req, res) => {
    try {
      await storageService.unpin(req.params.cid);
      res.json({ success: true, message: 'File unpinned successfully' });
    } catch (error) {
      console.error('Failed to unpin file:', error);
      res.status(500).json({ success: false, error: 'Failed to unpin file' });
    }
  });

  // ───────────────────── Error handling ─────────────────────

  app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
      error: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { details: error.message }),
    });
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  return app;
}
