# MedVault MVP - Quick Start Guide

## 🚀 One-Command Setup

```bash
bash init_medvault.sh
```

This single command will set up your entire development environment!

## 📋 What Gets Installed

- ✅ Foundry (smart contract development framework)
- ✅ Frontend dependencies (React, ethers.js, etc.)
- ✅ Compiles smart contracts
- ✅ Runs contract tests
- ✅ Creates environment files

## ⚙️ Quick Configuration (3 steps)

### 1. Get Pinata API Keys (2 min)

1. Go to https://pinata.cloud/ → Sign up (free)
2. API Keys → New Key → Full permissions
3. Copy API Key and Secret

### 2. Configure Frontend

```bash
cd frontend
nano .env  # or use your favorite editor
```

Paste:
```env
VITE_PINATA_API_KEY=your_key_here
VITE_PINATA_SECRET_API_KEY=your_secret_here
VITE_RPC_URL=https://rpc.awakening.bdagscan.com
VITE_CHAIN_ID=1043
VITE_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
```

### 3. Deploy Smart Contract

Get your MetaMask private key:
- MetaMask → ⋮ → Account Details → Export Private Key

```bash
cd ..
nano .env
```

Add:
```env
PRIVATE_KEY=your_private_key_without_0x
RPC_URL=https://rpc.awakening.bdagscan.com
```

Deploy:
```bash
forge script script/DeployMedVault.s.sol \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --legacy
```

**Copy the deployed contract address!**

Update `frontend/.env`:
```env
VITE_CONTRACT_ADDRESS=0xYourContractAddress
```

## 🎮 Run the App

```bash
cd frontend
npm run dev
```

Open http://localhost:5173

## 🧪 Test It Out (2 min)

1. **Connect Wallet** → Approve MetaMask
2. **Upload a file** → Select PDF/image → Encrypt & Upload
3. **Grant access** → Enter friend's address → Grant
4. **Switch accounts** → Access the record as paramedic
5. **View audit log** → See all events on blockchain

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| "MetaMask not found" | Install MetaMask extension |
| "Insufficient funds" | Get testnet BDAG from faucet |
| "IPFS upload failed" | Check Pinata credentials |
| "Access denied" | Verify access was granted on-chain |

## 📚 Documentation

- **Complete Guide:** See DEPLOYMENT_GUIDE.md
- **Project Structure:** See PROJECT_STRUCTURE.md
- **Main README:** See README.md

## ⚠️ Important Security Notice

**This is a proof-of-concept. DO NOT use in production without:**
- Professional security audit
- Healthcare compliance certification
- Legal review

## 🔗 Useful Links

- BlockDAG Docs: https://docs.blockdagnetwork.io/
- BlockDAG IDE: https://ide.awakening.bdagscan.com/
- Explorer: https://bdagscan.com
- Pinata Docs: https://docs.pinata.cloud/

## 💡 Need Help?

Check the troubleshooting sections in:
- DEPLOYMENT_GUIDE.md (detailed troubleshooting)
- README.md (FAQ and common issues)

---

**Ready in under 10 minutes!** 🎉
