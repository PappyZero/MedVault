import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { ethers } from 'ethers';
import Upload from './pages/Upload';
import Paramedic from './pages/Paramedic';
import AuditLog from './pages/AuditLog';
import WalletConnectButton from './components/WalletConnectButton';


// Network config via env (defaults to Base Sepolia)
const ENV_CHAIN_ID_DEC = Number(import.meta.env.VITE_CHAIN_ID || 84532);
const ENV_CHAIN_ID_HEX = '0x' + ENV_CHAIN_ID_DEC.toString(16);
const ENV_CHAIN_NAME = import.meta.env.VITE_CHAIN_NAME || 'Base Sepolia';
const ENV_RPC_URL = import.meta.env.VITE_RPC_URL || 'https://base-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY';
const ENV_CURRENCY_NAME = import.meta.env.VITE_CURRENCY_NAME || 'ETH';
const ENV_CURRENCY_SYMBOL = import.meta.env.VITE_CURRENCY_SYMBOL || 'ETH';
const ENV_EXPLORER_URL = import.meta.env.VITE_EXPLORER_URL || 'https://sepolia.basescan.org';

function Navigation({ account, connectWallet, isConnecting }) {
  const location = useLocation();

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                🏥 MedVault
              </span>
            </Link>
            <nav className="hidden md:ml-10 md:flex space-x-8">
              <NavLink to="/" isActive={location.pathname === '/'}>Upload</NavLink>
              <NavLink to="/paramedic" isActive={location.pathname === '/paramedic'}>Access</NavLink>
              <NavLink to="/audit" isActive={location.pathname === '/audit'}>Audit Log</NavLink>
            </nav>
          </div>
          <div className="flex items-center">
            {account ? (
              <div className="hidden md:flex items-center space-x-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {`${account.slice(0, 6)}...${account.slice(-4)}`}
                </span>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  isConnecting ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                {isConnecting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting...
                  </>
                ) : <WalletConnectButton />
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({ to, children, isActive }) {
  return (
    <Link
      to={to}
      className={`${
        isActive
          ? 'border-blue-500 text-gray-900'
          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
      } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
    >
      {children}
    </Link>
  );
}

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [networkError, setNetworkError] = useState(null);
  const navigate = useNavigate();

  const checkNetwork = useCallback(async () => {
    if (!window.ethereum) return false;

    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== ENV_CHAIN_ID_HEX) {
        setNetworkError(`Please switch to ${ENV_CHAIN_NAME} network.`);
        return false;
      }
      setNetworkError(null);
      return true;
    } catch (error) {
      console.error('Error checking network:', error);
      setNetworkError('Failed to verify network. Please try again.');
      return false;
    }
  }, []);

  const switchToCorrectNetwork = useCallback(async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ENV_CHAIN_ID_HEX }],
      });
      return true;
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: ENV_CHAIN_ID_HEX,
              chainName: ENV_CHAIN_NAME,
              nativeCurrency: {
                name: ENV_CURRENCY_NAME,
                symbol: ENV_CURRENCY_SYMBOL,
                decimals: 18
              },
              rpcUrls: [ENV_RPC_URL],
              blockExplorerUrls: [ENV_EXPLORER_URL]
            }]
          });
          return true;
        } catch (addError) {
          console.error('Failed to add network:', addError);
          setNetworkError('Failed to add network. Please add it manually in MetaMask.');
          return false;
        }
      } else if (switchError.code === 4001) {
        setNetworkError('Network switch was rejected. Please switch to the correct network manually.');
        return false;
      } else {
        console.error('Failed to switch network:', switchError);
        setNetworkError('Failed to switch network. Please try again.');
        return false;
      }
    }
  }, []);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask to use this application');
      return;
    }

    setIsConnecting(true);
    setNetworkError(null);

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      const isCorrectNetwork = await checkNetwork();
      if (!isCorrectNetwork) {
        const switched = await switchToCorrectNetwork();
        if (!switched) {
          setIsConnecting(false);
          return;
        }
      }

      const ethersProvider = new ethers.BrowserProvider(window.ethereum);
      const ethersSigner = await ethersProvider.getSigner();

      setAccount(accounts[0]);
      setProvider(ethersProvider);
      setSigner(ethersSigner);
      setNetworkError(null);

    } catch (error) {
      console.error('Failed to connect wallet:', error);
      setNetworkError(error.message || 'Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  }, [checkNetwork, switchToCorrectNetwork]);

  // Check initial connection and network
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          connectWallet();
        }
      }
    };

    checkConnection();
  }, [connectWallet]);

  // Set up event listeners
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        setAccount(accounts[0]);
      } else {
        setAccount(null);
        setProvider(null);
        setSigner(null);
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  return 
  (
    <ErrorBoundary 
      fallback={({ error, resetError }) => (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <p>{error.message}</p>
          <button onClick={resetError}>Try again</button>
        </div>
      )}
    >

    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600">
      <Navigation 
        account={account} 
        connectWallet={connectWallet} 
        isConnecting={isConnecting} 
      />
      
      {networkError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{networkError}</p>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet context={{ account, signer, provider, onError: setNetworkError }} />
      </main>
    </div>
    </ErrorBoundary>
  );
}

export default App;