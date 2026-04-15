// src/pages/LandPage.jsx
// Fetches property from Supabase by slug.
// Falls back to local landData nếu Supabase chưa config hoặc không tìm thấy.
// Props: overrideProperty / overrideImages → AdminPage preview mode (bypass fetch).
//
// Dynamic data: render từ property.data (jsonb) theo schema order + label.
// Schema drift fix: khi có schema → KHÔNG fallback Object.entries, chỉ render đúng keys trong schema.
//
// Template system: TEMPLATE_MAP[category] → LandTemplate | PhoneTemplate | CarTemplate | DefaultTemplate
// Hero config:     HERO_CONFIG[category]  → tag + trust items per category
// CTA text:        CTA_TEXT[category]     → variant-B urgency text per category
import React, { useEffect, useState, Suspense } from 'react'
import { useParams } from 'react-router-dom'
import landData from '../data/landData'
import Gallery from '../components/Gallery'
import Map from '../components/Map'
import ContactBar from '../components/ContactBar'
import Chatbot from '../components/Chatbot'
import ImageUploader from '../components/ImageUploader'
import styles from './LandPage.module.css'
import { downloadLandHtml } from '../utils/exportHtml'
import { fetchPropertyBySlug, isConfigured } from '../lib/supabase'
import { trackEvent } from '../lib/analytics'

// InfoSection lazy-loaded: chỉ dùng trong LandTemplate
const InfoSection = React.lazy(() => import('../components/InfoSection'))

// ─────────────────────────────────────────
// A/B TESTING
// ─────────────────────────────────────────
const AB_KEY   = 'ab_variant'
const AB_STATS = 'ab_stats'

function getOrAssignVariant() {
  let v = localStorage.getItem(AB_KEY)
  if (!v) { v = Math.random() < 0.5 ? 'A' : 'B'; localStorage.setItem(AB_KEY, v) }
  return v
}

function getStats() {
  try {
    return JSON.parse(localStorage.getItem(AB_STATS)) || { A: { views: 0, clicks: 0 }, B: { views: 0, clicks: 0 } }
  } catch {
    return { A: { views: 0, clicks: 0 }, B: { views: 0, clicks: 0 } }
  }
}

function trackAB(variant, type) {
  const stats = getStats()
  if (!stats[variant]) stats[variant] = { views: 0, clicks: 0 }
  stats[variant][type] = (stats[variant][type] || 0) + 1
  localStorage.setItem(AB_STATS, JSON.stringify(stats))
  return stats
}

// ─────────────────────────────────────────
// HERO CONFIG — per category
// ─────────────────────────────────────────
const HERO_CONFIG = {
  land: {
    tag:   'Hồ Sơ Chính Thức',
    trust: ['Đã kiểm tra pháp lý', 'Có thể xem sổ trực tiếp', 'Thông tin minh bạch'],
  },
  phone: {
    tag:   'Sản phẩm chính hãng',
    trust: ['Kiểm tra máy trực tiếp', 'Bao test 7 ngày', 'Thông tin rõ ràng'],
  },
  car: {
    tag:   'Xe đã kiểm định',
    trust: ['Không đâm đụng', 'Bao test hãng', 'Giấy tờ rõ ràng'],
  },
}

// ─────────────────────────────────────────
// CTA TEXT — variant-B urgency per category
// ─────────────────────────────────────────
const CTA_TEXT = {
  land:  '🔥 Gọi ngay — Còn 1 lô!',
  phone: '🔥 Gọi ngay — Máy đẹp giá tốt!',
  car:   '🔥 Gọi ngay — Xe ngon giá tốt!',
}

// ─────────────────────────────────────────
// CTA SECONDARY — 2 action buttons per category
// ─────────────────────────────────────────
const CTA_SECONDARY = {
  land:  ['📄 Xem sổ ngay',   '⚡ Hỏi pháp lý 30s'],
  phone: ['📄 Xem chi tiết',  '⚡ Hỏi tình trạng máy'],
  car:   ['📄 Xem giấy tờ',   '⚡ Hỏi tình trạng xe'],
}

