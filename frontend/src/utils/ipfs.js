/**
 * IPFS Upload Utilities using Pinata
 *
 * Handles uploading encrypted medical records to IPFS via Pinata API
 */

const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
const PINATA_SECRET_API_KEY = import.meta.env.VITE_PINATA_SECRET_API_KEY;
const PINATA_API_URL = 'https://api.pinata.cloud';

/**
 * Upload a blob to IPFS via Pinata
 * @param {Blob} blob - File blob to upload
 * @param {string} filename - Name for the file
 * @param {object} metadata - Optional metadata to attach
 * @returns {Promise<{cid: string, url: string}>} IPFS CID and gateway URL
 */
export async function uploadToIPFS(blob, filename, metadata = {}) {
  if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
    throw new Error('Pinata API credentials not configured. Please set VITE_PINATA_API_KEY and VITE_PINATA_SECRET_API_KEY in .env file.');
  }

  const formData = new FormData();
  formData.append('file', blob, filename);

  // Add metadata
  const pinataMetadata = {
    name: filename,
    keyvalues: {
      uploadedAt: new Date().toISOString(),
      encrypted: 'true',
      ...metadata
    }
  };
  formData.append('pinataMetadata', JSON.stringify(pinataMetadata));

  // Add pinning options
  const pinataOptions = {
    cidVersion: 1
  };
  formData.append('pinataOptions', JSON.stringify(pinataOptions));

  try {
    const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
      method: 'POST',
      headers: {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_API_KEY
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload to IPFS');
    }

    const result = await response.json();

    return {
      cid: result.IpfsHash,
      url: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
      size: result.PinSize,
      timestamp: result.Timestamp
    };
  } catch (error) {
    console.error('IPFS upload error:', error);
    throw new Error(`Failed to upload to IPFS: ${error.message}`);
  }
}

/**
 * Fetch a file from IPFS
 * @param {string} cid - IPFS content identifier
 * @returns {Promise<Blob>} File blob
 */
export async function fetchFromIPFS(cid) {
  const url = `https://gateway.pinata.cloud/ipfs/${cid}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
    }

    return await response.blob();
  } catch (error) {
    console.error('IPFS fetch error:', error);
    throw new Error(`Failed to fetch from IPFS: ${error.message}`);
  }
}

/**
 * Check Pinata connection and API key validity
 * @returns {Promise<boolean>} True if connection is valid
 */
export async function testPinataConnection() {
  if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
    return false;
  }

  try {
    const response = await fetch(`${PINATA_API_URL}/data/testAuthentication`, {
      method: 'GET',
      headers: {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_API_KEY
      }
    });

    return response.ok;
  } catch (error) {
    console.error('Pinata connection test failed:', error);
    return false;
  }
}

/**
 * Upload JSON data to IPFS
 * @param {object} data - JSON data to upload
 * @param {string} name - Name for the JSON file
 * @returns {Promise<{cid: string, url: string}>} IPFS CID and gateway URL
 */
export async function uploadJSONToIPFS(data, name = 'data.json') {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });

  return uploadToIPFS(blob, name, { type: 'json' });
}

/**
 * Fetch and parse JSON from IPFS
 * @param {string} cid - IPFS content identifier
 * @returns {Promise<object>} Parsed JSON data
 */
export async function fetchJSONFromIPFS(cid) {
  const blob = await fetchFromIPFS(cid);
  const text = await blob.text();
  return JSON.parse(text);
}
