// src/components/ErrorBoundary.jsx
// Class component — required by React for error boundaries.
// Wrap any subtree to catch render / lifecycle crashes gracefully.
//
// Usage:
//   <ErrorBoundary>
//     <SomeComponent />
//   </ErrorBoundary>
//
//   <ErrorBoundary fallback={<CustomUI />}>
//     <SomeComponent />
//   </ErrorBoundary>
import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
    this.reset = this.reset.bind(this)
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Log to console — swap for Sentry / Supabase if needed
    console.error('[ErrorBoundary] Caught:', error?.message, info?.componentStack)
  }

  reset() {
    this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children

    // Custom fallback passed by parent takes priority
    if (this.props.fallback) return this.props.fallback

    return (
      <div style={{
        minHeight:      '40vh',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            16,
        padding:        '40px 20px',
        textAlign:      'center',
        background:     'var(--bg)',
        color:          'var(--text)',
        fontFamily:     'var(--font-body)',
      }}>
        <div style={{ fontSize: '3rem' }}>😕</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
          Trang đang gặp lỗi
        </div>
        <div style={{
          fontSize: '0.88rem',
          color:    'var(--text-muted)',
          maxWidth: 360,
          lineHeight: 1.6,
        }}>
          Vui lòng thử lại. Nếu lỗi tiếp tục xảy ra, hãy liên hệ hỗ trợ.
        </div>
        <button
          onClick={this.reset}
          style={{
            padding:      '10px 28px',
            background:   'var(--gold)',
            color:        'var(--hero-from)',
            border:       'none',
            borderRadius: 8,
            fontWeight:   700,
            cursor:       'pointer',
            fontSize:     '0.9rem',
          }}
        >
          Thử lại
        </button>
      </div>
    )
  }
}
