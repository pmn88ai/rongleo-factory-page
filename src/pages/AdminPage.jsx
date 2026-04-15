// src/pages/AdminPage.jsx
// Create / edit a property — DYNAMIC multi-category system.
// Schema fields được load từ bảng `schemas` theo category.
// Admin không cần sửa code khi thêm category hoặc field.
import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import ImageUploader from '../components/ImageUploader'
import LandPage from './LandPage'
import { downloadLandHtml } from '../utils/exportHtml'
import {
  upsertProperty,
  fetchPropertyBySlug,
  isConfigured,
  testConnection,
  getCategories,
  getSchema,
  normalizeSlug,
} from '../lib/supabase'

// ─────────────────────────────────────────
const EMPTY_FORM = {
  slug: '', category: 'land', title: '',
  hookHeadline: '', hookHeadlineAlt: '', hookSub: '',
  summary: '', price: '',
  location: '', locationDetail: '',
  phone: '', zalo: '', mapEmbedUrl: '',
}

// NÂNG CẤP 2: Raw panel mở rộng thêm status + priority
const EMPTY_RAW = {
  owner:           '',
  source:          '',
  notes:           '',
  status:          'đang bán',   // đang bán / đã bán / tạm dừng
  priority:        'bình thường', // cao / bình thường / thấp
}

// ── Helpers ──────────────────────────────────────────────────

function dbToForm(row) {
  return {
    slug:            row.slug              || '',
    category:        row.category          || 'land',
    title:           row.title             || '',
    hookHeadline:    row.hook_headline     || '',
    hookHeadlineAlt: row.hook_headline_alt || '',
    hookSub:         row.hook_sub          || '',
    summary:         row.summary           || '',
    price:           row.price             || '',
    location:        row.location          || '',
    locationDetail:  row.location_detail   || '',
    phone:           row.phone             || '',
    zalo:            row.zalo              || '',
    mapEmbedUrl:     row.map_embed_url     || '',
  }
}

function formToDb(form, images, data, raw) {
  return {
    slug:              normalizeSlug(form.slug),
    category:          form.category  || 'land',
    title:             form.title,
    hook_headline:     form.hookHeadline,
    hook_headline_alt: form.hookHeadlineAlt,
    hook_sub:          form.hookSub,
    summary:           form.summary,
    price:             form.price,
    location:          form.location,
    location_detail:   form.locationDetail,
    phone:             form.phone,
    zalo:              form.zalo || (form.phone ? `https://zalo.me/${form.phone}` : null),
    map_embed_url:     form.mapEmbedUrl,
    images,
    data: Object.keys(data).length > 0 ? data : null,
    raw:  (raw.owner || raw.source || raw.notes || raw.status || raw.priority) ? raw : null,
  }
}

// Build land object cho preview — truyền schema vào để DynamicDataPanel render đúng
function buildLandObject(form, images, data, schema) {
  return {
    slug:            form.slug        || 'preview',
    title:           form.title       || '',
    hookHeadline:    form.hookHeadline,
    hookHeadlineAlt: form.hookHeadlineAlt,
    hookSub:         form.hookSub,
    summary:         form.summary,
    price:           form.price,
    pricePerM2:      Number(data?.price_per_m2 || data?.pricePerM2 || 0),
    area:            Number(data?.area || 0),
    areaFront:       Number(data?.area_front || data?.areaFront || 0),
    areaDepth:       Number(data?.area_depth || data?.areaDepth || 0),
    location:        form.location,
    locationDetail:  form.locationDetail,
    images,
    videoUrl:        '',
    mapEmbedUrl:     form.mapEmbedUrl,
    data,
    schema,  // truyền schema để LandPage render đúng label + order
    legal: { bookType: 'Sổ hồng (GCNQSDĐ)', owner: 'Cá nhân', landType: 'Đất ở đô thị (ODT)', issueYear: '', notes: '' },
    priceComparison: { areaAvgMin: 0, areaAvgMax: 0, thisLot: 0, note: '' },
    advantages:  [],
    risks:       [],
    suitableFor: [
      { label: 'Ở thực',           score: 85, icon: '🏠' },
      { label: 'Đầu tư cho thuê',  score: 80, icon: '📈' },
      { label: 'Giữ đất tích lũy', score: 80, icon: '🏦' },
    ],
    contact: {
      name:  'Chủ đất',
      phone: form.phone || '',
      zalo:  form.zalo  || (form.phone ? `https://zalo.me/${form.phone}` : '#'),
    },
  }
}

