import React, { useState } from 'react';
import { getContract, isValidAddress } from '../utils/contract';
import { exportAESKeyRaw, wrapKeyForRecipient } from '../utils/cryptoHelpers';

function GrantModal({ account, signer, aesKey, onClose, onSuccess }) {
  const [granteeAddress, setGranteeAddress] = useState('');
  const [granting, setGranting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleGrant = async () => {
    if (!granteeAddress) {
      setMessage({ type: 'error', text: 'Please enter grantee address' });
      return;
    }

    if (!isValidAddress(granteeAddress)) {
      setMessage({ type: 'error', text: 'Invalid Ethereum address' });
      return;
    }

    // if (granteeAddress.toLowerCase() === account.toLowerCase()) {
    //   setMessage({ type: 'error', text: 'Cannot grant access to yourself' });
    //   return;
    // }

    setGranting(true);
    setMessage({ type: 'info', text: 'Wrapping encryption key...' });

    try {
      // 1. Export AES key as raw bytes
      const aesKeyRaw = await exportAESKeyRaw(aesKey);

      // 2. Wrap key for recipient
      setMessage({ type: 'info', text: 'Encrypting key for recipient...' });
      const wrappedKeyHex = await wrapKeyForRecipient(aesKeyRaw, granteeAddress);

      // 3. Grant access on blockchain
      setMessage({ type: 'info', text: 'Granting access on blockchain...' });
      const contract = getContract(signer);
      const tx = await contract.grantAccess(granteeAddress, wrappedKeyHex);

      setMessage({ type: 'info', text: 'Waiting for confirmation...' });
      await tx.wait();

      setMessage({ type: 'success', text: 'Access granted successfully!' });

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Grant access error:', error);
      setMessage({
        type: 'error',
        text: `Failed to grant access: ${error.message || 'Unknown error'}`
      });
    } finally {
      setGranting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: '20px', fontSize: '22px', fontWeight: '700' }}>
          Grant Access
        </h3>

        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Paramedic/Doctor Wallet Address
          </label>
          <input
            type="text"
            value={granteeAddress}
            onChange={(e) => setGranteeAddress(e.target.value)}
            placeholder="0x..."
            className="input"
            disabled={granting}
          />
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
            Enter the Ethereum address of the medical personnel you want to grant access to
          </p>
        </div>

        {granting && <div className="spinner"></div>}

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button
            onClick={handleGrant}
            disabled={!granteeAddress || granting}
            className="btn btn-primary"
            style={{ flex: 1 }}
          >
            {granting ? 'Granting...' : 'Grant Access'}
          </button>
          <button
            onClick={onClose}
            disabled={granting}
            className="btn btn-secondary"
            style={{ flex: 1 }}
          >
            Cancel
          </button>
        </div>

        <div style={{
          marginTop: '20px',
          padding: '12px',
          background: '#f3f4f6',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#374151'
        }}>
          <strong>Note:</strong> Granting access allows the medical personnel to:
          <ul style={{ marginTop: '8px', paddingLeft: '20px', marginBottom: 0 }}>
            <li>View your encrypted medical record</li>
            <li>Decrypt and read the contents</li>
            <li>Download a copy of the record</li>
          </ul>
          <p style={{ marginTop: '8px', marginBottom: 0 }}>
            You can revoke access at any time.
          </p>
        </div>
      </div>
    </div>
  );
}

export default GrantModal;
