// src/contexts/Web3Context.jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';

const Web3Context = createContext();

// Supported networks
const SUPPORTED_NETWORKS = {
  '0x413': 'BlockDAG',
  '1043': 'BlockDAG' // Decimal version
};

const TARGET_CHAIN_ID = '0x413'; // BlockDAG chain ID

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chainId, setChainId] = useState(null);
  const [error, setError] = useState(null);

  // Check for existing session on component mount
  useEffect(() => {
    const init = async () => {
      await checkIfWalletIsConnected();
      setupEventListeners();
    };
    
    init();
    return () => removeEventListeners();
  }, []);

  const setupEventListeners = useCallback(() => {
    if (!window.ethereum) {
      setError('Please install MetaMask!');
      return;
    }

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (account !== accounts[0]) {
        setAccount(accounts[0]);
        updateSigner();
      }
    };

    const handleChainChanged = (newChainId) => {
      setChainId(newChainId);
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    window.ethereum.on('disconnect', handleDisconnect);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
      window.ethereum?.removeListener('disconnect', handleDisconnect);
    };
  }, [account]);

  const updateSigner = useCallback(async () => {
    if (provider) {
      try {
        const signer = await provider.getSigner();
        setSigner(signer);
      } catch (err) {
        console.error('Error updating signer:', err);
      }
    }
  }, [provider]);

  const checkIfWalletIsConnected = useCallback(async () => {
    if (!window.ethereum) {
      setError('Please install MetaMask!');
      return;
    }

    try {
      setIsConnecting(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      
      if (accounts.length > 0) {
        const network = await provider.getNetwork();
        const currentChainId = `0x${network.chainId.toString(16)}`;
        
        setProvider(provider);
        setChainId(currentChainId);
        
        const signer = await provider.getSigner();
        setSigner(signer);
        setAccount(accounts[0]);
        setIsConnected(true);
      }
    } catch (err) {
      console.error('Error checking wallet connection:', err);
      setError('Failed to connect to wallet');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setError('Please install MetaMask!');
      return false;
    }

    try {
      setIsConnecting(true);
      setError(null);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      const network = await provider.getNetwork();
      const currentChainId = `0x${network.chainId.toString(16)}`;
      
      if (!SUPPORTED_NETWORKS[currentChainId]) {
        setError('Unsupported network. Please switch to BlockDAG network.');
        return false;
      }

      const signer = await provider.getSigner();
      
      setProvider(provider);
      setSigner(signer);
      setAccount(accounts[0]);
      setChainId(currentChainId);
      setIsConnected(true);
      
      return true;
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError(err.message || 'Failed to connect wallet');
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const switchNetwork = useCallback(async () => {
    if (!window.ethereum) {
      setError('Please install MetaMask!');
      return false;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: TARGET_CHAIN_ID }],
      });
      return true;
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: TARGET_CHAIN_ID,
              chainName: 'BlockDAG Mainnet',
              nativeCurrency: {
                name: 'BDAG',
                symbol: 'BDAG',
                decimals: 18
              },
              rpcUrls: ['https://rpc.awakening.bdagscan.com'],
              blockExplorerUrls: ['https://awakening.bdagscan.com/']
            }]
          });
          return true;
        } catch (addError) {
          console.error('Error adding network:', addError);
          setError('Failed to add BlockDAG network to MetaMask');
          return false;
        }
      } else {
        console.error('Error switching network:', switchError);
        setError('Failed to switch network');
        return false;
      }
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setChainId(null);
    setIsConnected(false);
    setError(null);
  }, []);

  const handleDisconnect = useCallback(() => {
    disconnectWallet();
  }, [disconnectWallet]);

  const removeEventListeners = useCallback(() => {
    if (window.ethereum) {
      window.ethereum.removeAllListeners('accountsChanged');
      window.ethereum.removeAllListeners('chainChanged');
      window.ethereum.removeAllListeners('disconnect');
    }
  }, []);

  return (
    <Web3Context.Provider
      value={{
        account,
        provider,
        signer,
        isConnected,
        isConnecting,
        chainId,
        error,
        connectWallet,
        disconnectWallet,
        switchNetwork,
        isCorrectNetwork: chainId ? !!SUPPORTED_NETWORKS[chainId] : false
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

export default Web3Context;