// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../contracts/MedVault.sol";

/**
 * @title DeployMedVault
 * @notice Foundry script to deploy MedVault contract to BlockDAG Awakening testnet
 * @dev Run with: forge script script/DeployMedVault.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast --legacy
 */
contract DeployMedVault is Script {
    function run() external {
        // Load environment variables
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);

        // Deploy MedVault contract
        MedVault medvault = new MedVault();

        // Stop broadcasting
        vm.stopBroadcast();

        // Log deployment information
        console.log("===========================================");
        console.log("MedVault Deployment Summary");
        console.log("===========================================");
        console.log("Network: BlockDAG Awakening Testnet");
        console.log("Chain ID: 1043");
        console.log("Contract Address:", address(medvault));
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("===========================================");
        console.log("");
        console.log("Next Steps:");
        console.log("1. Update frontend/src/utils/contract.js with contract address");
        console.log("2. Verify contract on BdagScan (if available)");
        console.log("3. Test contract functions via frontend or Foundry tests");
        console.log("===========================================");
    }
}
