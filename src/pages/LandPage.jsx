// src/pages/LandPage.jsx
// Conversion-focused land listing page.
// Renders 100% from DB: property.public_data + app_config.
// status !== 'published' → 404  (draft/sold blocked)
// previewData prop → admin preview mode (bypass fetch + status check)
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchPropertyBySlug, fetchAppConfig, isConfigured } from '../lib/supabase'
import { trackEvent, trackFB } from '../lib/analytics'
import { useTheme } from '../hooks/useTheme'
import { useSEO } from '../hooks/useSEO'
import ErrorBoundary from '../components/ErrorBoundary'
import Chatbot from '../components/Chatbot'
import S from './LandPage.module.css'

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

// Backward-compat: old flat-column rows → public_data shape
function resolvePublicData(row) {
  if (row.public_data && typeof row.public_data === 'object') return row.public_data
  // Legacy fallback
  return {
    hero: {
      headline:    row.hook_headline || row.title || '',
      subHeadline: row.hook_sub      || '',
      badges:      [],
    },
    price: {
      total:      row.price         || '',
      area:       row.area          || 0,
      pricePerM2: row.price_per_m2  || 0,
    },
    gallery: Array.isArray(row.images)
      ? row.images.map(url => ({ url, type: 'image' }))
      : [],
    legal: {
      type:     row.legal?.bookType  || '',
      owner:    row.legal?.owner     || '',
      landType: row.legal?.landType  || '',
    },
    proof:      { redBookImages: [], planningImages: [], planningText: '' },
    comparison: [],
    potential:  { text: '', images: [] },
    mapEmbedUrl: row.map_embed_url  || '',
    contact: {
      phone: row.phone || '',
      zalo:  row.zalo  || (row.phone ? `https://zalo.me/${row.phone}` : ''),
    },
    finalCTA: { headline: '', sub: '' },
  }
}

// Split potential.text into up to 3 "why buy" points (newlines or sentences)
function extractWhyPoints(text = '') {
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean)
  if (lines.length >= 2) return lines.slice(0, 3)
  // Fall back: split on '. '
  const sentences = text.split(/\.\s+/).map(s => s.trim()).filter(Boolean)
  return sentences.slice(0, 3)
}

// ─────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────

function SiteHeader({ config, toggle, isDark }) {
  return (
    <header className={S.siteHeader}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {config.logoUrl
          ? <img src={config.logoUrl} alt={config.brandName} className={S.headerLogo} />
          : <span className={S.headerBrand}>{config.brandName}</span>
        }
        {config.logoUrl && (
          <div>
            <div className={S.headerBrand}>{config.brandName}</div>
            {config.slogan && <div className={S.headerSlogan}>{config.slogan}</div>}
          </div>
        )}
      </div>
      <div className={S.headerRight}>
        {config.slogan && !config.logoUrl && (
          <span className={S.headerSlogan}>{config.slogan}</span>
        )}
        <button className="theme-toggle" onClick={toggle} aria-label="Đổi giao diện">
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  )
}

function HeroSection({ pub, onCall, onZalo }) {
  const { hero, price, gallery, contact } = pub
  const heroImg = gallery?.find(g => g.type === 'image') || gallery?.[0]

  return (
    <section className={S.hero}>
      {heroImg?.url && (
        <img src={heroImg.url} alt={hero.headline} className={S.heroImg} fetchpriority="high" decoding="async" />
      )}
      <div className={S.heroBody}>
        {hero.badges?.length > 0 && (
          <div className={S.heroBadges}>
            {hero.badges.map((b, i) => <span key={i} className={S.badge}>{b}</span>)}
          </div>
        )}

        <h1 className={S.heroHeadline}>{hero.headline}</h1>
        {hero.subHeadline && <p className={S.heroSub}>{hero.subHeadline}</p>}

        {(price.total || price.area || price.pricePerM2) && (
          <div className={S.priceBar}>
            {price.total && (
              <div className={S.priceItem}>
                <span className={S.priceLabel}>Giá bán</span>
                <span className={`${S.priceVal} ${S.highlight}`}>{price.total}</span>
              </div>
            )}
            {price.area > 0 && (
              <div className={S.priceItem}>
                <span className={S.priceLabel}>Diện tích</span>
                <span className={S.priceVal}>{price.area} m²</span>
              </div>
            )}
            {price.pricePerM2 > 0 && (
              <div className={S.priceItem}>
                <span className={S.priceLabel}>Đơn giá</span>
                <span className={S.priceVal}>{price.pricePerM2} tr/m²</span>
              </div>
            )}
          </div>
        )}

        <div className={S.heroCta}>
          <a href={`tel:${contact.phone}`} className={S.btnCall} onClick={onCall}>
            📞 Gọi ngay
          </a>
          <a
            href={contact.zalo || `https://zalo.me/${contact.phone}`}
            target="_blank" rel="noopener noreferrer"
            className={S.btnZalo} onClick={onZalo}
          >
            💬 Nhắn Zalo
          </a>
        </div>
      </div>
    </section>
  )
}

