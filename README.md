# Blockchain Document Storage

Decentralized document vault that encrypts files in your browser, stores them on IPFS, and anchors tamper-proof records on Polygon.

## About

Sensitive documents deserve better than a cloud folder protected by a password. This system encrypts every file client-side with AES-256-GCM before it ever leaves your device, pins the ciphertext to IPFS through a secure backend proxy, and writes the document hash to a Polygon smart contract so nobody — including us — can alter or deny its existence.

The result: you hold the encryption key, the network holds the data, and the blockchain holds the proof.

## Features

- **Client-side encryption** — AES-256-GCM via the Web Crypto API. Keys never leave the browser.
- **IPFS storage** — Encrypted files pinned through Pinata for persistent, distributed availability.
- **On-chain registry** — Document hashes, ownership, and access grants recorded on Polygon.
- **Granular access control** — Grant view-only or full access to other wallets, with optional time-based expiration.
- **Built-in document viewers** — Preview PDFs, Word docs, and Excel spreadsheets after decryption.
- **Dark and light themes** — Polished UI with animated transitions, keyboard shortcuts, and responsive layout.

## Architecture

```
┌──────────────┐      ┌──────────────┐      ┌────────────┐
│   Browser    │      │   Backend    │      │   Pinata   │
│              │      │   (Express)  │      │   (IPFS)   │
│  React 19    │─────▶│  JWT auth    │─────▶│  Pinning   │
│  Web Crypto  │      │  Rate limit  │      │  service   │
│  ethers.js   │      │  Helmet      │      └────────────┘
│              │      └──────────────┘
│  MetaMask    │─────▶ Polygon (Amoy) ─────▶ DocumentRegistry.sol
└──────────────┘
```

Encryption and decryption happen entirely in the browser. The backend exists only to proxy IPFS uploads so your Pinata credentials stay server-side.

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [MetaMask](https://metamask.io/) browser extension
- A [Pinata](https://pinata.cloud/) account (free tier works)
- Test MATIC from the [Polygon faucet](https://faucet.polygon.technology/) (for Amoy testnet)

## Quick Start

```bash
# Clone
git clone https://github.com/pradhyumnsinghthakur/BlockchainDocumentStorage.git
cd BlockchainDocumentStorage

# Install all dependencies
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..

# Configure environment (see "Configuration" below)

# Deploy the smart contract
npx hardhat compile
npx hardhat run scripts/deploy.js --network polygonAmoy

# Start backend (terminal 1)
cd backend && npm run dev

# Start frontend (terminal 2)
cd frontend && npm run dev
```

The app opens at `http://localhost:5173`. The backend API runs on `http://localhost:3001`.

## Configuration

### Root `.env`

```env
PRIVATE_KEY=your_wallet_private_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key
AMOY_RPC_URL=https://rpc-amoy.polygon.technology/
```

### Backend `.env`

Copy the example and fill in your values:

```bash
cp backend/.env.example backend/.env
```

```env
PINATA_JWT=your_pinata_jwt_token
JWT_SECRET=your_random_secret_min_32_chars
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

Generate a JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### MetaMask Network Setup

Add Polygon Amoy to MetaMask:

| Field           | Value                                    |
|-----------------|------------------------------------------|
| Network Name    | Polygon Amoy                             |
| RPC URL         | `https://rpc-amoy.polygon.technology/`   |
| Chain ID        | `80002`                                  |
| Currency Symbol | MATIC                                    |
| Block Explorer  | `https://amoy.polygonscan.com`           |

## Usage

1. **Connect wallet** — Click "Connect Wallet" and approve in MetaMask.
2. **Generate a key** — Go to the Upload page. Generate an AES-256 encryption key (export it and store it safely — you cannot recover files without it).
3. **Upload a document** — Select a file. It gets encrypted in your browser, uploaded to IPFS, and registered on-chain.
4. **Retrieve a document** — Go to the Retrieve page. Enter the document hash, provide your key, and the file is downloaded from IPFS and decrypted locally.
5. **Manage access** — On the Access page, grant or revoke access for other wallet addresses. Set view-only or full access with optional expiration.

Keyboard shortcuts: **D** (Dashboard), **U** (Upload), **R** (Retrieve), **A** (Access).

## Smart Contract

**Contract**: `DocumentRegistry.sol` (Solidity 0.8.19, MIT licensed)
**Deployed to**: Polygon Amoy at `0x5A8Bc28165a1B406A1cAe8b21DcC60d3d368B512`

| Function | Description |
|----------|-------------|
| `storeDocument` | Register a document hash with its IPFS CID |
| `getDocument` | Retrieve document metadata (requires access) |
| `grantAccess` | Give another address view-only or full access |
| `revokeAccess` | Remove a previously granted access |
| `getUserDocuments` | List all documents owned by an address |
| `cleanupExpiredAccess` | Remove expired access grants |

Access levels: `NONE`, `VIEW_ONLY`, `FULL_ACCESS`, `OWNER`.

## Development

### Run smart contract tests

```bash
npx hardhat test
REPORT_GAS=true npx hardhat test
```

### Deploy to local Hardhat network

```bash
# Terminal 1
npx hardhat node

# Terminal 2
npx hardhat run scripts/deploy.js --network localhost
```

### Verify contract on Polygonscan

```bash
npx hardhat verify --network polygonAmoy <CONTRACT_ADDRESS>
```

## Tech Stack

| Layer      | Technology |
|------------|------------|
| Frontend   | React 19, Vite 7, Tailwind CSS, Framer Motion, ethers.js v6 |
| Backend    | Node.js, Express, Multer, Helmet, express-rate-limit |
| Blockchain | Solidity 0.8.19, Hardhat, OpenZeppelin Contracts v5 |
| Storage    | IPFS via Pinata, IndexedDB (browser key storage) |
| Crypto     | Web Crypto API (AES-256-GCM), SHA-256 hashing |

## Troubleshooting

**MetaMask won't connect** — Make sure the extension is unlocked and set to the Polygon Amoy network. Clear the browser cache if the connection drops repeatedly.

**IPFS uploads fail** — Check that your Pinata JWT is valid and the backend `.env` is configured. Run `curl http://localhost:3001/health` to confirm the backend is reachable.

**Contract deployment fails** — Verify your wallet has test MATIC and that `PRIVATE_KEY` in the root `.env` is correct (without a `0x` prefix if Hardhat complains).

**Decryption fails** — You must use the same AES key that was used during encryption. If you lost the key, the file cannot be recovered — this is by design.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Open a pull request

## License

ISC
