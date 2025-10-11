import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContract, CONTRACT_ADDRESS } from '../utils/contract';
import GrantAccessModal from "../components/GrantAccessModal";

// Explorer base URL from env (e.g., https://sepolia.basescan.org or https://sepolia.etherscan.io)
const EXPLORER_BASE = import.meta.env.VITE_EXPLORER_URL || 'https://sepolia.basescan.org';

import { useOutletContext } from 'react-router-dom';

function AuditLog() {
  const { provider, signer } = useOutletContext();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const loadEvents = async () => {
    if (!provider) {
      setError('Please connect your wallet to view audit logs');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const contract = getContract(provider);
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000);

      const [uploadedEvents, updatedEvents, attemptEvents] = await Promise.all([
        contract.queryFilter(contract.filters.RecordUploaded(), fromBlock, currentBlock),
        contract.queryFilter(contract.filters.AccessUpdated(), fromBlock, currentBlock),
        contract.queryFilter(contract.filters.AccessAttempt(), fromBlock, currentBlock)
      ]);

      const formattedEvents = [
        // RecordUploaded events
        ...uploadedEvents.map(event => {
          const [patient, cid, timestamp] = event.args;
          return {
            type: 'RecordUploaded',
            patient,
            cid,
            timestamp: Number(timestamp),
            blockNumber: event.blockNumber,
            txHash: event.transactionHash,
            explorerUrl: `${EXPLORER_BASE}/tx/${event.transactionHash}`
          };
        }),
      
        // AccessUpdated events
        ...updatedEvents.map(event => {
          const [patient, grantee, granted, timestamp] = event.args;
          return {
            type: 'AccessUpdated',
            patient,
            grantee,
            granted,
            timestamp: Number(timestamp),
            blockNumber: event.blockNumber,
            txHash: event.transactionHash,
            explorerUrl: `${EXPLORER_BASE}/tx/${event.transactionHash}`
          };
        }),
      
        // AccessAttempt events
        ...attemptEvents.map(event => {
          const [accessor, patient, success, timestamp] = event.args;
          return {
            type: 'AccessAttempt',
            accessor,
            patient,
            success,
            timestamp: Number(timestamp),
            blockNumber: event.blockNumber,
            txHash: event.transactionHash,
            explorerUrl: `${EXPLORER_BASE}/tx/${event.transactionHash}`
          };
        })
      ].sort((a, b) => b.timestamp - a.timestamp);

      setEvents(formattedEvents);
    } catch (err) {
      console.error('Failed to load events:', err);
      setError(`Failed to load audit logs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (provider) {
      loadEvents();
    }
  }, [provider]);

  const handleGrantAccess = async (record, paramedicAddress) => {
    if (!signer || !account) {
      setMessage({ type: 'error', text: 'Please connect your wallet' });
      return;
    }
  
    try {
      setLoading(true);
      setMessage({ type: 'info', text: 'Granting access...' });
  
      // Ensure we have the record and its CID
      if (!record || !record.cid) {
        throw new Error('No record found or record is missing CID');
      }
  
      const contract = getContract(signer);
      const wrappedKey = await contract.getWrappedKey(account);
      
      if (!wrappedKey || wrappedKey.length === 0) {
        throw new Error('No wrapped key found for this record');
      }
  
      const tx = await contract.grantAccess(record.patientAddress, paramedicAddress, wrappedKey);
      await tx.wait();
  
      setMessage({ type: 'success', text: 'Access granted successfully!' });
      onAccessGranted(); // Refresh the audit log
    } catch (error) {
      console.error('Error granting access:', error);
      let errorMessage = 'Failed to grant access';
      
      if (error.code === 4001 || error.message.includes('rejected')) {
        errorMessage = 'Transaction was rejected';
      } else if (error.message.includes('No record found')) {
        errorMessage = 'Record not found';
      } else if (error.message.includes('No wrapped key')) {
        errorMessage = 'No encryption key found for this record';
      }
  
      setMessage({ 
        type: 'error', 
        text: errorMessage 
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = filter === 'all' ? events : events.filter(e => e.type === filter);

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>Audit Log</h2>
          <button
            onClick={loadEvents}
            disabled={loading || !provider}
            className="btn btn-secondary"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {!provider ? (
          <div className="alert alert-info">Please connect your wallet to view audit logs.</div>
        ) : (
          <>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Filter Events
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Events</option>
                <option value="RecordUploaded">Record Uploads</option>
                <option value="AccessUpdated">Access Updates</option>
                <option value="AccessAttempt">Access Attempts</option>
              </select>
            </div>

            {loading && <div className="spinner"></div>}

            {!loading && filteredEvents.length === 0 && (
              <div className="alert alert-info">
                No events found. Events will appear here as actions occur on the blockchain.
              </div>
            )}

            {!loading && filteredEvents.length > 0 && (
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
                Showing {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredEvents.map((event, index) => (
                <EventItem
                  key={`${event.txHash}-${index}`}
                  event={event}
                  index={index}
                  provider={provider}
                  signer={signer}
                  explorerBase={EXPLORER_BASE}
                  onGrantAccess={(record) => {
                    setSelectedRecord(record);
                    setShowGrantModal(true);
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {showGrantModal && selectedRecord && (
        <GrantAccessModal
          record={selectedRecord}
          onClose={() => {
            setShowGrantModal(false);
            setSelectedRecord(null);
          }}
          onGrant={handleGrantAccess}
        />
      )}

      <div className="card">
        <h3 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: '600' }}>
          About Audit Logs
        </h3>
        <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', marginBottom: '12px' }}>
          All actions in MedVault are permanently recorded on the BlockDAG blockchain, creating an immutable audit trail.
          This ensures complete transparency and accountability for medical record access.
        </p>
        <ul style={{ fontSize: '14px', color: '#374151', lineHeight: '1.8', paddingLeft: '20px' }}>
          <li><strong>Record Uploaded:</strong> When a patient uploads a new medical record</li>
          <li><strong>Access Updated:</strong> When access is granted or revoked</li>
          <li><strong>Access Attempt:</strong> Every time someone tries to access a record (success or denied)</li>
        </ul>
      </div>
    </div>
  );
}

function EventItem({ event, index, provider, signer, explorerBase, onGrantAccess }) {
  const [currentAccount, setCurrentAccount] = useState(null);

  useEffect(() => {
    const getCurrentAccount = async () => {
      if (provider?.getSigner) {
        try {
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          setCurrentAccount(address?.toLowerCase());
        } catch (error) {
          console.error('Error getting current account:', error);
        }
      }
    };

    getCurrentAccount();
  }, [provider]);

  const isPatient = event.patient?.toLowerCase() === currentAccount;

  const getEventIcon = (type) => {
    switch (type) {
      case 'RecordUploaded': return '📤';
      case 'AccessUpdated': return '🔐';
      case 'AccessAttempt': return '👁️';
      default: return '📋';
    }
  };

  const getEventColor = (event) => {
    if (event.type === 'RecordUploaded') return '#10b981';
    if (event.type === 'AccessUpdated') return event.granted ? '#3b82f6' : '#ef4444';
    if (event.type === 'AccessAttempt') return event.success ? '#10b981' : '#ef4444';
    return '#6b7280';
  };

  const formatAddress = (address) => {
    if (!address) return '0x0...0';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '16px',
        borderLeft: `4px solid ${getEventColor(event)}`
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>{getEventIcon(event.type)}</span>
          <strong style={{ fontSize: '16px' }}>{event.type}</strong>
        </div>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>
          {new Date(event.timestamp * 1000).toLocaleString()}
        </span>
      </div>

      {event.type === 'RecordUploaded' && (
        <div style={{ fontSize: '14px', color: '#374151' }}>
          <p style={{ margin: '4px 0' }}>
            <strong>Patient:</strong> {formatAddress(event.patient)}
          </p>
          <p style={{ margin: '4px 0', wordBreak: 'break-all' }}>
            <strong>CID:</strong> {event.cid}
          </p>
        </div>
      )}

      {event.type === 'AccessUpdated' && (
        <div style={{ fontSize: '14px', color: '#374151' }}>
          <p style={{ margin: '4px 0' }}>
            <strong>Patient:</strong> {formatAddress(event.patient)}
          </p>
          <p style={{ margin: '4px 0' }}>
            <strong>Grantee:</strong> {formatAddress(event.grantee)}
          </p>
          <p style={{ margin: '4px 0' }}>
            <strong>Action:</strong>{' '}
            <span style={{
              color: event.granted ? '#10b981' : '#ef4444',
              fontWeight: '600'
            }}>
              {event.granted ? 'Access Granted ✓' : 'Access Revoked ✗'}
            </span>
          </p>
        </div>
      )}

      {event.type === 'AccessAttempt' && (
        <div style={{ fontSize: '14px', color: '#374151' }}>
          <p style={{ margin: '4px 0' }}>
            <strong>Accessor:</strong> {formatAddress(event.accessor)}
          </p>
          <p style={{ margin: '4px 0' }}>
            <strong>Patient:</strong> {formatAddress(event.patient)}
          </p>
          <p style={{ margin: '4px 0' }}>
            <strong>Result:</strong>{' '}
            <span style={{
              color: event.success ? '#10b981' : '#ef4444',
              fontWeight: '600'
            }}>
              {event.success ? 'Authorized ✓' : 'Denied ✗'}
            </span>
          </p>
        </div>
      )}

      {event.type === 'RecordUploaded' && isPatient && (
        <div style={{ marginTop: '10px' }}>
          <button
            onClick={() => onGrantAccess(event)}
            className="btn btn-primary"
            style={{ padding: '5px 10px' }}
          >
            Grant Access to Paramedic
          </button>
        </div>
      )}

      <div style={{
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid #e5e7eb',
        fontSize: '12px',
        color: '#6b7280',
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <span>Block: {event.blockNumber}</span>
        <a
          href={`${explorerBase}/tx/${event.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#667eea', textDecoration: 'none' }}
        >
          View Transaction →
        </a>
      </div>
    </div>
  );
}

export default AuditLog;