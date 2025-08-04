# 🛡️ Secure Blockchain Document Storage

A **fully functional** decentralized document storage solution built on **Polygon** that combines client-side encryption with blockchain technology and IPFS storage. This system allows users to securely encrypt documents locally and store them on a distributed network with blockchain-verified integrity.

## 🚀 Project Overview

This project provides a complete, secure, decentralized way to store sensitive documents using:

### 🔐 **Security Features**
- **Client-side AES-256-GCM encryption** - Documents are encrypted in the browser before leaving your device
- **Zero-knowledge architecture** - Your private keys and original files never leave your device
- **Secure backend API** - IPFS operations handled server-side with JWT authentication
- **Smart contract access control** - Blockchain-based permission management

### 🌐 **Decentralized Storage**
- **Polygon blockchain verification** - Document hashes stored on-chain for tamper-proof verification
- **IPFS integration** - Encrypted documents stored on IPFS via Pinata
- **Low transaction costs** - Leveraging Polygon's efficient Layer 2 solution
- **Fast transactions** - 2-3 second block confirmations

### ✅ **Current Implementation Status**

**🎉 Fully Implemented:**
- ✅ Web Crypto API implementation for AES-256-GCM encryption
- ✅ Key generation, export, and import system
- ✅ File upload with encryption interface
- ✅ IPFS integration via secure backend API
- ✅ Smart contract for document registry with access control
- ✅ Web3 wallet connection (MetaMask integration)
- ✅ Smart contract interaction from frontend
- ✅ Document storage to blockchain + IPFS
- ✅ Document retrieval and decryption
- ✅ Hash calculation for file integrity verification
- ✅ Local key storage using IndexedDB
- ✅ Rate limiting and security headers
- ✅ Responsive UI with real-time status updates

**🚧 Future Enhancements:**
- 📱 Mobile app version
- 🔄 Batch file operations
- 👥 Advanced sharing features
- 📊 Usage analytics dashboard

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

The project has three main components that need setup:

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

#### Install Backend Dependencies
```bash
# Navigate to backend directory
cd backend
npm install
```

### 3. Set Up Environment Variables

#### Root Directory `.env` file:
Create a `.env` file in the root directory for blockchain/smart contract configuration:

```env
# For Hardhat (Polygon deployment)
PRIVATE_KEY=your_wallet_private_key_here
POLYGONSCAN_API_KEY=your_polygonscan_api_key_here

# Polygon Network RPC URLs
AMOY_RPC_URL=https://rpc-amoy.polygon.technology/

# Optional: If using Alchemy or Infura
ALCHEMY_API_KEY=your_alchemy_api_key
```

#### Backend Directory `.env` file:
Create a `.env` file in the `backend/` directory for IPFS and API configuration:

```env
# Pinata Configuration (REQUIRED)
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your_pinata_jwt_here

# Server Configuration
PORT=3001
NODE_ENV=development

# Security (REQUIRED)
JWT_SECRET=your_secure_random_jwt_secret_min_32_characters_long
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Generate Secure JWT Secret:
```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Using openssl
openssl rand -hex 32
```

#### Get Pinata JWT Token:
1. Create account at [Pinata.cloud](https://pinata.cloud)
2. Go to API Keys section
3. Create a new JWT token with full permissions
4. Copy the token to your backend `.env` file

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
npx hardhat run scripts/deploy.js --network polygonAmoy
```

The deployment script will:
- Deploy the DocumentRegistry contract
- Save the contract address to `frontend/src/contracts/contract-address.json`
- Display the deployed contract address

**Note**: For Amoy testnet, you'll need test MATIC. Get it from the [Polygon Faucet](https://faucet.polygon.technology/)

### 6. Start the Backend Server

```bash
# From the backend directory
cd backend
npm run dev
```

The backend API will be available at `http://localhost:3001`

### 7. Start the Frontend Application

```bash
# From the frontend directory (in a new terminal)
cd frontend
npm run dev
```

The application will be available at `http://localhost:5173`

**Important**: Both the backend server and frontend must be running simultaneously for the application to work properly.

## 🏗️ Project Structure

