import { useWeb3 } from '../contexts/Web3Context';
import WalletConnectButton from './WalletConnectButton';

const Navbar = () => {
  const { isConnected } = useWeb3();

  return (
    <nav className="navbar">
      <div className="logo">MedVault</div>
      <div className="nav-links">
        <a href="/">Home</a>
        {isConnected && (
          <>
            <a href="/records">My Records</a>
            <a href="/share">Share Access</a>
          </>
        )}
      </div>
      <WalletConnectButton />
    </nav>
  );
};

export default Navbar;