import { ethers } from 'ethers';

// Update this address after deploying the contract
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';

export const CONTRACT_ABI = [
  "function uploadRecord(string calldata cid) external",
  "function grantAccess(address grantee, bytes calldata wrappedKey) external",
  "function revokeAccess(address grantee) external",
  "function getRecord(address patient) external returns (string memory cid)",
  "function getWrappedKey(address patient) external view returns (bytes memory wrappedKey)",
  "function checkAccess(address patient, address accessor) external view returns (bool)",
  "function getRecordCID(address patient) external view returns (string memory cid)",
  "function hasRecord(address patient) external view returns (bool)",
  "event RecordUploaded(address indexed patient, string cid, uint256 timestamp)",
  "event AccessUpdated(address indexed patient, address indexed grantee, bool granted, uint256 timestamp)",
  "event AccessAttempt(address indexed accessor, address indexed patient, bool success, uint256 timestamp)"
];

export function getContract(signerOrProvider) {
  if (!signerOrProvider) {
    throw new Error('Provider or signer required');
  }
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
}

export function isValidAddress(address) {
  return ethers.isAddress(address);
}
