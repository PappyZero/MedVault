/**
 * IPFS Upload Utilities using Pinata
 * Handles uploading and fetching encrypted medical records to/from IPFS via Pinata API
 */

import { ethers } from 'ethers';

// Configuration
const CONFIG = {
  PINATA: {
    API_URL: 'https://api.pinata.cloud',
    GATEWAY_URL: import.meta.env.VITE_GATEWAY_URL || 'https://gateway.pinata.cloud',
    JWT: import.meta.env.VITE_PINATA_JWT,
    API_KEY: import.meta.env.VITE_PINATA_API_KEY,
    SECRET_KEY: import.meta.env.VITE_PINATA_SECRET_API_KEY
  },
  REQUEST_TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  GATEWAYS: [
    {
      name: 'pinata',
      url: (cid) => `${CONFIG.PINATA.GATEWAY_URL}/ipfs/${cid}`,
      options: (cid) => ({
        headers: CONFIG.PINATA.JWT ? {
          'Authorization': `Bearer ${CONFIG.PINATA.JWT}`
        } : {}
      })
    },
    {
      name: 'ipfs.io',
      url: (cid) => `https://ipfs.io/ipfs/${cid}`,
      options: () => ({})
    },
    {
      name: 'dweb',
      url: (cid) => `https://dweb.link/ipfs/${cid}`,
      options: () => ({})
    }
  ]
};

// Error class for IPFS operations
class IPFSError extends Error {
  constructor(message, { cause, code, details } = {}) {
    super(message);
    this.name = 'IPFSError';
    this.code = code;
    this.details = details;
    this.cause = cause;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, IPFSError);
    }
  }
}

// Utility Functions
const createTimeout = (ms) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  const cancel = () => clearTimeout(timeoutId);
  return { controller, timeoutId, cancel };
};

