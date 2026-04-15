// src/lib/supabase.js
// Pure REST — no SDK. Reads config from localStorage.
// Supabase is the SINGLE source of truth for all property data.

// ── Config ──────────────────────────────────────────────────
export function getConfig() {
  try {
    return {
      url:               localStorage.getItem('SUPABASE_URL')       || '',
      key:               localStorage.getItem('SUPABASE_ANON_KEY')  || '',
      groq:              localStorage.getItem('GROQ_API_KEY')       || '',
      userId:            localStorage.getItem('USER_ID')            || 'RongLeo',
      appId:             localStorage.getItem('APP_ID')             || 'factory_pages',
      GA_MEASUREMENT_ID: localStorage.getItem('GA_MEASUREMENT_ID') || '',
      categories:        getCategories(),
    }
  } catch {
    return { url: '', key: '', groq: '', userId: 'RongLeo', appId: 'factory_pages', GA_MEASUREMENT_ID: '', categories: getDefaultCategories() }
  }
}

export function saveConfig(cfg) {
  localStorage.setItem('SUPABASE_URL',       cfg.url               || '')
  localStorage.setItem('SUPABASE_ANON_KEY',  cfg.key               || '')
  localStorage.setItem('GROQ_API_KEY',       cfg.groq              || '')
  localStorage.setItem('USER_ID',            cfg.userId            || 'RongLeo')
  localStorage.setItem('APP_ID',             cfg.appId             || 'factory_pages')
  localStorage.setItem('GA_MEASUREMENT_ID',  cfg.GA_MEASUREMENT_ID || '')
  if (cfg.categories) {
    localStorage.setItem('APP_CATEGORIES', JSON.stringify(cfg.categories))
  }
}

// ── Categories — dynamic, managed in /config ────────────────
export function getDefaultCategories() {
  return [
    { value: 'land',   label: '🏕 Đất' },
    { value: 'phone',  label: '📱 Phone' },
    { value: 'car',    label: '🚗 Xe' },
    { value: 'laptop', label: '💻 Laptop' },
  ]
}

export function getCategories() {
  try {
    const raw = localStorage.getItem('APP_CATEGORIES')
    if (!raw) return getDefaultCategories()
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].value) return parsed
    return getDefaultCategories()
  } catch {
    return getDefaultCategories()
  }
}

export function saveCategories(cats) {
  localStorage.setItem('APP_CATEGORIES', JSON.stringify(cats))
}

// ── Slug normalization ───────────────────────────────────────
export function normalizeSlug(str) {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

// ── Storage URL checks ───────────────────────────────────────
export function isSupabaseAsset(url) {
  try {
    const u = new URL(url)
    return u.pathname.includes('/storage/v1/object/public/assets/')
  } catch {
    return false
  }
}

export function isSupabaseRawAsset(url) {
  try {
    const u = new URL(url)
    return u.pathname.includes('/storage/v1/object/public/raw-assets/')
  } catch {
    return false
  }
}

// ── Core REST wrapper ────────────────────────────────────────
function buildHeaders(extra = {}) {
  const { key } = getConfig()
  return {
    'Content-Type':  'application/json',
    'apikey':         key,
    'Authorization': `Bearer ${key}`,
    'Prefer':        'return=representation',
    ...extra,
  }
}

export function isConfigured() {
  const { url, key } = getConfig()
  return Boolean(url && key)
}

async function rest(path, options = {}) {
  const { url } = getConfig()
  if (!url) throw new Error('Supabase URL chưa được cấu hình')
  const res = await fetch(`${url}/rest/v1${path}`, {
    headers: buildHeaders(),
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase ${res.status}: ${text}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

// ── Schemas ──────────────────────────────────────────────────
export async function getSchemas() {
  return rest('/schemas?select=*&order=category')
}

export async function getSchema(category) {
  if (!category) return []
  try {
    const rows = await rest(
      `/schemas?category=eq.${encodeURIComponent(category)}&select=fields&limit=1`
    )
    const raw = rows?.[0]?.fields
    if (!raw) return []
    if (typeof raw === 'string') return JSON.parse(raw)
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

// ── Properties ──────────────────────────────────────────────
export async function fetchProperties() {
  return rest('/properties?order=created_at.desc&select=*')
}

export async function fetchPropertyBySlug(slug) {
  const normalized = normalizeSlug(slug)
  const rows = await rest(
    `/properties?slug=eq.${encodeURIComponent(normalized)}&select=*&limit=1`
  )
  return rows?.[0] || null
}

export async function upsertProperty(data) {
  const payload = { ...data, slug: normalizeSlug(data.slug) }
  if (!payload.slug)  throw new Error('slug là bắt buộc')
  if (!payload.title) throw new Error('title là bắt buộc')
  return rest('/properties?on_conflict=slug', {
    method: 'POST',
    body:   JSON.stringify(payload),
    headers: buildHeaders({ 'Prefer': 'return=representation,resolution=merge-duplicates' }),
  })
}

export async function deleteProperty(id, imageUrls = []) {
  try {
    const validPublic = (imageUrls || []).filter(isSupabaseAsset)
    const validRaw    = (imageUrls || []).filter(isSupabaseRawAsset)
    if (validPublic.length > 0) await deleteStorageImages(validPublic, 'assets')
    if (validRaw.length > 0)    await deleteStorageImages(validRaw, 'raw-assets')
  } catch (e) {
    console.warn('[deleteProperty] Storage cleanup failed:', e.message)
  }
  return rest(`/properties?id=eq.${id}`, { method: 'DELETE' })
}

// ── Storage ─────────────────────────────────────────────────
async function uploadToBucket(file, bucket) {
  const { url, key } = getConfig()
  if (!url || !key) throw new Error('Supabase chưa được cấu hình')
  const ext      = (file.name || 'img').split('.').pop().toLowerCase() || 'jpg'
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const res = await fetch(`${url}/storage/v1/object/${bucket}/${filename}`, {
    method: 'POST',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': file.type || 'image/jpeg', 'Cache-Control': '3600' },
    body: file,
  })
  if (!res.ok) { const text = await res.text(); throw new Error(`Upload failed ${res.status}: ${text}`) }
  return `${url}/storage/v1/object/public/${bucket}/${filename}`
}

export async function uploadImage(file)    { return uploadToBucket(file, 'assets') }
export async function uploadRawImage(file) { return uploadToBucket(file, 'raw-assets') }

export async function deleteStorageImages(urls = [], bucket = 'assets') {
  const { url, key } = getConfig()
  if (!url || !key) return
  const storageBase = `${url}/storage/v1/object/public/${bucket}/`
  const filenames   = urls.map(u => u.replace(storageBase, '')).filter(Boolean)
  if (!filenames.length) return
  const res = await fetch(`${url}/storage/v1/object/${bucket}`, {
    method: 'DELETE',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: filenames }),
  })
  if (!res.ok) { const text = await res.text(); throw new Error(`Storage delete failed ${res.status}: ${text}`) }
  return res.json()
}

// ── Connection test ──────────────────────────────────────────
export async function testConnection() {
  try {
    await rest('/properties?limit=1&select=id')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}
