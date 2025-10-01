# MedVault MVP - Complete Deployment Guide

## Step-by-Step Deployment Instructions

### Prerequisites

1. **Node.js** (v18 or higher) - https://nodejs.org/
2. **Foundry** (for smart contract deployment) - Will be installed by init script
3. **MetaMask** browser extension - https://metamask.io/
4. **Pinata Account** (for IPFS) - https://pinata.cloud/
5. **BlockDAG Testnet BDAG tokens** - Request from faucet

### Phase 1: Initial Setup (5 minutes)

1. **Run the initialization script:**
   ```bash
   bash init_medvault.sh
   ```

   This will:
   - Install Foundry (if not present)
   - Install all frontend dependencies
   - Create environment files
   - Compile smart contracts
   - Run contract tests

2. **Configure Pinata (IPFS Storage):**
   - Go to https://pinata.cloud/ and create a free account
   - Navigate to API Keys section
   - Create a new API key with full permissions
   - Copy your API Key and API Secret

3. **Update frontend environment:**
   ```bash
   cd frontend
   nano .env  # or use any text editor
   ```

   Fill in:
   ```env
   VITE_PINATA_API_KEY=your_api_key_here
   VITE_PINATA_SECRET_API_KEY=your_secret_key_here
   VITE_RPC_URL=https://rpc.awakening.bdagscan.com
   VITE_CHAIN_ID=1043
   VITE_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
   ```

   **Note:** CONTRACT_ADDRESS will be updated after deployment

### Phase 2: Smart Contract Deployment (10 minutes)

#### Option A: Deploy with Foundry (Recommended)

1. **Get your private key from MetaMask:**
   - Open MetaMask → Click the 3 dots → Account Details → Export Private Key
   - Enter your password and copy the private key
   - **NEVER share or commit this key!**

2. **Configure root .env file:**
   ```bash
   cd ..  # Back to root directory
   nano .env
   ```

   Fill in:
   ```env
   PRIVATE_KEY=your_private_key_without_0x
   RPC_URL=https://rpc.awakening.bdagscan.com
   ```

3. **Get testnet BDAG tokens:**
   - Ensure your MetaMask is connected to BlockDAG Awakening testnet
   - Request tokens from the BlockDAG faucet (check BlockDAG Discord/docs)

4. **Deploy the contract:**
   ```bash
   forge script script/DeployMedVault.s.sol \
     --rpc-url $RPC_URL \
     --private-key $PRIVATE_KEY \
     --broadcast \
     --legacy
   ```

   **Important:** Always use the `--legacy` flag for BlockDAG compatibility

5. **Save the contract address:**
   The deployment will output something like:
   ```
   Contract Address: 0x1234567890abcdef...
   ```
   Copy this address!

#### Option B: Deploy with BlockDAG IDE

1. Visit https://ide.awakening.bdagscan.com/
2. Create a new file and copy contents from `contracts/MedVault.sol`
3. Select compiler version 0.8.26
4. Click "Compile"
5. Connect MetaMask to Awakening testnet
6. Click "Deploy"
7. Confirm transaction in MetaMask
8. Copy the deployed contract address from the IDE

### Phase 3: Configure Frontend (2 minutes)

1. **Update contract address in frontend:**
   ```bash
   cd frontend
   nano .env
   ```

   Update the CONTRACT_ADDRESS line:
   ```env
   VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddress
   ```

2. **Also update in contract.js (for reference):**
   ```bash
   nano src/utils/contract.js
   ```

   Change line 4:
   ```javascript
   export const CONTRACT_ADDRESS = '0xYourDeployedContractAddress';
   ```

### Phase 4: Run the Application (1 minute)

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open your browser:**
   Navigate to http://localhost:5173

3. **Configure MetaMask:**
   - Click the MetaMask extension
   - Add BlockDAG Awakening network (if not added):
     - Network Name: `BlockDAG Awakening`
     - RPC URL: `https://rpc.awakening.bdagscan.com`
     - Chain ID: `1043`
     - Currency Symbol: `BDAG`
     - Block Explorer: `https://bdagscan.com`

