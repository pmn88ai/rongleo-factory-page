// src/pages/Dashboard.jsx
import React, { useState, useEffect, useCallback } from 'react'
import {
  fetchProperties, deleteProperty,
  isConfigured, testConnection,
  getCategories,
} from '../lib/supabase'

const S = {
  page:   { minHeight: '100vh', background: 'var(--cream)', fontFamily: 'var(--font-body)' },
  topBar: {
    background: 'var(--green-deep)', padding: '0 24px', height: 56,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    borderBottom: '2px solid var(--gold)', position: 'sticky', top: 0, zIndex: 100,
  },
  title:  { fontFamily: 'var(--font-display)', color: 'var(--gold-light)', fontSize: '1.1rem', fontWeight: 700 },
  navBar: {
    background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)',
    padding: '0 24px', display: 'flex', alignItems: 'center',
    gap: 0, height: 44, overflowX: 'auto',
  },
  navBtn: (active) => ({
    padding: '0 14px', height: '100%', display: 'flex', alignItems: 'center',
    fontSize: 13, fontWeight: active ? 700 : 400, whiteSpace: 'nowrap',
    color: active ? 'var(--green-deep)' : '#888',
    borderBottom: active ? '2px solid var(--green-mid)' : '2px solid transparent',
    cursor: 'pointer', background: 'transparent', border: 'none', fontFamily: 'inherit',
  }),
  body:    { padding: '20px 24px', maxWidth: 1100, margin: '0 auto' },
  toolbar: {
    display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
    marginBottom: 18, justifyContent: 'space-between',
  },
  searchInput: {
    padding: '8px 14px', fontSize: 13, border: '1px solid #ddd',
    borderRadius: 8, outline: 'none', width: 220, fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  },
  btnNew: {
    padding: '9px 18px', background: 'var(--green-deep)',
    color: 'var(--gold-light)', border: 'none', borderRadius: 8,
    fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', gap: 6,
  },
  btnSecondary: {
    padding: '9px 14px', background: 'transparent',
    color: '#666', border: '1px solid #ddd', borderRadius: 8,
    fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
  },
  table: {
    width: '100%', borderCollapse: 'collapse',
    background: '#fff', borderRadius: 10, overflow: 'hidden',
    border: '1px solid rgba(0,0,0,0.07)',
    boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
  },
  th: {
    padding: '11px 14px', textAlign: 'left', fontSize: 11,
    fontWeight: 700, color: '#888', textTransform: 'uppercase',
    letterSpacing: '0.06em', background: '#f9fafb',
    borderBottom: '1px solid rgba(0,0,0,0.07)',
  },
  td: { padding: '12px 14px', fontSize: 13, color: '#333', borderBottom: '1px solid rgba(0,0,0,0.05)' },
  badge: (cat, cats) => {
    const COLORS = ['#f0fdf4:#16a34a', '#eff6ff:#2563eb', '#fff7ed:#c2410c', '#faf5ff:#7c3aed',
                    '#fef9c3:#854d0e', '#f0f9ff:#0369a1', '#fdf4ff:#7e22ce']
    const idx  = cats.findIndex(c => c.value === cat)
    const pair = COLORS[idx % COLORS.length] || '#f5f5f5:#555'
    const [bg, col] = pair.split(':')
    return { display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: bg, color: col }
  },
  actionBtn: (color) => ({
    padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
    background: 'transparent', border: `1px solid ${color}`,
    color: color, borderRadius: 6, fontFamily: 'inherit',
  }),
  emptyState: { padding: '60px 24px', textAlign: 'center', color: '#aaa' },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },
  card: {
    background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.07)',
    overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  ownerTag: {
    display: 'inline-block', fontSize: 10, fontWeight: 600,
    padding: '2px 7px', borderRadius: 20,
    background: '#f0f9ff', color: '#0369a1',
    border: '1px solid #bae6fd',
    maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  statusDot: (status) => {
    const map = { 'đang bán': '#16a34a', 'đã bán': '#dc2626', 'tạm dừng': '#d97706' }
    return { display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: map[status] || '#aaa', marginRight: 4 }
  },
}

function ConnectionBadge() {
  const [state, setState] = useState(isConfigured() ? 'checking' : 'uncfg')
  useEffect(() => {
    if (!isConfigured()) return
    testConnection().then(r => setState(r.ok ? 'ok' : 'fail'))
  }, [])
  const map = {
    uncfg:    { icon: '⚪', color: '#888',    bg: '#f5f5f5', border: '#ddd',    label: 'Chưa cấu hình' },
    checking: { icon: '⏳', color: '#888',    bg: '#f5f5f5', border: '#ddd',    label: 'Đang kết nối...' },
    ok:       { icon: '🟢', color: '#16a34a', bg: '#f0fdf4', border: '#86efac', label: 'Supabase OK' },
    fail:     { icon: '🔴', color: '#dc2626', bg: '#fff5f5', border: '#fca5a5', label: 'Kết nối thất bại' },
  }
  const { icon, color, bg, border, label } = map[state]
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12, fontWeight:600,
      padding:'4px 12px', borderRadius:20, background:bg, border:`1px solid ${border}`, color }}>
      {icon} {label}
    </span>
  )
}

