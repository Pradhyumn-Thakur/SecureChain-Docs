import dotenv from 'dotenv';
import { createApp } from './src/app.js';
import { createAuthService } from './src/auth.js';
import { createChainService } from './src/chain.js';
import { createStorageService } from './src/storage.js';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['PINATA_JWT', 'JWT_SECRET', 'RPC_URL', 'CONTRACT_ADDRESS'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const PORT = process.env.PORT || 3001;
const CHAIN_ID = parseInt(process.env.CHAIN_ID) || 80002; // Polygon Amoy

const app = createApp({
  authService: createAuthService({
    jwtSecret: process.env.JWT_SECRET,
    chainId: CHAIN_ID,
  }),
  chainService: createChainService({
    rpcUrl: process.env.RPC_URL,
    contractAddress: process.env.CONTRACT_ADDRESS,
  }),
  storageService: createStorageService({
    pinataJwt: process.env.PINATA_JWT,
  }),
  corsOrigin: process.env.CORS_ORIGIN,
  rateLimitOptions: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || undefined,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || undefined,
  },
});

app.listen(PORT, () => {
  console.log(`🚀 Secure IPFS API server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
  console.log(`Chain: ${CHAIN_ID} via ${process.env.RPC_URL}`);
  console.log(`Contract: ${process.env.CONTRACT_ADDRESS}`);
});
