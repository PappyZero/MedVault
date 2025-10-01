# MedVault MVP - Project Structure

## Overview

MedVault is a secure, blockchain-based Emergency Medical Record Access System built on BlockDAG Awakening testnet. This document describes the complete project architecture.

## Technology Stack

### Blockchain Layer
- **Smart Contracts:** Solidity ^0.8.26
- **Development Framework:** Foundry
- **Network:** BlockDAG Awakening Testnet (Chain ID: 1043)
- **RPC:** https://rpc.awakening.bdagscan.com

### Frontend Layer
- **Framework:** React 18
- **Build Tool:** Vite
- **Blockchain Library:** ethers.js v6
- **Routing:** react-router-dom v6
- **Styling:** Vanilla CSS with gradient themes

### Storage Layer
- **Encrypted Storage:** IPFS via Pinata
- **On-chain Storage:** CIDs and access permissions

### Cryptography
- **File Encryption:** AES-256-GCM (Web Crypto API)
- **Key Exchange:** ECIES-like scheme using secp256k1
- **Key Wrapping:** @noble/secp256k1

## Directory Structure

```
medvault-mvp/
├── README.md                          # Main documentation
├── DEPLOYMENT_GUIDE.md               # Step-by-step deployment
├── PROJECT_STRUCTURE.md              # This file
├── foundry.toml                      # Foundry configuration
├── .env.example                      # Example environment variables
├── .gitignore                        # Git ignore rules
├── init_medvault.sh                  # One-command setup script
│
├── contracts/                        # Smart contracts
│   └── MedVault.sol                 # Main contract with access control
│
├── script/                          # Deployment scripts
│   └── DeployMedVault.s.sol        # Foundry deployment script
│
├── test/                            # Contract tests
│   └── MedVault.t.sol              # Comprehensive test suite
│
└── frontend/                        # React application
    ├── package.json                # Frontend dependencies
    ├── vite.config.js              # Vite configuration
    ├── index.html                  # HTML entry point
    ├── .env.example                # Frontend environment template
    │
    └── src/
        ├── main.jsx                # React entry point
        ├── App.jsx                 # Main app component with routing
        ├── index.css               # Global styles
        │
        ├── pages/                  # Page components
        │   ├── Upload.jsx          # Patient upload interface
        │   ├── Paramedic.jsx       # Medical personnel access
        │   └── AuditLog.jsx        # Blockchain event viewer
        │
        ├── components/             # Reusable components
        │   └── GrantModal.jsx      # Access grant modal
        │
        └── utils/                  # Utility modules
            ├── contract.js         # Contract ABI and address
            ├── cryptoHelpers.js    # Encryption utilities
            └── ipfs.js             # IPFS upload/fetch
```

## Smart Contract Architecture

### MedVault.sol

**State Variables:**
- `records` - Mapping of patient → encrypted CID
- `accessPermissions` - Mapping of patient → grantee → bool
- `encryptedSymKeys` - Mapping of patient → grantee → wrapped AES key
- `hasRecord` - Mapping of patient → bool

**Key Functions:**
- `uploadRecord(cid)` - Patient uploads encrypted medical record
- `grantAccess(grantee, wrappedKey)` - Patient grants access with wrapped key
- `revokeAccess(grantee)` - Patient revokes access
- `getRecord(patient)` - Retrieve CID (emits audit event)
- `getWrappedKey(patient)` - Retrieve wrapped AES key for authorized party
- `checkAccess(patient, accessor)` - Check if accessor has permission
- `getRecordCID(patient)` - Patient views own CID

**Events:**
- `RecordUploaded(patient, cid, timestamp)`
- `AccessUpdated(patient, grantee, granted, timestamp)`
- `AccessAttempt(accessor, patient, success, timestamp)`

**Security Features:**
- Patient-only upload and access control
- Granular permission management
- Complete audit trail
- Revocable access grants
- On-chain wrapped key storage

## Frontend Architecture

### Page Components

#### Upload.jsx
**Responsibilities:**
- File selection and validation
- Client-side encryption using AES-256-GCM
- IPFS upload of encrypted blob
- Blockchain transaction to store CID
- Access grant modal trigger