// ─────────────────────────────────────────
// BRAND — footer identity per category
// ─────────────────────────────────────────
const BRAND = {
  land:  '🏡 Land Dossier',
  phone: '📱 Phone Dossier',
  car:   '🚗 Auto Dossier',
}

// ─────────────────────────────────────────
// DB row → property object
// ─────────────────────────────────────────
function dbRowToProperty(row) {
  const d        = (row.data && typeof row.data === 'object') ? row.data : {}
  const category = row.category || 'land'

  const base = {
    slug:            row.slug,
    category,
    title:           row.title            || '',
    hookHeadline:    row.hook_headline    || '',
    hookHeadlineAlt: row.hook_headline_alt || '',
    hookSub:         row.hook_sub         || '',
    summary:         row.summary          || '',
    price:           row.price            || '',
    location:        row.location         || '',
    locationDetail:  row.location_detail  || '',
    images:          Array.isArray(row.images) ? row.images : [],
    videoUrl:        '',
    mapEmbedUrl:     row.map_embed_url    || '',
    data:            d,
    schema:          null, // được gán từ ngoài nếu cần (admin preview)
    contact: {
      name:  row.contact_name || 'Người bán',
      phone: row.phone || '',
      zalo:  row.zalo  || (row.phone ? `https://zalo.me/${row.phone}` : '#'),
    },
  }

  if (category === 'land') {
    return {
      ...base,
      // Legacy flat columns — vẫn map để không vỡ record cũ
      pricePerM2:      row.price_per_m2 || d.price_per_m2 || d.pricePerM2 || 0,
      area:            row.area         || d.area         || 0,
      areaFront:       row.area_front   || d.areaFront    || 0,
      areaDepth:       row.area_depth   || d.areaDepth    || 0,
      legal:           {
        bookType:  row.legal_book_type  || 'Sổ hồng (GCNQSDĐ)',
        owner:     row.legal_owner      || 'Cá nhân',
        landType:  row.legal_land_type  || 'Đất ở đô thị (ODT)',
        issueYear: row.legal_issue_year || '',
        notes:     row.legal_notes      || '',
      },
      priceComparison: {
        areaAvgMin: row.area_avg_min   || 0,
        areaAvgMax: row.area_avg_max   || 0,
        thisLot:    row.price_per_m2   || 0,
        note:       row.price_note     || '',
      },
      advantages: Array.isArray(row.advantages) ? row.advantages : [],
      risks:      Array.isArray(row.risks)      ? row.risks      : [],
    }
  }

  return base
}

