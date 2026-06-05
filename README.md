# SecureChain Docs

A decentralized document vault that encrypts files in your browser, stores them on IPFS, and anchors tamper-proof records on the Polygon blockchain.

## Description

SecureChain Docs is a full-stack web application for secure, private document storage. Every file is encrypted with AES-256-GCM directly in your browser before it leaves your device. The encrypted file is then pinned to IPFS through a secure backend proxy, and a hash of the document is written to a Solidity smart contract on Polygon Amoy. No one, including the server, can read your documents because encryption and decryption happen entirely on your machine.

The system supports granular access control. Owners can grant other wallet addresses either view-only or full access to a document, and each grant can carry an optional expiration time. All access grants and revocations are recorded on-chain so the permission history is transparent and auditable.

## Pages

### Dashboard

The Dashboard is the landing page after connecting a wallet. It shows an overview of the user's uploaded documents, quick-action buttons to navigate to Upload, Retrieve, or Access, and the current IPFS connection status in the sidebar. The dashboard pulls document records from the smart contract for the connected wallet address.

### Upload

The Upload page walks the user through a three-step flow: select a file, generate or load an AES-256 encryption key, and submit the encrypted file to IPFS and the blockchain. The file is encrypted in 1 MB chunks using the Web Crypto API before any network request is made. After a successful upload, the page displays the IPFS CID and the on-chain document hash, both of which are needed to retrieve the file later.

The encryption key is shown as a 64-character hex string. Users must export and save this key themselves. The key is optionally cached in the browser's IndexedDB for the current session, but it is never sent to the server.

### Retrieve

The Retrieve page lets a user download and decrypt a document they own or have been granted access to. The user provides the document hash or IPFS CID and their encryption key. The backend fetches the encrypted file from IPFS, returns it to the browser as base64, and the browser decrypts it locally. After decryption, the page opens a built-in viewer for PDFs, Word documents, and Excel spreadsheets so users can preview the file before saving it.

### Access

The Access page lets document owners manage who can read their files. An owner can enter a wallet address and choose to grant either view-only or full access, with an optional expiration date. Each grant is submitted as a blockchain transaction through the DocumentRegistry smart contract. The page also shows the current access list for a document and allows the owner to revoke any existing grant.

Users with view-only access can preview a document through the built-in viewer but cannot download the raw file. Users with full access can both view and download.

## Architecture

```
Browser (React)
  |-- AES-256-GCM encrypt/decrypt (Web Crypto API)
  |-- MetaMask / ethers.js  -->  Polygon Amoy
  |                                  |
  |                         DocumentRegistry.sol
  |
  |-- JWT-authenticated requests
  v
Express Backend
  |-- Pinata SDK  -->  IPFS (file storage)
  |-- JWT signing and verification
  |-- Rate limiting, Helmet security headers
```

