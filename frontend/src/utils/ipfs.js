import { pinata } from './pinata';

/**
 * IPFS Upload Utilities using Pinata SDK v2
 *
 * Handles uploading encrypted medical records to IPFS via Pinata API
 */

/**
 * Upload a blob to IPFS via Pinata SDK v2
 * @param {Blob} blob - File blob to upload
 * @param {string} filename - Name for the file
 * @param {object} metadata - Optional metadata to attach
 * @returns {Promise<{cid: string, url: string}>} IPFS CID and gateway URL
 */
export async function uploadToIPFS(blob, filename, metadata = {}) {
  const urlResponse = await fetch(`${import.meta.env.VITE_SERVER_URL}/presigned_url`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const { url:presignedUrl } = await urlResponse.json();
  try {
    const result = await pinata.upload.public.file(blob, {
      metadata: {
        name: filename,
        keyvalues: {
          uploadedAt: new Date().toISOString(),
          encrypted: 'true',
          ...metadata
        }
      }
    }).url(presignedUrl);

    return {
      cid: result.cid,
      url: `https://${pinata.config.pinataGateway}/ipfs/${result.cid}`,
      size: result.size,
      timestamp: result.created_at
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
  try {
    // Use a CORS-enabled IPFS gateway
    const url = `https://ipfs.io/ipfs/${cid}`;

    console.log('Fetching from IPFS:', url);

    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Accept': 'application/octet-stream',
      }
    });

    if (!response.ok) {
      console.error('IPFS fetch failed:', response.status, response.statusText);

      // If rate limited or CORS blocked, try alternative gateway
      if (response.status === 429 || response.status === 0) {
        console.log('Trying alternative gateway...');
        return await fetchFromIPFSAlternative(cid);
      }

      throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
    }

    // Check if response is actually the file content (not HTML)
    const contentType = response.headers.get('content-type');
    console.log('Response content-type:', contentType);

    if (contentType && contentType.includes('text/html')) {
      throw new Error('Received HTML response instead of file content. File may not exist or gateway may be having issues.');
    }

    const blob = await response.blob();
    console.log('Blob size:', blob.size, 'type:', blob.type);

    return blob;
  } catch (error) {
    console.error('IPFS fetch error:', error);
    throw new Error(`Failed to fetch from IPFS: ${error.message}`);
  }
}

async function fetchFromIPFSAlternative(cid) {
  try {
    // Try dweb.link as alternative gateway
    const url = `https://dweb.link/ipfs/${cid}`;

    console.log('Trying alternative gateway:', url);

    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Accept': 'application/octet-stream',
      }
    });

    if (!response.ok) {
      throw new Error(`Alternative gateway failed: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      throw new Error('Alternative gateway also returned HTML');
    }

    return await response.blob();
  } catch (error) {
    console.error('Alternative gateway also failed:', error);
    throw new Error(`All IPFS gateways failed: ${error.message}`);
  }
}

/**
 * Check Pinata connection and JWT validity
 * @returns {Promise<boolean>} True if connection is valid
 */
export async function testPinataConnection() {
  try {
    // Test the connection by trying to list files (this requires valid authentication)
    await pinata.files.list();
    return true;
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
