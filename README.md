# Blockchain Document Storage System

A decentralized document storage solution built on **Polygon** that combines client-side encryption with blockchain technology and IPFS storage. This system allows users to securely encrypt documents locally and store them on a distributed network with blockchain-verified integrity.

## 🚀 Project Overview

This project provides a secure, decentralized way to store sensitive documents on the **Polygon blockchain** by:
- **Client-side AES-256-GCM encryption** - Documents are encrypted in the browser before leaving your device
- **Polygon blockchain verification** - Document hashes are stored on-chain for tamper-proof verification
- **Low transaction costs** - Leveraging Polygon's efficient Layer 2 solution
- **IPFS integration** (planned) - Encrypted documents will be stored on IPFS for decentralized storage
- **Access control** - Smart contract-based permission management for document sharing

### Why Polygon?
- **Low fees**: Fraction of Ethereum mainnet costs
- **Fast transactions**: 2-3 second block times
- **EVM compatible**: Full compatibility with Ethereum tools
- **Eco-friendly**: Proof-of-Stake consensus mechanism

### Current Implementation Status

✅ **Completed Features:**
- Web Crypto API implementation for AES-256-GCM encryption
- Key generation and management system
- File upload and encryption interface
- Smart contract for document registry
- Hash calculation for file integrity
- Local key storage using IndexedDB

