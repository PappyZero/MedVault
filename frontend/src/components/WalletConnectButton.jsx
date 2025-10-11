import { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import Tooltip from './ui/Tooltip';

const WalletConnectButton = () => {
  const { 
    account, 
    isConnected, 
    connectWallet, 
    disconnectWallet,
    chainId,
    isConnecting,
    error: web3Error 
  } = useWeb3();
  
  const [isHovered, setIsHovered] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [isMounted, setIsMounted] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const formatAddress = (address) => {
    if (!address) return '0x0...0';
    return `${address.substring(0, 6)}...${address.substring(38)}`;
  };

  const handleConnect = async () => {
    try {
      setLocalError(null);
      await connectWallet();
    } catch (error) {
      console.error('Connection error:', error);
      setLocalError(error.message || 'Failed to connect wallet');
    }
  };

  const handleDisconnect = () => {
    try {
      disconnectWallet();
      setShowTooltip(false);
    } catch (error) {
      console.error('Disconnection error:', error);
      setLocalError('Failed to disconnect wallet');
    }
  };

  // Don't render anything during SSR or if not mounted
  if (!isMounted) {
    return null;
  }

  // Show network error if connected to wrong network
  const isWrongNetwork = isConnected && chainId !== '0x413' && chainId !== '1043';
  const isBlockDAGNetwork = chainId === '0x413' || chainId === '1043';

  return (
    <div className="relative">
      {isConnected ? (
        <div 
          className="relative group"
          onMouseEnter={() => {
            setIsHovered(true);
            setShowTooltip(true);
          }}
          onMouseLeave={() => {
            setIsHovered(false);
            setShowTooltip(false);
          }}
        >
          <Tooltip
            content={
              <div className="p-2 text-xs">
                <div className="font-medium">Account Details</div>
                <div className="mt-1 text-gray-200">Address: {account}</div>
                <div className="mt-1">
                  Network: {isBlockDAGNetwork ? 'BlockDAG' : 'Unsupported'}
                </div>
                {isWrongNetwork && (
                  <div className="mt-1 text-yellow-400">
                    Please switch to BlockDAG network
                  </div>
                )}
              </div>
            }
            position="bottom"
            showArrow={true}
            delay={100}
            tooltipClassName="bg-gray-800 text-white"
          >
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-colors cursor-pointer ${
              isWrongNetwork 
                ? 'bg-yellow-100 text-yellow-800' 
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}>
              {isWrongNetwork ? (
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-green-500" />
              )}
              <span className="font-medium">
                {isWrongNetwork ? 'Wrong Network' : formatAddress(account)}
              </span>
            </div>
          </Tooltip>
          
          {/* Disconnect button appears on hover */}
          <button
            onClick={handleDisconnect}
            className={`absolute right-0 top-full mt-1 w-full bg-white shadow-lg rounded-md py-1 px-3 text-sm text-red-600 hover:bg-red-50 transition-all duration-200 ${
              isHovered ? 'opacity-100 visible' : 'opacity-0 invisible'
            }`}
            aria-label="Disconnect wallet"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className={`px-4 py-2 rounded-full font-medium transition-colors ${
            isConnecting
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
          aria-label={isConnecting ? 'Connecting to wallet' : 'Connect wallet'}
        >
          {isConnecting ? (
            <div className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" 
                aria-hidden="true"
              />
              <span>Connecting...</span>
            </div>
          ) : (
            'Connect Wallet'
          )}
        </button>
      )}

      {/* Error message */}
      {(localError || (web3Error && !isConnected)) && (
        <div 
          className="absolute left-0 right-0 mt-2 text-sm text-red-600 text-center"
          role="alert"
        >
          {localError || web3Error}
          {web3Error?.includes('MetaMask') && (
            <div className="mt-1">
              <a 
                href="https://metamask.io/download.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
                aria-label="Install MetaMask"
              >
                Install MetaMask
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WalletConnectButton;