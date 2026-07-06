# SecureChain Docs

A decentralized document vault that encrypts files in your browser, stores them on IPFS, and anchors tamper-proof records on the Polygon blockchain.

## Description

SecureChain Docs is a full-stack web application for secure, private document storage. Every file is encrypted with AES-256-GCM directly in your browser before it leaves your device. The encrypted file is then pinned to IPFS through a secure backend proxy, and a hash of the document is written to a Solidity smart contract on Polygon Amoy. No one, including the server, can read your documents because encryption and decryption happen entirely on your machine.

The system supports granular access control enforced end to end. Owners can grant other wallet addresses either view-only or full access to a document, and each grant can carry an optional expiration time. All access grants and revocations are recorded on-chain so the permission history is transparent and auditable.

Access control is real, not advisory:

- **Wallet-signature authentication.** The backend issues API tokens only after the user proves wallet ownership by signing a nonce (SIWE-style). No request can claim someone else's address.
- **On-chain enforcement.** Before serving any file, the backend queries the `DocumentRegistry` contract: revoked or expired grants are rejected with a 403 at the moment of retrieval.
- **On-chain key distribution.** Each user registers an encryption public key (derived from a wallet signature) in the contract. When an owner grants access, the document's AES key is encrypted to the recipient's public key and stored on-chain with the grant — so granting access also delivers the means to decrypt. The server never sees any keys.

## Pages

The interface ships with light and dark themes; the sun/moon button in the header toggles them, and the choice is remembered across sessions.

### Dashboard

The Dashboard is the landing page after connecting a wallet. It shows an overview of the user's uploaded documents, quick-action buttons to navigate to Upload, Retrieve, or Access, and the current IPFS connection status in the sidebar. The dashboard pulls document records from the smart contract for the connected wallet address.

### Upload

The Upload page walks the user through a four-step flow: generate or load an AES-256 encryption key, select a file, encrypt it client-side, and store the result on IPFS and the blockchain. The file is encrypted in 1 MB chunks using the Web Crypto API before any network request is made. At the store step, the document key is also encrypted to the owner's own on-chain encryption identity, so it can later be recovered with nothing but a wallet signature. After a successful upload, the page displays the IPFS CID and the on-chain document hash.

The encryption key is shown as a 64-character hex string. Users must export and save this key themselves. The key is optionally cached in the browser's IndexedDB for the current session, but it is never sent to the server.

### Retrieve

The Retrieve page has two tabs. **My Documents** lets a user download and decrypt their own files: the encryption key is recovered automatically from the chain with a wallet signature (a self-encrypted copy is stored at upload time), with manual 64-character hex entry as a fallback. **Shared With Me** lists every document other users have granted to the connected wallet, along with the access level and expiration; opening one fetches the encrypted key from the chain, unwraps it locally, and decrypts the file in the browser.

All file content is fetched through the access-controlled backend route, which verifies the caller's on-chain access before serving anything. After decryption, a built-in viewer renders PDFs, Word documents, and Excel spreadsheets.

### Access

The Access page lets document owners manage who can read their files. An owner enters a wallet address and grants either view-only or full access, with an optional expiration date. The recipient must have registered their encryption public key first (a one-time signature + transaction prompted by a banner in the app); the grant transaction stores both the permission and the document key encrypted to the recipient. The page also shows the current access list for a document and allows the owner to revoke any existing grant — revocation deletes the wrapped key on-chain and the backend stops serving the file immediately.

Users with view-only access can preview a document through the built-in viewer but cannot download the raw file. Users with full access can both view and download.

## Architecture

```
Browser (React)
  |-- AES-256-GCM encrypt/decrypt (Web Crypto API)
  |-- ECIES key wrapping (signature-derived secp256k1 keypairs)
  |-- MetaMask / ethers.js  -->  Polygon Amoy
  |                                  |
  |                         DocumentRegistry.sol
  |                          (permissions + wrapped keys)
  |                                  ^
  |-- wallet-signature auth          | read-only access checks
  v                                  |
Express Backend  --------------------+
  |-- ethers.js (verifies hasAccess before serving files)
  |-- Pinata SDK  -->  IPFS (encrypted file storage)
  |-- SIWE-style nonce auth, JWT bound to wallet address
  |-- Rate limiting, Helmet security headers
```

The backend holds the Pinata credentials and acts as a proxy so they are never exposed to the browser. To authenticate, the browser requests a nonce, signs it with MetaMask, and exchanges the signature for a one-hour JWT bound to the verified wallet address. Every file retrieval is then authorized against the smart contract: the backend resolves the document on-chain, checks `hasAccess()` for the authenticated wallet (which enforces revocation and expiration), and only then serves the encrypted bytes. Decryption keys never touch the backend — they travel encrypted inside the contract itself.

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
   npm run compile
   npm run deploy:amoy
   ```

   The deploy script writes the contract address and ABI into `frontend/src/contracts/` automatically. Copy the printed address into `CONTRACT_ADDRESS` in `backend/.env`.

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

### Local Development (No Testnet Required)

The whole stack can run against a local Hardhat chain — no test MATIC, instant transactions:

1. Terminal 1 — local blockchain: `npx hardhat node`
2. Terminal 2 — deploy the contract: `npm run deploy:local` (on a fresh node it deterministically lands at `0x5FbDB2315678afecb367f032d93F642f64180aa3`), then start the backend: `cd backend && npm start`
3. Terminal 3 — frontend: `cd frontend && npm run dev`

Point `backend/.env` at the local chain (`RPC_URL=http://127.0.0.1:8545`, `CHAIN_ID=31337`, and the deployed `CONTRACT_ADDRESS`), and add the network to MetaMask:

