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
  const plaintext = typeof data === 'string'
    ? new TextEncoder().encode(data)
    : data;

  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128
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
 */
function derivePublicKeyFromAddress(address) {
  // WARNING: This is a simplified derivation for demo purposes.
  const hash = ethers.keccak256(ethers.toUtf8Bytes(address.toLowerCase()));
  const hashBytes = ethers.getBytes(hash);
  const privKey = hashBytes.slice(0, 32);
  return secp256k1.getPublicKey(privKey, true);
}

/**
 * Wrap AES key for a recipient using ECIES-like scheme
 */
export async function wrapKeyForRecipient(aesKeyRaw, recipientAddress) {
  // Generate ephemeral key pair
  const ephemeralPrivKey = secp256k1.utils.randomPrivateKey();
  const ephemeralPubKey = secp256k1.getPublicKey(ephemeralPrivKey, true);

  // Derive recipient's public key
  const recipientPubKey = derivePublicKeyFromAddress(recipientAddress);

  // ECDH: compute shared secret
  const sharedPoint = secp256k1.getSharedSecret(ephemeralPrivKey, recipientPubKey, true);

  // Derive encryption key from shared secret
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
 */
export async function unwrapKeyWithSigner(wrappedKeyHex, signerAddress) {
  const wrapped = ethers.getBytes(wrappedKeyHex);
  const ephemeralPubKey = wrapped.slice(0, 33);
  const iv = wrapped.slice(33, 45);
  const ciphertext = wrapped.slice(45);

  // Derive recipient's private key (simplified)
  const hash = ethers.keccak256(ethers.toUtf8Bytes(signerAddress.toLowerCase()));
  const hashBytes = ethers.getBytes(hash);
  const recipientPrivKey = hashBytes.slice(0, 32);

  // ECDH: compute shared secret
  const sharedPoint = secp256k1.getSharedSecret(recipientPrivKey, ephemeralPubKey, true);

  // Derive encryption key from shared secret
  const sharedSecretHash = await crypto.subtle.digest('SHA-256', sharedPoint.slice(1, 33));
  const encryptionKey = await importAESKey(new Uint8Array(sharedSecretHash));

  // Decrypt the AES key
  return await decryptAES(ciphertext, encryptionKey, iv);
}

// ============================================
// File Encryption Helpers
// ============================================

/**
 * Encrypt a file (blob) and return encrypted blob + metadata
 */
export async function encryptFile(file) {
  const fileData = await file.arrayBuffer();
  const fileBytes = new Uint8Array(fileData);
  const aesKey = await generateAESKey();
  const { ciphertext, iv } = await encryptAES(fileBytes, aesKey);

  const metadata = {
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    iv: ethers.hexlify(iv),
    encryptedAt: new Date().toISOString()
  };

  const metadataStr = JSON.stringify(metadata);
  const metadataBytes = new TextEncoder().encode(metadataStr);
  const metadataLength = new Uint32Array([metadataBytes.length]);

  const packagedData = new Uint8Array(4 + metadataBytes.length + ciphertext.length);
  packagedData.set(new Uint8Array(metadataLength.buffer), 0);
  packagedData.set(metadataBytes, 4);
  packagedData.set(ciphertext, 4 + metadataBytes.length);

  const encryptedBlob = new Blob([packagedData], { type: 'application/octet-stream' });
  return { encryptedBlob, aesKey, metadata };
}

/**
 * Decrypt a file blob
 */
export async function decryptFile(encryptedBlob, aesKey) {
  const packagedData = new Uint8Array(await encryptedBlob.arrayBuffer());
  const metadataLength = new Uint32Array(packagedData.slice(0, 4).buffer)[0];
  const metadataBytes = packagedData.slice(4, 4 + metadataLength);
  const ciphertext = packagedData.slice(4 + metadataLength);
  const metadata = JSON.parse(new TextDecoder().decode(metadataBytes));
  const iv = ethers.getBytes(metadata.iv);
  const decryptedBytes = await decryptAES(ciphertext, aesKey, iv);
  const file = new Blob([decryptedBytes], { type: metadata.fileType });
  return { file, metadata };
}

// ============================================
// Utility Functions
// ============================================

export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

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