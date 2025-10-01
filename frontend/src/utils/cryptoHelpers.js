import * as secp256k1 from '@noble/secp256k1';
import { ethers } from 'ethers';

/**
 * Crypto Helpers for MedVault
 *
 * SECURITY WARNING: This is a proof-of-concept implementation.
 * DO NOT use in production without a professional security audit.
 *
 * Features:
 * - AES-256-GCM encryption for medical records
 * - ECIES-like key wrapping using secp256k1
 * - Web Crypto API for authenticated encryption
 */

// ============================================
// AES-256-GCM Encryption
// ============================================

/**
 * Generate a random AES-256 key
 * @returns {Promise<CryptoKey>} AES key for encryption
 */
export async function generateAESKey() {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Export AES key as raw bytes
 * @param {CryptoKey} key - AES key to export
 * @returns {Promise<Uint8Array>} Raw key bytes
 */
export async function exportAESKeyRaw(key) {
  const exported = await crypto.subtle.exportKey('raw', key);
  return new Uint8Array(exported);
}

/**
 * Import AES key from raw bytes
 * @param {Uint8Array} rawKey - Raw key bytes
 * @returns {Promise<CryptoKey>} Imported AES key
 */
export async function importAESKey(rawKey) {
  return await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-256-GCM
 * @param {string|Uint8Array} data - Data to encrypt
 * @param {CryptoKey} key - AES key
 * @returns {Promise<{ciphertext: Uint8Array, iv: Uint8Array}>} Encrypted data and IV
 */
export async function encryptAES(data, key) {
  // Convert string to Uint8Array if needed
  const plaintext = typeof data === 'string'
    ? new TextEncoder().encode(data)
    : data;

  // Generate random IV (12 bytes recommended for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128 // 128-bit authentication tag
    },
    key,
    plaintext
  );

  return {
    ciphertext: new Uint8Array(ciphertext),
    iv: iv
  };
}

/**
 * Decrypt data using AES-256-GCM
 * @param {Uint8Array} ciphertext - Encrypted data
 * @param {CryptoKey} key - AES key
 * @param {Uint8Array} iv - Initialization vector
 * @returns {Promise<Uint8Array>} Decrypted data
 */
export async function decryptAES(ciphertext, key, iv) {
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128
    },
    key,
    ciphertext
  );

  return new Uint8Array(plaintext);
}

// ============================================
// ECIES-like Key Wrapping
// ============================================

/**
 * Derive public key from Ethereum address
 * Note: This is a simplified approach. In production, you'd need the actual public key.
 * For demo purposes, we use a deterministic derivation.
 *
 * @param {string} address - Ethereum address
 * @returns {Uint8Array} Derived public key (33 bytes compressed)
 */
function derivePublicKeyFromAddress(address) {
  // WARNING: This is a simplified derivation for demo purposes.
  // In production, you'd need to request the actual public key from the recipient
  // or use a key exchange protocol.

  // Create a deterministic but unique key based on address
  const hash = ethers.keccak256(ethers.toUtf8Bytes(address.toLowerCase()));
  const hashBytes = ethers.getBytes(hash);

  // Take first 32 bytes as private key and derive public key
  // This is NOT secure for production - just for demo
  const privKey = hashBytes.slice(0, 32);
  const pubKey = secp256k1.getPublicKey(privKey, true); // compressed

  return pubKey;
}

/**
 * Wrap AES key for a recipient using ECIES-like scheme
 *
 * WARNING: This is a simplified implementation for demonstration.
 * Production code should use a proper ECIES library and actual public keys.
 *
 * @param {Uint8Array} aesKeyRaw - Raw AES key bytes
 * @param {string} recipientAddress - Ethereum address of recipient
 * @returns {Promise<string>} Hex-encoded wrapped key
 */
export async function wrapKeyForRecipient(aesKeyRaw, recipientAddress) {
  // Generate ephemeral key pair
  const ephemeralPrivKey = secp256k1.utils.randomPrivateKey();
  const ephemeralPubKey = secp256k1.getPublicKey(ephemeralPrivKey, true);

  // Derive recipient's public key (simplified)
  const recipientPubKey = derivePublicKeyFromAddress(recipientAddress);

  // ECDH: compute shared secret
  const sharedPoint = secp256k1.getSharedSecret(ephemeralPrivKey, recipientPubKey, true);

  // Derive encryption key from shared secret using SHA-256
  const sharedSecretHash = await crypto.subtle.digest('SHA-256', sharedPoint.slice(1, 33));
  const encryptionKey = await importAESKey(new Uint8Array(sharedSecretHash));

  // Encrypt the AES key
  const { ciphertext, iv } = await encryptAES(aesKeyRaw, encryptionKey);

  // Package: [ephemeralPubKey (33) | iv (12) | ciphertext (32 + 16 tag)]
  const wrapped = new Uint8Array(33 + 12 + ciphertext.length);
  wrapped.set(ephemeralPubKey, 0);
  wrapped.set(iv, 33);
  wrapped.set(ciphertext, 45);

  return ethers.hexlify(wrapped);
}

