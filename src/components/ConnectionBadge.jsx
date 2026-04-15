// src/components/ConnectionBadge.jsx
// Reusable Supabase connection indicator
import { useState, useEffect } from 'react'
import { isConfigured, testConnection } from '../lib/supabase'

export default function ConnectionBadge({ onReady } = {}) {
  const [state, setState] = useState(isConfigured() ? 'checking' : 'uncfg')

  useEffect(() => {
    if (!isConfigured()) { onReady?.(false); return }
    testConnection().then(r => {
      setState(r.ok ? 'ok' : 'fail')
      onReady?.(r.ok)
    })
  }, [])

  const map = {
    uncfg:    { icon: '⚪', color: '#888',    bg: '#f5f5f5', border: '#ddd',    label: 'Chưa cấu hình' },
    checking: { icon: '⏳', color: '#888',    bg: '#f5f5f5', border: '#ddd',    label: 'Đang kết nối...' },
    ok:       { icon: '🟢', color: '#16a34a', bg: '#f0fdf4', border: '#86efac', label: 'Supabase OK' },
    fail:     { icon: '🔴', color: '#dc2626', bg: '#fff5f5', border: '#fca5a5', label: 'Kết nối thất bại' },
  }

  const { icon, color, bg, border, label } = map[state] || map.uncfg

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 12, fontWeight: 600, padding: '4px 12px',
      borderRadius: 20, background: bg, border: `1px solid ${border}`, color,
      fontFamily: 'inherit',
    }}>
      {icon} {label}
    </span>
  )
}
