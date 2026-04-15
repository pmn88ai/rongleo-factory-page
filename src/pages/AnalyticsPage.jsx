// src/pages/AnalyticsPage.jsx
// Analytics dashboard — đọc từ bảng `events` (Supabase).
// Hiển thị: tổng views, clicks, top sản phẩm, breakdown by category, timeline.
// Không dùng chart lib nặng — tự render bar chart bằng CSS.
import React, { useState, useEffect, useCallback } from 'react'
import { isConfigured, testConnection, getCategories } from '../lib/supabase'
import { fetchEvents } from '../lib/analytics'

// ── Process raw events → stats ───────────────────────────────
function processEvents(events) {
  const views    = events.filter(e => e.type === 'view_item')
  const calls    = events.filter(e => e.type === 'click_call')
  const zalos    = events.filter(e => e.type === 'click_zalo')
  const docs     = events.filter(e => e.type === 'click_doc')

  // Count by slug
  const viewsBySlug = {}
  views.forEach(e => {
    const slug = e.payload?.slug || 'unknown'
    viewsBySlug[slug] = (viewsBySlug[slug] || 0) + 1
  })

  // Count clicks by slug
  const clicksBySlug = {}
  ;[...calls, ...zalos].forEach(e => {
    const slug = e.payload?.slug || 'unknown'
    clicksBySlug[slug] = (clicksBySlug[slug] || 0) + 1
  })

  // Count by category
  const viewsByCategory = {}
  views.forEach(e => {
    const cat = e.payload?.category || 'unknown'
    viewsByCategory[cat] = (viewsByCategory[cat] || 0) + 1
  })

  // Top 10 by views
  const top10 = Object.entries(viewsBySlug)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([slug, count]) => ({
      slug,
      views:  count,
      clicks: clicksBySlug[slug] || 0,
      cvr:    count > 0 ? ((clicksBySlug[slug] || 0) / count * 100).toFixed(1) : '0.0',
      // grab title from first matching view event
      title:  views.find(e => e.payload?.slug === slug)?.payload?.title || slug,
      category: views.find(e => e.payload?.slug === slug)?.payload?.category || '',
    }))

  // 7-day timeline (views per day)
  const timeline = {}
  const now = Date.now()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 86400000)
    timeline[d.toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit' })] = 0
  }
  views.forEach(e => {
    const d = new Date(e.created_at)
    const key = d.toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit' })
    if (key in timeline) timeline[key]++
  })

  return {
    totalViews:   views.length,
    totalCalls:   calls.length,
    totalZalos:   zalos.length,
    totalDocs:    docs.length,
    totalClicks:  calls.length + zalos.length,
    viewsBySlug,
    clicksBySlug,
    viewsByCategory,
    top10,
    timeline,
  }
}

