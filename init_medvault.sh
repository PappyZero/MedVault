#!/bin/bash

# MedVault MVP - Initialization Script
# This script sets up the complete MedVault development environment

set -e

echo "=========================================="
echo "MedVault MVP - Initialization"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Foundry is installed
echo "Checking dependencies..."
if ! command -v forge &> /dev/null; then
    echo -e "${YELLOW}Foundry not found. Installing...${NC}"
    curl -L https://foundry.paradigm.xyz | bash
    source ~/.bashrc
    foundryup
else
    echo -e "${GREEN}✓ Foundry installed${NC}"
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
else
    echo -e "${GREEN}✓ Node.js installed ($(node -v))${NC}"
fi

echo ""
echo "Installing Foundry dependencies..."
cd contracts-foundry
forge install --no-commit foundry-rs/forge-std 2>/dev/null || echo "Forge dependencies already installed"
echo -e "${GREEN}✓ Foundry dependencies ready${NC}"

echo ""
echo "Installing frontend dependencies..."
cd ../frontend
npm install
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
cd ..

echo ""
echo "Setting up environment files..."
if [ ! -f frontend/.env ]; then
    cp frontend/.env.example frontend/.env
    echo -e "${YELLOW}⚠ Created frontend/.env file - please configure with Pinata credentials${NC}"
else
    echo -e "${GREEN}✓ frontend/.env file exists${NC}"
fi

echo ""
echo "Compiling smart contracts..."
cd contracts-foundry
forge build
echo -e "${GREEN}✓ Contracts compiled${NC}"

echo ""
echo "Running contract tests..."
forge test -vvvv
echo -e "${GREEN}✓ Tests passed${NC}"

echo ""
echo "=========================================="
echo -e "${GREEN}MedVault MVP Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Next Steps:"
echo ""
echo "1. Configure environment variables:"
echo "   - Edit .env with your private key"
echo "   - Edit frontend/.env with Pinata API credentials"
echo ""
echo "2. Deploy smart contract:"
echo "   forge script script/DeployMedVault.s.sol --rpc-url \$RPC_URL --private-key \$PRIVATE_KEY --broadcast --legacy"
echo ""
echo "3. Update contract address:"
echo "   - Edit frontend/src/utils/contract.js"
echo "   - Set CONTRACT_ADDRESS to your deployed address"
echo ""
echo "4. Start frontend development server:"
echo "   cd frontend && npm run dev"
echo ""
echo "5. Access application:"
echo "   Open http://localhost:5173 in your browser"
echo ""
echo "=========================================="
echo "Documentation: See README.md"
echo "BlockDAG Awakening RPC: https://rpc.awakening.bdagscan.com"
echo "BlockDAG IDE: https://ide.awakening.bdagscan.com/"
echo "=========================================="
