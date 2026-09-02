import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 32, background: '#F8FAFC' }}>
          <div style={{ fontSize: '3rem' }}>⚠️</div>
          <h2 style={{ color: '#1A2B3C', fontSize: '1.4rem', fontWeight: 700 }}>Something went wrong</h2>
          <p style={{ color: '#64748B', maxWidth: 500, textAlign: 'center', fontSize: '0.9rem' }}>
            {this.state.error?.message || 'An unexpected error occurred while rendering this page.'}
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn btn-primary"
              style={{ padding: '8px 20px', fontSize: '0.85rem' }}
            >
              Reload Page
            </button>
            <button
              type="button"
              onClick={() => { window.location.href = '/'; }}
              className="btn btn-secondary"
              style={{ padding: '8px 20px', fontSize: '0.85rem' }}
            >
              Go to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