// ─────────────────────────────────────────
// DYNAMIC DATA PANEL
//
// FIX ⚠️1: label từ schemaMap thay vì formatKey(key)
// FIX ⚠️2: render đúng thứ tự schema
// FIX SCHEMA DRIFT: khi có schema → CHỈ render keys tồn tại trong schema
//   → field cũ bị xóa khỏi schema sẽ không hiện nữa, dù data vẫn có trong DB
// Fallback Object.entries CHỈ dùng khi KHÔNG có schema (data cũ chưa có schema)
// ─────────────────────────────────────────
function DynamicDataPanel({ data, schema }) {
  if (!data || typeof data !== 'object') return null

  const hasSchema = Array.isArray(schema) && schema.length > 0

  const schemaMap = hasSchema
    ? Object.fromEntries(schema.map(f => [f.key, f.label]))
    : {}

  let entries
  if (hasSchema) {
    entries = schema
      .map(f => [f.key, data[f.key]])
      .filter(([, val]) => val !== null && val !== undefined && val !== '')
  } else {
    entries = Object.entries(data)
      .filter(([, val]) => val !== null && val !== undefined && val !== '')
  }

  if (entries.length === 0) return null

  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '18px 20px',
      border: '1px solid rgba(0,0,0,0.07)', marginTop: 16,
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{
        fontSize: 13, fontWeight: 700, color: 'var(--green-deep)',
        marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6,
      }}>
        📋 Thông tin chi tiết
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
        {entries.map(([key, val]) => (
          <div key={key} style={{ padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 10, color: '#999', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
              {schemaMap[key] || key}
            </div>
            <div style={{ fontSize: 13, color: '#333', fontWeight: 500 }}>
              {String(val)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// LOADING SCREEN
// ─────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 16,
      background: 'var(--green-deep)', fontFamily: 'var(--font-body)',
    }}>
      <div style={{ fontSize: '2.5rem' }}>🏡</div>
      <div style={{ color: 'var(--gold-light)', fontSize: '1rem', fontWeight: 600 }}>Đang tải thông tin...</div>
      <div style={{ width: 180, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', background: 'var(--gold)', borderRadius: 2,
          animation: 'loadBar 1.4s ease-in-out infinite', width: '40%',
        }} />
      </div>
      <style>{`
        @keyframes loadBar {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(500%); }
        }
      `}</style>
    </div>
  )
}

// ─────────────────────────────────────────
// DEBUG PANEL
// ─────────────────────────────────────────
function DebugPanel({ variant, stats }) {
  const a    = stats.A || { views: 0, clicks: 0 }
  const b    = stats.B || { views: 0, clicks: 0 }
  const aCvr = a.views > 0 ? ((a.clicks / a.views) * 100).toFixed(1) : '0.0'
  const bCvr = b.views > 0 ? ((b.clicks / b.views) * 100).toFixed(1) : '0.0'

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: 12, zIndex: 9999,
      background: '#0d0d0d', color: '#f0f0f0',
      border: '1px solid #333', borderRadius: 10, padding: '14px 16px', minWidth: 240,
      fontFamily: 'monospace', fontSize: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
    }}>
      <div style={{ color: 'var(--gold)', fontWeight: 700, marginBottom: 10, fontSize: 13 }}>🧪 A/B Debug</div>
      <div style={{ marginBottom: 8 }}>
        Current: <span style={{
          background: variant === 'A' ? 'var(--green-mid)' : 'var(--gold)',
          color: variant === 'A' ? 'var(--gold-light)' : 'var(--green-deep)',
          padding: '2px 8px', borderRadius: 4, fontWeight: 700,
        }}>Variant {variant}</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <thead>
          <tr style={{ color: '#888', fontSize: 11 }}>
            <th style={{ textAlign: 'left' }}>V</th>
            <th style={{ textAlign: 'right' }}>Views</th>
            <th style={{ textAlign: 'right' }}>Clicks</th>
            <th style={{ textAlign: 'right' }}>CVR</th>
          </tr>
        </thead>
        <tbody>
          {[['A', a, aCvr, '#4ade80'], ['B', b, bCvr, '#fb923c']].map(([v, s, cvr, col]) => (
            <tr key={v} style={{ color: variant === v ? col : '#ccc' }}>
              <td style={{ fontWeight: variant === v ? 700 : 400 }}>{variant === v ? '▶ ' : ''}V{v}</td>
              <td style={{ textAlign: 'right' }}>{s.views}</td>
              <td style={{ textAlign: 'right' }}>{s.clicks}</td>
              <td style={{ textAlign: 'right', color: col }}>{cvr}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        onClick={() => { localStorage.removeItem(AB_STATS); localStorage.removeItem(AB_KEY); window.location.reload() }}
        style={{ width: '100%', padding: '4px 0', fontSize: 11, background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, cursor: 'pointer' }}
      >Reset stats</button>
    </div>
  )
}

// ─────────────────────────────────────────
// OWNER CARD (shared helper)
// ─────────────────────────────────────────
function OwnerCard({ property, handleCall }) {
  return (
    <div className={styles.ownerCard}>
      <div className={styles.ownerAvatar}>👤</div>
      <div className={styles.ownerInfo}>
        <div className={styles.ownerName}>{property.contact?.name}</div>
        <div className={styles.ownerSub}>Liên hệ trực tiếp</div>
      </div>
      <a href={`tel:${property.contact?.phone}`} className={styles.ownerCall} onClick={() => handleCall('owner_card')}>
        {property.contact?.phone}
      </a>
    </div>
  )
}

// ─────────────────────────────────────────
// TEMPLATES
// ─────────────────────────────────────────

// Land: full layout — stats diện tích/giá + pháp lý + InfoSection (lazy)
function LandTemplate({ property, activeImages, handleCall }) {
  return (
    <div className={styles.grid}>
      <div className={styles.left}>
        <Gallery images={activeImages} videoUrl={property.videoUrl} />

        {(property.area || property.price || property.pricePerM2) && (
          <div className={styles.stats}>
            {[
              property.area       && ['Diện tích', `${property.area} m²`,              false],
              property.price      && ['Giá bán',   property.price,                      true ],
              property.pricePerM2 && ['Đơn giá',   `${property.pricePerM2} tr/m²`,     false],
              (property.areaFront || property.areaDepth)
                && ['Kích thước', `${property.areaFront}×${property.areaDepth}m`,       false],
            ].filter(Boolean).map(([label, val, highlight], i, arr) => (
              <React.Fragment key={label}>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>{label}</span>
                  <span className={`${styles.statVal} ${highlight ? styles.statPrice : ''}`}>{val}</span>
                </div>
                {i < arr.length - 1 && <div className={styles.statDivider} />}
              </React.Fragment>
            ))}
          </div>
        )}

        {property.summary && (
          <div className={styles.summary}>
            <h2 className={styles.summaryTitle}>📝 Mô tả tổng quan</h2>
            <p>{property.summary}</p>
          </div>
        )}

        <DynamicDataPanel data={property.data} schema={property.schema} />
        <OwnerCard property={property} handleCall={handleCall} />
        {property.mapEmbedUrl && <Map embedUrl={property.mapEmbedUrl} locationDetail={property.locationDetail} />}
      </div>

      <div className={styles.right}>
        <div className={styles.desktopCta}><ContactBar contact={property.contact} /></div>
        <Suspense fallback={null}>
          <InfoSection property={property} />
        </Suspense>
      </div>
    </div>
  )
}

// Phone: giá + thông số máy — không có pháp lý đất / map
function PhoneTemplate({ property, activeImages, handleCall }) {
  return (
    <div className={styles.grid}>
      <div className={styles.left}>
        <Gallery images={activeImages} videoUrl={property.videoUrl} />

        {property.price && (
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Giá bán</span>
              <span className={`${styles.statVal} ${styles.statPrice}`}>{property.price}</span>
            </div>
          </div>
        )}

        {property.summary && (
          <div className={styles.summary}>
            <h2 className={styles.summaryTitle}>📝 Mô tả</h2>
            <p>{property.summary}</p>
          </div>
        )}

        <DynamicDataPanel data={property.data} schema={property.schema} />
        <OwnerCard property={property} handleCall={handleCall} />
        {property.mapEmbedUrl && <Map embedUrl={property.mapEmbedUrl} locationDetail={property.locationDetail} />}
      </div>

      <div className={styles.right}>
        <div className={styles.desktopCta}><ContactBar contact={property.contact} /></div>
      </div>
    </div>
  )
}

// Car: giá + thông số xe — map nếu có địa chỉ
function CarTemplate({ property, activeImages, handleCall }) {
  return (
    <div className={styles.grid}>
      <div className={styles.left}>
        <Gallery images={activeImages} videoUrl={property.videoUrl} />

        {property.price && (
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Giá bán</span>
              <span className={`${styles.statVal} ${styles.statPrice}`}>{property.price}</span>
            </div>
          </div>
        )}

        {property.summary && (
          <div className={styles.summary}>
            <h2 className={styles.summaryTitle}>📝 Mô tả</h2>
            <p>{property.summary}</p>
          </div>
        )}

        <DynamicDataPanel data={property.data} schema={property.schema} />
        <OwnerCard property={property} handleCall={handleCall} />
        {property.mapEmbedUrl && <Map embedUrl={property.mapEmbedUrl} locationDetail={property.locationDetail} />}
      </div>

      <div className={styles.right}>
        <div className={styles.desktopCta}><ContactBar contact={property.contact} /></div>
      </div>
    </div>
  )
}

// Default fallback: DynamicDataPanel + summary + owner card + optional map
function DefaultTemplate({ property, activeImages, handleCall }) {
  return (
    <div className={styles.grid}>
      <div className={styles.left}>
        <Gallery images={activeImages} videoUrl={property.videoUrl} />

        {property.price && (
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Giá bán</span>
              <span className={`${styles.statVal} ${styles.statPrice}`}>{property.price}</span>
            </div>
          </div>
        )}

        {property.summary && (
          <div className={styles.summary}>
            <h2 className={styles.summaryTitle}>📝 Mô tả</h2>
            <p>{property.summary}</p>
          </div>
        )}

        <DynamicDataPanel data={property.data} schema={property.schema} />
        <OwnerCard property={property} handleCall={handleCall} />
        {property.mapEmbedUrl && <Map embedUrl={property.mapEmbedUrl} locationDetail={property.locationDetail} />}
      </div>

      <div className={styles.right}>
        <div className={styles.desktopCta}><ContactBar contact={property.contact} /></div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// TEMPLATE MAP
// ─────────────────────────────────────────
const TEMPLATE_MAP = {
  land:  LandTemplate,
  phone: PhoneTemplate,
  car:   CarTemplate,
}

// ─────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────
export default function LandPage({ overrideProperty, overrideImages }) {
  const params = useParams()
  const slug   = overrideProperty?.slug || params?.slug

  const [property, setProperty]         = useState(overrideProperty || null)
  const [fetchState, setFetchState]     = useState('idle')
  const [variant, setVariant]           = useState(null)
  const [abStats, setAbStats]           = useState(getStats())
  const [showDebug, setShowDebug]       = useState(false)
  const [exportDone, setExportDone]     = useState(false)
  const [customImages, setCustomImages] = useState(overrideImages || [])
  const [showUploader, setShowUploader] = useState(false)

  useEffect(() => { if (overrideProperty) setProperty(overrideProperty) }, [overrideProperty])
  useEffect(() => { if (overrideImages !== undefined) setCustomImages(overrideImages) }, [overrideImages])

  // Fetch từ Supabase
  useEffect(() => {
    if (overrideProperty || !slug) return
    const local = landData[slug]
    if (!isConfigured()) {
      if (local) { setProperty(local); setFetchState('done') }
      else setFetchState('notfound')
      return
    }
    if (local) setProperty(local)
    setFetchState('loading')
    fetchPropertyBySlug(slug)
      .then(row => {
        if (row) { setProperty(dbRowToProperty(row)); setFetchState('done') }
        else if (local) { setFetchState('done') }
        else { setFetchState('notfound') }
      })
      .catch(() => {
        if (local) setFetchState('done')
        else setFetchState('notfound')
      })
  }, [slug, overrideProperty])

  // A/B tracking
  useEffect(() => {
    if (overrideProperty) return
    setShowDebug(new URLSearchParams(window.location.search).get('debug') === '1')
    const v = getOrAssignVariant()
    setVariant(v)
    setAbStats(trackAB(v, 'views'))
    window.scrollTo(0, 0)
  }, [slug, overrideProperty])

  // Track view_item khi property load xong (GA4 + Supabase)
  useEffect(() => {
    if (!property || overrideProperty) return
    trackEvent('view_item', {
      slug:     property.slug,
      category: property.category,
      title:    property.title,
    })
  }, [property?.slug, overrideProperty])

  const activeImages = customImages.length > 0 ? customImages : (property?.images || [])

  function handleExport() {
    const root = getComputedStyle(document.documentElement)
    const theme = {
      greenDeep:   root.getPropertyValue('--green-deep').trim(),
      greenMid:    root.getPropertyValue('--green-mid').trim(),
      greenLight:  root.getPropertyValue('--green-light').trim(),
      gold:        root.getPropertyValue('--gold').trim(),
      goldLight:   root.getPropertyValue('--gold-light').trim(),
      cream:       root.getPropertyValue('--cream').trim(),
      fontDisplay: root.getPropertyValue('--font-display').replace(/'/g, '').trim(),
      fontBody:    root.getPropertyValue('--font-body').replace(/'/g, '').trim(),
    }
    downloadLandHtml(property, theme, slug, customImages.length ? customImages : null)
    setExportDone(true)
    setTimeout(() => setExportDone(false), 2000)
  }

  if (fetchState === 'loading' && !property && !overrideProperty) return <LoadingScreen />

  if (fetchState === 'notfound') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 12,
        background: 'var(--cream)', fontFamily: 'var(--font-body)', color: '#888',
      }}>
        <div style={{ fontSize: '3rem' }}>🔍</div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Không tìm thấy trang "{slug}"</div>
        <a href="/dashboard" style={{ color: 'var(--green-mid)', textDecoration: 'underline', fontSize: 14 }}>← Về Dashboard</a>
      </div>
    )
  }

  if (!property) return <LoadingScreen />
  if (!overrideProperty && !variant) return <LoadingScreen />

  const isB      = !overrideProperty && variant === 'B'
  const headline = isB ? (property.hookHeadlineAlt || property.hookHeadline) : property.hookHeadline
  const heroCfg    = HERO_CONFIG[property.category]    || HERO_CONFIG.land
  const ctaBText   = CTA_TEXT[property.category]       || CTA_TEXT.land
  const ctaSecond  = CTA_SECONDARY[property.category]  || CTA_SECONDARY.land
  const brand      = BRAND[property.category]          || BRAND.land

  const ctaCallStyle = isB ? {
    background: 'var(--gold)', color: 'var(--green-deep)',
    padding: '13px 22px', fontWeight: 800, fontSize: '0.9rem',
    boxShadow: '0 4px 16px rgba(0,0,0,0.25)', border: 'none',
    animation: 'ctaPulse 2s infinite',
  } : {}

  function handleCall(position) {
    if (overrideProperty) return
    setAbStats(trackAB(variant, 'clicks'))
    trackEvent('click_call', { slug: property.slug, category: property.category, position, variant })
  }
  function handleZalo(position) {
    if (overrideProperty) return
    setAbStats(trackAB(variant, 'clicks'))
    trackEvent('click_zalo', { slug: property.slug, category: property.category, position, variant })
  }
  function handleXemSo(position)  { trackEvent('click_doc',   { slug: property.slug, position }) }
  function handlePhapLy(position) { trackEvent('click_legal', { slug: property.slug, position }) }

  const Template = TEMPLATE_MAP[property.category] || DefaultTemplate

  return (
    <div className={styles.page}>
      {showDebug && (
        <div style={{
          position: 'fixed', top: 10, right: 10, zIndex: 9998,
          background: isB ? 'var(--gold)' : 'var(--green-mid)',
          color: isB ? 'var(--green-deep)' : 'var(--gold-light)',
          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, fontFamily: 'monospace',
        }}>AB:{variant}</div>
      )}

      {/* ── HERO ── */}
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroTag}>
            <span className={styles.tagDot} />
            {heroCfg.tag}
          </div>
          <h1 className={styles.heroHeadline}>{headline}</h1>
          <p className={styles.heroSub}>{property.hookSub}</p>

          <div className={styles.trustBlock}>
            {heroCfg.trust.map(t => (
              <div key={t} className={styles.trustItem}>
                <span className={styles.trustCheck}>✔</span>
                <span>{t}</span>
              </div>
            ))}
          </div>

          <div className={styles.quickCta}>
            <a href={`tel:${property.contact?.phone}`}
              className={`${styles.ctaBtn} ${styles.ctaCall} ${isB ? styles.ctaCallB : ''}`}
              onClick={() => handleCall('hero')} style={ctaCallStyle}>
              {isB ? ctaBText : '📞 Gọi ngay'}
            </a>
            <a href={property.contact?.zalo} target="_blank" rel="noopener noreferrer"
              className={`${styles.ctaBtn} ${styles.ctaZalo}`} onClick={() => handleZalo('hero')}>
              💬 Zalo
            </a>
            <button className={`${styles.ctaBtn} ${styles.ctaDocs}`} onClick={() => handleXemSo('hero')}>
              {ctaSecond[0]}
            </button>
            <a href={property.contact?.zalo} target="_blank" rel="noopener noreferrer"
              className={`${styles.ctaBtn} ${styles.ctaLegal}`} onClick={() => handlePhapLy('hero')}>
              {ctaSecond[1]}
            </a>
          </div>

          {!overrideProperty && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button onClick={() => setShowUploader(v => !v)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px',
                background: customImages.length ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.1)',
                color: customImages.length ? '#4ade80' : 'rgba(245,230,184,0.75)',
                border: `1px solid ${customImages.length ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.2)'}`,
                borderRadius: 8, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {customImages.length ? `📸 ${customImages.length} ảnh` : '📸 Upload ảnh'}
              </button>
              <button onClick={handleExport} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px',
                background: 'rgba(255,255,255,0.1)',
                color: exportDone ? '#4ade80' : 'rgba(245,230,184,0.75)',
                border: `1px solid ${exportDone ? 'rgba(74,222,128,0.33)' : 'rgba(255,255,255,0.2)'}`,
                borderRadius: 8, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {exportDone ? '✅ Đã tải xuống!' : '⬇️ Export HTML'}
              </button>
            </div>
          )}

          {!overrideProperty && showUploader && (
            <ImageUploader
              dark
              onImagesReady={(imgs) => {
                setCustomImages(imgs)
                if (imgs.length) setShowUploader(false)
              }}
            />
          )}

          {isB && (
            <div style={{
              marginTop: 12, background: 'rgba(201,168,76,0.12)',
              border: '1px solid rgba(201,168,76,0.3)', borderRadius: 8, padding: '8px 12px',
              fontSize: '0.8rem', color: 'var(--gold-pale)', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>⏳</span>
              <span>Đang có <strong>3 người</strong> xem sản phẩm này — liên hệ sớm để giữ chỗ</span>
            </div>
          )}
        </div>
      </header>

      {/* ── MAIN: template-driven ── */}
      <main className={styles.main}>
        <Template
          property={property}
          activeImages={activeImages}
          handleCall={handleCall}
        />
      </main>

      {!overrideProperty && (
        <div className={styles.stickyBar}><ContactBar contact={property.contact} /></div>
      )}
      {!overrideProperty && <Chatbot property={property} />}
      {showDebug && <DebugPanel variant={variant} stats={abStats} />}

      <footer className={styles.footer}>
        <p className={styles.footerBrand}>{brand}</p>
        <p className={styles.footerText}>Hồ sơ chuyên nghiệp — minh bạch — đáng tin cậy</p>
        <p className={styles.footerDis}>Thông tin mang tính tham khảo. Vui lòng kiểm tra trực tiếp trước khi giao dịch.</p>
      </footer>

      <style>{`
        @keyframes ctaPulse {
          0%,100% { box-shadow: 0 4px 16px rgba(0,0,0,0.2); }
          50%      { box-shadow: 0 6px 24px rgba(0,0,0,0.35); }
        }
      `}</style>
    </div>
  )
}