The backend holds the Pinata credentials and acts as a proxy so they are never exposed to the browser. The browser first requests a short-lived JWT from the backend, then uses that token to authenticate all upload and retrieval requests.

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [MetaMask](https://metamask.io/) browser extension
- A [Pinata](https://pinata.cloud/) account (free tier is sufficient)
- Test MATIC from the Polygon faucet (for Amoy testnet transactions)

## Instructions

Note: These instructions are for macOS and Linux terminals.

1. Clone the repository.

   ```bash
   git clone https://github.com/Pradhyumn-Thakur/SecureChain-Docs.git
   cd SecureChain-Docs
   ```

2. Install root dependencies (Hardhat toolchain).

   ```bash
   npm install
   ```

3. Install frontend dependencies.

   ```bash
   cd frontend && npm install && cd ..
   ```

4. Install backend dependencies.

   ```bash
   cd backend && npm install && cd ..
   ```

5. Configure environment variables (see the Configuration section below).

6. Compile and deploy the smart contract.

   ```bash
   npx hardhat compile
   npx hardhat run scripts/deploy.js --network polygonAmoy
   ```

   Copy the deployed contract address from the output and update `frontend/src/contracts/contract-address.json`.

7. Start the backend server in a new terminal.

   ```bash
   cd backend && npm run dev
   ```

   The API runs on `http://localhost:3001`.

8. Start the frontend development server in another terminal.

   ```bash
   cd frontend && npm run dev
   ```

   The app opens at `http://localhost:5173`.

9. Open `http://localhost:5173` in a browser with MetaMask installed. Switch MetaMask to the Polygon Amoy network (see the MetaMask Setup section below) and connect your wallet.

To stop the servers, press Ctrl+C in each terminal.

## Configuration

### Root `.env`

Create a `.env` file in the project root with the following values:

```env
PRIVATE_KEY=your_wallet_private_key_without_0x_prefix
POLYGONSCAN_API_KEY=your_polygonscan_api_key
AMOY_RPC_URL=https://rpc-amoy.polygon.technology/
```

### Backend `.env`

Copy the example file and fill in your values:

```bash
cp backend/.env.example backend/.env
```

```env
PINATA_JWT=your_pinata_jwt_token
JWT_SECRET=your_random_secret_at_least_32_characters
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

To generate a secure JWT secret, run:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### MetaMask Network Setup

Add Polygon Amoy to MetaMask manually with these values:

| Field           | Value                                  |
|-----------------|----------------------------------------|
| Network Name    | Polygon Amoy                           |
| RPC URL         | `https://rpc-amoy.polygon.technology/` |
| Chain ID        | `80002`                                |
| Currency Symbol | MATIC                                  |
| Block Explorer  | `https://amoy.polygonscan.com`         |

Get free test MATIC from the Polygon faucet before uploading any documents.

## Smart Contract

**File:** `contracts/DocumentRegistry.sol`  
**Solidity version:** 0.8.19  
**Deployed on:** Polygon Amoy at `0x5A8Bc28165a1B406A1cAe8b21DcC60d3d368B512`

| Function | Description |
|---|---|
| `storeDocument` | Register a document hash with its IPFS CID |
| `getDocument` | Retrieve the IPFS CID for a document (requires valid access) |
| `getDocumentMetadata` | Get owner, timestamp, and file name (public) |
| `verifyDocument` | Check whether a document hash exists on-chain |
| `grantAccess` | Give another address view-only or full access, with optional expiration |
| `revokeAccess` | Remove a previously granted access |
| `hasAccess` | Check whether an address currently has valid access |
| `getUserAccess` | Get the access level and expiration details for a specific address |
| `getDocumentAccessList` | List all addresses that have ever been granted access (owner only) |
| `cleanupExpiredAccess` | Mark an expired access grant as inactive |
| `getUserDocuments` | Return all document hashes owned by an address |
| `getDocumentByIndex` | Return document details by owner address and index |

Access levels: `NONE`, `VIEW_ONLY`, `FULL_ACCESS`, `OWNER`.

## Backend API

All routes except `/health` require a Bearer JWT obtained from `POST /api/auth/token`.

| Method | Route | Description |
|---|---|---|
| GET | `/health` | Server health check |
| POST | `/api/auth/token` | Issue a short-lived JWT for subsequent requests |
| GET | `/api/ipfs/test` | Verify the Pinata connection |
| POST | `/api/ipfs/upload` | Upload an encrypted file to IPFS |
| GET | `/api/ipfs/retrieve/:cid` | Fetch an encrypted file from IPFS by CID |
| GET | `/api/ipfs/files` | List pinned files |
| DELETE | `/api/ipfs/files/:cid` | Unpin a file from IPFS |
| POST | `/api/access/validate` | Validate a user's access level for a document |
| POST | `/api/access/token` | Generate a time-limited access token for a document |
| GET | `/api/ipfs/usage` | Get Pinata storage usage statistics |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| D | Go to Dashboard |
| U | Go to Upload |
| R | Go to Retrieve |
| A | Go to Access |
| B | Toggle sidebar |

## Troubleshooting

**MetaMask will not connect.** Make sure the extension is unlocked and set to the Polygon Amoy network (chain ID 80002). Clear the browser cache if the connection drops repeatedly.

**IPFS uploads fail.** Check that your Pinata JWT is correct and that the backend `.env` is saved properly. Run `curl http://localhost:3001/health` to confirm the backend is running.

**Contract deployment fails.** Verify that your wallet has test MATIC and that `PRIVATE_KEY` in the root `.env` does not include a `0x` prefix.

**Decryption fails.** You must use the same AES-256 key that was used during encryption. If the key is lost, the file cannot be recovered. Export and store the key safely after generating it.

## File Organization

```
SecureChainDocs/
|
├── contracts/
|   └── DocumentRegistry.sol
|
├── scripts/
|   └── deploy.js
|
├── test/
|   └── access-control-test.js
|
├── artifacts/
|   └── contracts/
|       └── DocumentRegistry.sol/
|           └── DocumentRegistry.json
|
├── backend/
|   ├── server.js
|   ├── package.json
|   └── .env.example
|
├── frontend/
|   ├── index.html
|   ├── package.json
|   ├── vite.config.js
|   ├── tailwind.config.js
|   ├── postcss.config.js
|   └── src/
|       ├── App.jsx
|       ├── main.jsx
|       ├── index.css
|       ├── components/
|       |   ├── Dashboard/
|       |   |   └── index.jsx
|       |   ├── UploadFlow/
|       |   |   └── index.jsx
|       |   ├── DocumentRetrieval/
|       |   |   └── index.jsx
|       |   ├── AccessManagementPage/
|       |   |   └── index.jsx
|       |   ├── DocumentViewer/
|       |   |   ├── index.jsx
|       |   |   ├── PDFViewer.jsx
|       |   |   ├── WordViewer.jsx
|       |   |   └── ExcelViewer.jsx
|       |   ├── WalletConnect/
|       |   |   └── index.jsx
|       |   ├── IPFSStatus/
|       |   |   └── index.jsx
|       |   ├── FileUpload/
|       |   |   └── index.jsx
|       |   ├── EncryptionModule/
|       |   |   └── index.jsx
|       |   ├── KeyManagement/
|       |   |   └── index.jsx
|       |   └── AccessManagement/
|       |       └── index.jsx
|       ├── contexts/
|       |   └── Web3Context.jsx
|       ├── hooks/
|       |   ├── useAccessControl.js
|       |   └── useEncryption.js
|       ├── utils/
|       |   ├── crypto.js
|       |   └── ipfs.js
|       └── contracts/
|           ├── DocumentRegistry.abi.json
|           ├── DocumentRegistry.json
|           └── contract-address.json
|
├── hardhat.config.js
├── package.json
└── README.md
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, Framer Motion, ethers.js v6 |
| Backend | Node.js, Express, Multer, Helmet, express-rate-limit, Pinata SDK |
| Blockchain | Solidity 0.8.19, Hardhat, OpenZeppelin Contracts v5 |
| Storage | IPFS via Pinata, IndexedDB (browser key storage) |
| Cryptography | Web Crypto API (AES-256-GCM, SHA-256, PBKDF2) |

## License

Copyright (c) 2026 Pradhyumn Thakur. All rights reserved.