🚧 **In Progress:**
- IPFS integration for encrypted file storage
- Web3 wallet connection
- Smart contract interaction from frontend
- Document retrieval and decryption

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher) - [Download](https://nodejs.org/)
- **npm** (v8.0.0 or higher) - Comes with Node.js
- **Git** - [Download](https://git-scm.com/)
- **MetaMask** browser extension - [Install](https://metamask.io/)

### Polygon Network Setup:
1. Add Polygon networks to MetaMask:
   - **Polygon Mainnet**:
     - Network Name: Polygon
     - RPC URL: https://polygon-rpc.com/
     - Chain ID: 137
     - Currency Symbol: MATIC
     - Block Explorer: https://polygonscan.com/
   
   - **Polygon Amoy Testnet**:
     - Network Name: Polygon Amoy
     - RPC URL: https://rpc-amoy.polygon.technology/
     - Chain ID: 80002
     - Currency Symbol: MATIC
     - Block Explorer: https://www.oklink.com/amoy

2. Get test MATIC for Amoy from [Polygon Faucet](https://faucet.polygon.technology/)

### Optional (for blockchain development):
- **Hardhat** - Will be installed as project dependency
- **A code editor** (VS Code recommended) - [Download](https://code.visualstudio.com/)

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd <project-directory>
```

### 2. Install Dependencies

The project has two main parts that need setup:

#### Install Root Dependencies (Blockchain/Smart Contracts)
```bash
# In the root directory
npm install
```

#### Install Frontend Dependencies
```bash
# Navigate to frontend directory
cd frontend
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
# For Hardhat (Polygon deployment)
PRIVATE_KEY=your_wallet_private_key_here
POLYGONSCAN_API_KEY=your_polygonscan_api_key

# Polygon Network RPC URLs
POLYGON_RPC_URL=https://polygon-rpc.com/
AMOY_RPC_URL=https://rpc-amoy.polygon.technology/

# Optional: If using Alchemy or Infura
ALCHEMY_API_KEY=your_alchemy_api_key
```

You'll also need to create a `hardhat.config.js` file in the root directory:

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.19",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    amoy: {
      url: process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology/",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80002
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com/",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 137
    }
  },
  etherscan: {
    apiKey: {
      polygon: process.env.POLYGONSCAN_API_KEY,
      amoy: process.env.POLYGONSCAN_API_KEY
    }
  }
};
```

### 4. Compile Smart Contracts

```bash
# In the root directory
npx hardhat compile
```

This will compile the `DocumentRegistry.sol` contract and generate artifacts.

### 5. Deploy Smart Contracts

#### For Local Development (Hardhat Network):
```bash
# Start local Hardhat node in one terminal
npx hardhat node

# In another terminal, deploy contracts
npx hardhat run scripts/deploy.js --network localhost
```

#### For Polygon Amoy Testnet:
```bash
# Deploy to Amoy testnet
npx hardhat run scripts/deploy.js --network amoy
```

#### For Polygon Mainnet (Production):
```bash
# Deploy to Polygon mainnet (ensure you have MATIC for gas)
npx hardhat run scripts/deploy.js --network polygon
```

The deployment script will:
- Deploy the DocumentRegistry contract
- Save the contract address to `frontend/src/contracts/contract-address.json`
- Display the deployed contract address

**Note**: For Amoy testnet, you'll need test MATIC. Get it from the [Polygon Faucet](https://faucet.polygon.technology/)

### 6. Start the Frontend Application

```bash
# From the frontend directory
cd frontend
npm run dev
```

The application will be available at `http://localhost:5173`

## 🏗️ Project Structure

```
project-root/
├── contracts/              # Smart contracts
│   ├── DocumentRegistry.sol # Main document storage contract
│   └── Lock.sol            # Example contract (from template)
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── FileUpload/ # File upload functionality
│   │   │   ├── EncryptionModule/ # Encryption interface
│   │   │   └── KeyManagement/ # Key generation/import
│   │   ├── contracts/      # Contract ABIs and addresses
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # Utility functions
│   │   │   └── crypto.js   # Web Crypto API wrapper
│   │   └── App.jsx         # Main application component
│   └── package.json
├── scripts/                # Deployment scripts
│   └── deploy.js
├── test/                   # Contract tests
├── hardhat.config.js       # Hardhat configuration
└── package.json
```

## 💻 Development Workflow

### Running Tests

```bash
# Run smart contract tests
npx hardhat test

# Run with gas reporting
REPORT_GAS=true npx hardhat test
```

### Frontend Development

The frontend uses Vite for fast development:

```bash
cd frontend
npm run dev    # Start development server
npm run build  # Build for production
npm run lint   # Run ESLint
```

### Smart Contract Development

```bash
# Compile contracts
npx hardhat compile

# Deploy to local network
npx hardhat run scripts/deploy.js --network localhost

# Deploy to Polygon Amoy testnet
npx hardhat run scripts/deploy.js --network amoy

# Verify on PolygonScan (after deployment)
npx hardhat verify --network amoy <CONTRACT_ADDRESS>
```

## 🔧 Key Features & Usage

### 1. Key Management
- **Generate Key**: Creates a new AES-256 encryption key
- **Export Key**: Download key as a text file for backup
- **Import Key**: Load a previously exported key
- Keys are stored in IndexedDB for persistence

### 2. File Encryption
- Select any file for encryption
- Uses chunked processing for large files
- Shows real-time encryption progress
- Generates SHA-256 hash of original file

### 3. Document Registry (Smart Contract)
The smart contract provides:
- Document hash storage with timestamps
- Owner-based access control
- Permission granting/revoking
- Document verification

### Contract Interface:
```solidity
// Store a document
function storeDocument(bytes32 _documentHash, string _ipfsCID, string _fileName)

// Grant access to another user
function grantAccess(bytes32 _documentHash, address _user)

// Verify document exists
function verifyDocument(bytes32 _documentHash) returns (bool)
```

## 🔐 Security Considerations

1. **Encryption Keys**: 
   - Keys are generated using Web Crypto API
   - Never transmitted to servers
   - Store backups securely

2. **File Processing**:
   - All encryption happens client-side
   - Original files never leave your device unencrypted

3. **Smart Contract**:
   - Only document hashes are stored on-chain
   - Access control enforced by contract logic

## 🐛 Troubleshooting

### Common Issues:

1. **"Module not found" errors**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **MetaMask connection issues**
   - Ensure MetaMask is installed and unlocked
   - Check you're on the correct network (Polygon or Amoy)
   - Add Polygon networks to MetaMask if not already added
   - Reset MetaMask account if transactions are stuck

3. **Contract deployment fails**
   - Check your account has sufficient MATIC (or test MATIC for Amoy)
   - Verify network configuration in hardhat.config.js
   - Ensure your private key is correctly set in .env
   - For Amoy: Get test MATIC from [faucet](https://faucet.polygon.technology/)

4. **Frontend won't start**
   ```bash
   cd frontend
   rm -rf node_modules .vite
   npm install
   npm run dev
   ```

5. **Transaction fees too high**
   - Polygon typically has much lower fees than Ethereum
   - Check current gas prices on [PolygonScan](https://polygonscan.com/gastracker)
   - Adjust gas settings in MetaMask if needed

## 📄 Smart Contract Details

### DocumentRegistry.sol

The main contract that handles document registration and access control.

**Key Functions:**
- `storeDocument()` - Register a new document
- `getDocument()` - Retrieve document details (requires access)
- `grantAccess()` - Grant access to another address
- `revokeAccess()` - Revoke previously granted access
- `verifyDocument()` - Check if a document exists

**Events:**
- `DocumentStored` - Emitted when a document is registered
- `AccessGranted` - Emitted when access is granted
- `AccessRevoked` - Emitted when access is revoked

---

**Note**: This project is under active development. Features and APIs may change. Please refer to the latest documentation and feel free to open issues for any questions or problems.
