import { Navigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';

const ProtectedRoute = ({ children }) => {
  const { isConnected } = useWeb3();

  if (!isConnected) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;