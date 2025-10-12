import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Web3Provider } from './contexts/Web3Context';
import router from './routes';
import './index.css';

// Error reporting service
const reportError = (error, errorInfo = null) => {
  const errorData = {
    error: error?.message || String(error),
    stack: error?.stack,
    componentStack: errorInfo?.componentStack,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
  };

  if (process.env.NODE_ENV === 'production') {
    console.error('Error reported:', errorData);
  } else {
    console.error('Development error:', error, errorInfo);
  }
};

// Global error handler
const handleGlobalError = (error, errorInfo) => {
  reportError(error, errorInfo);
  return true;
};

// Unhandled promise rejection handler
const handleUnhandledRejection = (event) => {
  const error = event.reason || event.detail?.reason;
  reportError(error, { type: 'unhandledrejection' });
  event.preventDefault();
};

// Register global error handlers
const registerErrorHandlers = () => {
  window.addEventListener('error', (event) => {
    handleGlobalError(event.error || new Error(event.message), {
      componentStack: event.filename,
    });
  });

  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  return () => {
    window.removeEventListener('error', handleGlobalError);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  };
};

// Error fallback component
const ErrorFallback = ({ error, resetError }) => {
  const handleReset = () => {
    resetError?.();
    if (window.location.pathname !== '/') {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="mt-3 text-2xl font-bold text-gray-900">
            Something went wrong
          </h2>
          <p className="mt-2 text-gray-600">
            We're sorry, but an unexpected error occurred. Our team has been notified.
          </p>
          
          {error?.message && (
            <div className="mt-4 p-3 bg-red-50 rounded-md text-sm text-red-700 text-left">
              <p className="font-medium">Error details:</p>
              <p className="mt-1">{error.message}</p>
              {process.env.NODE_ENV === 'development' && error.stack && (
                <details className="mt-2">
                  <summary className="text-xs text-red-600 cursor-pointer">
                    Show technical details
                  </summary>
                  <pre className="mt-1 p-2 bg-red-100 rounded text-xs overflow-auto max-h-40">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}

          <div className="mt-6 space-y-3">
            <button
              onClick={handleReset}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Return to Home
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App component
function App() {
  React.useEffect(() => {
    const cleanup = registerErrorHandlers();
    return cleanup;
  }, []);

  return (
    <Web3Provider>
      <RouterProvider 
        router={router}
        fallbackElement={<div className="flex items-center justify-center min-h-screen">Loading...</div>}
      />
    </Web3Provider>
  );
}

// Initialize the app
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Cleanup for HMR
if (import.meta.hot) {
  import.meta.hot.accept();
}