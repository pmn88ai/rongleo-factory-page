// src/components/ProtectedRoute.jsx
// Guards a route with password prompt. sessionStorage keeps auth across page navigations.
import { useEffect, useState } from 'react'
import { isAuthed, setAuthed } from '../lib/auth'

const PASSWORD = 'RongLeo1234!'

export default function ProtectedRoute({ children }) {
  // Initialise immediately from sessionStorage — no flicker for already-authed users
  const [status, setStatus] = useState(() => isAuthed() ? 'ok' : 'pending')

  useEffect(() => {
    if (status !== 'pending') return

    // window.prompt is synchronous — runs after React's first paint
    const input = window.prompt('🔐 Nhập mật khẩu để tiếp tục:')

    if (input === PASSWORD) {
      setAuthed()
      setStatus('ok')
    } else {
      setStatus('denied')
      window.location.replace('/')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally empty: run once on mount

  if (status === 'ok') return children

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--green-deep)',
      flexDirection: 'column', gap: 12,
    }}>
      <div style={{ fontSize: '2rem' }}>🔐</div>
      <div style={{
        color: 'var(--gold-light)', fontFamily: 'var(--font-display)', fontSize: '1.1rem',
      }}>
        {status === 'denied' ? 'Sai mật khẩu. Đang chuyển hướng...' : 'Đang xác thực...'}
      </div>
    </div>
  )
}