**Flow:**
1. User selects medical record file
2. Generate random AES-256 key
3. Encrypt file with AES-GCM
4. Upload encrypted blob to IPFS
5. Store CID on blockchain
6. Display success and grant access option

#### Paramedic.jsx
**Responsibilities:**
- Patient address input
- Access permission verification
- Encrypted record retrieval
- Key unwrapping and decryption
- Record display and download

**Flow:**
1. Input patient wallet address
2. Call `getRecord(patient)` - emits audit event
3. Retrieve wrapped AES key from contract
4. Unwrap key using paramedic's wallet
5. Fetch encrypted blob from IPFS
6. Decrypt and display medical record

#### AuditLog.jsx
**Responsibilities:**
- Blockchain event querying
- Real-time event listening
- Event filtering and display
- Transaction link generation

**Flow:**
1. Query past events from blockchain
2. Listen for new events in real-time
3. Format and display chronologically
4. Link to block explorer for verification

### Utility Modules

#### contract.js
- Contract address configuration
- ABI definitions
- Contract instance creation
- Address validation

#### cryptoHelpers.js
**AES-256-GCM Functions:**
- `generateAESKey()` - Create random 256-bit key
- `exportAESKeyRaw()` - Export key as bytes
- `importAESKey()` - Import key from bytes
- `encryptAES()` - Encrypt with IV generation
- `decryptAES()` - Decrypt with IV

**ECIES Functions:**
- `wrapKeyForRecipient()` - Encrypt AES key for recipient
- `unwrapKeyWithSigner()` - Decrypt wrapped key with wallet

**File Helpers:**
- `encryptFile()` - Encrypt file with metadata
- `decryptFile()` - Decrypt and restore file
- `blobToDataURL()` - Convert for display
- `downloadBlob()` - Trigger file download

#### ipfs.js
- `uploadToIPFS()` - Upload to Pinata
- `fetchFromIPFS()` - Retrieve from gateway
- `testPinataConnection()` - Verify credentials
- `uploadJSONToIPFS()` - JSON-specific upload
- `fetchJSONFromIPFS()` - JSON-specific fetch

## Data Flow

### Upload Flow
```
Patient → Select File
       → Generate AES Key
       → Encrypt File (AES-GCM)
       → Upload to IPFS → Get CID
       → Store CID on Blockchain
       → [Optional] Grant Access → Wrap AES Key → Store on-chain
```

### Access Flow
```
Paramedic → Enter Patient Address
         → Request Record (getRecord)
         → Blockchain Verifies Permission
         → Retrieve CID
         → Retrieve Wrapped Key
         → Unwrap with Wallet
         → Fetch from IPFS
         → Decrypt with AES Key
         → Display/Download
```

### Audit Flow
```
Any Action → Smart Contract Event
          → Blockchain Storage
          → Frontend Query
          → Real-time Listen
          → Display in Audit Log
```

## Security Model

### Encryption Layers

1. **File Encryption (AES-256-GCM):**
   - Symmetric encryption for medical records
   - 256-bit keys for strong security
   - Authentication tags prevent tampering
   - Unique IV per encryption

2. **Key Wrapping (ECIES-like):**
   - AES key encrypted for each authorized party
   - Based on elliptic curve cryptography
   - Only recipient can unwrap with private key
   - Shared secret derived via ECDH

3. **Blockchain Layer:**
   - Immutable access control
   - Transparent audit trail
   - No raw data on-chain
   - Only CIDs and permissions stored

### Access Control

**Three-Tier Permission Model:**
1. **Patient Control:** Only patient can upload and grant/revoke access
2. **Smart Contract Enforcement:** On-chain permission checks
3. **Cryptographic Enforcement:** Can't decrypt without wrapped key

**Audit Trail:**
- Every action logged on blockchain
- Immutable and publicly verifiable
- Includes timestamps and addresses
- Failed access attempts recorded

## Environment Configuration

### Root .env (Contract Deployment)
```env
PRIVATE_KEY=deployer_private_key
RPC_URL=https://rpc.awakening.bdagscan.com
```

