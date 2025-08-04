import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import crypto from 'crypto';
import multer from 'multer';
import { PinataSDK } from 'pinata';
import jwt from 'jsonwebtoken';
import FormData from 'form-data';
import fetch from 'node-fetch';

// Load environment variables from current directory
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Validate required environment variables
const requiredEnvVars = ['PINATA_JWT', 'JWT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Initialize Pinata SDK securely on server
const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types since we're dealing with encrypted data
    cb(null, true);
  }
});

// Middleware to generate signed JWT for Pinata operations
const generateSignedJWT = (req, res, next) => {
  try {
    // Generate a short-lived token (15 minutes)
    const token = jwt.sign(
      {
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
        sub: 'pinata-operations',
        aud: 'ipfs-client',
        nonce: crypto.randomBytes(16).toString('hex')
      },
      process.env.JWT_SECRET,
      { algorithm: 'HS256' }
    );
    
    req.signedToken = token;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate signed token' });
  }
};

// Middleware to verify signed JWT
const verifySignedJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Generate signed JWT endpoint
app.post('/api/auth/token', generateSignedJWT, (req, res) => {
  res.json({
    token: req.signedToken,
    expiresIn: '15m',
    type: 'Bearer'
  });
});

// Test Pinata connection
app.get('/api/ipfs/test', verifySignedJWT, async (req, res) => {
  try {
    // Test with a simple authentication check
    const testResponse = await pinata.testAuthentication();
    res.json({ success: true, message: 'Pinata connection successful', data: testResponse });
  } catch (error) {
    console.error('Pinata test failed:', error);
    res.status(500).json({ 
      success: false, 
      error: `Failed to connect to Pinata: ${error.message}`
    });
  }
});

// Upload encrypted file to IPFS
app.post('/api/ipfs/upload', verifySignedJWT, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { metadata } = req.body;
    let parsedMetadata = {};
    
    if (metadata) {
      try {
        parsedMetadata = JSON.parse(metadata);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid metadata format' });
      }
    }

    // Prepare metadata for Pinata
    const pinataMetadata = {
      name: `Encrypted: ${req.file.originalname}`,
      keyvalues: {
        originalFileName: req.file.originalname,
        uploadedAt: new Date().toISOString(),
        fileSize: req.file.size.toString(),
        ...parsedMetadata
      }
    };

    // Use REST API approach with form-data for Node.js
    const formData = new FormData();
    
    // Append file buffer directly to form-data
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype || 'application/octet-stream'
    });
    
    // Add metadata 
    formData.append('pinataMetadata', JSON.stringify(pinataMetadata));
    
    // Add options
    const pinataOptions = {
      cidVersion: 1
    };
    formData.append('pinataOptions', JSON.stringify(pinataOptions));

    const uploadResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PINATA_JWT}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Pinata upload failed:', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        headers: Object.fromEntries(uploadResponse.headers.entries()),
        body: errorText
      });
      throw new Error(`Pinata upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    const response = await uploadResponse.json();

    res.json({
      success: true,
      cid: response.IpfsHash,
      ipfsHash: response.IpfsHash,
      size: response.PinSize,
      timestamp: response.Timestamp,
      metadata: pinataMetadata
    });

  } catch (error) {
    console.error('IPFS upload failed:', error);
    res.status(500).json({ 
      success: false, 
      error: `Failed to upload to IPFS: ${error.message}` 
    });
  }
});

// Retrieve file from IPFS
app.get('/api/ipfs/retrieve/:cid', verifySignedJWT, async (req, res) => {
  try {
    const { cid } = req.params;
    
    if (!cid) {
      return res.status(400).json({ error: 'CID is required' });
    }

    // Use Pinata gateway to get file data
    const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
    const fileResponse = await fetch(gatewayUrl);
    
    if (!fileResponse.ok) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileData = await fileResponse.arrayBuffer();

    // Get file metadata using REST API
    let metadata = {};
    try {
      const metadataResponse = await fetch(`https://api.pinata.cloud/data/pinList?hashContains=${cid}&status=pinned&pageLimit=1`, {
        headers: {
          'Authorization': `Bearer ${process.env.PINATA_JWT}`
        }
      });
      
      if (metadataResponse.ok) {
        const metadataResult = await metadataResponse.json();
        if (metadataResult.rows && metadataResult.rows.length > 0) {
          metadata = metadataResult.rows[0].metadata || {};
        }
      }
    } catch (metaError) {
      console.warn('Could not retrieve metadata:', metaError);
    }

    res.json({
      success: true,
      data: Buffer.from(fileData).toString('base64'), // Convert to base64 for JSON transport
      metadata: metadata,
      cid: cid
    });

  } catch (error) {
    console.error('IPFS retrieval failed:', error);
    res.status(500).json({ 
      success: false, 
      error: `Failed to retrieve from IPFS: ${error.message}` 
    });
  }
});

// List files
app.get('/api/ipfs/files', verifySignedJWT, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const response = await fetch(`https://api.pinata.cloud/data/pinList?status=pinned&pageLimit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${process.env.PINATA_JWT}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to list files: ${response.status}`);
    }

    const result = await response.json();
    
    res.json({
      success: true,
      files: result.rows || [],
      count: result.count || 0
    });

  } catch (error) {
    console.error('Failed to list files:', error);
    res.status(500).json({ 
      success: false, 
      error: `Failed to list files: ${error.message}` 
    });
  }
});

// Get usage statistics
app.get('/api/ipfs/usage', verifySignedJWT, async (req, res) => {
  try {
    // Check if usage API is available in this SDK version
    if (!pinata.usage || typeof pinata.usage.get !== 'function') {
      throw new Error('Usage API not available in current Pinata SDK version');
    }
    
    const response = await pinata.usage.get();
    
    res.json({
      success: true,
      usage: {
        totalStorage: response.total_storage_size,
        storageLimit: response.total_storage_size_limit,
        fileCount: response.pin_count,
        fileLimit: response.pin_count_limit
      }
    });

  } catch (error) {
    // Don't log usage API errors as they're expected with this SDK version
    // Return success with null usage instead of error to not break the frontend
    res.json({ 
      success: true, 
      usage: null,
      message: 'Usage statistics temporarily unavailable'
    });
  }
});

// Delete/unpin file
app.delete('/api/ipfs/files/:cid', verifySignedJWT, async (req, res) => {
  try {
    const { cid } = req.params;
    
    if (!cid) {
      return res.status(400).json({ error: 'CID is required' });
    }

    await pinata.files.delete([cid]);
    
    res.json({
      success: true,
      message: 'File unpinned successfully'
    });

  } catch (error) {
    console.error('Failed to unpin file:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to unpin file' 
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: error.message })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Secure IPFS API server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
});