// ── Styles ───────────────────────────────────────────────────
const S = {
  page:   { minHeight: '100vh', background: 'var(--cream)', fontFamily: 'var(--font-body)' },
  topBar: {
    background: 'var(--green-deep)', padding: '0 24px', height: 56,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    borderBottom: '2px solid var(--gold)', position: 'sticky', top: 0, zIndex: 100,
  },
  title:  { fontFamily: 'var(--font-display)', color: 'var(--gold-light)', fontSize: '1.1rem', fontWeight: 700 },
  body:   { padding: '24px', maxWidth: 1100, margin: '0 auto' },
  kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 },
  kpiCard: (accent) => ({
    background: '#fff', borderRadius: 12, padding: '18px 20px',
    border: `1px solid ${accent}33`,
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    borderLeft: `4px solid ${accent}`,
  }),
  kpiLabel: { fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 },
  kpiValue: (accent) => ({ fontSize: 28, fontWeight: 800, color: accent, lineHeight: 1 }),
  kpiSub:   { fontSize: 11, color: '#bbb', marginTop: 4 },
  section:  { background: '#fff', borderRadius: 12, padding: '20px 24px', marginBottom: 20, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: 'var(--green-deep)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 },
  tableWrap: { overflowX: 'auto' },
  table:  { width: '100%', borderCollapse: 'collapse' },
  th:     { padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #f0f0f0' },
  td:     { padding: '10px 12px', fontSize: 13, color: '#333', borderBottom: '1px solid rgba(0,0,0,0.04)' },
  bar:    (pct, color) => ({
    height: 8, borderRadius: 4, background: color,
    width: `${Math.max(pct, 2)}%`, transition: 'width 0.4s ease',
  }),
  barBg:  { height: 8, borderRadius: 4, background: '#f0f0f0', overflow: 'hidden' },
  badge: (cat, cats) => {
    const COLORS = ['#f0fdf4:#16a34a', '#eff6ff:#2563eb', '#fff7ed:#c2410c', '#faf5ff:#7c3aed', '#fef9c3:#854d0e']
    const idx  = cats.findIndex(c => c.value === cat)
    const pair = COLORS[idx % COLORS.length] || '#f5f5f5:#555'
    const [bg, col] = pair.split(':')
    return { display:'inline-block', padding:'1px 8px', borderRadius:20, fontSize:10, fontWeight:600, background:bg, color:col }
  },
  infoBox: (type) => ({
    padding: '10px 14px', borderRadius: 8, fontSize: 12, marginBottom: 16,
    background: type === 'warn' ? '#fef9c3' : type === 'error' ? '#fff2f2' : '#eff6ff',
    border: `1px solid ${type === 'warn' ? '#fde047' : type === 'error' ? '#fca5a5' : '#bfdbfe'}`,
    color: type === 'warn' ? '#713f12' : type === 'error' ? '#7f1d1d' : '#1e3a5f',
  }),
}

// ── Mini bar chart component ─────────────────────────────────
function BarChart({ data }) {
  // data: { label, value }[]
  const max = Math.max(...data.map(d => d.value), 1)
  const COLORS = ['var(--green-mid)', '#2563eb', '#7c3aed', '#c2410c', '#0369a1', '#854d0e', '#16a34a']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((d, i) => (
        <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 80, fontSize: 12, color: '#555', textAlign: 'right', flexShrink: 0, fontFamily: 'monospace' }}>
            {d.label}
          </div>
          <div style={{ flex: 1, ...S.barBg }}>
            <div style={S.bar((d.value / max) * 100, COLORS[i % COLORS.length])} />
          </div>
          <div style={{ width: 36, fontSize: 12, fontWeight: 700, color: '#333', textAlign: 'right', flexShrink: 0 }}>
            {d.value}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── CVR badge ────────────────────────────────────────────────
function CvrBadge({ cvr }) {
  const n = parseFloat(cvr)
  const color = n >= 10 ? '#16a34a' : n >= 5 ? '#d97706' : '#888'
  const bg    = n >= 10 ? '#f0fdf4' : n >= 5 ? '#fef9c3' : '#f5f5f5'
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, background: bg, padding: '2px 7px', borderRadius: 20 }}>
      {cvr}%
    </span>
  )
}

