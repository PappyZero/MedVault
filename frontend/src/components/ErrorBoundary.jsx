import { Component } from 'react';
import PropTypes from 'prop-types';

class ErrorBoundary extends Component {
  static propTypes = {
    children: PropTypes.node.isRequired,
    fallback: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
    onError: PropTypes.func,
    resetOnChange: PropTypes.any,
    showReset: PropTypes.bool,
    className: PropTypes.string,
    errorClassName: PropTypes.string,
  };

  static defaultProps = {
    fallback: null,
    onError: null,
    resetOnChange: null,
    showReset: true,
    className: '',
    errorClassName: 'p-6 max-w-md mx-auto mt-10 bg-white rounded-lg shadow-lg',
  };

  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    return { 
      hasError: true, 
      error,
      errorInfo: { componentStack: error.stack },
      errorId: `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`  
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    this.logErrorToService(error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo, this.state.errorId);
    }
  }

  componentDidUpdate(prevProps) {
    if (
      this.props.resetOnChange !== prevProps.resetOnChange &&
      this.state.hasError
    ) {
      this.resetErrorBoundary();
    }
  }

  logErrorToService = (error, errorInfo) => {
    const { errorId } = this.state;
    
    if (process.env.NODE_ENV === 'production') {
      try {
        console.error('ErrorBoundary caught an error:', {
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
          errorInfo,
          errorId,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        });
      } catch (loggingError) {
        console.error('Error logging to service:', loggingError);
      }
    } else {
      console.group('ErrorBoundary');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.groupEnd();
    }
  };

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  renderErrorContent = () => {
    const { error, errorId, errorInfo } = this.state;
    const { fallback, errorClassName, showReset } = this.props;

    if (fallback) {
      return typeof fallback === 'function'
        ? fallback({ 
            error, 
            errorId, 
            errorInfo,
            resetError: this.resetErrorBoundary 
          })
        : fallback;
    }

    return (
      <div 
        className={`bg-red-50 border-l-4 border-red-400 p-4 ${errorClassName}`}
        role="alert"
        aria-live="assertive"
      >
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Something went wrong
              {errorId && (
                <span className="text-xs text-red-600 ml-2">(Error ID: {errorId})</span>
              )}
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error?.message || 'An unexpected error occurred'}</p>
              {(process.env.NODE_ENV !== 'production') && (
                <details className="mt-2">
                  <summary className="text-xs text-red-500 cursor-pointer hover:underline">
                    Show error details
                  </summary>
                  <div className="mt-1 p-2 bg-red-100 rounded text-xs overflow-auto max-h-40">
                    {error?.stack && (
                      <pre className="whitespace-pre-wrap break-words">
                        {error.stack}
                      </pre>
                    )}
                    {errorInfo?.componentStack && (
                      <div className="mt-2 pt-2 border-t border-red-200">
                        <div className="font-semibold mb-1">Component Stack:</div>
                        <pre className="whitespace-pre-wrap break-words text-red-800">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
            {showReset && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={this.resetErrorBoundary}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-150"
                  aria-label="Try again"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  render() {
    if (this.state.hasError) {
      return this.renderErrorContent();
    }

    // Ensure children is always rendered
    return this.props.children || null;
  }
}

export default ErrorBoundary;