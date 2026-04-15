// src/pages/ConfigPage.jsx
// Auth handled by ProtectedRoute in main.jsx
import React, { useState, useEffect } from 'react'
import {
  getConfig, saveConfig, testConnection, isConfigured,
  getCategories, saveCategories, getDefaultCategories,
} from '../lib/supabase'

const S = {
  page:  { minHeight: '100vh', background: 'var(--cream)', fontFamily: 'var(--font-body)' },
  topBar: {
    background: 'var(--green-deep)', padding: '0 24px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    height: 56, borderBottom: '2px solid var(--gold)',
    position: 'sticky', top: 0, zIndex: 100,
  },
  title:  { fontFamily: 'var(--font-display)', color: 'var(--gold-light)', fontSize: '1.1rem', fontWeight: 700 },
  body:   { maxWidth: 640, margin: '0 auto', padding: '28px 20px 60px' },
  card:   {
    background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)',
    padding: '24px', marginBottom: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 700,
    color: 'var(--green-deep)', marginBottom: 16, paddingBottom: 10,
    borderBottom: '1px solid rgba(0,0,0,0.07)',
  },
  field:  { marginBottom: 14 },
  label:  { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 },
  hint:   { fontSize: 11, color: '#aaa', marginTop: 3 },
  input:  {
    width: '100%', padding: '9px 12px', fontSize: 13,
    border: '1px solid #ddd', borderRadius: 8,
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  },
  textarea: {
    width: '100%', padding: '9px 12px', fontSize: 13,
    border: '1px solid #ddd', borderRadius: 8,
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
    resize: 'vertical', minHeight: 100,
  },
  row: { display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' },
  btnPrimary: {
    flex: 1, padding: '10px 20px', background: 'var(--green-deep)',
    color: 'var(--gold-light)', border: 'none', borderRadius: 8,
    fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', minWidth: 120,
  },
  btnSecondary: {
    padding: '10px 16px', background: 'transparent',
    color: '#666', border: '1px solid #ddd', borderRadius: 8,
    fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
  },
  btnDanger: {
    padding: '5px 10px', background: 'transparent',
    color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6,
    fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
  },
  btnSmall: {
    padding: '6px 14px', background: 'var(--green-deep)',
    color: 'var(--gold-light)', border: 'none', borderRadius: 7,
    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },
}

function focusStyle(e) { e.target.style.borderColor = 'var(--green-light)' }
function blurStyle(e)  { e.target.style.borderColor = '#ddd' }

function StatusBadge({ ok, error }) {
  return (
    <div style={{ marginTop: 14 }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px',
        borderRadius: 20, fontSize: 12, fontWeight: 600,
        background: ok ? '#f0fdf4' : '#fff5f5',
        border: `1px solid ${ok ? '#86efac' : '#fca5a5'}`,
        color: ok ? '#16a34a' : '#dc2626',
      }}>
        {ok ? '🟢 Kết nối Supabase thành công!' : `🔴 Lỗi: ${error}`}
      </span>
    </div>
  )
}

