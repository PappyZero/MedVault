# 🚀 START HERE - MedVault MVP Setup

Welcome to **MedVault MVP** - a secure Emergency Medical Record Access System built on BlockDAG!

## 🎯 What is MedVault?

MedVault allows patients to:
- **Encrypt** medical records client-side
- **Store** encrypted files on IPFS
- **Control** access via blockchain smart contracts
- **Grant** access to emergency medical personnel
- **Audit** all access attempts on-chain

## ⚡ Quick Setup (10 Minutes)

### Step 1: Initialize Project (1 minute)

```bash
bash init_medvault.sh
```

This installs everything you need automatically!

### Step 2: Get Pinata API Keys (2 minutes)

1. Go to https://pinata.cloud/
2. Sign up for free account
3. Navigate to: **API Keys** → **New Key**
4. Give it all permissions
5. Copy the **API Key** and **API Secret**

### Step 3: Configure Frontend (1 minute)

```bash
cd frontend
cp .env.example .env
nano .env  # or use any text editor
```

Fill in:
```env
VITE_PINATA_API_KEY=your_api_key_here
VITE_PINATA_SECRET_API_KEY=your_secret_here
VITE_RPC_URL=https://rpc.awakening.bdagscan.com
VITE_CHAIN_ID=1043
VITE_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
```

### Step 4: Deploy Smart Contract (3 minutes)

**Get testnet tokens first:**
- Add BlockDAG Awakening network to MetaMask
- Request tokens from BlockDAG faucet

**Deploy:**
```bash
cd ..
cp .env.example .env
nano .env
```

Add your private key:
```env
PRIVATE_KEY=your_metamask_private_key_without_0x
RPC_URL=https://rpc.awakening.bdagscan.com
```

Deploy contract:
```bash
forge script script/DeployMedVault.s.sol \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --legacy
```

**Copy the contract address from output!**

### Step 5: Update Contract Address (1 minute)

```bash
cd frontend
nano .env
```

Update:
```env
VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddressHere
```

### Step 6: Run the App (1 minute)

```bash
npm run dev
```

Open: http://localhost:5173

### Step 7: Test It! (2 minutes)

1. **Connect MetaMask** in the app
2. **Upload** a test medical record (PDF/image)
3. **Grant access** to another wallet address
4. **Switch wallets** and access the record
5. **View audit log** to see all blockchain events

## 📚 Documentation Structure

Choose your path:

### 🏃 I want to start immediately
→ You're reading it! Just follow the steps above.

### 📖 I want detailed instructions
→ Read **DEPLOYMENT_GUIDE.md**

### 🏗️ I want to understand the architecture
→ Read **PROJECT_STRUCTURE.md**

### 📋 I want to see all files
→ Read **FILES_MANIFEST.md**

### 📘 I want the complete overview
→ Read **README.md**

## 🛠️ What's Included?

### Smart Contracts
- ✅ `MedVault.sol` - Main contract with access control
- ✅ `DeployMedVault.s.sol` - Deployment script
- ✅ `MedVault.t.sol` - Comprehensive tests

### Frontend Pages
- ✅ **Upload** - Encrypt & upload medical records
- ✅ **Access** - View records (for authorized personnel)
- ✅ **Audit Log** - View all blockchain events

### Utilities
- ✅ **Crypto Helpers** - AES-256-GCM + ECIES key wrapping
- ✅ **IPFS** - Pinata integration
- ✅ **Contract** - Smart contract interface

### Documentation
- ✅ 5 comprehensive markdown files
- ✅ Step-by-step guides
- ✅ Troubleshooting sections
- ✅ Architecture documentation

## 🔒 Security Features

- 🔐 **Client-side encryption** - Files never leave your browser unencrypted
- 🔗 **Blockchain access control** - Smart contracts enforce permissions
- 🔑 **Key wrapping** - Each recipient gets their own encrypted key
- 📝 **Complete audit trail** - Every action logged on-chain
- ♻️ **Revocable access** - Take back permissions anytime

## ⚠️ Important Notes

### This is a Proof-of-Concept

**DO NOT USE IN PRODUCTION** without:
- Professional security audit
- Healthcare compliance certification (HIPAA, GDPR)
- Legal review
- Enterprise key management
- Proper insurance

### For Development/Demo Only

This MVP demonstrates:
- Blockchain-based access control
- Client-side encryption
- IPFS storage
- Audit trails

## 🆘 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Foundry not found" | Run `init_medvault.sh` - it installs Foundry |
| "MetaMask not connected" | Install MetaMask browser extension |
| "Insufficient funds" | Get testnet BDAG from faucet |
| "IPFS upload failed" | Double-check Pinata API keys |
| "Transaction failed" | Use `--legacy` flag for BlockDAG |
| "Access denied" | Verify permission was granted on-chain |

## 🔗 Useful Links

- **BlockDAG Docs**: https://docs.blockdagnetwork.io/
- **BlockDAG IDE**: https://ide.awakening.bdagscan.com/
- **Block Explorer**: https://bdagscan.com
- **Pinata**: https://pinata.cloud/
- **Foundry**: https://book.getfoundry.sh/

## 🎬 90-Second Demo Flow

1. **[5s]** Connect wallet
2. **[25s]** Upload & encrypt medical record
3. **[20s]** Grant access to paramedic
4. **[25s]** Access record as paramedic
5. **[15s]** View audit log

## 🚀 Next Steps After Setup

1. ✅ Test upload functionality
2. ✅ Test access grants
3. ✅ Test access revocation
4. ✅ View audit logs
5. ✅ Try different file types
6. ✅ Read the architecture docs
7. ✅ Explore the smart contract code
8. ✅ Plan your own enhancements

## 💡 Pro Tips

- **Use test data only** - Never upload real medical records to testnet
- **Keep private keys safe** - Never commit them to git
- **Test with multiple accounts** - Use MetaMask account switcher
- **Check the audit log** - It shows all blockchain activity
- **Read the code** - All files are well-documented

## 📞 Need Help?

1. Check **DEPLOYMENT_GUIDE.md** for detailed troubleshooting
2. Review **PROJECT_STRUCTURE.md** for architecture questions
3. Read inline code comments for implementation details
4. Check BlockDAG documentation for network issues

## ✨ Features to Explore

After basic setup, try:
- Upload different file types (PDF, images, documents)
- Grant access to multiple addresses
- Revoke and re-grant access
- View real-time audit updates
- Check gas costs on BdagScan
- Test with mobile devices
- Review the cryptography implementation

## 🏆 You're Ready!

Your MedVault MVP is complete with:
- ✅ Smart contracts deployed
- ✅ Frontend running
- ✅ Wallet connected
- ✅ Ready to test

**Start with:** bash init_medvault.sh

**Questions?** Check the documentation files!

---

**Built with**: Solidity, React, ethers.js, IPFS, and BlockDAG

**License**: MIT (Educational/Demo Use)

**Version**: 0.1.0 MVP

🏥 **Securing Emergency Medical Records on the Blockchain**
