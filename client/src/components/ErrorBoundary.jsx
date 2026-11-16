import React from 'react';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;

      return (
        <div className="error-boundary" role="alert">
          <div className="error-boundary__icon" aria-hidden="true">🌿</div>
          <h1 className="error-boundary__title">Something went wrong</h1>
          <p className="error-boundary__desc">
            We encountered an unexpected error while loading this page. You can try refreshing or returning home.
          </p>
          <div className="error-boundary__actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={this.handleRetry}
            >
              Refresh page
            </button>
            <a href="/" className="btn btn-secondary">
              Back to home
            </a>
          </div>

          {isDev && this.state.error && (
            <details className="error-boundary__details">
              <summary>Error details (development only)</summary>
              <pre>{this.state.error.toString()}</pre>
              {this.state.errorInfo && (
                <pre>{this.state.errorInfo.componentStack}</pre>
              )}
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
