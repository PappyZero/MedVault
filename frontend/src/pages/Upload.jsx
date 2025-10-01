import React, { useState } from 'react';
import { getContract } from '../utils/contract';
import { encryptFile, exportAESKeyRaw } from '../utils/cryptoHelpers';
import { uploadToIPFS } from '../utils/ipfs';
import GrantModal from '../components/GrantModal';

function Upload({ account, signer, provider }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [uploadedCID, setUploadedCID] = useState(null);
  const [aesKey, setAesKey] = useState(null);
  const [showGrantModal, setShowGrantModal] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setMessage({ type: '', text: '' });
      setUploadedCID(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a file first' });
      return;
    }

    if (!account || !signer) {
      setMessage({ type: 'error', text: 'Please connect your wallet' });
      return;
    }

    setUploading(true);
    setMessage({ type: 'info', text: 'Encrypting file...' });

    try {
      // 1. Encrypt file client-side
      const { encryptedBlob, aesKey: generatedKey, metadata } = await encryptFile(file);
      setAesKey(generatedKey);

      setMessage({ type: 'info', text: 'Uploading to IPFS...' });

      // 2. Upload encrypted blob to IPFS
      const { cid } = await uploadToIPFS(
        encryptedBlob,
        `encrypted_${file.name}`,
        { originalName: file.name, patientAddress: account }
      );

      setMessage({ type: 'info', text: 'Storing CID on blockchain...' });

      // 3. Store CID on blockchain
      const contract = getContract(signer);
      const tx = await contract.uploadRecord(cid);

      setMessage({ type: 'info', text: 'Waiting for transaction confirmation...' });

      await tx.wait();

      setUploadedCID(cid);
      setMessage({
        type: 'success',
        text: `Record uploaded successfully! CID: ${cid}`
      });
    } catch (error) {
      console.error('Upload error:', error);
      setMessage({
        type: 'error',
        text: `Upload failed: ${error.message || 'Unknown error'}`
      });
    } finally {
      setUploading(false);
    }
  };

  const handleGrantSuccess = () => {
    setMessage({
      type: 'success',
      text: 'Access granted successfully!'
    });
  };

  return (
    <div>
      <div className="card">
        <h2 style={{ marginBottom: '20px', fontSize: '24px', fontWeight: '700' }}>
          Upload Medical Record
        </h2>

        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        {!account ? (
          <div className="alert alert-info">
            Please connect your wallet to upload medical records.
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Select Medical Record File
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.txt,.jpg,.jpeg,.png,.doc,.docx"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px dashed #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
                disabled={uploading}
              />
              <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
                Supported formats: PDF, Text, Images, Word documents
              </p>
            </div>

            {file && (
              <div style={{
                background: '#f3f4f6',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <p style={{ margin: 0 }}>
                  <strong>Selected:</strong> {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              {uploading ? 'Uploading...' : 'Encrypt & Upload to Blockchain'}
            </button>

            {uploading && <div className="spinner"></div>}
          </>
        )}
      </div>

      {uploadedCID && aesKey && (
        <div className="card">
          <h3 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: '600' }}>
            Upload Successful!
          </h3>

          <div style={{
            background: '#f3f4f6',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px',
            wordBreak: 'break-all'
          }}>
            <p style={{ marginBottom: '8px' }}>
              <strong>Your Address:</strong> {account}
            </p>
            <p style={{ marginBottom: '8px' }}>
              <strong>Record CID:</strong> {uploadedCID}
            </p>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280', marginTop: '12px' }}>
              Save this information to share with authorized medical personnel.
            </p>
          </div>

          <button
            onClick={() => setShowGrantModal(true)}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            Grant Access to Medical Personnel
          </button>

          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '12px', textAlign: 'center' }}>
            You can grant or revoke access at any time
          </p>
        </div>
      )}

      {showGrantModal && (
        <GrantModal
          account={account}
          signer={signer}
          aesKey={aesKey}
          onClose={() => setShowGrantModal(false)}
          onSuccess={handleGrantSuccess}
        />
      )}
    </div>
  );
}

export default Upload;