function getTheme() {
  const root = getComputedStyle(document.documentElement)
  return {
    greenDeep:   root.getPropertyValue('--green-deep').trim(),
    greenMid:    root.getPropertyValue('--green-mid').trim(),
    greenLight:  root.getPropertyValue('--green-light').trim(),
    gold:        root.getPropertyValue('--gold').trim(),
    goldLight:   root.getPropertyValue('--gold-light').trim(),
    cream:       root.getPropertyValue('--cream').trim(),
    fontDisplay: root.getPropertyValue('--font-display').replace(/'/g, '').trim(),
    fontBody:    root.getPropertyValue('--font-body').replace(/'/g, '').trim(),
  }
}

// ── Styles ───────────────────────────────────────────────────
const S = {
  page:    { minHeight: '100vh', background: 'var(--cream)', fontFamily: 'var(--font-body)' },
  topBar:  {
    background: 'var(--green-deep)', padding: '0 24px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    height: 56, borderBottom: '2px solid var(--gold)',
    position: 'sticky', top: 0, zIndex: 100,
  },
  topTitle: { fontFamily: 'var(--font-display)', color: 'var(--gold-light)', fontSize: '1.1rem', fontWeight: 700 },
  panel:    {
    width: 420, flexShrink: 0, overflowY: 'auto',
    background: '#fff', borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column',
  },
  tabs: { display: 'flex', borderBottom: '1px solid var(--border)', background: '#fafafa', flexShrink: 0 },
  tab: (a) => ({
    flex: 1, padding: '10px 4px', fontSize: 11,
    fontWeight: a ? 700 : 400,
    color: a ? 'var(--green-deep)' : '#888',
    background: 'transparent', border: 'none',
    borderBottom: a ? '2px solid var(--green-mid)' : '2px solid transparent',
    cursor: 'pointer', fontFamily: 'inherit',
  }),
  formBody:   { flex: 1, overflowY: 'auto', padding: '16px 20px' },
  groupLabel: {
    fontSize: 10, fontWeight: 700, color: '#888',
    textTransform: 'uppercase', letterSpacing: '0.08em',
    marginBottom: 10, marginTop: 4,
  },
  field:  { marginBottom: 10 },
  label:  { display: 'block', fontSize: 11, color: '#666', marginBottom: 3, fontWeight: 500 },
  input:  {
    width: '100%', padding: '7px 10px', fontSize: 13,
    border: '1px solid #ddd', borderRadius: 6,
    fontFamily: 'inherit', outline: 'none', color: '#222',
    background: '#fff', boxSizing: 'border-box',
  },
  inputError: {
    width: '100%', padding: '7px 10px', fontSize: 13,
    border: '1.5px solid #ef4444', borderRadius: 6,
    fontFamily: 'inherit', outline: 'none', color: '#222',
    background: '#fff2f2', boxSizing: 'border-box',
  },
  select: {
    width: '100%', padding: '7px 10px', fontSize: 13,
    border: '1px solid #ddd', borderRadius: 6,
    fontFamily: 'inherit', outline: 'none', color: '#222',
    background: '#fff', boxSizing: 'border-box', cursor: 'pointer',
  },
  textarea: {
    width: '100%', padding: '7px 10px', fontSize: 13,
    border: '1px solid #ddd', borderRadius: 6,
    fontFamily: 'inherit', outline: 'none', color: '#222',
    background: '#fff', resize: 'vertical', minHeight: 72, boxSizing: 'border-box',
  },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  footer: {
    padding: '12px 20px', borderTop: '1px solid var(--border)',
    display: 'flex', gap: 8, flexShrink: 0, background: '#fff', flexWrap: 'wrap',
  },
  btnSave: {
    flex: 1, padding: '10px 16px',
    background: 'var(--green-deep)', color: 'var(--gold-light)',
    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit', minWidth: 120,
  },
  btnExport: {
    padding: '10px 14px', background: '#f0f7f4', color: 'var(--green-mid)',
    border: '1px solid rgba(45,106,79,0.2)', borderRadius: 8, fontSize: 12,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  btnReset: {
    padding: '10px 12px', background: 'transparent', color: '#999',
    border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 12,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  preview:       { flex: 1, overflow: 'auto', background: '#f0f0f0', display: 'flex', flexDirection: 'column', minWidth: 0 },
  previewBar:    { background: '#1a1a1a', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  previewScroll: { flex: 1, overflow: 'auto' },
  infoBox: (type) => ({
    padding: '8px 12px', borderRadius: 7, fontSize: 11, marginBottom: 8,
    background: type === 'warn'    ? '#fef9c3'
               : type === 'error'   ? '#fff2f2'
               : type === 'success' ? '#f0fdf4'
               :                     '#eff6ff',
    border: `1px solid ${
      type === 'warn'    ? '#fde047'
    : type === 'error'   ? '#fca5a5'
    : type === 'success' ? '#86efac'
    :                      '#bfdbfe'}`,
    color:  type === 'warn'    ? '#713f12'
           : type === 'error'   ? '#7f1d1d'
           : type === 'success' ? '#14532d'
           :                      '#1e3a5f',
  }),
  // Required field indicator
  requiredDot: { color: '#ef4444', marginLeft: 2 },
}

// ── Sub-components ───────────────────────────────────────────
function Field({ label, name, value, onChange, type = 'text', placeholder = '', error = '', hint = '', required = false }) {
  return (
    <div style={S.field}>
      <label style={S.label}>
        {label}
        {required && <span style={S.requiredDot}>*</span>}
      </label>
      <input
        type={type} name={name} value={value}
        onChange={onChange} placeholder={placeholder}
        style={error ? S.inputError : S.input}
        onFocus={e => { if (!error) e.target.style.borderColor = 'var(--green-light)' }}
        onBlur={e => { if (!error) e.target.style.borderColor = '#ddd' }}
      />
      {hint  && <div style={{ fontSize: 10, color: '#aaa',    marginTop: 2 }}>{hint}</div>}
      {error && <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2 }}>⚠ {error}</div>}
    </div>
  )
}

function TextArea({ label, name, value, onChange, placeholder = '' }) {
  return (
    <div style={S.field}>
      <label style={S.label}>{label}</label>
      <textarea
        name={name} value={value} onChange={onChange}
        placeholder={placeholder} style={S.textarea}
        onFocus={e => e.target.style.borderColor = 'var(--green-light)'}
        onBlur={e => e.target.style.borderColor = '#ddd'}
      />
    </div>
  )
}

// Dynamic field renderer — đọc từ schema DB
// LỖI 3 FIX: hiển thị required indicator, validate ở handleSave
function DynamicField({ field, value, onChange, error = '' }) {
  const handleChange = (e) => {
    const val = field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value
    onChange(field.key, val)
  }

  const inputStyle = error
    ? { ...S.inputError }
    : { ...S.input }

  const labelEl = (
    <label style={S.label}>
      {field.label}
      {field.required && <span style={S.requiredDot}>*</span>}
    </label>
  )

  if (field.type === 'textarea') {
    return (
      <div style={S.field}>
        {labelEl}
        <textarea
          value={value ?? ''}
          onChange={handleChange}
          placeholder={field.placeholder || ''}
          style={{ ...S.textarea, ...(error ? { border: '1.5px solid #ef4444', background: '#fff2f2' } : {}) }}
          onFocus={e => { if (!error) e.target.style.borderColor = 'var(--green-light)' }}
          onBlur={e => { if (!error) e.target.style.borderColor = '#ddd' }}
        />
        {error && <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2 }}>⚠ {error}</div>}
        {field.hint && <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>{field.hint}</div>}
      </div>
    )
  }

  if (field.type === 'select' && Array.isArray(field.options)) {
    return (
      <div style={S.field}>
        {labelEl}
        <select
          value={value ?? ''}
          onChange={handleChange}
          style={{ ...S.select, ...(error ? { border: '1.5px solid #ef4444' } : {}) }}
        >
          <option value="">-- Chọn --</option>
          {field.options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {error && <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2 }}>⚠ {error}</div>}
      </div>
    )
  }

  return (
    <div style={S.field}>
      {labelEl}
      <input
        type={field.type === 'number' ? 'number' : 'text'}
        value={value ?? ''}
        onChange={handleChange}
        placeholder={field.placeholder || ''}
        style={inputStyle}
        onFocus={e => { if (!error) e.target.style.borderColor = 'var(--green-light)' }}
        onBlur={e => { if (!error) e.target.style.borderColor = '#ddd' }}
      />
      {error && <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2 }}>⚠ {error}</div>}
      {field.hint && <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>{field.hint}</div>}
    </div>
  )
}

