// src/utils/exportHtml.js
// ─────────────────────────────────────────────────────────
// Export LandPage → standalone HTML (no React, no libs)
// exportLandAsHtml(land, theme, customImages?)
// downloadLandHtml(land, theme, slug, customImages?)
//
// customImages: string[] of base64 data-URIs
//   → embedded directly in HTML so file works fully offline
// ─────────────────────────────────────────────────────────

export function exportLandAsHtml(land, theme = {}, customImages = null) {
  const t = {
    greenDeep:   '#0d2b1f',
    greenMid:    '#1a4731',
    greenLight:  '#2d6a4f',
    gold:        '#c9a84c',
    goldLight:   '#e8c96d',
    goldPale:    '#f5e6b8',
    cream:       '#fdf8f0',
    white:       '#ffffff',
    textMain:    '#1a1a1a',
    textMuted:   '#5a6a5e',
    radius:      '12px',
    fontDisplay: 'Playfair Display',
    fontBody:    'Be Vietnam Pro',
    ...theme,
  }

  // TASK 3: prefer embedded base64 images; fall back to land.images URLs
  const images = (customImages && customImages.length > 0
    ? customImages
    : (land.images || [])
  ).slice(0, 6)

  const advantages  = land.advantages  || []
  const risks       = land.risks       || []
  const suitableFor = land.suitableFor || []
  const legal   = land.legal   || {}
  const contact = land.contact || {}
  const pc      = land.priceComparison || {}

  /* ── helpers ── */
  const esc = (s = '') => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  // For base64 src values we do NOT escape quotes (they go into src="...")
  // and the value itself never contains &/</>
  const imgTags = images.map((src, i) =>
    `<img class="slide" src="${src}" alt="Ảnh ${i + 1}"
          style="display:${i === 0 ? 'block' : 'none'}"
          onerror="this.style.display='none'">`
  ).join('\n')

  const advantageItems = advantages.map(a =>
    `<li><span class="check">✓</span>${esc(a)}</li>`
  ).join('\n')

  const riskCards = risks.map(r =>
    `<div class="risk-card">
      <span class="risk-icon">${r.icon || '⚠️'}</span>
      <div>
        <div class="risk-label">${esc(r.label)}</div>
        <div class="risk-text">${esc(r.text)}</div>
      </div>
    </div>`
  ).join('\n')

  const suitCards = suitableFor.map(s =>
    `<div class="suit-card">
      <div class="suit-icon">${s.icon || '•'}</div>
      <div class="suit-label">${esc(s.label)}</div>
      <div class="score-bar"><div class="score-fill" style="width:${s.score || 70}%"></div></div>
      <div class="score-num">${s.score || 70}%</div>
    </div>`
  ).join('\n')

  const legalRows = [
    ['📗 Loại sổ',    legal.bookType],
    ['👤 Chủ sở hữu', legal.owner],
    ['🏷️ Loại đất',   legal.landType],
    ['📅 Năm cấp sổ', legal.issueYear],
    ['🔍 Ghi chú',    legal.notes],
  ].filter(([, v]) => v).map(([l, v]) =>
    `<div class="legal-row">
      <span class="legal-label">${l}</span>
      <span class="legal-val">${esc(v)}</span>
    </div>`
  ).join('\n')

  const isCheaper = pc.thisLot && pc.areaAvgMin && pc.thisLot < pc.areaAvgMin

  /* ── Full HTML ── */
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(land.title)} — Land Dossier</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(t.fontDisplay)}:wght@400;600;700&family=${encodeURIComponent(t.fontBody)}:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
:root {
  --green-deep:  ${t.greenDeep};
  --green-mid:   ${t.greenMid};
  --green-light: ${t.greenLight};
  --gold:        ${t.gold};
  --gold-light:  ${t.goldLight};
  --gold-pale:   ${t.goldPale};
  --cream:       ${t.cream};
  --white:       ${t.white};
  --text-main:   ${t.textMain};
  --text-muted:  ${t.textMuted};
  --radius:      ${t.radius};
  --border:      rgba(201,168,76,0.25);
  --font-display: '${t.fontDisplay}', Georgia, serif;
  --font-body:    '${t.fontBody}', sans-serif;
}
*,*::before,*::after { box-sizing:border-box; margin:0; padding:0 }
html { scroll-behavior:smooth; font-size:16px }
body { font-family:var(--font-body); background:var(--cream); color:var(--text-main); line-height:1.6; -webkit-font-smoothing:antialiased }
img  { max-width:100%; display:block }
a    { color:inherit; text-decoration:none }