const withRetry = async (fn, { maxRetries = CONFIG.MAX_RETRIES, retryDelay = CONFIG.RETRY_DELAY } = {}) => {
  let lastError;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      attempt++;
      
      // Don't retry for these error types
      if (error.name === 'AbortError' || error.code === 'INVALID_CID') {
        break;
      }

      // Exponential backoff with jitter
      if (attempt < maxRetries) {
        const jitter = Math.random() * 1000;
        const delay = Math.min(
          retryDelay * Math.pow(2, attempt - 1) + jitter,
          30000 // Max 30s delay
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};

// Authentication
function getAuthHeaders() {
  if (CONFIG.PINATA.JWT) {
    const token = CONFIG.PINATA.JWT.startsWith('Bearer ') 
      ? CONFIG.PINATA.JWT.split(' ')[1] 
      : CONFIG.PINATA.JWT;
    return { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }
  
  if (CONFIG.PINATA.API_KEY && CONFIG.PINATA.SECRET_KEY) {
    return {
      'pinata_api_key': CONFIG.PINATA.API_KEY,
      'pinata_secret_api_key': CONFIG.PINATA.SECRET_KEY
    };
  }
  
  throw new IPFSError('Pinata credentials not configured', {
    code: 'AUTH_ERROR',
    details: 'Set VITE_PINATA_JWT or both VITE_PINATA_API_KEY and VITE_PINATA_SECRET_API_KEY'
  });
}

// CID Validation
const validateCID = (cid) => {
  if (!cid) {
    throw new IPFSError('No CID provided', { code: 'INVALID_CID' });
  }

  // Handle different CID formats
  let cleanCid;
  if (typeof cid === 'object') {
    if (cid.hash) {
      cleanCid = cid.hash;
    } else if (cid._hex) {
      cleanCid = ethers.utils.hexStripZeros(cid._hex).substring(2);
    } else if (cid.toString) {
      cleanCid = cid.toString().trim();
    } else {
      throw new IPFSError('Invalid CID object format', { 
        code: 'INVALID_CID',
        details: `Expected object with hash or _hex property, got: ${JSON.stringify(cid)}`
      });
    }
  } else {
    cleanCid = String(cid).trim();
  }

  // Basic validation
  cleanCid = cleanCid
    .replace(/^\/+|\/+$/g, '')
    .replace(/^ipfs\//, '')
    .replace(/\s+/g, '');

  if (!/^[a-zA-Z0-9]{46,128}$/.test(cleanCid)) {
    throw new IPFSError(`Invalid CID format: ${cleanCid}`, {
      code: 'INVALID_CID',
      details: 'CID must be 46-128 alphanumeric characters'
    });
  }

  return cleanCid;
};

// Network Utilities
const fetchWithTimeout = async (url, options = {}) => {
  const { controller, timeoutId, cancel } = createTimeout(CONFIG.REQUEST_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    cancel();
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json().catch(() => ({}));
      } catch (e) {
        errorData = { error: await response.text() };
      }
      
      throw new IPFSError(`Request failed with status ${response.status}`, {
        code: `HTTP_${response.status}`,
        details: errorData.error?.details || response.statusText,
        response
      });
    }
    
    return response;
  } catch (error) {
    cancel();
    
    if (error.name === 'AbortError') {
      throw new IPFSError(`Request to ${url} timed out after ${CONFIG.REQUEST_TIMEOUT}ms`, {
        code: 'TIMEOUT',
        cause: error
      });
    }
    
    throw new IPFSError(`Network request failed: ${error.message}`, {
      code: 'NETWORK_ERROR',
      cause: error
    });
  }
};

// Core IPFS Functions
export const uploadToIPFS = async (blob, filename, metadata = {}) => {
  if (!(blob instanceof Blob)) {
    throw new IPFSError('Invalid file data. Expected Blob or File object', {
      code: 'INVALID_INPUT'
    });
  }

  const formData = new FormData();
  formData.append('file', blob, filename);

  const pinataMetadata = {
    name: filename,
    keyvalues: {
      uploadedAt: new Date().toISOString(),
      encrypted: 'true',
      originalSize: blob.size,
      mimeType: blob.type || 'application/octet-stream',
      ...metadata
    }
  };

  formData.append('pinataMetadata', JSON.stringify(pinataMetadata));
  formData.append('pinataOptions', JSON.stringify({
    cidVersion: 1,
    wrapWithDirectory: false
  }));

  const headers = getAuthHeaders();
  delete headers['Content-Type']; // Let browser set content type with boundary

  try {
    const response = await withRetry(
      () => fetchWithTimeout(`${CONFIG.PINATA.API_URL}/pinning/pinFileToIPFS`, {
        method: 'POST',
        headers,
        body: formData
      }),
      { maxRetries: 3 } // More retries for uploads
    );

    const result = await response.json();

    if (!result.IpfsHash) {
      throw new IPFSError('Invalid response from IPFS service', {
        code: 'INVALID_RESPONSE',
        details: 'Missing IpfsHash in response'
      });
    }

    return {
      cid: result.IpfsHash,
      url: `${CONFIG.PINATA.GATEWAY_URL}/ipfs/${result.IpfsHash}`,
      size: result.PinSize,
      timestamp: result.Timestamp,
      gatewayUrls: CONFIG.GATEWAYS.map(g => g.url(result.IpfsHash))
    };
  } catch (error) {
    console.error('IPFS upload error:', {
      error: error.message,
      filename,
      size: blob.size,
      type: blob.type,
      metadata
    });

    if (error.name !== 'IPFSError') {
      error = new IPFSError(`Upload failed: ${error.message}`, {
        code: 'UPLOAD_ERROR',
        cause: error
      });
    }
    
    throw error;
  }
};

export const fetchFromIPFS = async (cidOrHash, options = {}) => {
  const { signal, timeout = CONFIG.REQUEST_TIMEOUT } = options;
  const cid = validateCID(cidOrHash);
  let lastError;

  const fetchOptions = {
    method: 'GET',
    signal,
    timeout
  };

  for (const gateway of CONFIG.GATEWAYS) {
    try {
      const url = gateway.url(cid);
      console.log(`Trying ${gateway.name} gateway: ${url}`);
      
      const response = await withRetry(
        async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);
          
          if (signal) {
            signal.addEventListener('abort', () => controller.abort());
          }

          try {
            const response = await fetch(url, {
              ...fetchOptions,
              ...gateway.options(cid),
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response;
          } catch (err) {
            clearTimeout(timeoutId);
            throw err;
          }
        },
        { maxRetries: 2 } // Fewer retries per gateway
      );

      if (!response.ok) {
        throw new IPFSError(`Gateway ${gateway.name} returned ${response.status}`, {
          code: `GATEWAY_${response.status}`,
          gateway: gateway.name
        });
      }

      const blob = await response.blob();
      
      if (!blob || blob.size === 0) {
        throw new IPFSError('Empty response from gateway', {
          code: 'EMPTY_RESPONSE',
          gateway: gateway.name
        });
      }

      return {
        blob,
        cid,
        gateway: gateway.name,
        size: blob.size,
        type: blob.type
      };
    } catch (error) {
      console.warn(`Failed to fetch from ${gateway.name}:`, error.message);
      lastError = error;
    }
  }

  throw new IPFSError('All IPFS gateways failed', {
    code: 'ALL_GATEWAYS_FAILED',
    cause: lastError,
    cid
  });
};

// JSON Helpers
export const uploadJSONToIPFS = async (data, filename = 'data.json', metadata = {}) => {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { 
      type: 'application/json' 
    });
    
    return await uploadToIPFS(blob, filename, {
      ...metadata,
      type: 'json',
      originalData: {
        ...(metadata.originalData || {}),
        keys: Object.keys(data)
      }
    });
  } catch (error) {
    throw new IPFSError(`Failed to upload JSON: ${error.message}`, {
      code: 'JSON_UPLOAD_ERROR',
      cause: error
    });
  }
};