function ConnBadge() {
  const [state, setState] = useState(isConfigured() ? 'checking' : 'uncfg')
  useEffect(() => {
    if (!isConfigured()) return
    testConnection().then(r => setState(r.ok ? 'ok' : 'fail'))
  }, [])
  const map = {
    uncfg:    ['⚪', '#888',    'Chưa cấu hình'],
    checking: ['⏳', '#888',    'Connecting...'],
    ok:       ['🟢', '#16a34a', 'Supabase OK'],
    fail:     ['🔴', '#dc2626', 'Kết nối thất bại'],
  }
  const [icon, color, label] = map[state]
  return <span style={{ fontSize: 11, fontWeight: 600, color }}>{icon} {label}</span>
}

// ── Main component ───────────────────────────────────────────
export default function AdminPage() {
  const [searchParams]  = useSearchParams()
  const editSlug        = searchParams.get('slug')

  const [categories]    = useState(() => getCategories())
  const [activeTab, setActiveTab]         = useState('basic')
  const [form, setForm]                   = useState({ ...EMPTY_FORM })
  const [schema, setSchema]               = useState([])
  const [schemaLoading, setSchemaLoading] = useState(false)
  const [data, setData]                   = useState({})
  // LỖI 3 FIX: track validation errors per dynamic field
  const [dataErrors, setDataErrors]       = useState({}) // { fieldKey → errorMsg }
  const [raw, setRaw]                     = useState({ ...EMPTY_RAW })
  const [images, setImages]               = useState([])
  const [saveState, setSaveState]         = useState('idle')
  const [saveError, setSaveError]         = useState('')
  const [exportDone, setExportDone]       = useState(false)
  const [loadState, setLoadState]         = useState('idle')
  const [slugError, setSlugError]         = useState('')
  const [titleError, setTitleError]       = useState('')

  // Load schema khi category thay đổi
  useEffect(() => {
    if (!form.category) return
    if (!isConfigured()) return
    setSchemaLoading(true)
    setDataErrors({}) // clear errors khi đổi category
    getSchema(form.category)
      .then(fields => { setSchema(fields || []); setSchemaLoading(false) })
      .catch(() => { setSchema([]); setSchemaLoading(false) })
  }, [form.category])

  // Load existing record từ Supabase khi edit
  useEffect(() => {
    if (!editSlug) return
    if (!isConfigured()) { setLoadState('error'); return }
    setLoadState('loading')
    fetchPropertyBySlug(editSlug)
      .then(row => {
        if (row) {
          setForm(dbToForm(row))
          setImages(Array.isArray(row.images) ? row.images : [])
          setData(row.data && typeof row.data === 'object' ? row.data : {})
          setRaw({
            ...EMPTY_RAW,
            ...(row.raw && typeof row.raw === 'object' ? row.raw : {}),
          })
          setLoadState('loaded')
        } else {
          setLoadState('error')
        }
      })
      .catch(() => setLoadState('error'))
  }, [editSlug])

  // schema truyền vào land object để preview render đúng
  const land = buildLandObject(form, images, data, schema)

  function handleChange(e) {
    const { name, value } = e.target
    if (name === 'slug') {
      setForm(prev => ({ ...prev, slug: normalizeSlug(value) }))
      setSlugError('')
      return
    }
    if (name === 'title') setTitleError('')
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleDataChange = useCallback((key, value) => {
    setData(prev => ({ ...prev, [key]: value }))
    // Clear error khi user bắt đầu nhập
    setDataErrors(prev => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const handleRawChange = useCallback((e) => {
    const { name, value } = e.target
    setRaw(prev => ({ ...prev, [name]: value }))
  }, [])

  // ── Save ──────────────────────────────────────────────────
  async function handleSave() {
    let valid = true

    // Validate slug + title
    if (!form.slug) {
      setSlugError('Slug là bắt buộc')
      setActiveTab('basic')
      valid = false
    }
    if (!form.title) {
      setTitleError('Tiêu đề là bắt buộc')
      setActiveTab('basic')
      valid = false
    }

    // LỖI 3 FIX: validate required fields trong schema
    const newDataErrors = {}
    schema.forEach(f => {
      if (f.required) {
        const val = data[f.key]
        const empty = val === undefined || val === null || val === ''
        if (empty) {
          newDataErrors[f.key] = `${f.label} bắt buộc`
          valid = false
        }
      }
    })

    if (Object.keys(newDataErrors).length > 0) {
      setDataErrors(newDataErrors)
      // Chuyển sang tab dynamic để user thấy lỗi
      if (valid === false && activeTab !== 'basic') {
        setActiveTab('dynamic')
      } else if (activeTab === 'basic') {
        // giữ nguyên basic tab để show slug/title error trước
      } else {
        setActiveTab('dynamic')
      }
    }

    if (!valid) return

    if (!isConfigured()) {
      setSaveError('Chưa cấu hình Supabase — vào /config để thiết lập')
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 4000)
      return
    }

    setSaveState('saving')
    setSaveError('')

    try {
      const payload = formToDb(form, images, data, raw)
      await upsertProperty(payload)
      setSaveState('ok')
      setTimeout(() => setSaveState('idle'), 3000)
    } catch (e) {
      setSaveError(e.message)
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 5000)
    }
  }

  function handleExport() {
    if (!form.slug) { alert('Nhập slug trước khi export'); return }
    downloadLandHtml(land, getTheme(), form.slug, images.length ? images : null)
    setExportDone(true)
    setTimeout(() => setExportDone(false), 2500)
  }

  function handleReset() {
    if (!window.confirm('Reset form? Dữ liệu chưa lưu sẽ mất.')) return
    setForm({ ...EMPTY_FORM })
    setData({})
    setDataErrors({})
    setRaw({ ...EMPTY_RAW })
    setImages([])
    setSlugError('')
    setTitleError('')
    setSaveState('idle')
  }

  // Đếm số lỗi dynamic fields để hiện badge trên tab
  const dynamicErrorCount = Object.keys(dataErrors).length

  const tabs = [
    { id: 'basic',   label: '📋 Cơ bản' },
    { id: 'dynamic', label: `📐 ${getCatLabel(form.category, categories)}${dynamicErrorCount ? ` ⚠️${dynamicErrorCount}` : ''}` },
    { id: 'raw',     label: '🔒 Nội bộ' },
    { id: 'images',  label: `📸 Ảnh${images.length ? ` (${images.length})` : ''}` },
  ]

  return (
    <div style={S.page}>
      <div style={S.topBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={S.topTitle}>🏡 {editSlug ? 'Chỉnh sửa' : 'Tạo mới'}</span>
          <ConnBadge />
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <a href="/dashboard" style={{ color: 'rgba(245,230,184,0.6)', fontSize: 12, textDecoration: 'underline' }}>
            ← Dashboard
          </a>
          <a href="/config" style={{ color: 'rgba(245,230,184,0.5)', fontSize: 12, textDecoration: 'underline' }}>
            ⚙️ Config
          </a>
        </div>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>

        {/* ── LEFT: Form panel ── */}
        <div style={S.panel}>
          <div style={S.tabs}>
            {tabs.map(t => (
              <button key={t.id} style={S.tab(activeTab === t.id)} onClick={() => setActiveTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          <div style={S.formBody}>
            {loadState === 'loading' && <div style={S.infoBox('info')}>⏳ Đang tải từ Supabase...</div>}
            {loadState === 'loaded'  && <div style={S.infoBox('success')}>✅ Đã tải "{editSlug}"</div>}
            {loadState === 'error'   && (
              <div style={S.infoBox('error')}>
                {isConfigured()
                  ? `⚠️ Không tìm thấy "${editSlug}" trong DB`
                  : '⚠️ Chưa cấu hình Supabase'}
              </div>
            )}
            {saveState === 'error' && <div style={S.infoBox('error')}>❌ {saveError}</div>}
            {saveState === 'ok'    && <div style={S.infoBox('success')}>✅ Đã lưu thành công!</div>}

            {/* ── Tab: Cơ bản ── */}
            {activeTab === 'basic' && (
              <>
                <div style={S.groupLabel}>Định danh</div>

                {/* NÂNG CẤP 1: Category load từ config (đã dynamic từ getCategories()) */}
                <div style={S.field}>
                  <label style={S.label}>Danh mục</label>
                  <select name="category" value={form.category} onChange={handleChange} style={S.select}>
                    {categories.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <Field
                  label="Slug (dùng cho URL)" required
                  name="slug" value={form.slug} onChange={handleChange}
                  placeholder="san-pham-001" error={slugError}
                  hint="Tự động normalize: chữ thường, gạch ngang"
                />
                {form.slug && (
                  <div style={{ fontSize: 11, color: '#888', marginTop: -6, marginBottom: 8 }}>
                    → <code style={{ background: '#f5f5f5', padding: '1px 5px', borderRadius: 3 }}>
                        /land/{form.slug}
                      </code>
                  </div>
                )}

                <Field
                  label="Tiêu đề" required
                  name="title" value={form.title} onChange={handleChange}
                  placeholder="Tên sản phẩm" error={titleError}
                />

                <div style={{ ...S.groupLabel, marginTop: 16 }}>Hook bán hàng</div>
                <TextArea label="Headline A" name="hookHeadline" value={form.hookHeadline}
                  onChange={handleChange} placeholder="Tiêu đề chính kéo attention..." />
                <TextArea label="Headline B (A/B test)" name="hookHeadlineAlt" value={form.hookHeadlineAlt}
                  onChange={handleChange} placeholder="Variant B để test..." />
                <Field label="Sub-headline" name="hookSub" value={form.hookSub}
                  onChange={handleChange} placeholder="Mô tả ngắn gọn lợi ích" />

                <div style={{ ...S.groupLabel, marginTop: 16 }}>Thông tin chung</div>
                <Field label="Giá hiển thị" name="price" value={form.price}
                  onChange={handleChange} placeholder="1.26 tỷ / 15 tr / 12.5 tr" />
                <TextArea label="Tóm tắt" name="summary" value={form.summary}
                  onChange={handleChange} placeholder="Mô tả tổng quan sản phẩm..." />
                <Field label="Địa chỉ ngắn" name="location" value={form.location}
                  onChange={handleChange} placeholder="Quận 1, TP.HCM" />
                <TextArea label="Mô tả vị trí / chi tiết" name="locationDetail" value={form.locationDetail}
                  onChange={handleChange} placeholder="Chi tiết hơn về vị trí..." />

                <div style={{ ...S.groupLabel, marginTop: 16 }}>Liên hệ</div>
                <Field label="Số điện thoại" name="phone" value={form.phone}
                  onChange={handleChange} placeholder="0901234567" />
                <Field label="Link Zalo" name="zalo" value={form.zalo}
                  onChange={handleChange} placeholder="https://zalo.me/090..."
                  hint={!form.zalo && form.phone ? `Auto: https://zalo.me/${form.phone}` : ''} />

                <div style={{ ...S.groupLabel, marginTop: 16 }}>Google Maps</div>
                <TextArea label="Map embed URL" name="mapEmbedUrl" value={form.mapEmbedUrl}
                  onChange={handleChange} placeholder="https://www.google.com/maps/embed?pb=..." />
              </>
            )}

            {/* ── Tab: Dynamic fields ── */}
            {activeTab === 'dynamic' && (
              <>
                {schemaLoading && (
                  <div style={S.infoBox('info')}>⏳ Đang tải schema cho "{form.category}"...</div>
                )}

                {!schemaLoading && schema.length === 0 && (
                  <div style={S.infoBox('warn')}>
                    ⚠️ Chưa có schema cho category <strong>{form.category}</strong>.
                    <br />
                    {isConfigured()
                      ? 'Insert vào bảng `schemas` để thêm fields.'
                      : 'Cần kết nối Supabase để load schema.'}
                  </div>
                )}

                {!schemaLoading && schema.length > 0 && (
                  <>
                    <div style={S.groupLabel}>
                      Fields của {getCatLabel(form.category, categories)} ({schema.length} fields
                      {dynamicErrorCount > 0 && (
                        <span style={{ color: '#ef4444', marginLeft: 4 }}>— {dynamicErrorCount} lỗi</span>
                      )})
                    </div>
                    {/* LỖI 2 FIX: render THEO ĐÚNG THỨ TỰ schema, không dùng Object.entries */}
                    {schema.map(field => (
                      <DynamicField
                        key={field.key}
                        field={field}
                        value={data[field.key]}
                        onChange={handleDataChange}
                        error={dataErrors[field.key] || ''}
                      />
                    ))}
                  </>
                )}
              </>
            )}

            {/* ── Tab: Raw / Nội bộ — NÂNG CẤP 2 ── */}
            {activeTab === 'raw' && (
              <>
                <div style={S.infoBox('warn')}>
                  🔒 Thông tin nội bộ — không hiển thị trên landing page. Lưu vào cột <code>raw</code> (jsonb).
                </div>

                {/* Status + Priority — 2 select quan trọng nhất */}
                <div style={S.groupLabel}>Trạng thái</div>
                <div style={S.row2}>
                  <div style={S.field}>
                    <label style={S.label}>Trạng thái bán</label>
                    <select name="status" value={raw.status || 'đang bán'} onChange={handleRawChange} style={S.select}>
                      <option value="đang bán">🟢 Đang bán</option>
                      <option value="đã bán">🔴 Đã bán</option>
                      <option value="tạm dừng">🟡 Tạm dừng</option>
                    </select>
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Độ ưu tiên</label>
                    <select name="priority" value={raw.priority || 'bình thường'} onChange={handleRawChange} style={S.select}>
                      <option value="cao">🔥 Cao</option>
                      <option value="bình thường">⚪ Bình thường</option>
                      <option value="thấp">⬇️ Thấp</option>
                    </select>
                  </div>
                </div>

                <div style={{ ...S.groupLabel, marginTop: 16 }}>Nguồn / Chủ</div>
                <div style={S.field}>
                  <label style={S.label}>Chủ đất / Người bán</label>
                  <textarea
                    name="owner" value={raw.owner || ''} onChange={handleRawChange}
                    placeholder="Tên chủ đất, mối quan hệ, nguồn dẫn mối..."
                    style={S.textarea}
                    onFocus={e => e.target.style.borderColor = 'var(--green-light)'}
                    onBlur={e => e.target.style.borderColor = '#ddd'}
                  />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Nguồn dẫn</label>
                  <textarea
                    name="source" value={raw.source || ''} onChange={handleRawChange}
                    placeholder="Facebook, môi giới, zalo group..."
                    style={S.textarea}
                    onFocus={e => e.target.style.borderColor = 'var(--green-light)'}
                    onBlur={e => e.target.style.borderColor = '#ddd'}
                  />
                </div>

                <div style={{ ...S.groupLabel, marginTop: 16 }}>Ghi chú nội bộ</div>
                <div style={S.field}>
                  <label style={S.label}>Ghi chú / Lịch sử liên hệ</label>
                  <textarea
                    name="notes" value={raw.notes || ''} onChange={handleRawChange}
                    placeholder="Ghi chú riêng, lưu ý khi tư vấn, tình trạng đàm phán, lịch sử liên hệ..."
                    style={{ ...S.textarea, minHeight: 120 }}
                    onFocus={e => e.target.style.borderColor = 'var(--green-light)'}
                    onBlur={e => e.target.style.borderColor = '#ddd'}
                  />
                </div>

                {/* Preview raw data */}
                {(raw.status || raw.priority || raw.owner) && (
                  <div style={{
                    background: '#f9fafb', borderRadius: 8, padding: '10px 12px',
                    border: '1px solid #e5e7eb', fontSize: 11, color: '#555', marginTop: 8,
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 6, color: '#888' }}>Preview raw JSON:</div>
                    <pre style={{ margin: 0, fontSize: 10, overflowX: 'auto', color: '#444' }}>
                      {JSON.stringify({
                        status: raw.status,
                        priority: raw.priority,
                        owner: raw.owner || undefined,
                        source: raw.source || undefined,
                        notes: raw.notes ? raw.notes.slice(0, 50) + (raw.notes.length > 50 ? '...' : '') : undefined,
                      }, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            )}

            {/* ── Tab: Ảnh ── */}
            {activeTab === 'images' && (
              <>
                <div style={S.groupLabel}>Upload ảnh</div>
                {isConfigured()
                  ? <div style={S.infoBox('success')}>☁️ Ảnh upload lên Supabase Storage bucket <code>assets</code></div>
                  : <div style={S.infoBox('warn')}>
                      ⚠️ Chưa cấu hình Supabase.{' '}
                      <a href="/config" style={{ color: '#2563eb' }}>Config →</a>
                    </div>
                }
                <ImageUploader onImagesReady={setImages} existingUrls={images} />
              </>
            )}
          </div>

          <div style={S.footer}>
            <button style={S.btnSave} onClick={handleSave} disabled={saveState === 'saving'}>
              {saveState === 'saving' ? '⏳ Đang lưu...'
               : saveState === 'ok'   ? '✅ Đã lưu!'
               : isConfigured()       ? '💾 Lưu vào Supabase'
               :                       '💾 Lưu (chưa có DB)'}
            </button>
            <button style={S.btnExport} onClick={handleExport}>
              {exportDone ? '✅' : '⬇️ HTML'}
            </button>
            <button style={S.btnReset} onClick={handleReset}>Reset</button>
          </div>
        </div>

        {/* ── RIGHT: Live preview ── */}
        <div style={S.preview}>
          <div style={S.previewBar}>
            {['#ef4444', '#f59e0b', '#22c55e'].map(c => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
            ))}
            <span style={{ color: '#888', fontSize: 11, marginLeft: 8 }}>
              Live Preview — {form.title || 'Chưa có tiêu đề'}
              {images.length > 0 && (
                <span style={{ marginLeft: 8, color: '#4ade80' }}>• {images.length} ảnh</span>
              )}
            </span>
          </div>
          <div style={S.previewScroll}>
            {(form.slug || form.hookHeadline || form.title)
              ? <LandPage overrideProperty={land} overrideImages={images} />
              : (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: '70%', color: '#aaa', flexDirection: 'column', gap: 8, paddingTop: 60,
                }}>
                  <div style={{ fontSize: '2.5rem' }}>👈</div>
                  <div style={{ fontSize: 13 }}>Điền thông tin bên trái để xem preview</div>
                </div>
              )}
          </div>
        </div>

      </div>
    </div>
  )
}

function getCatLabel(value, categories = []) {
  const found = categories.find(c => c.value === value)
  return found ? found.label : value
}
