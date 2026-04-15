// src/lib/auth.js
const PASSWORD    = 'RongLeo1234!'
const SESSION_KEY = 'admin_auth'

export function isAuthed() {
  try { return sessionStorage.getItem(SESSION_KEY) === '1' } catch { return false }
}

export function setAuthed() {
  try { sessionStorage.setItem(SESSION_KEY, '1') } catch {}
}

// Legacy helper — kept for any direct callers
export function promptPassword(redirectOnFail = '/') {
  if (isAuthed()) return true
  const input = window.prompt('🔐 Nhập mật khẩu để tiếp tục:')
  if (input === PASSWORD) {
    setAuthed()
    return true
  }
  window.location.replace(redirectOnFail)
  return false
}
