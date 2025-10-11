import React, { useState } from 'react';
import { ethers } from 'ethers';
import { getContract } from '../utils/contract';
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
  
    // Ensure we have a signer
    if (!signer) {
      setMessage({ 
        type: 'error', 
        text: 'Wallet not connected. Please connect your wallet and try again.' 
      });
      return;
    }
  
    let checksumAddress;
    try {
      checksumAddress = ethers.getAddress(granteeAddress.trim());
    } catch (error) {
      setMessage({ type: 'error', text: 'Invalid Ethereum address' });
      return;
    }
  
    if (checksumAddress.toLowerCase() === account?.toLowerCase()) {
      setMessage({ type: 'error', text: 'Cannot grant access to yourself' });
      return;
    }
  
    setGranting(true);
    setMessage({ type: 'info', text: 'Preparing transaction...' });
  
    try {
      // 1. Export and wrap the AES key
      const aesKeyRaw = await exportAESKeyRaw(aesKey);
      setMessage({ type: 'info', text: 'Encrypting key for recipient...' });
      
      // 2. Wrap key for recipient
      const wrappedKeyHex = await wrapKeyForRecipient(aesKeyRaw, checksumAddress);
      console.log('Wrapped key hex:', wrappedKeyHex);
  
      // 3. Get contract instance with signer
      const contract = getContract(signer);
      const wrappedKeyBytes = ethers.getBytes(wrappedKeyHex);
      
      // 4. Prepare transaction parameters
      const txParams = {
        from: account,
        gasLimit: 500000, // Set a higher gas limit
      };
  
      try {
        // 5. Try to estimate gas first
        setMessage({ type: 'info', text: 'Estimating gas...' });
        try {
          await contract.grantAccess.estimateGas(
            checksumAddress,
            wrappedKeyBytes,
            txParams
          );
        } catch (estimateError) {
          console.warn('Gas estimation warning:', estimateError);
          // Continue with default gas limit if estimation fails
        }
  
        // 6. Send the transaction
        setMessage({ type: 'info', text: 'Sending transaction...' });
        const tx = await contract.grantAccess(
          checksumAddress,
          wrappedKeyBytes,
          txParams
        );
  
        setMessage({ type: 'info', text: 'Waiting for confirmation...' });
        const receipt = await tx.wait();
        console.log('Transaction receipt:', receipt);
  
        if (receipt.status === 1) {
          setMessage({ 
            type: 'success', 
            text: 'Access granted successfully!' 
          });
          setTimeout(() => {
            onSuccess?.();
            onClose?.();
          }, 1500);
        } else {
          throw new Error('Transaction failed');
        }
      } catch (txError) {
        console.error('Transaction error:', txError);
        if (txError.code === 'ACTION_REJECTED') {
          throw new Error('Transaction was rejected by user');
        }
        throw txError;
      }
    } catch (error) {
      console.error('Grant access error:', error);
      
      let errorMessage = 'Failed to grant access';
      if (error.code === 'ACTION_REJECTED') {
        errorMessage = 'Transaction was rejected by user';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for transaction';
      } else if (error.message.includes('invalid address') || error.message.includes('invalid ENS name')) {
        errorMessage = 'Invalid recipient address';
      } else if (error.message.includes('Provider or signer required')) {
        errorMessage = 'Wallet connection error. Please reconnect your wallet and try again.';
      } else if (error.code === 'CALL_EXCEPTION' || error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        errorMessage = 'Transaction reverted. You may not have permission to grant access.';
      }
      
      setMessage({ 
        type: 'error',
        text: errorMessage
      });
    } finally {
      setGranting(false);
    }
  };

  const handleAddressChange = (e) => {
    const value = e.target.value.trim();
    setGranteeAddress(value);
    // Clear error when user starts typing
    if (message.text) {
      setMessage({ type: '', text: '' });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Grant Access</h3>
          <button 
            type="button" 
            className="close-button" 
            onClick={onClose}
            disabled={granting}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="grantee-address">Paramedic/Doctor Wallet Address</label>
          <input
            id="grantee-address"
            type="text"
            value={granteeAddress}
            onChange={handleAddressChange}
            placeholder="0x..."
            className="form-control"
            disabled={granting}
            autoComplete="off"
            spellCheck="false"
          />
          <p className="help-text">
            Enter the Ethereum address of the medical personnel you want to grant access to
          </p>
        </div>

        {granting && <div className="spinner"></div>}

        <div className="modal-actions">
          <button
            type="button"
            onClick={handleGrant}
            disabled={!granteeAddress || granting}
            className="btn btn-primary"
          >
            {granting ? 'Granting...' : 'Grant Access'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={granting}
            className="btn btn-secondary"
          >
            Cancel
          </button>
        </div>

        <div className="info-note">
          <strong>Note:</strong> Granting access allows the medical personnel to:
          <ul>
            <li>View your encrypted medical record</li>
            <li>Decrypt and read the contents</li>
            <li>Download a copy of the record</li>
          </ul>
          <p>You can revoke access at any time.</p>
        </div>
      </div>
    </div>
  );
}

export default GrantModal;