| Field           | Value                   |
|-----------------|-------------------------|
| Network Name    | Hardhat Local           |
| RPC URL         | `http://127.0.0.1:8545` |
| Chain ID        | `31337`                 |
| Currency Symbol | ETH                     |

Import one or two of the funded test accounts using the private keys printed by `npx hardhat node`. Two accounts are enough to exercise the full sharing flow (upload as one, grant to and open as the other).

**After every node restart:** redeploy the contract, and clear MetaMask's remembered transaction history for each test account (Settings → Advanced → Clear activity tab data) — otherwise transactions fail with nonce errors.

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

# Blockchain access-control enforcement
RPC_URL=https://rpc-amoy.polygon.technology/
CONTRACT_ADDRESS=0xYourDeployedDocumentRegistryAddress
CHAIN_ID=80002
```

For local development against a Hardhat node, use `RPC_URL=http://127.0.0.1:8545` and `CHAIN_ID=31337`.

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

> **Breaking change:** the contract interface changed (wrapped keys, encryption key registry, shared-document index). It must be redeployed; documents stored under the previous deployment (`0x5A8B...B512`) are not migrated. After deploying, update `CONTRACT_ADDRESS` in `backend/.env` — the deploy script updates the frontend address and ABI automatically.

| Function | Description |
|---|---|
| `storeDocument` | Register a document hash with its IPFS CID and the owner's self-encrypted document key |
| `getDocument` | Retrieve the IPFS CID for a document (requires valid access) |
| `getDocumentMetadata` | Get owner, timestamp, and file name (public) |
| `verifyDocument` | Check whether a document hash exists on-chain |
| `registerEncryptionKey` | Register the caller's encryption public key (required to receive shared documents) |
| `grantAccess` | Give another address view-only or full access, with optional expiration; stores the document key encrypted to the recipient |
| `revokeAccess` | Remove a previously granted access and delete the recipient's wrapped key |
| `getEncryptedKey` | Fetch the wrapped document key for a user (only decryptable by that user) |
| `getSharedDocuments` | List documents that have been shared with an address |
| `hasAccess` | Check whether an address currently has valid access |
| `getUserAccess` | Get the access level and expiration details for a specific address |
| `getDocumentAccessList` | List all addresses that have ever been granted access (owner only) |
| `cleanupExpiredAccess` | Mark an expired access grant as inactive |
| `getUserDocuments` | Return all document hashes owned by an address |
| `getDocumentByIndex` | Return document details by owner address and index |

Access levels: `NONE`, `VIEW_ONLY`, `FULL_ACCESS`, `OWNER`.

## Backend API

All routes except `/health` and the auth handshake require a Bearer JWT bound to a verified wallet address. To obtain one: request a nonce, sign the returned message with the wallet, and exchange the signature for a token.

| Method | Route | Description |
|---|---|---|
| GET | `/health` | Server health check |
| POST | `/api/auth/nonce` | Request a single-use sign-in message for a wallet address |
| POST | `/api/auth/verify` | Exchange `{address, signature}` for a one-hour wallet-bound JWT |
| GET | `/api/documents/:hash/content` | Fetch a document's encrypted content; the backend verifies on-chain access (owner or active grant) before serving |
| POST | `/api/access/validate` | Report the authenticated wallet's real on-chain access level for a document |
| GET | `/api/ipfs/test` | Verify the Pinata connection |
| POST | `/api/ipfs/upload` | Upload an encrypted file to IPFS (owner stamped from the verified JWT) |
| GET | `/api/ipfs/files` | List pinned files |
| DELETE | `/api/ipfs/files/:cid` | Unpin a file from IPFS |
| GET | `/api/ipfs/usage` | Get Pinata storage usage statistics |

Raw retrieval by CID was removed: file content is only served by document hash, after the on-chain access check.

## Testing

Run the full suite from the repository root:

```bash
npm test
```

This runs three suites in order:

| Suite | Command | What it covers |
|---|---|---|
| Contract | `npm run test:contracts` | Hardhat tests for `DocumentRegistry`: storage, grants, revocation, expiration, wrapped keys, the encryption key registry, and permission reverts |
| Crypto | `npm run test:crypto` | The ECIES key-wrap layer (round-trips, determinism, tamper rejection) plus the existing encryption tests |
| Backend | `npm run test:backend` | Integration tests that spin up a local Hardhat node, deploy the contract, and exercise the API with real wallet signatures: owner/granted/revoked/expired/stranger retrieval paths, nonce reuse, and forged-signature rejection |

The backend suite requires compiled contract artifacts; run `npm run compile` first if `artifacts/` is missing.

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

**MetaMask signs with the wrong account or network.** Recent MetaMask versions pin accounts and a network to each connected site, separately from the global selectors. Open the MetaMask menu → Dapp connections → find the site, and edit which accounts and network the connection uses.

**Transactions fail with nonce errors on Hardhat Local.** MetaMask caches transaction counts across node restarts. For each affected account: Settings → Advanced → Clear activity tab data.

**Decryption fails.** Your own documents normally need no manual key: a self-encrypted copy of the document key is stored on-chain at upload and recovered with a wallet signature. If you paste a key manually, it must be the exact AES-256 key from encryption. If both the on-chain copy and your exported key are lost, the file cannot be recovered.

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
|   ├── access-control-test.js
|   ├── keywrap.test.js
|   └── DocumentRegistry.test.js
|
├── artifacts/
|   └── contracts/
|       └── DocumentRegistry.sol/
|           └── DocumentRegistry.json
|
├── backend/
|   ├── server.js
|   ├── src/
|   |   ├── app.js
|   |   ├── auth.js
|   |   ├── chain.js
|   |   └── storage.js
|   ├── test/
|   |   └── api.test.js
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
|       |   └── useEncryption.js
|       ├── utils/
|       |   ├── crypto.js
|       |   ├── keywrap.js
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