// ── Category manager ──────────────────────────────────────────
function CategoryManager() {
  const [cats, setCats]         = useState(() => getCategories())
  const [newVal, setNewVal]     = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [saved, setSaved]       = useState(false)

  function handleAdd() {
    const val   = newVal.trim().toLowerCase().replace(/\s+/g, '_')
    const label = newLabel.trim()
    if (!val || !label) return
    if (cats.find(c => c.value === val)) { alert(`Category "${val}" đã tồn tại`); return }
    setCats(prev => [...prev, { value: val, label }])
    setNewVal(''); setNewLabel('')
  }

  function handleRemove(val) {
    if (cats.length <= 1) { alert('Phải có ít nhất 1 category'); return }
    setCats(prev => prev.filter(c => c.value !== val))
  }

  function handleSave() {
    saveCategories(cats)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleReset() {
    const defaults = getDefaultCategories()
    setCats(defaults)
    saveCategories(defaults)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        {cats.map(c => (
          <div key={c.value} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', background: '#f9fafb',
            border: '1px solid #e5e7eb', borderRadius: 8,
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, minWidth: 80, color: '#333' }}>{c.label}</span>
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#888', flex: 1 }}>{c.value}</span>
            <button style={S.btnDanger} onClick={() => handleRemove(c.value)}>✕</button>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>Value (lowercase)</div>
          <input style={{ ...S.input, fontSize: 12 }}
            value={newVal} onChange={e => setNewVal(e.target.value)}
            placeholder="vd: watch" onFocus={focusStyle} onBlur={blurStyle}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>Label hiển thị</div>
          <input style={{ ...S.input, fontSize: 12 }}
            value={newLabel} onChange={e => setNewLabel(e.target.value)}
            placeholder="vd: ⌚ Đồng hồ" onFocus={focusStyle} onBlur={blurStyle}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button style={S.btnSmall} onClick={handleAdd}>＋ Thêm</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button style={S.btnPrimary} onClick={handleSave}>
          {saved ? '✅ Đã lưu!' : '💾 Lưu categories'}
        </button>
        <button style={S.btnSecondary} onClick={handleReset}>↺ Reset mặc định</button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────
export default function ConfigPage() {
  const [cfg, setCfg] = useState({
    url: '', key: '', groq: '', userId: 'RongLeo', appId: 'factory_pages',
    GA_MEASUREMENT_ID: '',
  })
  const [aiPrompt, setAiPrompt] = useState('')
  const [testStatus, setTestStatus] = useState(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setCfg(getConfig())
    setAiPrompt(localStorage.getItem('AI_PROMPT') || '')
  }, [])

  function handleChange(e) {
    setCfg(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSave() {
    saveConfig(cfg)
    localStorage.setItem('AI_PROMPT', aiPrompt)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleTest() {
    saveConfig(cfg)
    setTestStatus('testing')
    const result = await testConnection()
    setTestStatus(result)
    setTimeout(() => setTestStatus(null), 7000)
  }

  const inp = (name, type = 'text', placeholder = '') => ({
    style: S.input, name, type, placeholder,
    value: cfg[name] || '',
    onChange: handleChange,
    onFocus: focusStyle,
    onBlur:  blurStyle,
  })

  return (
    <div style={S.page}>
      <div style={S.topBar}>
        <span style={S.title}>⚙️ Cấu hình hệ thống</span>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {isConfigured() && <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 600 }}>✓ Supabase đã cấu hình</span>}
          <a href="/dashboard"    style={{ color: 'rgba(245,230,184,0.65)', fontSize: 12, textDecoration: 'underline' }}>← Dashboard</a>
          <a href="/admin"        style={{ color: 'rgba(245,230,184,0.45)', fontSize: 12, textDecoration: 'underline' }}>Admin</a>
          <a href="/theme-editor" style={{ color: 'rgba(245,230,184,0.45)', fontSize: 12, textDecoration: 'underline' }}>🎨 Theme</a>
        </div>
      </div>

      <div style={S.body}>

        {/* ── Supabase ── */}
        <div style={S.card}>
          <div style={S.sectionTitle}>🗄 Supabase Connection</div>
          <div style={S.field}>
            <label style={S.label}>SUPABASE_URL</label>
            <input {...inp('url', 'text', 'https://xxxxxxxx.supabase.co')} />
            <div style={S.hint}>Settings → API → Project URL trong Supabase dashboard</div>
          </div>
          <div style={S.field}>
            <label style={S.label}>SUPABASE_ANON_KEY</label>
            <input {...inp('key', 'password', 'eyJhbGci...')} />
            <div style={S.hint}>anon / public key — an toàn dùng ở client side</div>
          </div>
          <div style={S.row}>
            <button style={S.btnPrimary} onClick={handleSave}>
              {saved ? '✅ Đã lưu!' : '💾 Lưu config'}
            </button>
            <button style={S.btnSecondary} onClick={handleTest} disabled={testStatus === 'testing'}>
              {testStatus === 'testing' ? '⏳ Đang test...' : '🔌 Test kết nối'}
            </button>
          </div>
          {testStatus && testStatus !== 'testing' && (
            <StatusBadge ok={testStatus.ok} error={testStatus.error} />
          )}
        </div>

        {/* ── Categories ── */}
        <div style={S.card}>
          <div style={S.sectionTitle}>🏷 Quản lý Categories</div>
          <p style={{ fontSize: 12, color: '#666', marginBottom: 14, lineHeight: 1.6 }}>
            Danh sách category dùng trong Admin và Dashboard. Lưu vào localStorage — không cần server.
          </p>
          <CategoryManager />
        </div>

        {/* ── AI + Analytics Config ── */}
        <div style={S.card}>
          <div style={S.sectionTitle}>🤖 AI & Analytics</div>

          <div style={S.field}>
            <label style={S.label}>GROQ_API_KEY (tuỳ chọn)</label>
            <input {...inp('groq', 'password', 'gsk_...')} />
            <div style={S.hint}>Lấy tại console.groq.com — dùng cho chatbot AI</div>
          </div>

          <div style={S.field}>
            <label style={S.label}>GA_MEASUREMENT_ID (tuỳ chọn)</label>
            <input {...inp('GA_MEASUREMENT_ID', 'text', 'G-XXXXXXXXXX')} />
            <div style={S.hint}>
              Google Analytics 4 — lấy tại{' '}
              <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--green-mid)' }}>
                analytics.google.com
              </a>
              {' '}→ Admin → Data Streams → Measurement ID.
              {cfg.GA_MEASUREMENT_ID && (
                <span style={{
                  marginLeft: 8, fontSize: 10, fontWeight: 700,
                  color: '#16a34a', background: '#f0fdf4',
                  padding: '1px 6px', borderRadius: 10,
                }}>
                  ✓ Đã cấu hình
                </span>
              )}
            </div>
          </div>

          <div style={S.field}>
            <label style={S.label}>AI System Prompt</label>
            <textarea
              style={S.textarea} value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder="Bạn là trợ lý tư vấn bất động sản chuyên nghiệp..."
              onFocus={focusStyle} onBlur={blurStyle}
            />
            <div style={S.hint}>Prompt hệ thống cho chatbot — kích hoạt khi có Groq key</div>
          </div>

          <button style={{ ...S.btnPrimary, marginTop: 4 }} onClick={handleSave}>
            {saved ? '✅ Đã lưu!' : '💾 Lưu AI & Analytics'}
          </button>
        </div>

        {/* ── App Info ── */}
        <div style={S.card}>
          <div style={S.sectionTitle}>🏷 App Identity</div>
          <div style={S.field}>
            <label style={S.label}>USER_ID</label>
            <input {...inp('userId', 'text', 'RongLeo')} />
          </div>
          <div style={S.field}>
            <label style={S.label}>APP_ID</label>
            <input {...inp('appId', 'text', 'factory_pages')} />
          </div>
          <button style={{ ...S.btnPrimary, marginTop: 4 }} onClick={handleSave}>
            {saved ? '✅ Đã lưu tất cả!' : '💾 Lưu tất cả'}
          </button>
        </div>

        {/* ── SQL Setup ── */}
        <div style={{ ...S.card, background: '#f8f9fa' }}>
          <div style={S.sectionTitle}>📋 Supabase SQL Setup</div>
          <p style={{ fontSize: 12, color: '#666', marginBottom: 12, lineHeight: 1.7 }}>
            Paste vào <strong>Supabase → SQL Editor</strong> rồi nhấn Run:
          </p>
          <pre style={{
            background: '#1e1e2e', color: '#cdd6f4', fontSize: 11, padding: 16,
            borderRadius: 8, overflowX: 'auto', lineHeight: 1.7,
            whiteSpace: 'pre', userSelect: 'all',
          }}>{`-- 1. Tạo bảng properties
create table if not exists properties (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  category         text default 'land',
  title            text,
  hook_headline    text,
  hook_headline_alt text,
  hook_sub         text,
  summary          text,
  price            text,
  price_per_m2     numeric,
  area             numeric,
  area_front       numeric,
  area_depth       numeric,
  location         text,
  location_detail  text,
  phone            text,
  zalo             text,
  map_embed_url    text,
  images           jsonb default '[]',
  data             jsonb,
  raw              jsonb,
  created_at       timestamptz default now()
);

-- 2. RLS
alter table properties enable row level security;
drop policy if exists "public_read" on properties;
drop policy if exists "auth_write"  on properties;
create policy "public_read" on properties for select using (true);
create policy "auth_write"  on properties for all using (true) with check (true);

-- 3. Storage bucket
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do update set public = true;

drop policy if exists "public_upload"       on storage.objects;
drop policy if exists "public_read_storage" on storage.objects;
drop policy if exists "public_delete"       on storage.objects;

create policy "public_upload" on storage.objects
  for insert with check (bucket_id = 'assets');
create policy "public_read_storage" on storage.objects
  for select using (bucket_id = 'assets');
create policy "public_delete" on storage.objects
  for delete using (bucket_id = 'assets');

-- 4. Bảng events (analytics)
create table if not exists events (
  id         uuid primary key default gen_random_uuid(),
  type       text,
  payload    jsonb,
  created_at timestamptz default now()
);
create index if not exists events_created_at_idx on events (created_at desc);`}
          </pre>
          <div style={{ marginTop: 8, fontSize: 11, color: '#888' }}>
            💡 Click vào code để chọn toàn bộ, rồi copy-paste vào SQL Editor
          </div>
        </div>

        {/* ── Quick links ── */}
        <div style={{ ...S.card, padding: '16px 24px' }}>
          <div style={S.sectionTitle}>🔗 Quick Links</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              ['/dashboard',    '📋 Dashboard'],
              ['/admin',        '🏡 Tạo mới'],
              ['/analytics',    '📊 Analytics'],
              ['/theme-editor', '🎨 Theme Editor'],
            ].map(([href, label]) => (
              <a key={href} href={href} style={{
                padding: '8px 16px', background: '#f0f7f4',
                color: 'var(--green-mid)', border: '1px solid rgba(45,106,79,0.2)',
                borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none',
              }}>{label}</a>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