### Phase 5: Test the Application (5 minutes)

#### As a Patient (Upload & Grant Access):

1. **Connect Wallet:**
   - Click "Connect Wallet" in the top right
   - Approve MetaMask connection

2. **Upload Medical Record:**
   - Click "Upload" in navigation
   - Select a test file (PDF, image, or text file)
   - Click "Encrypt & Upload to Blockchain"
   - Confirm transaction in MetaMask
   - Wait for confirmation (15-30 seconds)

3. **Grant Access:**
   - After upload, click "Grant Access to Medical Personnel"
   - Enter the paramedic's wallet address (use a second MetaMask account or friend's address)
   - Click "Grant Access"
   - Confirm transaction

4. **Save your address:**
   Copy your wallet address (shown in top right) - the paramedic will need this

#### As a Paramedic (Access Record):

1. **Switch to Paramedic Account:**
   - Switch to the account you granted access to in MetaMask
   - Or ask a friend to test with their account

2. **Access Record:**
   - Navigate to "Access" page
   - Enter the patient's wallet address
   - Click "Request Access"
   - Wait for decryption (10-20 seconds)
   - View the decrypted medical record

3. **Download Record:**
   - Click "Download Record" to save a local copy

#### View Audit Log:

1. Navigate to "Audit Log" page
2. See all events:
   - Record uploads
   - Access grants/revokes
   - Access attempts (successful and denied)
3. Click transaction links to view on BdagScan explorer

### Troubleshooting

#### "Failed to connect wallet"
- Ensure MetaMask is installed
- Refresh the page
- Clear browser cache

#### "Insufficient funds for transaction"
- Get testnet BDAG from the faucet
- Check your balance in MetaMask

#### "Transaction failed" or "Nonce too high"
- Reset MetaMask account: Settings → Advanced → Reset Account
- This clears transaction history without losing funds

#### "Failed to upload to IPFS"
- Verify Pinata API credentials in frontend/.env
- Check Pinata dashboard for API key status
- Ensure you have internet connection

#### "Access denied" when accessing record
- Verify the patient has granted access to your address
- Check the patient address is correct
- View Audit Log to confirm grant transaction succeeded

#### Contract deployment fails
- Ensure you have testnet BDAG tokens
- Always use `--legacy` flag with Foundry
- Check RPC URL is correct: https://rpc.awakening.bdagscan.com
- Verify private key format (no 0x prefix in .env)

### Production Deployment Considerations

**DO NOT deploy this to production without:**

1. **Professional Security Audit:**
   - Smart contract audit
   - Cryptography review
   - Penetration testing

2. **Healthcare Compliance:**
   - HIPAA compliance review
   - GDPR compliance (if applicable)
   - Legal consultation

3. **Enhanced Security:**
   - Hardware wallet integration
   - Multi-signature contracts
   - Key management system
   - Backup and recovery mechanisms

4. **Infrastructure:**
   - Dedicated IPFS infrastructure
   - Database for off-chain metadata
   - API rate limiting
   - DDoS protection

5. **User Experience:**
   - Fiat on-ramp for gas fees
   - Session management
   - Email notifications
   - Mobile applications

### Support Resources

- **BlockDAG Docs:** https://docs.blockdagnetwork.io/
- **BlockDAG IDE:** https://ide.awakening.bdagscan.com/
- **Block Explorer:** https://bdagscan.com
- **Pinata Docs:** https://docs.pinata.cloud/
- **Foundry Book:** https://book.getfoundry.sh/

### Next Steps After Deployment

1. Test with multiple accounts
2. Try revoking and re-granting access
3. Test with different file types (PDF, images, text)
4. Monitor the Audit Log for all activities
5. Review gas costs for optimization opportunities
6. Consider adding additional features:
   - Emergency access codes
   - Time-limited access
   - Multi-file records
   - Medical record categories
   - QR code generation for patient addresses

---

**Remember:** This is a proof-of-concept. Do not use in production without proper audits and compliance certifications.
