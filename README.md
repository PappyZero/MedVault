# MedVault MVP - Emergency Medical Record Access System

A minimal, secure web-based Emergency Medical Record Access System using **BlockDAG (Awakening testnet)** as the audit & access-control registry.

## ⚠️ Security Disclaimer

**DO NOT USE THIS CODE IN PRODUCTION WITHOUT A PROFESSIONAL SECURITY AUDIT.**

This is a proof-of-concept implementation. The cryptographic implementations (AES-256-GCM and ECIES-like key wrapping) are for demonstration purposes only. Production deployments must:

- Undergo thorough security audits by qualified cryptography experts
- Implement proper key management systems
- Follow healthcare compliance standards (HIPAA, GDPR, etc.)
- Use audited cryptographic libraries
- Implement secure backup and recovery mechanisms

## System Architecture

- **Smart Contract**: MedVault.sol on BlockDAG Awakening testnet
- **Frontend**: React + Vite with Web3 integration
- **Storage**: IPFS (Pinata) for encrypted medical records
- **Encryption**: Client-side AES-256-GCM + ECIES-like key wrapping
- **Audit Trail**: On-chain event logs via BlockDAG

## BlockDAG Resources

- **Awakening RPC**: `https://rpc.awakening.bdagscan.com`
- **Chain ID**: `1043`
- **Network Details**: https://docs.blockdagnetwork.io/test-main-networks/awakening-network-details
- **BlockDAG Smart Contract IDE**: https://ide.awakening.bdagscan.com/
- **Block Explorer**: https://bdagscan.com

## Quick Start

### One-Command Setup

```bash
forge init --force
```

```bash
bash init_medvault.sh
```

This script will:
1. Install Foundry dependencies
2. Install frontend dependencies
3. Set up environment files
4. Compile contracts
5. Display next steps

### Manual Setup

#### 1. Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

#### 2. Install Dependencies

```bash
# Install contract dependencies
forge install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

#### 3. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
# Root .env for contract deployment
PRIVATE_KEY=your_private_key_here
RPC_URL=https://rpc.awakening.bdagscan.com

# frontend/.env for React app
cd frontend
cp .env.example .env
# Edit frontend/.env with your Pinata credentials
```

## Server Setup
#### Step 1: Open a new terminal and run
```
sudo npm install -g pnpm@latest-10
```

#### Step 2:  cd into the folder "fileit-server"
```
cd fileit-server
```

#### Step 3:
```bash
pnpm i
```
#### Step 4: Run the server.
```bash
pnpm run dev
```
#### Step 5: make sure it's working properly. Open `http://localhost:8080` with your browser, you should see this message `Hello There from MedVault :)!`

#### Step 6: Deploy to your cloudflare dashboard.
```bash
pnpm run Deploy
```
Your browser should open a window, follow the steps.


## Smart Contract Deployment

### Option 1: Deploy with Foundry

```bash
# Compile contracts
forge build

# Run tests
forge test

# Deploy to Awakening testnet
forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY --legacy contracts/MedVault.sol:MedVault

# Or use the deploy script
forge script script/DeployMedVault.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast --legacy
```

**Note**: Use `--legacy` flag for BlockDAG compatibility (EIP-1559 not supported).

### Option 2: Deploy with BlockDAG IDE

1. Visit https://ide.awakening.bdagscan.com/
2. Create a new file and paste `contracts/MedVault.sol`
3. Compile with Solidity ^0.8.26
4. Connect MetaMask to Awakening testnet
5. Deploy the contract
6. Copy the deployed contract address

### Configure Frontend with Contract Address

After deployment, update `frontend/src/utils/contract.js`:

```javascript
export const CONTRACT_ADDRESS = "0x..."; // Your deployed address
```

## Running the Frontend

```bash
cd frontend
npm run dev
```

Open http://localhost:5173

## Frontend Pages

### 1. Upload Page (`/`)
- Connect wallet (MetaMask)
- Select medical record file (PDF, text, images)
- Encrypt file client-side with AES-256-GCM
- Upload encrypted blob to IPFS
- Store CID on BlockDAG smart contract
- Display resource ID for sharing

### 2. Grant Access Page
- Patient enters paramedic/doctor wallet address
- System wraps AES key for recipient using ECIES-like scheme
- Call `grantAccess(grantee)` on smart contract
- On-chain permission recorded with event

### 3. Paramedic Access Page
- Paramedic connects wallet
- Enters patient address
- Calls `getRecord(patient)` - emits audit event
- Fetches encrypted blob from IPFS
- Unwraps AES key using signer's private key
- Decrypts and displays medical record

