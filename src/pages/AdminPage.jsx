// src/pages/AdminPage.jsx
// CMS for land listings.
// URL: /admin?slug=<slug>   (or /admin to create new)
// A: Public editor  — all fields of public_data
// B: Private panel  — owner, commission, notes, broker logs, raw library
// C: Status actions — draft / published / sold
// D: Preview        — live render of LandPage with current form state
import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  fetchPropertyBySlug, upsertProperty,
  uploadImage, uploadRawImage, deleteStorageImages,
  normalizeSlug, isValidSlug, isConfigured,
} from '../lib/supabase'
import { useTheme } from '../hooks/useTheme'
import LandPage from './LandPage'
import S from './AdminPage.module.css'

// ─────────────────────────────────────────
// EMPTY STATES
// ─────────────────────────────────────────
const EMPTY_PUBLIC = {
  hero:       { headline: '', subHeadline: '', badges: [] },
  price:      { total: '', area: 0, pricePerM2: 0 },
  gallery:    [],
  legal:      { type: '', owner: '', landType: '' },
  proof:      { redBookImages: [], planningImages: [], planningText: '' },
  comparison: [],
  potential:  { text: '', images: [] },
  mapEmbedUrl: '',
  contact:    { phone: '', zalo: '' },
  finalCTA:   { headline: '', sub: '' },
}

const EMPTY_PRIVATE = {
  ownerName:   '',
  ownerPhone:  '',
  commission:  0,
  notesHtml:   '',
  brokerLogs:  [],
  rawLibrary:  { so: [], quyhoach: [], anhdat: [] },
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function deepMerge(base, override) {
  if (!override) return base
  const out = { ...base }
  for (const k of Object.keys(override)) {
    if (override[k] && typeof override[k] === 'object' && !Array.isArray(override[k])) {
      out[k] = deepMerge(base[k] || {}, override[k])
    } else {
      out[k] = override[k] ?? base[k]
    }
  }
  return out
}

// ─────────────────────────────────────────
// TINY REUSABLE COMPONENTS
// ─────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div className={S.field}>
      {label && <label className={S.label}>{label}</label>}
      {children}
    </div>
  )
}

function Section({ icon, title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={S.accordion}>
      <div className={S.accordionHead} onClick={() => setOpen(o => !o)}>
        <span className={S.accordionTitle}><span>{icon}</span>{title}</span>
        <span className={`${S.accordionChevron} ${open ? S.accordionChevronOpen : ''}`}>▼</span>
      </div>
      {open && <div className={S.accordionBody}>{children}</div>}
    </div>
  )
}

function ImageGrid({ images = [], onDelete, uploadFn, bucket = 'assets' }) {
  // Track per-file upload: Map<filename → 'uploading'|'error'>
  const [fileStates, setFileStates] = useState({})
  const inputRef = useRef()

  async function handleFiles(files) {
    if (!files.length) return
    const fileArr = Array.from(files)

    // Check 3 MB limit upfront (supabase.js also checks, but give immediate UI feedback)
    const oversized = fileArr.filter(f => f.size > 3 * 1024 * 1024)
    if (oversized.length) {
      const names = oversized.map(f => `${f.name} (${(f.size/1024/1024).toFixed(1)}MB)`).join(', ')
      alert(`Ảnh quá lớn (max 3MB):\n${names}\n\nHãy nén ảnh trước khi upload.`)
      return
    }

    // Mark all as uploading
    const init = Object.fromEntries(fileArr.map(f => [f.name, 'uploading']))
    setFileStates(init)

    const results = await Promise.allSettled(fileArr.map(async f => {
      try {
        const url = await uploadFn(f)
        setFileStates(prev => { const n = { ...prev }; delete n[f.name]; return n })
        return url
      } catch (e) {
        setFileStates(prev => ({ ...prev, [f.name]: 'error:' + e.message }))
        throw e
      }
    }))

    const successUrls = results.filter(r => r.status === 'fulfilled').map(r => r.value)
    const errors      = results.filter(r => r.status === 'rejected').map(r => r.reason?.message)

    if (successUrls.length) onDelete(null, successUrls)
    if (errors.length) alert('Lỗi upload:\n' + errors.join('\n'))

    // Clear error states after 4s
    setTimeout(() => setFileStates({}), 4000)
  }

  const uploadingNames = Object.entries(fileStates).filter(([, s]) => s === 'uploading').map(([n]) => n)
  const errorEntries   = Object.entries(fileStates).filter(([, s]) => s.startsWith('error:'))

  return (
    <div>
      <div className={S.imgGrid}>
        {images.map((url, i) => (
          <div key={i} className={S.imgThumb}>
            <img src={url} alt="" loading="lazy" />
            <button className={S.imgDel} onClick={() => onDelete(url)}>✕</button>
          </div>
        ))}
      </div>

      {/* Per-file progress */}
      {uploadingNames.map(name => (
        <div key={name} className={S.uploading}>⏳ Đang upload: {name}</div>
      ))}
      {errorEntries.map(([name, s]) => (
        <div key={name} style={{ fontSize: '0.75rem', color: '#ef4444', padding: '2px 0' }}>
          ❌ {name}: {s.replace('error:', '')}
        </div>
      ))}

      <button
        className={S.uploadBtn}
        style={{ marginTop: 8 }}
        onClick={() => inputRef.current?.click()}
        disabled={uploadingNames.length > 0}
      >
        📎 Chọn ảnh {uploadingNames.length > 0 ? `(${uploadingNames.length} đang upload...)` : ''}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
      />
    </div>
  )
}

