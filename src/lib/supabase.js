// src/lib/supabase.js
// Pure REST — no SDK.
// Config priority: Vercel env vars (import.meta.env) → localStorage fallback.
// Supabase is the SINGLE source of truth for all property data.

// ── Config ──────────────────────────────────────────────────
// ENV vars take priority so production works without opening /config.
// localStorage remains for dev overrides and the /config fallback UI.
export function getConfig() {
  try {
    return {
      url:               import.meta.env.VITE_SUPABASE_URL      || localStorage.getItem('SUPABASE_URL')       || '',
      key:               import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('SUPABASE_ANON_KEY')  || '',
      groq:              import.meta.env.VITE_GROQ_API_KEY      || localStorage.getItem('GROQ_API_KEY')       || '',
      userId:                                                       localStorage.getItem('USER_ID')            || 'RongLeo',
      appId:                                                        localStorage.getItem('APP_ID')             || 'factory_pages',
      GA_MEASUREMENT_ID: import.meta.env.VITE_GA_ID             || localStorage.getItem('GA_MEASUREMENT_ID') || '',
      categories:        getCategories(),
    }
  } catch {
    return {
      url:               import.meta.env.VITE_SUPABASE_URL      || '',
      key:               import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      groq:              import.meta.env.VITE_GROQ_API_KEY      || '',
      userId:            'RongLeo',
      appId:             'factory_pages',
      GA_MEASUREMENT_ID: import.meta.env.VITE_GA_ID             || '',
      categories:        getDefaultCategories(),
    }
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
// Handles Vietnamese fully:
//   "Cao Lãnh 120m²"  → "cao-lanh-120m"
//   "Đất thổ cư đẹp"  → "dat-tho-cu-dep"
//   "đường Nguyễn..."  → "duong-nguyen"
// Steps: lowercase → strip combining marks → đ→d → keep a-z0-9 → spaces/special→dash → dedup → trim
export function normalizeSlug(str = '') {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // bỏ dấu (à→a, ổ→o, ...)
    .replace(/đ/gi, 'd')               // đ không decompose bằng NFD, xử lý riêng
    .replace(/[^a-z0-9\s-]/g, '')      // xóa ký tự đặc biệt, giữ space và dash
    .trim()
    .replace(/[\s-]+/g, '-')           // space / multiple dashes → single dash
    .replace(/^-|-$/g, '')             // bỏ dash đầu/cuối
}

export function isValidSlug(str) {
  return /^[a-z0-9-]+$/.test(str) && str.length > 0
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

// ── Simple in-memory cache (5 min TTL) ──────────────────────
const _slugCache = new Map()
const CACHE_TTL  = 5 * 60 * 1000

export async function fetchPropertyBySlug(slug) {
  const normalized = normalizeSlug(slug)
  const cached = _slugCache.get(normalized)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data

  const rows = await rest(
    `/properties?slug=eq.${encodeURIComponent(normalized)}&select=*&limit=1`
  )
  const data = rows?.[0] || null
  _slugCache.set(normalized, { data, ts: Date.now() })
  return data
}

export function invalidatePropertyCache(slug) {
  if (slug) _slugCache.delete(normalizeSlug(slug))
  else      _slugCache.clear()
}

export async function upsertProperty(data) {
  const slug = normalizeSlug(data.slug)
  if (!slug) throw new Error('slug là bắt buộc')

  // Derive title from public_data for backward compat
  const title = data.public_data?.hero?.headline || data.title || slug

  const payload = {
    ...data,
    slug,
    title,
    updated_at: new Date().toISOString(),
  }

  const result = await rest('/properties?on_conflict=slug', {
    method: 'POST',
    body:   JSON.stringify(payload),
    headers: buildHeaders({ Prefer: 'return=representation,resolution=merge-duplicates' }),
  })
  invalidatePropertyCache(slug) // bust cache after write
  return result
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
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024 // 3 MB

async function uploadToBucket(file, bucket) {
  const { url, key } = getConfig()
  if (!url || !key) throw new Error('Supabase chưa được cấu hình')

  // ⚡ Size guard — reject before any network call
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    throw new Error(`Ảnh quá lớn: ${mb}MB. Tối đa 3MB — hãy nén ảnh trước khi upload.`)
  }

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

// ── Public URL helper ─────────────────────────────────────────
export function getPublicUrl(bucket, path) {
  const { url } = getConfig()
  return `${url}/storage/v1/object/public/${bucket}/${path}`
}

// ── List files already in a bucket (no re-upload) ────────────
// Returns [{ name, url, size, mime, createdAt }]
// Folders are filtered out (size === 0 or missing metadata).
export async function listStorageFiles(bucket, { offset = 0, limit = 50 } = {}) {
  const { url, key } = getConfig()
  if (!url || !key) throw new Error('Supabase chưa được cấu hình')

  const res = await fetch(`${url}/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':         key,
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      prefix:  '',
      limit,
      offset,
      sortBy: { column: 'created_at', order: 'desc' },
    }),
  })

  if (!res.ok) { const t = await res.text(); throw new Error(`Storage list ${res.status}: ${t}`) }

  const data = await res.json()
  return (data || [])
    .filter(f => f.name && f.metadata?.size > 0)   // folders have no metadata or size=0
    .map(f => ({
      name:      f.name,
      url:       getPublicUrl(bucket, f.name),
      size:      f.metadata.size,
      mime:      f.metadata.mimetype || '',
      createdAt: f.created_at       || '',
    }))
}

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

// ── App Config ──────────────────────────────────────────────
const DEFAULT_APP_CONFIG = {
  logoUrl:    '',
  brandName:  'Land Dossier',
  slogan:     'Hồ sơ đất chuyên nghiệp — minh bạch — đáng tin cậy',
  footerText: '© 2024 Land Dossier. Thông tin mang tính tham khảo.',
}

export async function fetchAppConfig() {
  try {
    const rows = await rest('/app_config?select=*&limit=1')
    if (rows?.[0]) return { ...DEFAULT_APP_CONFIG, ...rows[0] }
  } catch { /* fall through */ }
  return DEFAULT_APP_CONFIG
}

export async function upsertAppConfig(data) {
  // app_config is a single-row table — upsert by id=1
  return rest('/app_config?on_conflict=id', {
    method: 'POST',
    body:   JSON.stringify({ id: 1, ...data }),
    headers: buildHeaders({ Prefer: 'return=representation,resolution=merge-duplicates' }),
  })
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
