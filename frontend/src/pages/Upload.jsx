import React, { useState } from 'react';
import { ethers } from 'ethers';
import { getContract } from '../utils/contract';
import { encryptFile, exportAESKeyRaw } from '../utils/cryptoHelpers';
import { uploadToIPFS } from '../utils/ipfs';
import GrantModal from '../components/GrantModal';
import { useOutletContext } from 'react-router-dom';

// Custom error boundary for upload errors
class UploadErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded">
          <h3 className="font-medium text-red-800">Upload Error</h3>
          <p className="text-red-700 mt-1">
            {this.state.error?.message || 'Failed to process the file'}
          </p>
          <button 
            onClick={this.handleReset}
            className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function Upload() {
  const { account, signer } = useOutletContext();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [uploadedCID, setUploadedCID] = useState(null);
  const [aesKey, setAesKey] = useState(null);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [error, setError] = useState(null);

  const resetUploadState = () => {
    setFile(null);
    setUploading(false);
    setMessage({ type: '', text: '' });
    setUploadedCID(null);
    setAesKey(null);
    setError(null);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setMessage({ type: '', text: '' });
      setUploadedCID(null);
      setError(null);
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
    setError(null);
    setMessage({ type: 'info', text: 'Encrypting file...' });

    try {
      // 1. Encrypt file client-side
      const { encryptedBlob, aesKey: generatedKey } = await encryptFile(file);
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

      // 4. Store wrapped key for later grants
      try {
        const aesKeyRaw = await exportAESKeyRaw(generatedKey);
        const wrappedKeyHex = ethers.hexlify(aesKeyRaw);
        localStorage.setItem(`wrappedKey_${cid}`, wrappedKeyHex);
      } catch (keyError) {
        console.error('Error storing wrapped key:', keyError);
        // Continue even if key storage fails
      }

      setUploadedCID(cid);
      setMessage({
        type: 'success',
        text: 'Record uploaded successfully!'
      });

    } catch (error) {
      console.error('Upload error:', error);
      setError(error);
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

  // If there's a critical error, we'll let the error boundary handle it
  if (error && error.isCritical) {
    throw error;
  }

  return (
    <UploadErrorBoundary onReset={resetUploadState}>
      <div>
        <div className="card">
          <h2 className="text-2xl font-bold mb-5">Upload Medical Record</h2>

          {message.text && (
            <div className={`alert alert-${message.type} mb-4`}>
              {message.text}
            </div>
          )}

          {!account ? (
            <div className="alert alert-info">
              Please connect your wallet to upload medical records.
            </div>
          ) : (
            <>
              <div className="mb-5">
                <label className="block font-semibold mb-2">
                  Select Medical Record File
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.txt,.jpg,.jpeg,.png,.doc,.docx"
                  className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer"
                  disabled={uploading}
                />
                <p className="text-sm text-gray-500 mt-2">
                  Supported formats: PDF, Text, Images, Word documents
                </p>
              </div>

              {file && (
                <div className="bg-gray-50 p-3 rounded-lg mb-5">
                  <p className="m-0">
                    <strong>Selected:</strong> {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </p>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="btn btn-primary w-full"
              >
                {uploading ? 'Uploading...' : 'Encrypt & Upload to Blockchain'}
              </button>

              {uploading && <div className="spinner mt-4"></div>}
            </>
          )}
        </div>

        {uploadedCID && aesKey && (
          <div className="card mt-6">
            <h3 className="text-xl font-semibold mb-4">Upload Successful!</h3>

            <div className="bg-gray-50 p-4 rounded-lg mb-5 break-words">
              <p className="mb-2">
                <strong>Your Address:</strong> {account}
              </p>
              <p className="mb-2">
                <strong>Record CID:</strong> {uploadedCID}
              </p>
              <p className="text-sm text-gray-500 mt-3">
                Save this information to share with authorized medical personnel.
              </p>
            </div>

            <button
              onClick={() => setShowGrantModal(true)}
              className="btn btn-primary w-full"
            >
              Grant Access to Medical Personnel
            </button>

            <p className="text-sm text-gray-500 mt-3 text-center">
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
    </UploadErrorBoundary>
  );
}

export default Upload;