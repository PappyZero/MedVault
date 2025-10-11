import React, { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { getContract } from '../utils/contract';
import { fetchFromIPFS } from '../utils/ipfs';
import {
  unwrapKeyWithSigner,
  importAESKey,
  decryptFile,
  blobToDataURL,
  downloadBlob
} from '../utils/cryptoHelpers';
import { useOutletContext } from 'react-router-dom';

function Paramedic() {
  const { account, signer } = useOutletContext();
  const [patientAddress, setPatientAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [recordData, setRecordData] = useState(null);

  const resetState = useCallback(() => {
    setLoading(false);
    setMessage({ type: '', text: '' });
    setRecordData(null);
  }, []);

  const handleAccessRecord = async () => {
    if (!patientAddress) {
      setMessage({ type: 'error', text: 'Please enter patient address' });
      return;
    }
  
    resetState();
    setLoading(true);
    setMessage({ type: 'info', text: 'Validating address...' });
  
    try {
      // Convert to checksum address and validate
      const checksumAddress = ethers.getAddress(patientAddress.trim());
      console.log('Validated address:', checksumAddress);
      
      if (!account || !signer) {
        throw new Error('Please connect your wallet');
      }
  
      console.log('Connected account:', account);
      const contract = getContract(signer);
      
      try {
        // Try to get the record
        setMessage({ type: 'info', text: 'Checking record...' });
        console.log('Calling getRecord...');
        
        // First try the direct view function
        try {
          const cid = await contract.getRecord(checksumAddress);
          console.log('Direct record fetch result:', cid);
          
          if (cid && cid !== '0x') {
            // We got a CID directly, use it
            await processRecordAccess(contract, checksumAddress, cid);
            return;
          }
        } catch (directError) {
          console.log('Direct record fetch failed, trying transaction...', directError);
        }
  
        // If direct fetch failed, try the transaction approach
        const txResponse = await contract.getRecord(checksumAddress);
        console.log('Transaction response:', txResponse);
  
        // Wait for the transaction to be mined and get the receipt
        const receipt = await txResponse.wait();
        console.log('Transaction receipt:', receipt);
  
        // Log all events for debugging
        console.log('All events in receipt:');
        receipt.logs.forEach((log, index) => {
          try {
            const parsed = contract.interface.parseLog(log);
            console.log(`Event ${index}:`, parsed);
          } catch (e) {
            console.log(`Raw log ${index}:`, log);
          }
        });
  
        // Try to find the RecordUploaded event
        const event = receipt.logs
          .map(log => {
            try {
              return contract.interface.parseLog(log);
            } catch (e) {
              console.log('Failed to parse log:', e);
              return null;
            }
          })
          .find(log => log && log.name === 'RecordUploaded');
  
        if (!event) {
          throw new Error('No RecordUploaded event found in transaction. The record might not exist or the contract ABI might be outdated.');
        }
  
        const cidValue = event.args.cid || event.args[1]; // Try both possible argument positions
        console.log('Extracted CID from event:', cidValue);
  
        if (!cidValue) {
          throw new Error('No record found for this address');
        }
  
        // Process the record with the found CID
        await processRecordAccess(contract, checksumAddress, cidValue);
  
      } catch (accessError) {
        console.error('Access error details:', {
          error: accessError,
          code: accessError.code,
          message: accessError.message,
          data: accessError.data,
          stack: accessError.stack
        });
        throw accessError;
      }
    } catch (error) {
      console.error('Detailed error:', {
        error,
        name: error.name,
        code: error.code,
        message: error.message,
        stack: error.stack
      });
  
      let errorMessage = 'Failed to access record';
      if (error.code === 'INVALID_ARGUMENT' || error.message.includes('invalid address')) {
        errorMessage = 'Invalid Ethereum address';
      } else if (error.code === 4001 || error.message.includes('rejected')) {
        errorMessage = 'Action was rejected';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message.includes('access denied') || 
                error.message.includes('no access') || 
                error.message.includes('restrictions')) {
        errorMessage = 'Access denied or record not found. Please ensure you have the correct permissions.';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for gas';
      } else if (error.code === 'CALL_EXCEPTION' || error.message.includes('contract')) {
        errorMessage = 'Error accessing the smart contract. Please check your connection and try again.';
      } else if (error.message.includes('IPFS') || error.message.includes('fetch')) {
        errorMessage = 'Failed to retrieve the medical record. Please ensure you have a stable internet connection.';
      } else if (error.message.includes('RecordUploaded') || error.message.includes('event')) {
        errorMessage = 'Could not find the record details. The record might not exist or might have been removed.';
      }
  
      setMessage({ 
        type: 'error', 
        text: errorMessage 
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to process record access once we have the CID
  const processRecordAccess = async (contract, patientAddress, cid) => {
    // Get the wrapped key
    setMessage({ type: 'info', text: 'Retrieving encryption key...' });
    console.log('Calling getWrappedKey...');
    const wrappedKeyBytes = await contract.getWrappedKey(patientAddress);
    console.log('Got wrapped key, length:', wrappedKeyBytes?.length);
  
    if (!wrappedKeyBytes || wrappedKeyBytes.length === 0) {
      throw new Error('No encryption key found for this record');
    }
  
    // Process encryption keys
    setMessage({ type: 'info', text: 'Processing encryption keys...' });
    const wrappedKeyHex = ethers.hexlify(wrappedKeyBytes);
    const aesKeyRaw = await unwrapKeyWithSigner(wrappedKeyHex, account);
    const aesKey = await importAESKey(aesKeyRaw);
  
    // Fetch and decrypt record with better error handling
    setMessage({ type: 'info', text: 'Fetching encrypted record...' });
    let encryptedBlob;
    try {
      encryptedBlob = await Promise.race([
        fetchFromIPFS(cid),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('IPFS fetch timeout')), 30000)
        )
      ]);
    } catch (ipfsError) {
      console.error('IPFS fetch failed:', ipfsError);
      throw new Error('Failed to retrieve record from IPFS. The file might have been removed or the network is unavailable.');
    }
  
    setMessage({ type: 'info', text: 'Decrypting record...' });
    const { file, metadata } = await decryptFile(encryptedBlob, aesKey);
  
    // Prepare data URL for preview if applicable
    let dataUrl = null;
    if (metadata.fileType?.startsWith('image/') || metadata.fileType === 'application/pdf') {
      dataUrl = await blobToDataURL(file);
    }
  
    setRecordData({
      file,
      metadata: {
        ...metadata,
        lastAccessed: new Date().toISOString()
      },
      dataUrl,
      patientAddress,
      cid
    });
  
    setMessage({ type: 'success', text: 'Record accessed successfully!' });
  };

  const handleDownload = useCallback(() => {
    if (!recordData?.file) return;
    
    try {
      downloadBlob(
        recordData.file,
        recordData.metadata?.fileName || 'medical_record'
      );
    } catch (error) {
      console.error('Download failed:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to download file' 
      });
    }
  }, [recordData]);

  const handleInputChange = (e) => {
    setPatientAddress(e.target.value);
    if (message.text) {
      setMessage({ type: '', text: '' });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Access Patient Medical Record
        </h2>

        {message.text && (
          <div className={`mb-6 p-4 rounded ${
            message.type === 'error' ? 'bg-red-100 text-red-700' : 
            message.type === 'success' ? 'bg-green-100 text-green-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {message.text}
          </div>
        )}

        {!account ? (
          <div className="bg-yellow-100 text-yellow-700 p-4 rounded">
            Please connect your wallet to access medical records.
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Patient Ethereum Address
              </label>
              <input
                type="text"
                value={patientAddress}
                onChange={handleInputChange}
                placeholder="0x..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
              <p className="mt-2 text-sm text-gray-500">
                Enter the patient's wallet address to request access to their medical record
              </p>
            </div>

            <button
              onClick={handleAccessRecord}
              disabled={!patientAddress || loading}
              className={`w-full py-3 px-4 rounded-md font-medium text-white ${
                !patientAddress || loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : 'Request Access'}
            </button>
          </div>
        )}
      </div>

      {recordData && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Medical Record Details
          </h3>

          <div className="bg-gray-50 p-4 rounded-lg mb-6 space-y-3">
            <p><strong>Patient:</strong> {recordData.patientAddress}</p>
            <p><strong>File Name:</strong> {recordData.metadata?.fileName || 'N/A'}</p>
            <p><strong>File Type:</strong> {recordData.metadata?.fileType || 'N/A'}</p>
            <p>
              <strong>File Size:</strong> {recordData.metadata?.fileSize 
                ? `${(recordData.metadata.fileSize / 1024).toFixed(2)} KB`  
                : 'N/A'}
            </p>
            <p>
              <strong>Encrypted At:</strong> {recordData.metadata?.encryptedAt 
                ? new Date(recordData.metadata.encryptedAt).toLocaleString() 
                : 'N/A'}
            </p>
            <p className="break-all text-sm text-gray-500">
              <strong>IPFS CID:</strong> {recordData.cid}
            </p>
          </div>

          {recordData.dataUrl && (
            <div className="mb-6">
              <h4 className="text-lg font-medium text-gray-800 mb-3">
                Record Preview
              </h4>
              {recordData.metadata?.fileType?.startsWith('image/') ? (
                <img
                  src={recordData.dataUrl}
                  alt="Medical Record"
                  className="max-w-full h-auto rounded-lg border border-gray-200"
                />
              ) : recordData.metadata?.fileType === 'application/pdf' ? (
                <iframe
                  src={recordData.dataUrl}
                  className="w-full h-[600px] border border-gray-200 rounded-lg"
                  title="Medical Record PDF"
                />
              ) : (
                <div className="bg-gray-100 p-4 rounded-lg text-center">
                  <p>Preview not available for this file type</p>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleDownload}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium"
          >
            Download Record
          </button>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
            <strong>⚠️ Privacy Notice:</strong> This medical record is confidential and protected by law.
            Access is logged on the blockchain for audit purposes.
          </div>
        </div>
      )}
    </div>
  );
}

export default Paramedic;