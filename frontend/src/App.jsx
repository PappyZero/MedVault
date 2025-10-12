import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { ethers } from 'ethers';
import ErrorBoundary from './components/ErrorBoundary';
import WalletConnectButton from './components/WalletConnectButton';

// Network config for BlockDAG
const ENV_CHAIN_ID_DEC = Number(import.meta.env.VITE_CHAIN_ID || 1043);
const ENV_CHAIN_ID_HEX = '0x' + ENV_CHAIN_ID_DEC.toString(16);
const ENV_CHAIN_NAME = import.meta.env.VITE_CHAIN_NAME || 'BlockDAG';
const ENV_RPC_URL = import.meta.env.VITE_RPC_URL || 'https://rpc.awakening.bdagscan.com';
const ENV_CURRENCY_NAME = import.meta.env.VITE_CURRENCY_NAME || 'BDAG';
const ENV_CURRENCY_SYMBOL = import.meta.env.VITE_CURRENCY_SYMBOL || 'BDAG';
const ENV_EXPLORER_URL = import.meta.env.VITE_EXPLORER_URL || 'https://awakening.bdagscan.com/';

// Move NavLink component outside of App for better performance
const NavLink = ({ to, children, isActive }) => (
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

// Move Navigation component outside of App for better performance
const Navigation = ({ account, connectWallet, isConnecting }) => {
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
              <NavLink to="/audit-log" isActive={location.pathname === '/audit-log'}>Audit Log</NavLink>
            </nav>
          </div>
          <div className="flex items-center">
            <WalletConnectButton 
              account={account} 
              onConnect={connectWallet} 
              isConnecting={isConnecting} 
            />
          </div>
        </div>
      </div>
    </header>
  );
};

// Move ErrorFallback component outside of App for better performance
const ErrorFallback = ({ error, resetError }) => {
  const handleReset = () => {
    resetError?.();
    window.location.href = '/'; // Reset to home page on error
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
        <p className="text-gray-700 mb-6">{error.message || 'An unexpected error occurred'}</p>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
};

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [networkError, setNetworkError] = useState(null);

  const checkNetwork = useCallback(async () => {
    if (!window.ethereum) {
      setNetworkError('Please install MetaMask to continue');
      return false;
    }

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
    if (!window.ethereum) {
      setNetworkError('Please install MetaMask to continue');
      return false;
    }

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
      }
      console.error('Failed to switch network:', switchError);
      setNetworkError('Failed to switch network. Please try again.');
      return false;
    }
  }, []);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setNetworkError('Please install MetaMask to continue');
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
      // For critical errors, you can throw them to be caught by the error boundary
      if (error.isCritical) {
        throw error;
      }
    } finally {
      setIsConnecting(false);
    }
  }, [checkNetwork, switchToCorrectNetwork]);

  // Check initial connection and network
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            await connectWallet();
          }
        } catch (error) {
          console.error('Error checking connection:', error);
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
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  return (
    <ErrorBoundary fallback={ErrorFallback}>
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