export default function Dashboard() {
  const [categories, setCategories] = useState(() => getCategories())
  const [props, setProps]           = useState([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [cat, setCat]               = useState('all')
  const [search, setSearch]         = useState('')
  const [view, setView]             = useState('table')
  const [deleting, setDeleting]     = useState(null)

  const allCats = [{ value: 'all', label: 'Tất cả' }, ...categories]

  const loadProps = useCallback(async () => {
    if (!isConfigured()) { setError('Chưa cấu hình Supabase. Vào /config để thiết lập.'); return }
    setLoading(true); setError(null)
    try {
      const data = await fetchProperties()
      setProps(data || [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    loadProps()
    setCategories(getCategories())
  }, [loadProps])

  async function handleDelete(item) {
    if (!window.confirm(
      `Xoá "${item.title || item.slug}"?\n\n` +
      `⚠️ Hành động này sẽ:\n` +
      `• Xoá record khỏi database\n` +
      `• Xoá ${Array.isArray(item.images) ? item.images.length : 0} ảnh khỏi Storage\n\n` +
      `Không thể hoàn tác.`
    )) return

    setDeleting(item.id)
    try {
      await deleteProperty(item.id, Array.isArray(item.images) ? item.images : [])
      setProps(prev => prev.filter(p => p.id !== item.id))
    } catch (e) {
      alert('Lỗi xoá: ' + e.message)
    } finally {
      setDeleting(null)
    }
  }

  const getCatLabel = (val) => {
    const found = categories.find(c => c.value === val)
    return found ? found.label : (val || '—')
  }

  const filtered = props
    .filter(p => cat === 'all' || p.category === cat)
    .filter(p => {
      if (!search) return true
      const q = search.toLowerCase()
      return (p.slug||'').includes(q) || (p.title||'').includes(q) || (p.location||'').includes(q)
    })

  return (
    <div style={S.page}>
      <div style={S.topBar}>
        <span style={S.title}>📋 Dashboard</span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <ConnectionBadge />
          {/* Analytics link */}
          <a href="/analytics"  style={{ color: 'rgba(245,230,184,0.8)', fontSize: 12, textDecoration: 'underline', fontWeight: 600 }}>📊 Analytics</a>
          <a href="/config"     style={{ color: 'rgba(245,230,184,0.6)', fontSize: 12, textDecoration: 'underline' }}>⚙️ Config</a>
          <a href="/theme-editor" style={{ color: 'rgba(245,230,184,0.5)', fontSize: 12, textDecoration: 'underline' }}>🎨 Theme</a>
        </div>
      </div>

      {/* Category tabs */}
      <div style={S.navBar}>
        {allCats.map(c => (
          <button key={c.value} style={S.navBtn(cat === c.value)} onClick={() => setCat(c.value)}>
            {c.label}
            {c.value !== 'all' && (
              <span style={{ marginLeft: 5, fontSize: 11, opacity: 0.7 }}>
                ({props.filter(p => p.category === c.value).length})
              </span>
            )}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          <button style={S.navBtn(view === 'table')} onClick={() => setView('table')}>☰ Bảng</button>
          <button style={S.navBtn(view === 'cards')} onClick={() => setView('cards')}>⊞ Thẻ</button>
        </div>
      </div>

      <div style={S.body}>
        <div style={S.toolbar}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              style={S.searchInput} placeholder="🔍 Tìm slug, tiêu đề, vị trí..."
              value={search} onChange={e => setSearch(e.target.value)}
              onFocus={e => e.target.style.borderColor = 'var(--green-light)'}
              onBlur={e => e.target.style.borderColor = '#ddd'}
            />
            <button style={S.btnSecondary} onClick={loadProps}>🔄 Tải lại</button>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#aaa' }}>{filtered.length} / {props.length} records</span>
            <button style={S.btnNew} onClick={() => window.location.href = '/admin'}>＋ Thêm mới</button>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px', background: '#fff5f5', border: '1px solid #fca5a5',
            borderRadius: 10, marginBottom: 16, fontSize: 13, color: '#dc2626',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>⚠️ {error}</span>
            {!isConfigured() && (
              <a href="/config" style={{ color: '#2563eb', fontSize: 12, textDecoration: 'underline' }}>Vào Config →</a>
            )}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#aaa', fontSize: 14 }}>
            ⏳ Đang tải dữ liệu từ Supabase...
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div style={S.emptyState}>
            <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📭</div>
            <div style={{ fontSize: 14, marginBottom: 6 }}>
              {props.length === 0 ? 'Chưa có record nào' : 'Không tìm thấy kết quả'}
            </div>
            {props.length === 0 && (
              <button style={{ ...S.btnNew, margin: '10px auto', display: 'inline-flex' }}
                onClick={() => window.location.href = '/admin'}>
                ＋ Tạo record đầu tiên
              </button>
            )}
          </div>
        )}

        {/* ── Table view ── */}
        {!loading && filtered.length > 0 && view === 'table' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  {['Slug', 'Danh mục', 'Tiêu đề', 'Giá', 'Status', 'Owner', 'Ảnh', 'Ngày tạo', 'Thao tác'].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const imgs       = Array.isArray(item.images) ? item.images : []
                  const owner      = item.raw?.owner  || ''
                  const status     = item.raw?.status || ''
                  const isDeleting = deleting === item.id
                  return (
                    <tr key={item.id}
                      style={{ opacity: isDeleting ? 0.4 : 1, transition: 'opacity 0.2s' }}
                      onMouseEnter={e => { if (!isDeleting) e.currentTarget.style.background = '#fafafa' }}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12, color: '#444' }}>{item.slug}</td>
                      <td style={S.td}>
                        <span style={S.badge(item.category, categories)}>
                          {getCatLabel(item.category)}
                        </span>
                      </td>
                      <td style={{ ...S.td, maxWidth: 200 }}>
                        <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title || '—'}
                        </div>
                        {item.data && typeof item.data === 'object' && (
                          <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>
                            {Object.entries(item.data).slice(0, 2).map(([k, v]) => (
                              <span key={k} style={{ marginRight: 8 }}>
                                {k}: <strong style={{ color: '#777' }}>{String(v)}</strong>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ ...S.td, fontWeight: 700, color: 'var(--green-mid)', whiteSpace: 'nowrap' }}>
                        {item.price || '—'}
                      </td>
                      <td style={{ ...S.td, whiteSpace: 'nowrap', fontSize: 12 }}>
                        {status
                          ? <span><span style={S.statusDot(status)} />{status}</span>
                          : <span style={{ color: '#ddd' }}>—</span>
                        }
                      </td>
                      <td style={S.td}>
                        {owner
                          ? <span style={S.ownerTag} title={owner}>👤 {owner}</span>
                          : <span style={{ color: '#ddd', fontSize: 11 }}>—</span>
                        }
                      </td>
                      <td style={{ ...S.td, fontSize: 12, color: imgs.length ? '#16a34a' : '#aaa' }}>
                        {imgs.length ? `📸 ${imgs.length}` : '—'}
                      </td>
                      <td style={{ ...S.td, fontSize: 11, color: '#aaa', whiteSpace: 'nowrap' }}>
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      <td style={S.td}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button style={S.actionBtn('#2563eb')}
                            onClick={() => window.open(`/land/${item.slug}`, '_blank')}>
                            👁
                          </button>
                          <button style={S.actionBtn('#16a34a')}
                            onClick={() => window.location.href = `/admin?slug=${item.slug}`}>
                            ✏️
                          </button>
                          <button style={S.actionBtn('#dc2626')}
                            onClick={() => handleDelete(item)} disabled={isDeleting}>
                            {isDeleting ? '⏳' : '🗑'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Cards view ── */}
        {!loading && filtered.length > 0 && view === 'cards' && (
          <div style={S.cardGrid}>
            {filtered.map(item => {
              const imgs       = Array.isArray(item.images) ? item.images : []
              const owner      = item.raw?.owner  || ''
              const status     = item.raw?.status || ''
              const isDeleting = deleting === item.id
              return (
                <div key={item.id} style={{ ...S.card, opacity: isDeleting ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                  {imgs[0]
                    ? <img src={imgs[0]} alt={item.title} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
                    : <div style={{ height: 100, background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🏕</div>
                  }
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={S.badge(item.category, categories)}>{getCatLabel(item.category)}</span>
                      <span style={{ fontSize: 11, color: '#aaa', fontFamily: 'monospace' }}>{item.slug}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{item.title || '—'}</div>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>{item.location || '—'}</div>

                    {/* Status + Owner */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      {status && (
                        <span style={{ fontSize: 11, color: '#555' }}>
                          <span style={S.statusDot(status)} />{status}
                        </span>
                      )}
                      {owner && (
                        <span style={{ fontSize: 11, color: '#0369a1', fontWeight: 600 }}>
                          👤 {owner}
                        </span>
                      )}
                    </div>

                    {item.data && typeof item.data === 'object' && Object.keys(item.data).length > 0 && (
                      <div style={{
                        fontSize: 11, color: '#888', marginBottom: 8,
                        padding: '6px 8px', background: '#f9fafb',
                        borderRadius: 6, border: '1px solid rgba(0,0,0,0.05)',
                      }}>
                        {Object.entries(item.data).slice(0, 3).map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#aaa' }}>{k}</span>
                            <span style={{ fontWeight: 600, color: '#555' }}>{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--green-mid)', marginBottom: 12 }}>
                      {item.price || '—'}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button style={{ ...S.actionBtn('#2563eb'), flex: 1 }}
                        onClick={() => window.open(`/land/${item.slug}`, '_blank')}>👁 Xem</button>
                      <button style={{ ...S.actionBtn('#16a34a'), flex: 1 }}
                        onClick={() => window.location.href = `/admin?slug=${item.slug}`}>✏️ Sửa</button>
                      <button style={S.actionBtn('#dc2626')}
                        onClick={() => handleDelete(item)} disabled={isDeleting}>
                        {isDeleting ? '⏳' : '🗑'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
