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

/**
 * Creates a contract instance with the provided signer or provider
 * @param {ethers.Signer|ethers.Provider} signerOrProvider - The signer or provider to use with the contract
 * @returns {ethers.Contract} The contract instance
 */
export function getContract(signerOrProvider) {
  if (!signerOrProvider) {
    throw new Error('Provider or signer required');
  }
  return new ethers.Contract(
    CONTRACT_ADDRESS,
    CONTRACT_ABI,
    signerOrProvider
  );
}

/**
 * Validates if the provided address is a valid Ethereum address
 * @param {string} address - The address to validate
 * @returns {boolean} True if the address is valid, false otherwise
 */
export function isValidAddress(address) {
  return ethers.isAddress(address);
}

/**
 * Converts an address to a checksummed address
 * @param {string} address - The address to convert
 * @returns {string} The checksummed address
 */
export function toChecksumAddress(address) {
  return ethers.getAddress(address);
}

/**
 * Gets the current signer's address
 * @param {ethers.Provider} provider - The provider to use
 * @returns {Promise<string>} The current signer's address
 */
export async function getSignerAddress(provider) {
  if (!provider) {
    throw new Error('Provider is required');
  }
  const signer = await provider.getSigner();
  return signer.getAddress();
}