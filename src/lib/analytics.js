// src/lib/analytics.js
// GA4 + Supabase dual tracking.
// GA Measurement ID đọc từ localStorage (không hardcode).
// trackEvent() là entry point duy nhất — dùng ở mọi nơi.

import { getConfig, isConfigured } from './supabase'

// ── GA Init ──────────────────────────────────────────────────
// Gọi 1 lần duy nhất khi app start (main.jsx).
// Idempotent qua flag window.__GA_INIT.
export function initGA(measurementId) {
  if (!measurementId) return
  if (window.__GA_INIT) return
  window.__GA_INIT = true

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  function gtag() { window.dataLayer.push(arguments) }
  window.gtag = gtag

  gtag('js', new Date())
  gtag('config', measurementId, {
    send_page_view: false, // tự track, không để GA auto
  })
}

// ── Supabase insert (fire-and-forget) ───────────────────────
// Dùng REST trực tiếp — tránh circular import với supabase.js.
// Best-effort: lỗi chỉ warn, không throw, không block UX.
async function insertEvent(type, payload) {
  const { url, key } = getConfig()
  if (!url || !key) return

  try {
    await fetch(`${url}/rest/v1/events`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':         key,
        'Authorization': `Bearer ${key}`,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify({
        type,
        payload,
        created_at: new Date().toISOString(),
      }),
    })
  } catch (e) {
    console.warn('[analytics] Supabase insert failed:', e.message)
  }
}

// ── FIX ⚠️1: Dedup cache — chặn double-fire trong 1 giây ────
// Key = type + serialized payload → cùng event không fire 2 lần liên tiếp.
// view_item dùng window (persist across re-render), clicks dùng module-level.
// TTL = 1000ms cho clicks, 5000ms cho view (tránh re-mount fire lại).
const _dedupCache = {}

function isDupe(type, payload) {
  const key = type + ':' + JSON.stringify(payload)
  if (_dedupCache[key]) return true

  // TTL: view_item 5s (tránh StrictMode double-effect), clicks 1s
  const ttl = type === 'view_item' ? 5000 : 1000
  _dedupCache[key] = true
  setTimeout(() => { delete _dedupCache[key] }, ttl)
  return false
}

// ── Main trackEvent ──────────────────────────────────────────
// type: 'view_item' | 'click_call' | 'click_zalo' | 'click_doc' | ...
// payload: { slug, category, title, position, variant, ... }
//
// → GA4 (nếu đã init) + Supabase events table (fire-and-forget)
// → Never throws
export function trackEvent(type, payload = {}) {
  if (!type) return

  // FIX ⚠️1: bỏ qua nếu là duplicate trong TTL window
  if (isDupe(type, payload)) return

  // GA4
  try {
    const { GA_MEASUREMENT_ID } = getConfig()
    if (window.gtag && GA_MEASUREMENT_ID) {
      window.gtag('event', type, payload)
    }
  } catch (e) {
    console.warn('[analytics] GA track failed:', e.message)
  }

  // Supabase — async, không await, không block
  if (isConfigured()) {
    insertEvent(type, payload)
  }

  // dataLayer fallback (backward compat)
  try {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({ event: type, timestamp: Date.now(), ...payload })
  } catch (_) {}
}

// ── FIX ⚠️3: fetchEvents — limit 500, không fetch all ───────
// Default 500 thay vì 1000, caller có thể override.
// Query luôn order desc → lấy events mới nhất.
// FIX ⚠️2 (SQL — chạy trên Supabase, không fix ở đây):
//   create index if not exists events_created_at_idx on events (created_at desc);
//   Cleanup cũ: delete from events where created_at < now() - interval '90 days';
export async function fetchEvents(limit = 500) {
  const { url, key } = getConfig()
  if (!url || !key) return []

  try {
    const res = await fetch(
      // FIX ⚠️3: limit 500, order desc — không load toàn bộ table
      `${url}/rest/v1/events?select=*&order=created_at.desc&limit=${limit}`,
      {
        headers: {
          'apikey':        key,
          'Authorization': `Bearer ${key}`,
        },
      }
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}
