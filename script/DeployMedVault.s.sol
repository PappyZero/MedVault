// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../contracts/MedVault.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title DeployMedVault
 * @notice Foundry script to deploy MedVault contract to BlockDAG Awakening testnet
 * @dev Run with: forge script script/DeployMedVault.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast --legacy
 */
contract DeployMedVault is Script {
    function run() external {
        // Load PRIVATE_KEY as 0x-prefixed hex string
        bytes memory pkBytes = vm.envBytes("PRIVATE_KEY");
        require(pkBytes.length == 32, "Invalid PRIVATE_KEY length; expected 32 bytes hex");
        uint256 deployerPrivateKey = uint256(bytes32(pkBytes));
        address deployer = vm.addr(deployerPrivateKey);

        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);

        // Deploy the implementation contract
        MedVault implementation = new MedVault();
        
        // Encode the initialize function call
        bytes memory data = abi.encodeWithSignature("initialize()");
        
        // Deploy the proxy and set the implementation
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            data
        );
        
        // Wrap the proxy in the MedVault ABI
        // MedVault medvault = MedVault(address(proxy));

        // Stop broadcasting
        vm.stopBroadcast();

        // Log deployment information
        console.log("===========================================");
        console.log("MedVault Deployment Summary");
        console.log("===========================================");
        console.log("Network: BlockDAG Awakening Testnet");
        console.log("Chain ID: 1043");
        console.log("Implementation Address:", address(implementation));
        console.log("Proxy Address (use this):", address(proxy));
        console.log("Deployer:", deployer);
        console.log("===========================================");
        console.log("");
        console.log("Next Steps:");
        console.log("1. Update frontend/src/utils/contract.js with the proxy address");
        console.log("2. Verify implementation contract on BdagScan");
        console.log("3. Call initialize() on the proxy to complete setup");
        console.log("4. Test contract functions via frontend or Foundry tests");
        console.log("===========================================");
    }
}