function BadgeEditor({ badges = [], onChange }) {
  const [draft, setDraft] = useState('')
  function add() {
    const v = draft.trim()
    if (!v) return
    onChange([...badges, v])
    setDraft('')
  }
  return (
    <div>
      <div className={S.chipList}>
        {badges.map((b, i) => (
          <span key={i} className={S.chip}>
            {b}
            <button className={S.chipDel} onClick={() => onChange(badges.filter((_, j) => j !== i))}>✕</button>
          </span>
        ))}
      </div>
      <div className={S.addRow} style={{ marginTop: 8 }}>
        <input
          className={S.addInput}
          value={draft}
          placeholder="Thêm badge..."
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
        />
        <button className={S.addBtn} onClick={add}>+ Thêm</button>
      </div>
    </div>
  )
}

function ComparisonEditor({ rows = [], onChange }) {
  const [label, setLabel]   = useState('')
  const [price, setPrice]   = useState('')
  function add() {
    if (!label.trim()) return
    onChange([...rows, { label: label.trim(), pricePerM2: Number(price) || 0 }])
    setLabel(''); setPrice('')
  }
  return (
    <div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
          <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text)' }}>{r.label}</span>
          <span style={{ fontSize: '0.82rem', color: 'var(--gold)', fontWeight: 600 }}>{r.pricePerM2} tr/m²</span>
          <button className={S.chipDel} onClick={() => onChange(rows.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <div className={S.addRow}>
        <input className={S.addInput} placeholder="Vị trí / lô đối chiếu"
          value={label} onChange={e => setLabel(e.target.value)} />
        <input className={S.addInput} style={{ width: 80 }} placeholder="tr/m²"
          type="number" value={price} onChange={e => setPrice(e.target.value)} />
        <button className={S.addBtn} onClick={add}>+</button>
      </div>
    </div>
  )
}

function LogEditor({ logs = [], onChange }) {
  const [date, setDate]   = useState(new Date().toISOString().slice(0, 10))
  const [text, setText]   = useState('')
  function add() {
    if (!text.trim()) return
    onChange([...logs, { date, text: text.trim() }])
    setText('')
  }
  return (
    <div>
      <div className={S.logList}>
        {logs.map((l, i) => (
          <div key={i} className={S.logRow}>
            <div className={S.logDate}>{l.date}</div>
            <div className={S.logText}>{l.text}</div>
            <button className={S.logDel} onClick={() => onChange(logs.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <input type="date" className={S.input} value={date} onChange={e => setDate(e.target.value)} />
        <textarea className={S.textarea} style={{ minHeight: 60 }}
          placeholder="Nội dung cập nhật..."
          value={text} onChange={e => setText(e.target.value)} />
        <button className={S.addBtn} style={{ alignSelf: 'flex-start' }} onClick={add}>
          + Thêm
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────
export default function AdminPage() {
  const [params]          = useSearchParams()
  const initialSlug       = params.get('slug') || ''

  const [slugRaw, setSlugRaw]   = useState(initialSlug)
  const [status,  setStatus]    = useState('draft')
  const [pub,     setPub]       = useState(EMPTY_PUBLIC)
  const [priv,    setPriv]      = useState(EMPTY_PRIVATE)
  const [saveState, setSaveState] = useState('idle') // 'idle'|'saving'|'ok'|'err'
  const [saveMsg,   setSaveMsg]   = useState('')
  const [loadState, setLoadState] = useState('idle')
  const [showPrivate, setShowPrivate] = useState(false)

  const { toggle, isDark } = useTheme()
  const slugPreview = normalizeSlug(slugRaw)
  const slugOk      = isValidSlug(slugPreview)

  // ── Load existing property ──
  useEffect(() => {
    if (!initialSlug || !isConfigured()) return
    setLoadState('loading')
    fetchPropertyBySlug(initialSlug)
      .then(row => {
        if (!row) { setLoadState('notfound'); return }
        setSlugRaw(row.slug)
        setStatus(row.status || 'draft')
        setPub(deepMerge(EMPTY_PUBLIC,  row.public_data  || {}))
        setPriv(deepMerge(EMPTY_PRIVATE, row.private_data || {}))
        setLoadState('ok')
      })
      .catch(() => setLoadState('err'))
  }, [initialSlug])

  // ── setPub helper that deep-merges a path ──
  function updatePub(path, value) {
    setPub(prev => {
      const keys  = path.split('.')
      const clone = JSON.parse(JSON.stringify(prev))
      let   node  = clone
      for (let i = 0; i < keys.length - 1; i++) {
        if (node[keys[i]] === undefined) node[keys[i]] = {}
        node = node[keys[i]]
      }
      node[keys[keys.length - 1]] = value
      return clone
    })
  }

  function updatePriv(key, value) {
    setPriv(prev => ({ ...prev, [key]: value }))
  }

  // ── Gallery helpers ──
  function galleryDelete(url, newUrls) {
    if (newUrls) {
      // append from upload
      const appended = newUrls.map(u => ({ url: u, type: 'image' }))
      updatePub('gallery', [...pub.gallery, ...appended])
      return
    }
    updatePub('gallery', pub.gallery.filter(g => g.url !== url))
    deleteStorageImages([url]).catch(() => {})
  }

  function proofDelete(field, url, newUrls) {
    if (newUrls) {
      updatePub(`proof.${field}`, [...(pub.proof[field] || []), ...newUrls])
      return
    }
    updatePub(`proof.${field}`, (pub.proof[field] || []).filter(u => u !== url))
    deleteStorageImages([url]).catch(() => {})
  }

  function potentialImgDelete(url, newUrls) {
    if (newUrls) {
      updatePub('potential.images', [...(pub.potential?.images || []), ...newUrls])
      return
    }
    updatePub('potential.images', (pub.potential?.images || []).filter(u => u !== url))
    deleteStorageImages([url]).catch(() => {})
  }

  function rawLibDelete(field, url, newUrls) {
    if (newUrls) {
      updatePriv('rawLibrary', { ...priv.rawLibrary, [field]: [...(priv.rawLibrary?.[field] || []), ...newUrls] })
      return
    }
    updatePriv('rawLibrary', { ...priv.rawLibrary, [field]: (priv.rawLibrary?.[field] || []).filter(u => u !== url) })
    deleteStorageImages([url], 'raw-assets').catch(() => {})
  }

  // ── Validation ──
  function validate() {
    const warns = []
    const phone = pub.contact?.phone || ''
    if (phone && !/^(\+84|0)[0-9]{8,10}$/.test(phone.replace(/\s/g, ''))) {
      warns.push(`Số điện thoại "${phone}" có vẻ không hợp lệ (nên bắt đầu bằng 0 hoặc +84, 9–11 số)`)
    }
    const total = pub.price?.total || ''
    if (total && !/[0-9]/.test(total)) {
      warns.push(`Giá "${total}" không chứa số — kiểm tra lại`)
    }
    if (warns.length && !window.confirm(`⚠️ Cảnh báo:\n\n${warns.join('\n')}\n\nVẫn lưu?`)) return false
    return true
  }

  // ── Save ──
  async function handleSave(overrideStatus) {
    if (!slugOk) { alert('Slug không hợp lệ'); return }
    if (!validate()) return
    setSaveState('saving')
    try {
      await upsertProperty({
        slug:         slugPreview,
        status:       overrideStatus || status,
        public_data:  pub,
        private_data: priv,
      })
      setStatus(overrideStatus || status)
      setSaveState('ok')
      setSaveMsg('✅ Đã lưu')
      setTimeout(() => setSaveState('idle'), 2500)
    } catch (e) {
      setSaveState('err')
      setSaveMsg('❌ ' + e.message)
    }
  }

  // ── Preview data ── (passed to LandPage for live preview)
  const previewProperty = {
    slug:        slugPreview,
    status:      'published', // always show in preview regardless of real status
    public_data: pub,
  }

  // ─── RENDER ────────────────────────────────────────────────
  return (
    <div className={S.page}>

      {/* ── Top bar ── */}
      <div className={S.topBar}>
        <span className={S.topBarTitle}>🏕 Admin</span>

        {/* Slug input with preview */}
        <div className={S.slugWrap}>
          <input
            className={`${S.slugInput} ${slugRaw && !slugOk ? S.slugInvalid : ''}`}
            value={slugRaw}
            onChange={e => setSlugRaw(e.target.value)}
            placeholder="Nhập tên (vd: Cao Lãnh 120m2)"
            spellCheck={false}
          />
          {slugRaw && (
            <div className={`${S.slugPreview} ${slugOk ? S.slugPreviewOk : S.slugPreviewBad}`}>
              /{slugPreview || '…'}
            </div>
          )}
        </div>

        {/* Status */}
        <select
          className={S.statusSelect}
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          <option value="draft">📝 Nháp</option>
          <option value="published">✅ Xuất bản</option>
          <option value="sold">🔴 Đã bán</option>
        </select>

        {/* Save actions */}
        <button
          className={`${S.saveBtn} ${saveState === 'saving' ? S.btnSaving : S.btnDraft}`}
          onClick={() => handleSave('draft')}
          disabled={saveState === 'saving'}
        >
          Lưu nháp
        </button>
        <button
          className={`${S.saveBtn} ${S.btnPublish}`}
          onClick={() => handleSave('published')}
          disabled={saveState === 'saving'}
        >
          Xuất bản
        </button>
        <button
          className={`${S.saveBtn} ${S.btnSold}`}
          onClick={() => handleSave('sold')}
          disabled={saveState === 'saving'}
        >
          Đã bán
        </button>

        {saveMsg && (
          <span className={`${S.saveMsg} ${saveState === 'ok' ? S.saveMsgOk : S.saveMsgErr}`}>
            {saveMsg}
          </span>
        )}

        <button className="theme-toggle" onClick={toggle} aria-label="Đổi theme">
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>

      {/* ── Split ── */}
      <div className={S.split}>

        {/* ════════════ FORM PANEL ════════════ */}
        <div className={S.formPanel}>

          {/* A1: Hero */}
          <Section icon="🎯" title="Hero" defaultOpen={true}>
            <Field label="Headline chính">
              <input className={S.input}
                value={pub.hero.headline}
                onChange={e => updatePub('hero.headline', e.target.value)}
                placeholder="Vd: Đất thổ cư 120m² mặt tiền đường ô tô..."
              />
            </Field>
            <Field label="Sub-headline">
              <textarea className={S.textarea}
                value={pub.hero.subHeadline}
                onChange={e => updatePub('hero.subHeadline', e.target.value)}
                placeholder="Mô tả ngắn thu hút người mua..."
              />
            </Field>
            <Field label="Badges (tag)">
              <BadgeEditor
                badges={pub.hero.badges}
                onChange={v => updatePub('hero.badges', v)}
              />
            </Field>
          </Section>

          {/* A2: Giá */}
          <Section icon="💰" title="Giá bán">
            <div className={S.row3}>
              <Field label="Giá tổng">
                <input className={S.input} value={pub.price.total}
                  onChange={e => updatePub('price.total', e.target.value)}
                  placeholder="Vd: 1.8 tỷ" />
              </Field>
              <Field label="Diện tích (m²)">
                <input className={S.input} type="number" value={pub.price.area || ''}
                  onChange={e => updatePub('price.area', Number(e.target.value))}
                  placeholder="120" />
              </Field>
              <Field label="Đơn giá (tr/m²)">
                <input className={S.input} type="number" value={pub.price.pricePerM2 || ''}
                  onChange={e => updatePub('price.pricePerM2', Number(e.target.value))}
                  placeholder="15" />
              </Field>
            </div>
          </Section>

          {/* A3: Gallery */}
          <Section icon="🖼️" title="Ảnh / Video">
            <ImageGrid
              images={pub.gallery.map(g => g.url)}
              uploadFn={uploadImage}
              onDelete={(url, newUrls) => galleryDelete(url, newUrls)}
            />
          </Section>

          {/* A4: Pháp lý */}
          <Section icon="📜" title="Pháp lý">
            <div className={S.row2}>
              <Field label="Loại sổ">
                <input className={S.input} value={pub.legal.type}
                  onChange={e => updatePub('legal.type', e.target.value)}
                  placeholder="Vd: Sổ hồng (GCNQSDĐ)" />
              </Field>
              <Field label="Loại đất">
                <input className={S.input} value={pub.legal.landType}
                  onChange={e => updatePub('legal.landType', e.target.value)}
                  placeholder="Vd: Đất ở đô thị (ODT)" />
              </Field>
            </div>
            <Field label="Chủ sở hữu">
              <input className={S.input} value={pub.legal.owner}
                onChange={e => updatePub('legal.owner', e.target.value)}
                placeholder="Vd: Cá nhân" />
            </Field>
          </Section>

          {/* A5: Hồ sơ chứng minh */}
          <Section icon="🔎" title="Hồ sơ — Sổ đỏ / Quy hoạch">
            <Field label="Ảnh sổ đỏ / sổ hồng">
              <ImageGrid
                images={pub.proof.redBookImages}
                uploadFn={uploadImage}
                onDelete={(url, newUrls) => proofDelete('redBookImages', url, newUrls)}
              />
            </Field>
            <Field label="Ảnh quy hoạch">
              <ImageGrid
                images={pub.proof.planningImages}
                uploadFn={uploadImage}
                onDelete={(url, newUrls) => proofDelete('planningImages', url, newUrls)}
              />
            </Field>
            <Field label="Ghi chú quy hoạch">
              <textarea className={S.textarea}
                value={pub.proof.planningText}
                onChange={e => updatePub('proof.planningText', e.target.value)}
                placeholder="Mô tả chi tiết quy hoạch..." />
            </Field>
          </Section>

          {/* A6: So sánh giá */}
          <Section icon="📊" title="So sánh giá khu vực">
            <ComparisonEditor
              rows={pub.comparison}
              onChange={v => updatePub('comparison', v)}
            />
          </Section>

          {/* A7: Tiềm năng */}
          <Section icon="🚀" title="Tiềm năng tăng giá">
            <Field label="Mô tả tiềm năng">
              <textarea className={S.textarea} style={{ minHeight: 100 }}
                value={pub.potential.text}
                onChange={e => updatePub('potential.text', e.target.value)}
                placeholder="Mô tả tiềm năng... (mỗi dòng là 1 lý do)" />
            </Field>
            <Field label="Ảnh minh họa tiềm năng">
              <ImageGrid
                images={pub.potential.images || []}
                uploadFn={uploadImage}
                onDelete={(url, newUrls) => potentialImgDelete(url, newUrls)}
              />
            </Field>
          </Section>

          {/* A8: Bản đồ */}
          <Section icon="📍" title="Bản đồ">
            <Field label="Map embed URL (Google Maps)">
              <input className={S.input}
                value={pub.mapEmbedUrl}
                onChange={e => updatePub('mapEmbedUrl', e.target.value)}
                placeholder="https://www.google.com/maps/embed?pb=..." />
            </Field>
          </Section>

          {/* A9: Liên hệ */}
          <Section icon="📞" title="Liên hệ">
            <div className={S.row2}>
              <Field label="Số điện thoại">
                <input className={S.input} value={pub.contact.phone}
                  onChange={e => updatePub('contact.phone', e.target.value)}
                  placeholder="0901234567" />
              </Field>
              <Field label="Zalo URL">
                <input className={S.input} value={pub.contact.zalo}
                  onChange={e => updatePub('contact.zalo', e.target.value)}
                  placeholder="https://zalo.me/..." />
              </Field>
            </div>
          </Section>

          {/* A10: Final CTA */}
          <Section icon="🎯" title="Final CTA">
            <Field label="Headline">
              <input className={S.input}
                value={pub.finalCTA.headline}
                onChange={e => updatePub('finalCTA.headline', e.target.value)}
                placeholder="Vd: Cơ hội sở hữu đất vàng — Liên hệ ngay!" />
            </Field>
            <Field label="Sub">
              <input className={S.input}
                value={pub.finalCTA.sub}
                onChange={e => updatePub('finalCTA.sub', e.target.value)}
                placeholder="Vd: Số lượng có hạn, giá tốt nhất khu vực" />
            </Field>
          </Section>

          {/* ════ B: PRIVATE PANEL ════ */}
          <div
            className={S.privateToggle}
            onClick={() => setShowPrivate(o => !o)}
          >
            <span className={S.privateDot} />
            🔒 Thông tin nội bộ (riêng tư)
            <span className={S.accordionChevron} style={{ marginLeft: 'auto' }}>
              {showPrivate ? '▲' : '▼'}
            </span>
          </div>

          {showPrivate && (
            <>
              <Section icon="👤" title="Chủ đất">
                <div className={S.row2}>
                  <Field label="Tên chủ đất">
                    <input className={S.input} value={priv.ownerName}
                      onChange={e => updatePriv('ownerName', e.target.value)} />
                  </Field>
                  <Field label="Số điện thoại">
                    <input className={S.input} value={priv.ownerPhone}
                      onChange={e => updatePriv('ownerPhone', e.target.value)} />
                  </Field>
                </div>
                <Field label="Hoa hồng (%)">
                  <input className={S.input} type="number" value={priv.commission || ''}
                    onChange={e => updatePriv('commission', Number(e.target.value))}
                    placeholder="Vd: 2" />
                </Field>
              </Section>

              <Section icon="📝" title="Ghi chú nội bộ">
                <Field label="Ghi chú (nội bộ)">
                  <textarea className={S.textarea} style={{ minHeight: 120 }}
                    value={priv.notesHtml}
                    onChange={e => updatePriv('notesHtml', e.target.value)}
                    placeholder="Ghi chú, quan sát, điều kiện đặc biệt..." />
                </Field>
              </Section>

              <Section icon="🤝" title="Nhật ký môi giới">
                <LogEditor
                  logs={priv.brokerLogs}
                  onChange={v => updatePriv('brokerLogs', v)}
                />
              </Section>

              <Section icon="📁" title="Thư viện raw (nội bộ)">
                <Field label="Sổ (bản gốc)">
                  <ImageGrid
                    images={priv.rawLibrary?.so || []}
                    uploadFn={uploadRawImage}
                    onDelete={(url, newUrls) => rawLibDelete('so', url, newUrls)}
                  />
                </Field>
                <Field label="Quy hoạch (bản gốc)">
                  <ImageGrid
                    images={priv.rawLibrary?.quyhoach || []}
                    uploadFn={uploadRawImage}
                    onDelete={(url, newUrls) => rawLibDelete('quyhoach', url, newUrls)}
                  />
                </Field>
                <Field label="Ảnh đất thực tế">
                  <ImageGrid
                    images={priv.rawLibrary?.anhdat || []}
                    uploadFn={uploadRawImage}
                    onDelete={(url, newUrls) => rawLibDelete('anhdat', url, newUrls)}
                  />
                </Field>
              </Section>
            </>
          )}

        </div>{/* /formPanel */}

        {/* ════════════ PREVIEW PANEL ════════════ */}
        <div className={S.previewPanel}>
          <div className={S.previewLabel}>👁 Preview — {status}</div>
          <LandPage previewData={previewProperty} />
        </div>

      </div>{/* /split */}
    </div>
  )
}
