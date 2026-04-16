// src/hooks/useTheme.js
import { useState, useEffect } from 'react'

function getInitialTheme() {
  try {
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark') return stored
  } catch { /* ignore */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('theme', theme) } catch { /* ignore */ }
  }, [theme])

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return { theme, toggle, isDark: theme === 'dark' }
}
