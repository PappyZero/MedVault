import React, { useState } from 'react';
import { ethers } from 'ethers';
import { getContract, isValidAddress } from '../utils/contract';
import { fetchFromIPFS } from '../utils/ipfs';
import {
  unwrapKeyWithSigner,
  importAESKey,
  decryptFile,
  blobToDataURL,
  downloadBlob
} from '../utils/cryptoHelpers';

function Paramedic({ account, signer, provider }) {
  const [patientAddress, setPatientAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [recordData, setRecordData] = useState(null);

  const handleAccessRecord = async () => {
    if (!patientAddress) {
      setMessage({ type: 'error', text: 'Please enter patient address' });
      return;
    }

    if (!isValidAddress(patientAddress)) {
      setMessage({ type: 'error', text: 'Invalid Ethereum address' });
      return;
    }

    if (!account || !signer) {
      setMessage({ type: 'error', text: 'Please connect your wallet' });
      return;
    }

    setLoading(true);
    setMessage({ type: 'info', text: 'Checking access permissions...' });
    setRecordData(null);

    try {
      const contract = getContract(signer);

      // 1. Check if patient has a record
      const hasRecord = await contract.hasRecord(patientAddress);
      if (!hasRecord) {
        setMessage({ type: 'error', text: 'Patient has no medical record on file' });
        setLoading(false);
        return;
      }

      // 2. Attempt to access record (this emits AccessAttempt event)
      setMessage({ type: 'info', text: 'Requesting record access...' });
      const cid = await contract.getRecord(patientAddress);

      // 3. Get wrapped AES key
      setMessage({ type: 'info', text: 'Retrieving encryption key...' });
      const wrappedKeyBytes = await contract.getWrappedKey(patientAddress);
      const wrappedKeyHex = ethers.hexlify(wrappedKeyBytes);

      // 4. Unwrap AES key
      setMessage({ type: 'info', text: 'Decrypting key...' });
      const aesKeyRaw = await unwrapKeyWithSigner(wrappedKeyHex, account);
      const aesKey = await importAESKey(aesKeyRaw);

      // 5. Fetch encrypted blob from IPFS
      setMessage({ type: 'info', text: 'Fetching encrypted record from IPFS...' });
      const encryptedBlob = await fetchFromIPFS(cid);

      // 6. Decrypt file
      setMessage({ type: 'info', text: 'Decrypting medical record...' });
      const { file, metadata } = await decryptFile(encryptedBlob, aesKey);

      // 7. Display or download
      setMessage({ type: 'success', text: 'Record accessed successfully!' });

      // Convert to data URL for display if it's an image or PDF
      let dataUrl = null;
      if (metadata.fileType.startsWith('image/') || metadata.fileType === 'application/pdf') {
        dataUrl = await blobToDataURL(file);
      }

      setRecordData({
        file,
        metadata,
        dataUrl,
        patientAddress,
        cid
      });
    } catch (error) {
      console.error('Access error:', error);

      let errorMessage = 'Failed to access record';
      if (error.message.includes('access denied')) {
        errorMessage = 'Access denied: You do not have permission to view this record';
      } else if (error.message.includes('no access permission')) {
        errorMessage = 'Access denied: Patient has not granted you permission';
      } else {
        errorMessage = `Error: ${error.message}`;
      }

      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (recordData) {
      downloadBlob(
        recordData.file,
        recordData.metadata.fileName || 'medical_record'
      );
    }
  };

  return (
    <div>
      <div className="card">
        <h2 style={{ marginBottom: '20px', fontSize: '24px', fontWeight: '700' }}>
          Access Patient Medical Record
        </h2>

        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        {!account ? (
          <div className="alert alert-info">
            Please connect your wallet to access medical records.
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Patient Ethereum Address
              </label>
              <input
                type="text"
                value={patientAddress}
                onChange={(e) => setPatientAddress(e.target.value)}
                placeholder="0x..."
                className="input"
                disabled={loading}
              />
              <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
                Enter the patient's wallet address to request access to their medical record
              </p>
            </div>

            <button
              onClick={handleAccessRecord}
              disabled={!patientAddress || loading}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              {loading ? 'Accessing Record...' : 'Request Access'}
            </button>

            {loading && <div className="spinner"></div>}
          </>
        )}
      </div>

      {recordData && (
        <div className="card">
          <h3 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: '600' }}>
            Medical Record Details
          </h3>

          <div style={{
            background: '#f3f4f6',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <p style={{ marginBottom: '8px' }}>
              <strong>Patient:</strong> {recordData.patientAddress}
            </p>
            <p style={{ marginBottom: '8px' }}>
              <strong>File Name:</strong> {recordData.metadata.fileName}
            </p>
            <p style={{ marginBottom: '8px' }}>
              <strong>File Type:</strong> {recordData.metadata.fileType}
            </p>
            <p style={{ marginBottom: '8px' }}>
              <strong>File Size:</strong> {(recordData.metadata.fileSize / 1024).toFixed(2)} KB
            </p>
            <p style={{ marginBottom: '8px' }}>
              <strong>Encrypted At:</strong> {new Date(recordData.metadata.encryptedAt).toLocaleString()}
            </p>
            <p style={{ marginBottom: 0, wordBreak: 'break-all', fontSize: '14px', color: '#6b7280' }}>
              <strong>IPFS CID:</strong> {recordData.cid}
            </p>
          </div>

          {recordData.dataUrl && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: '600' }}>
                Record Preview
              </h4>
              {recordData.metadata.fileType.startsWith('image/') ? (
                <img
                  src={recordData.dataUrl}
                  alt="Medical Record"
                  style={{
                    maxWidth: '100%',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}
                />
              ) : recordData.metadata.fileType === 'application/pdf' ? (
                <iframe
                  src={recordData.dataUrl}
                  style={{
                    width: '100%',
                    height: '600px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                  title="Medical Record PDF"
                />
              ) : null}
            </div>
          )}

          <button
            onClick={handleDownload}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            Download Record
          </button>

          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: '#fef3c7',
            border: '1px solid #fbbf24',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            <strong>⚠️ Privacy Notice:</strong> This medical record is confidential and protected by law.
            Access is logged on the blockchain for audit purposes.
          </div>
        </div>
      )}
    </div>
  );
}

export default Paramedic;