```
BlockchainDocumentStorage/
├── contracts/                    # Smart contracts
│   └── DocumentRegistry.sol     # Main document storage contract
├── backend/                      # Secure IPFS API server
│   ├── server.js                # Express.js server with Pinata integration
│   ├── package.json             # Backend dependencies
│   └── README.md                # Backend setup guide
├── frontend/                     # React frontend application
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── BlockchainStorage/    # Blockchain interaction
│   │   │   ├── DocumentRetrieval/    # Document download & decryption
│   │   │   ├── EncryptionModule/     # File encryption interface
│   │   │   ├── FileUpload/           # File upload functionality
│   │   │   ├── IPFSConfig/           # IPFS configuration
│   │   │   ├── IPFSStatus/           # IPFS connection status
│   │   │   ├── KeyManagement/        # Key generation/import/export
│   │   │   └── WalletConnect/        # MetaMask integration
│   │   ├── contexts/            # React contexts
│   │   │   └── Web3Context.jsx      # Web3 provider context
│   │   ├── contracts/           # Contract ABIs and addresses
│   │   │   ├── DocumentRegistry.abi.json
│   │   │   ├── DocumentRegistry.json
│   │   │   └── contract-address.json
│   │   ├── hooks/               # Custom React hooks
│   │   │   └── useEncryption.js     # Encryption hook
│   │   ├── utils/               # Utility functions
│   │   │   ├── crypto.js            # Web Crypto API wrapper
│   │   │   └── ipfs.js              # IPFS API client
│   │   └── App.jsx              # Main application component
│   ├── package.json             # Frontend dependencies
│   └── vite.config.js           # Vite configuration
├── scripts/                      # Deployment scripts
│   └── deploy.js                # Smart contract deployment
├── artifacts/                    # Compiled contract artifacts
├── hardhat.config.js            # Hardhat configuration
├── package.json                 # Root dependencies
└── README.md                    # This file
```

## 💻 Development Workflow

### Running Tests

```bash
# Run smart contract tests
npx hardhat test

# Run with gas reporting
REPORT_GAS=true npx hardhat test
```

### Backend Development

The backend uses Express.js with Pinata for IPFS operations:

```bash
cd backend
npm run dev    # Start development server with auto-restart
npm start      # Start production server
```

### Frontend Development

The frontend uses Vite for fast development:

```bash
cd frontend
npm run dev    # Start development server
npm run build  # Build for production
npm run lint   # Run ESLint
npm run preview # Preview production build
```

### Smart Contract Development

```bash
# Compile contracts
npx hardhat compile

# Deploy to local network
npx hardhat run scripts/deploy.js --network localhost

# Deploy to Polygon Amoy testnet
npx hardhat run scripts/deploy.js --network polygonAmoy

# Verify on PolygonScan (after deployment)
npx hardhat verify --network polygonAmoy <CONTRACT_ADDRESS>
```

## 🔧 Key Features & Usage

### 🗝️ **1. Key Management**
- **Generate Key**: Creates a new AES-256 encryption key using Web Crypto API
- **Export Key**: Download key as a secure text file for backup
- **Import Key**: Load a previously exported key from file
- **Persistent Storage**: Keys are securely stored in IndexedDB for session persistence
- **Key Validation**: Automatic validation of imported keys

### 📁 **2. File Upload & Encryption**
- **Drag & Drop**: Intuitive file selection with drag-and-drop support
- **Any File Type**: Support for documents, images, videos, archives, etc.
- **Chunked Processing**: Efficient handling of large files with progress indication
- **Real-time Progress**: Visual feedback during encryption process
- **Hash Generation**: SHA-256 hash calculation for file integrity verification

### 🌐 **3. IPFS Storage**
- **Secure Upload**: Encrypted files uploaded to IPFS via secure backend API
- **Pinata Integration**: Reliable IPFS pinning service for data persistence
- **JWT Authentication**: Secure API access with short-lived tokens
- **Rate Limiting**: Protection against abuse with configurable limits

### ⛓️ **4. Blockchain Integration**
- **MetaMask Connection**: Seamless Web3 wallet integration
- **Smart Contract Interaction**: Direct interaction with Polygon blockchain
- **Document Registry**: On-chain storage of document metadata and hashes
- **Access Control**: Blockchain-based permission management system
- **Event Logging**: Comprehensive event logging for all operations

### 📥 **5. Document Retrieval**
- **Search by Hash**: Find documents using their unique hash
- **Download & Decrypt**: Secure retrieval and client-side decryption
- **Access Verification**: Smart contract-based access control checking
- **Integrity Verification**: Hash validation to ensure file integrity