### frontend/.env (Application)
```env
VITE_PINATA_API_KEY=pinata_api_key
VITE_PINATA_SECRET_API_KEY=pinata_secret
VITE_RPC_URL=https://rpc.awakening.bdagscan.com
VITE_CHAIN_ID=1043
VITE_CONTRACT_ADDRESS=deployed_contract_address
```

## Testing

### Contract Tests (test/MedVault.t.sol)

**Test Coverage:**
- ✓ Upload record functionality
- ✓ Grant access with key wrapping
- ✓ Revoke access
- ✓ Access record with permissions
- ✓ Access denial for unauthorized
- ✓ Wrapped key retrieval
- ✓ Access checking
- ✓ Complete integration flow
- ✓ Edge cases and error conditions

**Run Tests:**
```bash
forge test                    # Run all tests
forge test -vvv              # Verbose output
forge test --match-test testUploadRecord  # Specific test
forge test --gas-report      # Gas usage report
```

## Gas Optimization

**Contract Design Decisions:**
- Use `calldata` for string parameters (cheaper than `memory`)
- Pack boolean flags efficiently
- Use indexed events for efficient filtering
- Minimal on-chain storage (only CIDs and permissions)
- No loops or unbounded arrays

**Estimated Gas Costs (Awakening testnet):**
- Upload Record: ~100,000 gas
- Grant Access: ~120,000 gas
- Revoke Access: ~50,000 gas
- Get Record: ~80,000 gas (includes event)

## Scalability Considerations

### Current Architecture
- Per-patient storage model
- Linear access control checks
- Event-based audit trail

### Future Enhancements
- Batch operations for multiple grants
- Off-chain metadata with on-chain roots
- Layer 2 scaling solutions
- IPFS pinning services integration
- Decentralized storage alternatives

## Development Workflow

### Local Development
```bash
# Install dependencies
bash init_medvault.sh

# Compile contracts
forge build

# Run tests
forge test

# Start frontend
cd frontend && npm run dev
```

### Deployment
```bash
# Deploy contract
forge script script/DeployMedVault.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast --legacy

# Update frontend config
# Edit frontend/.env with contract address

# Build frontend
cd frontend && npm run build
```

### Testing Flow
```bash
# Contract tests
forge test

# Frontend dev (with hot reload)
cd frontend && npm run dev

# Manual testing with MetaMask
# Follow DEPLOYMENT_GUIDE.md Phase 5
```

## Compliance & Security Notes

### Required for Production

1. **Security Audits:**
   - Smart contract audit
   - Cryptography review
   - Penetration testing
   - Formal verification

2. **Compliance:**
   - HIPAA compliance (US)
   - GDPR compliance (EU)
   - Local healthcare regulations
   - Data residency requirements

3. **Infrastructure:**
   - Redundant IPFS pinning
   - Key management system
   - Backup and recovery
   - Disaster recovery plan

4. **Legal:**
   - Terms of service
   - Privacy policy
   - User consent forms
   - Liability disclaimers

### Known Limitations (POC)

- Simplified key derivation (demo only)
- No key recovery mechanism
- Single IPFS provider
- No rate limiting
- No user authentication beyond wallet
- No email/SMS notifications
- No mobile optimization
- No offline access

## Future Enhancements

### Short Term
- Emergency access codes
- Time-limited access grants
- Multi-file record support
- Medical record categories
- QR code patient identifiers

### Medium Term
- Mobile applications (iOS/Android)
- Biometric authentication
- Encrypted messaging between parties
- Appointment scheduling integration
- Prescription management

### Long Term
- AI-powered medical insights
- Cross-chain interoperability
- Decentralized identity (DID)
- Zero-knowledge proofs for privacy
- Integration with EHR systems

## Support & Resources

- **Project README:** README.md
- **Deployment Guide:** DEPLOYMENT_GUIDE.md
- **Smart Contract:** contracts/MedVault.sol
- **BlockDAG Docs:** https://docs.blockdagnetwork.io/
- **Foundry Book:** https://book.getfoundry.sh/

---

**Version:** 0.1.0 (POC)
**License:** MIT
**Status:** Proof of Concept - Not for Production Use
