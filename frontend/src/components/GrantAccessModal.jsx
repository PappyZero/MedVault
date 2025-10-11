import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const GrantAccessModal = ({ isOpen, onClose, onGrant, record }) => {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Reset form when modal is opened/closed
  useEffect(() => {
    if (isOpen) {
      setAddress('');
      setMessage({ type: '', text: '' });
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!record || !record.cid) {
      setMessage({ 
        type: 'error', 
        text: 'Error: Record data is missing. Please try again.' 
      });
      return;
    }

    // Basic validation
    if (!address) {
      setMessage({ type: 'error', text: 'Please enter a wallet address' });
      return;
    }

    // Validate Ethereum address format
    let checksumAddress;
    try {
      checksumAddress = ethers.getAddress(address);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Please enter a valid Ethereum address' 
      });
      return;
    }
    
    setLoading(true);
    setMessage({ type: 'info', text: 'Processing transaction...' });

    try {
      // Pass both the record and the address to the onGrant handler
      await onGrant(record, checksumAddress);
      
      setMessage({ 
        type: 'success', 
        text: 'Access granted successfully! Closing...' 
      });
      setTimeout(onClose, 1500);
    } catch (error) {
      console.error('Error granting access:', error);
      setMessage({ 
        type: 'error', 
        text: `Failed to grant access: ${error.reason || error.message || 'Unknown error occurred'}`  
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddressChange = (e) => {
    const value = e.target.value.trim();
    setAddress(value);
    // Clear error when user starts typing
    if (message.text) {
      setMessage({ type: '', text: '' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-md" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-800">
              Grant Access to Medical Record
            </h3>
            <button 
              type="button" 
              className="text-gray-400 hover:text-gray-500"
              onClick={onClose}
              disabled={loading}
              aria-label="Close"
            >
              <span className="text-2xl">&times;</span>
            </button>
          </div>
          
          {message.text && (
            <div className={`mb-4 p-3 rounded ${
              message.type === 'error' ? 'bg-red-100 text-red-700' : 
              message.type === 'success' ? 'bg-green-100 text-green-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label 
                htmlFor="recipient-address" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Recipient's Wallet Address
              </label>
              <input
                id="recipient-address"
                type="text"
                value={address}
                onChange={handleAddressChange}
                placeholder="0x..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
                autoComplete="off"
                spellCheck="false"
              />
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={!address || loading}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Granting...
                  </span>
                ) : 'Grant Access'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GrantAccessModal;