### 🛡️ **6. Security Features**
- **Zero-Knowledge Architecture**: Private keys never leave your device
- **Client-Side Encryption**: AES-256-GCM encryption performed in browser
- **Secure API**: Backend handles IPFS operations without exposing keys
- **HTTPS Only**: All communications encrypted in transit
- **Rate Limiting**: Protection against DDoS and brute force attacks

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

1. **Backend API connection issues**
   ```bash
   # Check if backend is running
   curl http://localhost:3001/health
   
   # Restart backend
   cd backend
   npm start
   ```

2. **IPFS upload failures**
   - Verify your Pinata JWT token is valid and has the correct permissions
   - Check backend `.env` file configuration
   - Ensure you have sufficient Pinata storage quota
   - Check network connectivity to Pinata services

3. **"Module not found" errors**
   ```bash
   # Clear node_modules and reinstall (run in affected directory)
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **MetaMask connection issues**
   - Ensure MetaMask is installed and unlocked
   - Check you're on the correct network (Polygon Amoy for testnet)
   - Add Polygon networks to MetaMask if not already added
   - Reset MetaMask account if transactions are stuck
   - Clear browser cache if connection fails

5. **Contract deployment fails**
   - Check your account has sufficient MATIC (or test MATIC for Amoy)
   - Verify network configuration matches `hardhat.config.js`
   - Ensure your private key is correctly set in root `.env`
   - For Amoy: Get test MATIC from [faucet](https://faucet.polygon.technology/)
   - Check PolygonScan for network status

6. **Frontend won't start**
   ```bash
   cd frontend
   rm -rf node_modules .vite dist
   npm install
   npm run dev
   ```

7. **Encryption/Decryption errors**
   - Ensure you're using the correct encryption key
   - Verify file integrity with hash comparison
   - Check browser console for Web Crypto API errors
   - Clear IndexedDB storage if key storage is corrupted

8. **Transaction fees too high**
   - Polygon typically has much lower fees than Ethereum
   - Check current gas prices on [PolygonScan](https://polygonscan.com/gastracker)
   - Adjust gas settings in MetaMask if needed
   - For development, use Polygon Amoy testnet

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

## 🔄 **Quick Start Summary**

For the impatient developers, here's the TL;DR version:

```bash
# 1. Clone and install dependencies
git clone <repository-url>
cd BlockchainDocumentStorage
npm install && cd frontend && npm install && cd ../backend && npm install && cd ..

# 2. Set up environment files
# Create root/.env with PRIVATE_KEY and POLYGONSCAN_API_KEY
# Create backend/.env with PINATA_JWT and JWT_SECRET

# 3. Deploy smart contract
npx hardhat compile
npx hardhat run scripts/deploy.js --network polygonAmoy

# 4. Start all services (3 terminals)
# Terminal 1: Backend
cd backend && npm start

# Terminal 2: Frontend  
cd frontend && npm run dev

# Terminal 3: Optional - Local blockchain
npx hardhat node
```

## 📊 **Technology Stack**

### **Frontend**
- **React 19** - Modern UI framework
- **Vite** - Fast build tool and dev server
- **Web Crypto API** - Client-side encryption
- **ethers.js** - Ethereum/Polygon blockchain interaction
- **MetaMask** - Web3 wallet integration
- **Lucide React** - Modern icon library

### **Backend**
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **Pinata SDK** - IPFS pinning service
- **JWT** - Secure API authentication
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - DDoS protection

### **Blockchain**
- **Solidity 0.8.19** - Smart contract language
- **Hardhat** - Development framework
- **Polygon** - Layer 2 blockchain
- **OpenZeppelin** - Secure contract libraries

### **Storage**
- **IPFS** - Decentralized file storage
- **Pinata** - IPFS pinning service
- **IndexedDB** - Browser-based key storage

## 🚀 **Performance & Limits**

- **File Size**: Tested up to 100MB files
- **Encryption Speed**: ~50MB/s on modern browsers
- **IPFS Upload**: Depends on file size and network
- **Transaction Cost**: ~0.001 MATIC per document
- **Storage Persistence**: Files pinned on IPFS indefinitely

## 🤝 **Contributing**

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**⚡ Ready to secure your documents on the blockchain? Get started now!**