// Priority: pub.whyBuyNow[] → extracted from potential.text → hardcoded fallback
// Fallback ensures this conversion-critical section ALWAYS renders.
const WHY_FALLBACK = [
  'Giá tốt nhất khu vực — thấp hơn mặt bằng chung',
  'Pháp lý minh bạch — sổ hồng riêng, chủ sở hữu cá nhân',
  'Tiềm năng tăng giá — hạ tầng đang phát triển mạnh',
]

function WhyBuyNow({ pub }) {
  let points = []

  // 1. Explicit whyBuyNow array from admin (future field)
  if (Array.isArray(pub.whyBuyNow) && pub.whyBuyNow.length) {
    points = pub.whyBuyNow.slice(0, 3)
  } else {
    // 2. Extract from potential text
    points = extractWhyPoints(pub.potential?.text || '')
  }

  // 3. Always show at least fallback bullets
  if (points.length < 3) {
    const needed = WHY_FALLBACK.slice(points.length)
    points = [...points, ...needed].slice(0, 3)
  }

  return (
    <section className={S.section}>
      <div className={S.inner}>
        <h2 className={S.sectionTitle}>💡 Tại sao nên mua ngay?</h2>
        <div className={S.whyGrid}>
          {points.map((p, i) => (
            <div key={i} className={S.whyCard}>
              <div className={S.whyNum}>{String(i + 1).padStart(2, '0')}</div>
              <div className={S.whyText}>{p}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CoreInfo({ pub }) {
  const { legal, price } = pub
  const rows = [
    ['📐 Diện tích',   price.area ? `${price.area} m²` : ''],
    ['🏷️ Loại đất',   legal.landType  || ''],
    ['📗 Pháp lý',    legal.type      || ''],
    ['👤 Chủ sở hữu', legal.owner     || ''],
  ].filter(([, v]) => v)

  if (!rows.length) return null

  return (
    <section className={S.section} style={{ background: 'var(--bg-soft)' }}>
      <div className={S.inner}>
        <h2 className={S.sectionTitle}>📋 Thông tin cơ bản</h2>
        <div className={S.infoGrid}>
          {rows.map(([label, val]) => (
            <div key={label} className={S.infoCard}>
              <div className={S.infoLabel}>{label}</div>
              <div className={S.infoVal}>{val}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ProofSection({ pub }) {
  const [activeTab, setActiveTab] = useState(0)
  const { proof } = pub

  const tabs = [
    { label: '📗 Sổ đỏ / Sổ hồng', images: proof.redBookImages || [], text: '' },
    { label: '🗺️ Quy hoạch',       images: proof.planningImages || [], text: proof.planningText || '' },
  ].filter(t => t.images.length > 0 || t.text)

  if (!tabs.length) return null

  const active = tabs[activeTab] || tabs[0]

  return (
    <section className={S.section}>
      <div className={S.inner}>
        <h2 className={S.sectionTitle}>🔎 Pháp lý &amp; Quy hoạch</h2>
        <div className={S.tabs}>
          {tabs.map((t, i) => (
            <button
              key={i}
              className={`${S.tab} ${i === activeTab ? S.tabActive : ''}`}
              onClick={() => setActiveTab(i)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {active.images.length > 0 && (
          <div className={S.proofImages}>
            {active.images.map((url, i) => (
              <img key={i} src={url} alt={`${active.label} ${i + 1}`} className={S.proofImg} loading="lazy" />
            ))}
          </div>
        )}
        {active.text && <div className={S.proofText}>{active.text}</div>}
      </div>
    </section>
  )
}

function ComparisonSection({ pub }) {
  const { comparison, price } = pub
  if (!comparison?.length && !price.pricePerM2) return null

  const rows = comparison?.length
    ? comparison
    : [{ label: 'Lô này', pricePerM2: price.pricePerM2, isThis: true }]

  return (
    <section className={S.section} style={{ background: 'var(--bg-soft)' }}>
      <div className={S.inner}>
        <h2 className={S.sectionTitle}>📊 So sánh giá khu vực</h2>
        <table className={S.compTable}>
          <thead>
            <tr>
              <th>Vị trí / Lô đất</th>
              <th style={{ textAlign: 'right' }}>Giá (tr/m²)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={r.isThis || r.label === 'Lô này' ? S.thisLot : ''}>
                <td>{r.label}</td>
                <td style={{ textAlign: 'right' }} className={S.compPrice}>{r.pricePerM2}</td>
              </tr>
            ))}
            {comparison?.length > 0 && price.pricePerM2 && (
              <tr className={S.thisLot}>
                <td>🏷️ Lô này</td>
                <td style={{ textAlign: 'right' }} className={S.compPrice}>{price.pricePerM2}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function PotentialSection({ pub }) {
  const { potential } = pub
  if (!potential?.text && !potential?.images?.length) return null

  return (
    <section className={S.section}>
      <div className={S.inner}>
        <h2 className={S.sectionTitle}>🚀 Tiềm năng tăng giá</h2>
        {potential.text && <p className={S.potText}>{potential.text}</p>}
        {potential.images?.length > 0 && (
          <div className={S.potImages}>
            {potential.images.map((url, i) => (
              <img key={i} src={url} alt={`Tiềm năng ${i + 1}`} className={S.potImg} loading="lazy" />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function MapSection({ pub }) {
  if (!pub.mapEmbedUrl) return null
  return (
    <section className={S.section} style={{ background: 'var(--bg-soft)' }}>
      <div className={S.inner}>
        <h2 className={S.sectionTitle}>📍 Vị trí trên bản đồ</h2>
        <div className={S.mapWrap}>
          <iframe src={pub.mapEmbedUrl} allowFullScreen loading="lazy" title="Bản đồ" />
        </div>
      </div>
    </section>
  )
}

function FinalCTA({ pub, onCall, onZalo }) {
  const { finalCTA, contact } = pub
  if (!contact.phone) return null   // no phone = truly nothing to CTA to

  // Always show — fall back to default copy when admin hasn't filled in
  const headline = finalCTA?.headline || 'Cơ hội có hạn — Liên hệ ngay hôm nay!'
  const sub      = finalCTA?.sub      || 'Đất đẹp, pháp lý rõ, giá tốt nhất khu vực. Xem thực tế trước khi quyết định.'

  return (
    <section className={S.finalCta}>
      <div className={S.inner}>
        <h2 className={S.finalHeadline}>{headline}</h2>
        <p className={S.finalSub}>{sub}</p>
        <div className={S.finalBtns}>
          <a href={`tel:${contact.phone}`} className={S.btnCall} onClick={onCall}>
            📞 Gọi ngay — {contact.phone}
          </a>
          <a
            href={contact.zalo || `https://zalo.me/${contact.phone}`}
            target="_blank" rel="noopener noreferrer"
            className={S.btnZalo} onClick={onZalo}
          >
            💬 Chat Zalo
          </a>
        </div>
      </div>
    </section>
  )
}

function FloatingContact({ contact, onCall, onZalo }) {
  if (!contact.phone) return null
  return (
    <div className={S.floating}>
      <a href={`tel:${contact.phone}`} className={`${S.floatBtn} ${S.floatCall}`}
        onClick={onCall} aria-label="Gọi điện">📞</a>
      <a
        href={contact.zalo || `https://zalo.me/${contact.phone}`}
        target="_blank" rel="noopener noreferrer"
        className={`${S.floatBtn} ${S.floatZalo}`}
        onClick={onZalo} aria-label="Nhắn Zalo"
      >💬</a>
    </div>
  )
}

// ─────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────
export default function LandPage({ previewData }) {
  const { slug: paramSlug } = useParams()
  const slug = previewData?.slug || paramSlug

  const [property, setProperty] = useState(previewData || null)
  const [config, setConfig]     = useState(null)
  const [status, setStatus]     = useState('loading') // 'loading' | 'ok' | 'notfound' | 'blocked'
  const { theme, toggle, isDark } = useTheme()

  // SEO — runs whenever property resolves; useSEO handles null gracefully
  useSEO(property ? resolvePublicData(property) : null, slug)

  // Sync previewData (admin live preview)
  useEffect(() => {
    if (previewData) { setProperty(previewData); setStatus('ok') }
  }, [previewData])

  // Fetch property
  useEffect(() => {
    if (previewData) return
    if (!slug)       { setStatus('notfound'); return }

    Promise.all([
      isConfigured() ? fetchPropertyBySlug(slug) : Promise.resolve(null),
      fetchAppConfig(),
    ]).then(([row, cfg]) => {
      setConfig(cfg)
      if (!row) { setStatus('notfound'); return }

      // Status gate — treat missing status as published (backward compat)
      const st = row.status || 'published'
      if (st !== 'published') { setStatus('blocked'); return }

      setProperty(row)
      setStatus('ok')
      trackEvent('view_item', { slug })
    }).catch(() => setStatus('notfound'))
  }, [slug, previewData])

  // Config for preview mode
  useEffect(() => {
    if (!previewData || config) return
    fetchAppConfig().then(setConfig)
  }, [previewData, config])

  function handleCall()  { trackEvent('click_call',  { slug }) }
  function handleZalo()  { trackEvent('click_zalo',  { slug }) }

  // ── Loading ──
  if (status === 'loading') {
    return (
      <div className={S.loading}>
        <div style={{ fontSize: '2.5rem' }}>🏡</div>
        <div style={{ color: 'var(--gold-light)', fontWeight: 600 }}>Đang tải thông tin...</div>
        <div className={S.loadBar}><div className={S.loadBarFill} /></div>
      </div>
    )
  }

  // ── Not found / blocked ──
  if (status === 'notfound' || status === 'blocked') {
    return (
      <div className={S.notFound}>
        <div style={{ fontSize: '3rem' }}>{status === 'blocked' ? '🔒' : '🔍'}</div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>
          {status === 'blocked' ? 'Trang này chưa được xuất bản' : `Không tìm thấy "${slug}"`}
        </div>
        <a href="/dashboard" style={{ color: 'var(--gold)', marginTop: 8 }}>← Về trang chủ</a>
      </div>
    )
  }

  if (!property) return null

  const pub    = resolvePublicData(property)
  const appCfg = config || { brandName: 'Land Dossier', slogan: '', footerText: '' }

  return (
    <div className={S.page}>
      <SiteHeader config={appCfg} toggle={toggle} isDark={isDark} />

      <HeroSection pub={pub} onCall={handleCall} onZalo={handleZalo} />
      <WhyBuyNow   pub={pub} />
      <CoreInfo    pub={pub} />
      <ProofSection pub={pub} />
      <ComparisonSection pub={pub} />
      <PotentialSection  pub={pub} />
      <MapSection        pub={pub} />
      <FinalCTA pub={pub} onCall={handleCall} onZalo={handleZalo} />

      <footer className={S.footer}>
        <div className={S.footerBrand}>{appCfg.brandName}</div>
        <div>{appCfg.footerText}</div>
      </footer>

      <FloatingContact contact={pub.contact} onCall={handleCall} onZalo={handleZalo} />

      {!previewData && (
        <Chatbot property={{
          title:      pub.hero.headline,
          category:   'land',
          legal:      pub.legal,
          price:      pub.price.total,
          pricePerM2: pub.price.pricePerM2,
          potential:  pub.potential?.text || '',
          slug:       slug,
          contact:    pub.contact,
        }} />
      )}
    </div>
  )
}