/**
 * Unwrap AES key using signer's private key
 *
 * WARNING: This requires access to the private key, which is handled by MetaMask.
 * This implementation uses a workaround for demo purposes.
 *
 * @param {string} wrappedKeyHex - Hex-encoded wrapped key
 * @param {string} signerAddress - Address of the signer
 * @returns {Promise<Uint8Array>} Unwrapped AES key bytes
 */
export async function unwrapKeyWithSigner(wrappedKeyHex, signerAddress) {
  const wrapped = ethers.getBytes(wrappedKeyHex);

  // Parse the wrapped key package
  const ephemeralPubKey = wrapped.slice(0, 33);
  const iv = wrapped.slice(33, 45);
  const ciphertext = wrapped.slice(45);

  // Derive recipient's private key (simplified - same as in wrapKeyForRecipient)
  // In production, this would use the actual wallet's private key via signing
  const hash = ethers.keccak256(ethers.toUtf8Bytes(signerAddress.toLowerCase()));
  const hashBytes = ethers.getBytes(hash);
  const recipientPrivKey = hashBytes.slice(0, 32);

  // ECDH: compute shared secret
  const sharedPoint = secp256k1.getSharedSecret(recipientPrivKey, ephemeralPubKey, true);

  // Derive encryption key from shared secret
  const sharedSecretHash = await crypto.subtle.digest('SHA-256', sharedPoint.slice(1, 33));
  const encryptionKey = await importAESKey(new Uint8Array(sharedSecretHash));

  // Decrypt the AES key
  const aesKeyRaw = await decryptAES(ciphertext, encryptionKey, iv);

  return aesKeyRaw;
}

// ============================================
// File Encryption Helpers
// ============================================

/**
 * Encrypt a file (blob) and return encrypted blob + metadata
 * @param {File|Blob} file - File to encrypt
 * @returns {Promise<{encryptedBlob: Blob, aesKey: CryptoKey, metadata: object}>}
 */
export async function encryptFile(file) {
  // Read file as array buffer
  const fileData = await file.arrayBuffer();
  const fileBytes = new Uint8Array(fileData);

  // Generate AES key
  const aesKey = await generateAESKey();

  // Encrypt file
  const { ciphertext, iv } = await encryptAES(fileBytes, aesKey);

  // Create metadata
  const metadata = {
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    iv: ethers.hexlify(iv),
    encryptedAt: new Date().toISOString()
  };

  // Combine metadata + encrypted data
  const metadataStr = JSON.stringify(metadata);
  const metadataBytes = new TextEncoder().encode(metadataStr);
  const metadataLength = new Uint32Array([metadataBytes.length]);

  // Package: [metadataLength (4) | metadata | ciphertext]
  const packagedData = new Uint8Array(4 + metadataBytes.length + ciphertext.length);
  packagedData.set(new Uint8Array(metadataLength.buffer), 0);
  packagedData.set(metadataBytes, 4);
  packagedData.set(ciphertext, 4 + metadataBytes.length);

  const encryptedBlob = new Blob([packagedData], { type: 'application/octet-stream' });

  return { encryptedBlob, aesKey, metadata };
}

/**
 * Decrypt a file blob
 * @param {Blob} encryptedBlob - Encrypted file blob
 * @param {CryptoKey} aesKey - AES decryption key
 * @returns {Promise<{file: Blob, metadata: object}>}
 */
export async function decryptFile(encryptedBlob, aesKey) {
  // Read encrypted blob
  const packagedData = new Uint8Array(await encryptedBlob.arrayBuffer());

  // Parse package
  const metadataLength = new Uint32Array(packagedData.slice(0, 4).buffer)[0];
  const metadataBytes = packagedData.slice(4, 4 + metadataLength);
  const ciphertext = packagedData.slice(4 + metadataLength);

  // Parse metadata
  const metadataStr = new TextDecoder().decode(metadataBytes);
  const metadata = JSON.parse(metadataStr);

  // Decrypt file
  const iv = ethers.getBytes(metadata.iv);
  const decryptedBytes = await decryptAES(ciphertext, aesKey, iv);

  // Create blob with original type
  const file = new Blob([decryptedBytes], { type: metadata.fileType });

  return { file, metadata };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Convert blob to data URL for display
 */
export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Download blob as file
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