.page { max-width:1100px; margin:0 auto; padding:0 0 40px }

/* Hero */
.hero {
  background: linear-gradient(140deg, var(--green-deep) 0%, var(--green-mid) 55%, #235c3e 100%);
  padding: 32px 24px 28px; position:relative; overflow:hidden;
}
.hero::after {
  content:''; position:absolute; top:0; left:0; right:0; height:3px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
}
.hero-tag {
  display:inline-flex; align-items:center; gap:7px;
  background:rgba(201,168,76,.15); border:1px solid rgba(201,168,76,.4);
  color:var(--gold-light); font-size:.72rem; font-weight:600;
  padding:4px 12px; border-radius:20px; letter-spacing:.08em;
  margin-bottom:14px; text-transform:uppercase;
}
.hero-tag-dot { width:6px; height:6px; background:var(--gold); border-radius:50%; display:inline-block }
.hero-headline {
  font-family:var(--font-display);
  font-size:clamp(1.3rem, 4vw, 1.9rem);
  font-weight:700; color:#fff; line-height:1.28; margin-bottom:10px;
}
.hero-sub { color:var(--gold-pale); font-size:.95rem; margin-bottom:18px; opacity:.9 }

/* Trust */
.trust-block {
  display:flex; flex-wrap:wrap; gap:6px 16px;
  background:rgba(255,255,255,.07); border:1px solid rgba(201,168,76,.22);
  border-radius:10px; padding:11px 14px; margin-bottom:20px;
}
.trust-item { display:flex; align-items:center; gap:7px; font-size:.83rem; color:rgba(253,248,240,.92); font-weight:500 }
.trust-check {
  display:inline-flex; align-items:center; justify-content:center;
  width:18px; height:18px; background:var(--gold); color:var(--green-deep);
  border-radius:50%; font-size:.6rem; font-weight:900; flex-shrink:0;
}

/* CTA */
.cta-row { display:flex; flex-wrap:wrap; gap:8px }
.btn {
  display:inline-flex; align-items:center; gap:5px;
  padding:10px 18px; border-radius:9px;
  font-family:var(--font-body); font-weight:600; font-size:.83rem;
  cursor:pointer; border:none; text-decoration:none; white-space:nowrap;
  transition:opacity .15s;
}
.btn:hover { opacity:.88 }
.btn-call  { background:var(--gold); color:var(--green-deep) }
.btn-zalo  { background:#0068ff; color:#fff }
.btn-docs  { background:rgba(255,255,255,.13); color:#fff; border:1px solid rgba(255,255,255,.25) }
.btn-legal { background:rgba(201,168,76,.12); color:var(--gold-light); border:1px solid rgba(201,168,76,.35) }

/* Grid */
.main { padding:20px 16px }
.grid { display:flex; flex-direction:column; gap:20px }
@media(min-width:880px) {
  .grid { flex-direction:row; align-items:flex-start; gap:28px }
  .col-left  { flex:1.05; position:sticky; top:20px }
  .col-right { flex:1 }
}

/* Gallery */
.gallery { border-radius:var(--radius); overflow:hidden; background:var(--green-deep); aspect-ratio:16/10; position:relative }
.gallery .slide { width:100%; height:100%; object-fit:cover }
.gallery-nav {
  position:absolute; top:50%; transform:translateY(-50%);
  background:rgba(13,43,31,.6); color:var(--gold-light);
  border:none; width:36px; height:36px; border-radius:50%;
  font-size:1.1rem; cursor:pointer; display:flex; align-items:center; justify-content:center;
}
.gallery-nav.prev { left:10px }
.gallery-nav.next { right:10px }
.gallery-counter {
  position:absolute; bottom:10px; right:12px;
  background:rgba(13,43,31,.75); color:var(--gold-light);
  font-size:.72rem; padding:3px 10px; border-radius:20px;
}

/* Stats */
.stats {
  display:flex; align-items:center; flex-wrap:wrap;
  background:var(--green-deep); border-radius:var(--radius);
  padding:14px 16px; gap:6px; margin-top:12px;
}
.stat-item  { flex:1; min-width:72px; text-align:center; padding:4px 0 }
.stat-label { display:block; font-size:.68rem; color:rgba(245,230,184,.55); margin-bottom:3px; text-transform:uppercase; letter-spacing:.04em }
.stat-val   { display:block; font-weight:700; font-size:.92rem; color:var(--gold-light) }
.stat-price { color:var(--gold); font-size:1rem }
.stat-divider { width:1px; height:32px; background:rgba(201,168,76,.18); flex-shrink:0 }

/* Summary */
.summary { background:var(--white); border-radius:var(--radius); border:1px solid var(--border); padding:18px 20px; margin-top:12px }
.summary-title { font-family:var(--font-display); font-size:.98rem; font-weight:600; color:var(--green-deep); margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid var(--border) }
.summary p { font-size:.87rem; color:var(--text-main); line-height:1.72 }

/* Section */
.section { background:var(--white); border-radius:var(--radius); border:1px solid var(--border); padding:20px; margin-bottom:16px }
.section-title { font-family:var(--font-display); font-size:1.05rem; font-weight:600; color:var(--green-deep); margin-bottom:16px; padding-bottom:10px; border-bottom:1px solid var(--border) }

/* Price comparison */
.price-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px }
.price-card    { background:var(--cream); border-radius:10px; padding:16px 12px; text-align:center; border:1px solid var(--border) }
.price-card-hl { background:var(--green-deep); border:2px solid var(--gold) }
.pc-label    { font-size:.76rem; color:var(--text-muted); margin-bottom:6px; text-transform:uppercase; letter-spacing:.06em }
.pc-label-hl { font-size:.76rem; color:rgba(245,230,184,.7); margin-bottom:6px }
.pc-val      { font-weight:700; font-size:1.05rem; color:var(--green-mid) }
.pc-val-big  { font-family:var(--font-display); font-weight:700; font-size:1.45rem; color:var(--gold-light) }
.badge       { display:inline-block; margin-top:10px; background:var(--gold); color:var(--green-deep); font-size:.7rem; font-weight:700; padding:4px 10px; border-radius:20px }

/* Legal */
.legal-row   { display:flex; gap:12px; align-items:flex-start; padding:8px 0; border-bottom:1px solid rgba(201,168,76,.1) }
.legal-row:last-child { border-bottom:none }
.legal-label { min-width:138px; font-size:.8rem; color:var(--text-muted); flex-shrink:0 }
.legal-val   { font-size:.87rem; color:var(--text-main); font-weight:500; line-height:1.4 }

/* Risks */
.risk-intro { font-size:.82rem; color:var(--text-muted); margin-bottom:14px; font-style:italic }
.risk-card  { display:flex; gap:14px; align-items:flex-start; background:#f0f7f4; border-left:3px solid var(--green-light); border-radius:0 8px 8px 0; padding:12px 14px; margin-bottom:10px }
.risk-icon  { font-size:1.35rem; flex-shrink:0 }
.risk-label { font-weight:600; font-size:.88rem; color:var(--green-mid); margin-bottom:4px }
.risk-text  { font-size:.82rem; color:var(--text-main); line-height:1.55 }

/* Advantages */
.adv-list { list-style:none; display:flex; flex-direction:column; gap:10px }
.adv-list li { display:flex; gap:10px; align-items:flex-start; font-size:.88rem; line-height:1.5 }
.check { width:20px; height:20px; flex-shrink:0; background:var(--green-light); color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:.65rem; font-weight:700; margin-top:2px }

/* Suitable */
.suit-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px }
.suit-card  { background:var(--cream); border-radius:10px; padding:14px 8px; text-align:center; border:1px solid var(--border) }
.suit-icon  { font-size:1.5rem; margin-bottom:6px }
.suit-label { font-size:.75rem; font-weight:600; color:var(--green-mid); margin-bottom:8px; line-height:1.3 }
.score-bar  { height:6px; background:#dde9e4; border-radius:3px; overflow:hidden; margin-bottom:4px }
.score-fill { height:100%; background:linear-gradient(90deg, var(--green-light), var(--gold)); border-radius:3px }
.score-num  { font-size:.72rem; color:var(--text-muted); font-weight:600 }

/* Map */
.map-wrap    { border-radius:var(--radius); overflow:hidden; border:1px solid var(--border); margin-top:12px }
.map-header  { background:var(--green-deep); padding:14px 18px; display:flex; gap:12px; align-items:flex-start }
.map-title   { font-family:var(--font-display); font-size:1rem; font-weight:600; color:var(--gold-light) }
.map-sub     { font-size:.82rem; color:rgba(253,248,240,.75); margin-top:2px }
.map-frame   { width:100%; height:300px; border:none }
.map-dir-btn { display:block; text-align:center; padding:12px; background:var(--green-light); color:#fff; font-weight:600; font-size:.9rem }
.map-dir-btn:hover { background:var(--green-mid) }

/* Contact bar */
.contact-bar { background:var(--white); border-top:1px solid var(--border); padding:14px 16px; display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:12px; border-radius:var(--radius); border:1px solid var(--border) }
@media(min-width:600px) { .contact-bar { grid-template-columns:repeat(4,1fr) } }

/* Footer */
.footer       { background:var(--green-deep); color:rgba(245,230,184,.55); text-align:center; padding:24px 16px; margin-top:32px }
.footer-brand { font-family:var(--font-display); font-size:1.1rem; color:var(--gold); margin-bottom:4px }
.footer-sub   { font-size:.82rem; color:rgba(245,230,184,.65); margin-bottom:6px }
.footer-dis   { font-size:.72rem; opacity:.45 }

::-webkit-scrollbar { width:6px }
::-webkit-scrollbar-thumb { background:var(--green-light); border-radius:3px }
</style>
</head>
<body>
<div class="page">

  <header class="hero">
    <div class="hero-tag"><span class="hero-tag-dot"></span>Hồ Sơ Đất Chính Thức</div>
    <h1 class="hero-headline">${esc(land.hookHeadline)}</h1>
    <p class="hero-sub">${esc(land.hookSub)}</p>
    <div class="trust-block">
      <div class="trust-item"><span class="trust-check">✔</span>Đã kiểm tra pháp lý</div>
      <div class="trust-item"><span class="trust-check">✔</span>Có thể xem sổ trực tiếp</div>
      <div class="trust-item"><span class="trust-check">✔</span>Thông tin minh bạch</div>
    </div>
    <div class="cta-row">
      <a href="tel:${esc(contact.phone)}" class="btn btn-call">📞 Gọi ngay</a>
      <a href="${esc(contact.zalo)}" target="_blank" rel="noopener" class="btn btn-zalo">💬 Zalo</a>
      <a href="tel:${esc(contact.phone)}" class="btn btn-docs">📄 Liên hệ xem sổ</a>
      <a href="${esc(contact.zalo)}" target="_blank" rel="noopener" class="btn btn-legal">⚡ Hỏi pháp lý 30s</a>
    </div>
  </header>

  <main class="main">
    <div class="grid">

      <div class="col-left">
        <div class="gallery" id="gallery">
          ${imgTags}
          ${images.length > 1 ? `
          <button class="gallery-nav prev" onclick="prevSlide()">‹</button>
          <button class="gallery-nav next" onclick="nextSlide()">›</button>
          <div class="gallery-counter" id="counter">1 / ${images.length}</div>` : ''}
        </div>

        <div class="stats">
          <div class="stat-item">
            <span class="stat-label">Diện tích</span>
            <span class="stat-val">${esc(String(land.area))} m²</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-label">Giá bán</span>
            <span class="stat-val stat-price">${esc(land.price)}</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-label">Đơn giá</span>
            <span class="stat-val">${esc(String(land.pricePerM2))} tr/m²</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-label">Kích thước</span>
            <span class="stat-val">${esc(String(land.areaFront))}×${esc(String(land.areaDepth))}m</span>
          </div>
        </div>

        <div class="summary">
          <h2 class="summary-title">📝 Mô tả tổng quan</h2>
          <p>${esc(land.summary)}</p>
        </div>

        <div class="map-wrap">
          <div class="map-header">
            <span style="font-size:1.5rem">📍</span>
            <div>
              <div class="map-title">Vị trí lô đất</div>
              <div class="map-sub">${esc(land.locationDetail || land.location)}</div>
            </div>
          </div>
          <iframe class="map-frame" src="${esc(land.mapEmbedUrl)}"
            allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"
            title="Vị trí lô đất"></iframe>
          <a class="map-dir-btn"
            href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(land.locationDetail || land.location)}"
            target="_blank" rel="noopener">🗺️ Chỉ đường đến đây</a>
        </div>
      </div>

      <div class="col-right">
        <div class="section">
          <h2 class="section-title">📊 So sánh giá khu vực</h2>
          <div class="price-grid">
            <div class="price-card">
              <div class="pc-label">Giá khu vực</div>
              <div class="pc-val">${pc.areaAvgMin || '?'}–${pc.areaAvgMax || '?'} tr/m²</div>
            </div>
            <div class="price-card price-card-hl">
              <div class="pc-label-hl">Lô này</div>
              <div class="pc-val-big">${pc.thisLot || land.pricePerM2} tr/m²</div>
              ${isCheaper ? `<span class="badge">🔥 ${esc(pc.note)}</span>` : ''}
            </div>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">📜 Thông tin pháp lý</h2>
          ${legalRows}
        </div>

        <div class="section">
          <h2 class="section-title">🔎 Lưu ý pháp lý</h2>
          <p class="risk-intro">Các thông tin đã được kiểm tra thực tế — trình bày để khách hàng nắm rõ trước khi quyết định.</p>
          ${riskCards}
        </div>

        <div class="section">
          <h2 class="section-title">✅ Ưu điểm nổi bật</h2>
          <ul class="adv-list">${advantageItems}</ul>
        </div>

        <div class="section">
          <h2 class="section-title">🎯 Phù hợp với ai?</h2>
          <div class="suit-grid">${suitCards}</div>
        </div>

        <div class="contact-bar">
          <a href="tel:${esc(contact.phone)}" class="btn btn-call">📞 Gọi ngay</a>
          <a href="${esc(contact.zalo)}" target="_blank" rel="noopener" class="btn btn-zalo">💬 Zalo</a>
          <a href="tel:${esc(contact.phone)}" class="btn btn-docs">📄 Xem sổ ngay</a>
          <a href="${esc(contact.zalo)}" target="_blank" rel="noopener" class="btn btn-legal">⚡ Hỏi pháp lý 30s</a>
        </div>
      </div>

    </div>
  </main>

  <footer class="footer">
    <p class="footer-brand">🏡 Land Dossier</p>
    <p class="footer-sub">Hồ sơ đất chuyên nghiệp — minh bạch — đáng tin cậy</p>
    <p class="footer-dis">Thông tin mang tính tham khảo. Vui lòng kiểm tra trực tiếp trước khi giao dịch.</p>
  </footer>

</div>

<script>
var slides = document.querySelectorAll('#gallery .slide')
var current = 0

function showSlide(n) {
  if (!slides.length) return
  slides[current].style.display = 'none'
  current = (n + slides.length) % slides.length
  slides[current].style.display = 'block'
  var counter = document.getElementById('counter')
  if (counter) counter.textContent = (current + 1) + ' / ' + slides.length
}
function prevSlide() { showSlide(current - 1) }
function nextSlide() { showSlide(current + 1) }

document.addEventListener('keydown', function(e) {
  if (e.key === 'ArrowLeft')  prevSlide()
  if (e.key === 'ArrowRight') nextSlide()
})

if (slides.length > 1) {
  setInterval(function() { showSlide(current + 1) }, 5000)
}
</script>
</body>
</html>`
}

// ─────────────────────────────────────────
// Download helper — triggers file save
// ─────────────────────────────────────────
export function downloadLandHtml(land, theme, slug, customImages = null) {
  const html = exportLandAsHtml(land, theme, customImages)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `land-${slug || land.slug || 'dossier'}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // TASK 4: revoke object URL to prevent memory leak
  URL.revokeObjectURL(url)
}
