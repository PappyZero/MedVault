import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ethers } from 'ethers';
import Upload from './pages/Upload';
import Paramedic from './pages/Paramedic';
import AuditLog from './pages/AuditLog';

function Navigation({ account, connectWallet }) {
  const location = useLocation();

  return (
    <header className="header">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <h1 style={{ margin: 0, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '28px' }}>
            🏥 MedVault
          </h1>
          <nav className="nav">
            <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
              Upload
            </Link>
            <Link to="/paramedic" className={location.pathname === '/paramedic' ? 'active' : ''}>
              Access
            </Link>
            <Link to="/audit" className={location.pathname === '/audit' ? 'active' : ''}>
              Audit Log
            </Link>
          </nav>
          {account ? (
            <div style={{ background: '#f3f4f6', padding: '8px 16px', borderRadius: '8px', fontSize: '14px' }}>
              {account.slice(0, 6)}...{account.slice(-4)}
            </div>
          ) : (
            <button onClick={connectWallet} className="btn btn-primary">
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('Please install MetaMask to use this application');
        return;
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      const ethersProvider = new ethers.BrowserProvider(window.ethereum);
      const ethersSigner = await ethersProvider.getSigner();

      setAccount(accounts[0]);
      setProvider(ethersProvider);
      setSigner(ethersSigner);

      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const expectedChainId = '0x413'; // 1043 in hex

      if (chainId !== expectedChainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: expectedChainId }],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: expectedChainId,
                chainName: 'BlockDAG Awakening',
                nativeCurrency: {
                  name: 'BDAG',
                  symbol: 'BDAG',
                  decimals: 18
                },
                rpcUrls: ['https://rpc.awakening.bdagscan.com'],
                blockExplorerUrls: ['https://bdagscan.com']
              }]
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('Failed to connect wallet: ' + error.message);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount(null);
          setProvider(null);
          setSigner(null);
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  return (
    <Router>
      <div style={{ minHeight: '100vh' }}>
        <Navigation account={account} connectWallet={connectWallet} />
        <div className="container">
          <Routes>
            <Route path="/" element={<Upload account={account} signer={signer} provider={provider} />} />
            <Route path="/paramedic" element={<Paramedic account={account} signer={signer} provider={provider} />} />
            <Route path="/audit" element={<AuditLog provider={provider} />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