### 4. Audit Log Page
- Lists all on-chain events:
  - `RecordUploaded`: New records added
  - `AccessUpdated`: Permissions granted/revoked
  - `AccessAttempt`: Every access request (authorized or denied)
- Real-time event listening via ethers.js

## 90-Second Demo Script

1. **Setup** (5s): Connect MetaMask to Awakening testnet, ensure you have testnet BDAG
2. **Upload** (25s): Navigate to Upload page → Select sample medical PDF → Click "Encrypt & Upload" → Wait for IPFS upload → Confirm transaction → Copy patient address
3. **Grant Access** (20s): Click "Grant Access" → Paste paramedic address → Confirm transaction → Wait for confirmation
4. **Paramedic Access** (25s): Switch to paramedic wallet → Navigate to Paramedic page → Paste patient address → Click "Access Record" → View decrypted medical data
5. **Audit** (15s): Navigate to Audit Log → See all events: upload, grant, and access attempt

## Technology Stack

- **Smart Contracts**: Solidity ^0.8.26, Foundry
- **Frontend**: React 18, Vite, ethers.js v6
- **Encryption**: Web Crypto API (AES-256-GCM), @noble/secp256k1 (ECIES)
- **Storage**: IPFS via Pinata
- **Blockchain**: BlockDAG Awakening testnet (Chain ID: 1043)

## Project Structure

```
medvault-mvp/
├── README.md
├── foundry.toml
├── .gitignore
├── .env.example
├── init_medvault.sh
├── contracts/
│   └── MedVault.sol
├── script/
│   └── DeployMedVault.s.sol
├── test/
│   └── MedVault.t.sol
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── .env.example
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── pages/
        │   ├── Upload.jsx
        │   ├── Paramedic.jsx
        │   └── AuditLog.jsx
        ├── components/
        │   └── GrantModal.jsx
        └── utils/
            ├── cryptoHelpers.js
            ├── ipfs.js
            └── contract.js
```

## Cryptography Notes

### AES-256-GCM Encryption
- Symmetric encryption for medical records
- 256-bit keys with authentication
- Unique IV per encryption operation
- Tamper-proof authenticated encryption

### ECIES-like Key Wrapping
- AES symmetric key is wrapped using recipient's public key
- Only recipient can unwrap with their private key
- Based on Elliptic Curve Integrated Encryption Scheme
- Uses secp256k1 curve (Ethereum-compatible)

### Key Flow
1. Patient generates random AES-256 key
2. Medical record encrypted with AES key
3. For each authorized paramedic:
   - AES key wrapped with paramedic's public key (derived from address)
   - Wrapped key stored on-chain or IPFS
4. Paramedic unwraps AES key with their wallet's private key
5. Decrypt medical record with unwrapped AES key

## Testing

```bash
# Run contract tests
forge test

# Run with verbosity
forge test -vvv

# Test specific function
forge test --match-test testUploadRecord
```

## Troubleshooting

### MetaMask Connection Issues
- Ensure Awakening network is added to MetaMask
- Network Name: `BlockDAG Awakening`
- RPC URL: `https://rpc.awakening.bdagscan.com`
- Chain ID: `1043`
- Currency: `BDAG`

### Transaction Failures
- Always use `--legacy` flag (no EIP-1559 support)
- Ensure sufficient BDAG balance for gas
- Check gas limit settings

### IPFS Upload Failures
- Verify Pinata API credentials in `.env`
- Check file size limits
- Ensure stable internet connection

### Decryption Failures
- Verify access was granted on-chain
- Check wallet is connected with correct account
- Ensure IPFS content is accessible

## Development Commands

```bash
# Compile contracts
forge build

# Run tests
forge test

# Format contracts
forge fmt

# Generate gas report
forge test --gas-report

# Frontend dev server
cd frontend && npm run dev

# Frontend production build
cd frontend && npm run build

# Frontend preview production build
cd frontend && npm run preview
```

## License

MIT License - For demonstration and educational purposes only.

## Support

For BlockDAG specific questions:
- Documentation: https://docs.blockdagnetwork.io/
- Community: [BlockDAG Discord/Telegram]

For this project:
- Issues: Create a GitHub issue
- Security: **Do not report security issues publicly** - contact maintainers directly

---

**Remember**: This is a proof-of-concept. Healthcare data requires enterprise-grade security, compliance certifications, and professional audits before production use.