// ── Main ─────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [events,   setEvents]   = useState([])
  const [stats,    setStats]    = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [connOk,   setConnOk]   = useState(null)
  const categories = getCategories()

  const load = useCallback(async () => {
    if (!isConfigured()) {
      setError('Chưa cấu hình Supabase.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const conn = await testConnection()
      setConnOk(conn.ok)
      if (!conn.ok) { setError('Không kết nối được Supabase.'); setLoading(false); return }

      const data = await fetchEvents(2000)
      setEvents(data)
      setStats(processEvents(data))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const timelineData = stats
    ? Object.entries(stats.timeline).map(([label, value]) => ({ label, value }))
    : []

  const categoryData = stats
    ? Object.entries(stats.viewsByCategory)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, value]) => ({
          label: categories.find(c => c.value === cat)?.label || cat,
          value,
        }))
    : []

  return (
    <div style={S.page}>
      {/* Top bar */}
      <div style={S.topBar}>
        <span style={S.title}>📊 Analytics</span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {connOk === true  && <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 600 }}>🟢 Supabase OK</span>}
          {connOk === false && <span style={{ fontSize: 11, color: '#f87171', fontWeight: 600 }}>🔴 Kết nối thất bại</span>}
          <button
            onClick={load}
            style={{ fontSize: 12, color: 'rgba(245,230,184,0.7)', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            🔄 Refresh
          </button>
          <a href="/dashboard" style={{ color: 'rgba(245,230,184,0.6)', fontSize: 12, textDecoration: 'underline' }}>← Dashboard</a>
          <a href="/config"    style={{ color: 'rgba(245,230,184,0.5)', fontSize: 12, textDecoration: 'underline' }}>⚙️ Config</a>
        </div>
      </div>

      <div style={S.body}>
        {/* Error / loading */}
        {!isConfigured() && (
          <div style={S.infoBox('warn')}>
            ⚠️ Chưa cấu hình Supabase — <a href="/config" style={{ color: '#2563eb' }}>Vào Config →</a>
          </div>
        )}
        {error && <div style={S.infoBox('error')}>❌ {error}</div>}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#aaa', fontSize: 14 }}>
            ⏳ Đang tải events...
          </div>
        )}

        {!loading && stats && (
          <>
            {/* ── KPI row ── */}
            <div style={S.kpiRow}>
              {[
                { label: 'Tổng views',  value: stats.totalViews,  icon: '👁',  accent: 'var(--green-mid)' },
                { label: 'Gọi điện',    value: stats.totalCalls,  icon: '📞',  accent: '#2563eb' },
                { label: 'Zalo',        value: stats.totalZalos,  icon: '💬',  accent: '#16a34a' },
                { label: 'Xem tài liệu',value: stats.totalDocs,   icon: '📄',  accent: '#7c3aed' },
                { label: 'Tổng clicks', value: stats.totalClicks, icon: '🖱️', accent: '#c2410c' },
                {
                  label: 'CVR tổng',
                  value: stats.totalViews > 0
                    ? `${(stats.totalClicks / stats.totalViews * 100).toFixed(1)}%`
                    : '0%',
                  icon: '📈', accent: '#854d0e',
                },
              ].map(k => (
                <div key={k.label} style={S.kpiCard(k.accent)}>
                  <div style={S.kpiLabel}>{k.icon} {k.label}</div>
                  <div style={S.kpiValue(k.accent)}>{k.value}</div>
                  <div style={S.kpiSub}>{events.length} events tổng</div>
                </div>
              ))}
            </div>

            {/* ── 2-col layout: timeline + by category ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

              {/* 7-day timeline */}
              <div style={S.section}>
                <div style={S.sectionTitle}>📅 Views 7 ngày gần nhất</div>
                {timelineData.every(d => d.value === 0)
                  ? <div style={{ color: '#bbb', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Chưa có dữ liệu</div>
                  : <BarChart data={timelineData} />
                }
              </div>

              {/* By category */}
              <div style={S.section}>
                <div style={S.sectionTitle}>🗂️ Views theo category</div>
                {categoryData.length === 0
                  ? <div style={{ color: '#bbb', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Chưa có dữ liệu</div>
                  : <BarChart data={categoryData} />
                }
              </div>
            </div>

            {/* ── Top 10 sản phẩm ── */}
            <div style={S.section}>
              <div style={S.sectionTitle}>🔥 Top sản phẩm ({stats.top10.length})</div>
              {stats.top10.length === 0
                ? <div style={{ color: '#bbb', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                    Chưa có events. Cần tạo bảng <code>events</code> và có user truy cập trang.
                  </div>
                : (
                  <div style={S.tableWrap}>
                    <table style={S.table}>
                      <thead>
                        <tr>
                          {['#', 'Sản phẩm', 'Category', 'Views', 'Clicks', 'CVR', 'Bar'].map(h => (
                            <th key={h} style={S.th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {stats.top10.map((item, i) => {
                          const maxViews = stats.top10[0]?.views || 1
                          return (
                            <tr key={item.slug}
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              onClick={() => window.open(`/land/${item.slug}`, '_blank')}
                            >
                              <td style={{ ...S.td, color: '#aaa', fontSize: 12, width: 28 }}>{i + 1}</td>
                              <td style={S.td}>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{item.title}</div>
                                <div style={{ fontSize: 11, color: '#aaa', fontFamily: 'monospace' }}>{item.slug}</div>
                              </td>
                              <td style={S.td}>
                                {item.category
                                  ? <span style={S.badge(item.category, categories)}>
                                      {categories.find(c => c.value === item.category)?.label || item.category}
                                    </span>
                                  : <span style={{ color: '#ddd' }}>—</span>
                                }
                              </td>
                              <td style={{ ...S.td, fontWeight: 700, color: 'var(--green-mid)' }}>{item.views}</td>
                              <td style={{ ...S.td, fontWeight: 700, color: '#2563eb' }}>{item.clicks}</td>
                              <td style={S.td}><CvrBadge cvr={item.cvr} /></td>
                              <td style={{ ...S.td, minWidth: 100 }}>
                                <div style={S.barBg}>
                                  <div style={S.bar((item.views / maxViews) * 100, 'var(--green-mid)')} />
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </div>

            {/* ── Raw events sample ── */}
            <div style={S.section}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={S.sectionTitle}>🗃️ Events gần nhất (20)</div>
                <span style={{ fontSize: 11, color: '#aaa' }}>{events.length} events tổng</span>
              </div>
              {events.length === 0
                ? <div style={{ color: '#bbb', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Chưa có events</div>
                : (
                  <div style={S.tableWrap}>
                    <table style={S.table}>
                      <thead>
                        <tr>
                          {['Thời gian', 'Type', 'Slug', 'Category', 'Details'].map(h => (
                            <th key={h} style={S.th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {events.slice(0, 20).map(e => (
                          <tr key={e.id}>
                            <td style={{ ...S.td, fontSize: 11, color: '#aaa', whiteSpace: 'nowrap' }}>
                              {new Date(e.created_at).toLocaleString('vi-VN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td style={{ ...S.td }}>
                              <span style={{
                                fontSize: 11, fontWeight: 700,
                                color: e.type === 'view_item' ? 'var(--green-mid)'
                                     : e.type === 'click_call' ? '#2563eb'
                                     : e.type === 'click_zalo' ? '#16a34a'
                                     : '#7c3aed',
                              }}>
                                {e.type === 'view_item'   ? '👁 view'
                                 : e.type === 'click_call' ? '📞 call'
                                 : e.type === 'click_zalo' ? '💬 zalo'
                                 : e.type === 'click_doc'  ? '📄 doc'
                                 : e.type}
                              </span>
                            </td>
                            <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12, color: '#444' }}>
                              {e.payload?.slug || '—'}
                            </td>
                            <td style={S.td}>
                              {e.payload?.category
                                ? <span style={S.badge(e.payload.category, categories)}>
                                    {categories.find(c => c.value === e.payload.category)?.label || e.payload.category}
                                  </span>
                                : <span style={{ color: '#ddd' }}>—</span>
                              }
                            </td>
                            <td style={{ ...S.td, fontSize: 11, color: '#888' }}>
                              {e.payload?.position && `pos: ${e.payload.position}`}
                              {e.payload?.variant  && ` · v${e.payload.variant}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </div>

            {/* ── Setup hint nếu chưa có events ── */}
            {events.length === 0 && !error && (
              <div style={S.infoBox('warn')}>
                💡 <strong>Chưa có events.</strong> Chạy SQL trên Supabase để tạo bảng:
                <pre style={{ margin: '8px 0 0', fontSize: 11, background: 'rgba(0,0,0,0.05)', padding: '8px', borderRadius: 4 }}>
{`create table if not exists events (
  id uuid default gen_random_uuid() primary key,
  type text,
  payload jsonb,
  created_at timestamp default now()
);`}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