export const fetchJSONFromIPFS = async (cid, options) => {
  try {
    const { blob } = await fetchFromIPFS(cid, options);
    const text = await blob.text();
    
    try {
      return {
        data: JSON.parse(text),
        cid,
        size: blob.size
      };
    } catch (parseError) {
      throw new IPFSError('Failed to parse JSON from IPFS', {
        code: 'INVALID_JSON',
        cause: parseError,
        cid,
        textPreview: text.substring(0, 200) + (text.length > 200 ? '...' : '')
      });
    }
  } catch (error) {
    if (error.name !== 'IPFSError') {
      error = new IPFSError(`Failed to fetch JSON: ${error.message}`, {
        code: 'FETCH_JSON_ERROR',
        cause: error,
        cid
      });
    }
    throw error;
  }
};

// Connection Test
export const testPinataConnection = async () => {
  try {
    const response = await withRetry(() =>
      fetchWithTimeout(`${CONFIG.PINATA.API_URL}/data/testAuthentication`, {
        method: 'GET',
        headers: getAuthHeaders()
      })
    );
    
    if (!response.ok) {
      throw new IPFSError(`API returned ${response.status}`, {
        code: `API_ERROR_${response.status}`
      });
    }
    
    const data = await response.json();
    return {
      authenticated: data.authenticated === true,
      user: data.pinata_pin_requirements || {}
    };
  } catch (error) {
    if (error.name !== 'IPFSError') {
      error = new IPFSError(`Connection test failed: ${error.message}`, {
        code: 'CONNECTION_TEST_FAILED',
        cause: error
      });
    }
    throw error;
  }
};

// Get gateway URL for a CID
export const getGatewayUrl = (cid, gatewayIndex = 0) => {
  const gateway = CONFIG.GATEWAYS[gatewayIndex] || CONFIG.GATEWAYS[0];
  return gateway.url(validateCID(cid));
};

// Get all gateway URLs for a CID
export const getAllGatewayUrls = (cid) => {
  return CONFIG.GATEWAYS.map(gateway => ({
    name: gateway.name,
    url: gateway.url(validateCID(cid))
  }));
};

// Export as default object
export default {
  uploadToIPFS,
  fetchFromIPFS,
  uploadJSONToIPFS,
  fetchJSONFromIPFS,
  testPinataConnection,
  getGatewayUrl,
  getAllGatewayUrls,
  validateCID,
  CONFIG
};