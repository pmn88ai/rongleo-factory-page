import { useState, useCallback } from "react";

// ── Default theme — khớp với index.css của Land Dossier ──
const DEFAULT_THEME = {
  greenDeep:   "#0d2b1f",
  greenMid:    "#1a4731",
  greenLight:  "#2d6a4f",
  gold:        "#c9a84c",
  goldLight:   "#e8c96d",
  goldPale:    "#f5e6b8",
  cream:       "#fdf8f0",
  white:       "#ffffff",
  textMain:    "#1a1a1a",
  textMuted:   "#5a6a5e",
  fontDisplay: "Playfair Display",
  fontBody:    "Be Vietnam Pro",
  baseFontSize: 16,
  radius:      12,
  maxWidth:    1160,
  heropadding: 28,
  mainPadding: 20,
  heroGradientAngle: 140,
  heroGradientMid:   55,
  trustBlockBg:      "rgba(255,255,255,0.07)",
  sectionGap: 24,
  cardPadding: 20,
};

const FONT_DISPLAY_OPTIONS = [
  "Playfair Display", "Cormorant Garamond", "DM Serif Display",
  "Libre Baskerville", "Lora", "EB Garamond",
];
const FONT_BODY_OPTIONS = [
  "Be Vietnam Pro", "Nunito", "Mulish", "Outfit",
  "Karla", "Jost", "Plus Jakarta Sans",
];

const PRESETS = {
  "🌿 Dark Green / Gold (Mặc định)": { ...DEFAULT_THEME },
  "🖤 Luxury Black / Gold": {
    ...DEFAULT_THEME,
    greenDeep: "#0a0a0a", greenMid: "#1c1c1c", greenLight: "#2e2e2e",
    gold: "#d4af6a", goldLight: "#e8c97a", goldPale: "#f5e6c0",
    cream: "#f8f6f1", textMuted: "#6b6b6b",
  },
  "🏔️ Navy / Silver": {
    ...DEFAULT_THEME,
    greenDeep: "#0f1c2e", greenMid: "#1a3050", greenLight: "#2e4f7a",
    gold: "#a0aec0", goldLight: "#c8d6e5", goldPale: "#e8eef5",
    cream: "#f0f4f8", textMuted: "#5a7080",
  },
  "🌸 Warm Terracotta": {
    ...DEFAULT_THEME,
    greenDeep: "#2d1a0e", greenMid: "#5c3317", greenLight: "#8b4513",
    gold: "#e07b39", goldLight: "#f0a060", goldPale: "#fde8d0",
    cream: "#fdf6f0", textMuted: "#7a5040",
  },
  "🌊 Ocean Blue": {
    ...DEFAULT_THEME,
    greenDeep: "#0c1f3d", greenMid: "#143460", greenLight: "#1a5276",
    gold: "#2eabd4", goldLight: "#5bc8e8", goldPale: "#d0f0fa",
    cream: "#f0f8fb", textMuted: "#4a7090",
  },
};

function ColorSwatch({ label, themeKey, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <input
        type="color" value={value}
        onChange={e => onChange(themeKey, e.target.value)}
        style={{ width: 34, height: 34, border: "2px solid #e0e0e0", borderRadius: 6, cursor: "pointer", padding: 2, background: "none" }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: "#888", marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: 12, fontFamily: "monospace", color: "#555" }}>{value}</div>
      </div>
    </div>
  );
}

function Slider({ label, themeKey, value, min, max, unit, onChange }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "#555" }}>{label}</span>
        <span style={{ fontSize: 12, fontFamily: "monospace", color: "#333", fontWeight: 600 }}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(themeKey, Number(e.target.value))}
        style={{ width: "100%", accentColor: "#1a4731" }}
      />
    </div>
  );
}

function Select({ label, themeKey, value, options, onChange }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>{label}</div>
      <select value={value} onChange={e => onChange(themeKey, e.target.value)}
        style={{ width: "100%", padding: "6px 8px", fontSize: 13, border: "1.5px solid #ddd", borderRadius: 6, background: "#fff", color: "#333", cursor: "pointer" }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function generateCSS(t) {
  return `:root {
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
  --border:      rgba(${hexToRgb(t.gold)}, 0.25);
  --shadow:      0 4px 32px rgba(${hexToRgb(t.greenDeep)}, 0.18);
  --radius:      ${t.radius}px;
  --font-display: '${t.fontDisplay}', Georgia, serif;
  --font-body:    '${t.fontBody}', sans-serif;
}

html { font-size: ${t.baseFontSize}px; scroll-behavior: smooth; }

body {
  font-family: var(--font-body);
  background: var(--cream);
  color: var(--text-main);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}`;
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function Preview({ theme: t }) {
  const s = {
    wrap: { fontFamily: `'${t.fontBody}', sans-serif`, background: t.cream, borderRadius: 12, overflow: "hidden", border: "1px solid #ddd", fontSize: `${t.baseFontSize * 0.75}px` },
    hero: { background: `linear-gradient(${t.heroGradientAngle}deg, ${t.greenDeep} 0%, ${t.greenMid} ${t.heroGradientMid}%, ${t.greenLight} 100%)`, padding: `${t.heropadding * 0.55}px ${t.heropadding * 0.5}px`, position: "relative" },
    tag: { display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.1)", border: `1px solid ${t.gold}44`, color: t.goldLight, fontSize: "0.68em", fontWeight: 600, padding: "2px 8px", borderRadius: 20, marginBottom: 8, letterSpacing: "0.06em" },
    headline: { fontFamily: `'${t.fontDisplay}', serif`, fontSize: "1.05em", fontWeight: 700, color: t.white, lineHeight: 1.3, marginBottom: 6 },
    sub: { color: t.goldPale, fontSize: "0.8em", marginBottom: 10, opacity: 0.9 },
    trust: { display: "flex", gap: 8, flexWrap: "wrap", background: t.trustBlockBg, border: `1px solid ${t.gold}33`, borderRadius: 7, padding: "6px 8px", marginBottom: 10 },
    trustItem: { display: "flex", alignItems: "center", gap: 4, color: "rgba(255,255,255,0.88)", fontSize: "0.72em" },
    trustCheck: { width: 13, height: 13, background: t.gold, color: t.greenDeep, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.5em", fontWeight: 900 },
    ctaRow: { display: "flex", gap: 5, flexWrap: "wrap" },
    ctaCall: { background: t.gold, color: t.greenDeep, padding: "4px 10px", borderRadius: 6, fontSize: "0.72em", fontWeight: 700, border: "none" },
    ctaZalo: { background: "#0068ff", color: "#fff", padding: "4px 10px", borderRadius: 6, fontSize: "0.72em", fontWeight: 700, border: "none" },
    ctaDocs: { background: "rgba(255,255,255,0.12)", color: "#fff", padding: "4px 10px", borderRadius: 6, fontSize: "0.72em", fontWeight: 700, border: "1px solid rgba(255,255,255,0.25)" },
    body: { display: "flex", gap: 8, padding: `${t.mainPadding * 0.4}px` },
    stats: { background: t.greenDeep, borderRadius: t.radius * 0.6, padding: "8px 10px", display: "flex", gap: 6, marginBottom: 7 },
    statItem: { flex: 1, textAlign: "center" },
    statLabel: { fontSize: "0.55em", color: `${t.goldPale}88`, display: "block", marginBottom: 1 },
    statVal: { fontSize: "0.7em", fontWeight: 700, color: t.goldLight },
    card: { background: t.white, border: `1px solid ${t.gold}33`, borderRadius: t.radius * 0.6, padding: "8px 10px", marginBottom: 7 },
    cardTitle: { fontFamily: `'${t.fontDisplay}', serif`, fontSize: "0.72em", fontWeight: 600, color: t.greenDeep, marginBottom: 5, paddingBottom: 4, borderBottom: `1px solid ${t.gold}22` },
    priceGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 },
    priceCardBase: { background: t.cream, border: `1px solid ${t.gold}30`, borderRadius: 7, padding: "8px 6px", textAlign: "center" },
    priceCardHL: { background: t.greenDeep, border: `2px solid ${t.gold}`, borderRadius: 7, padding: "8px 6px", textAlign: "center" },
    pcLabel: { fontSize: "0.6em", color: t.textMuted, marginBottom: 3 },
    pcLabelHL: { fontSize: "0.6em", color: `${t.goldPale}99`, marginBottom: 3 },
    pcVal: { fontSize: "0.72em", fontWeight: 700, color: t.greenMid },
    pcValBig: { fontFamily: `'${t.fontDisplay}', serif`, fontSize: "0.9em", fontWeight: 700, color: t.goldLight },
    badge: { display: "inline-block", marginTop: 4, background: t.gold, color: t.greenDeep, fontSize: "0.55em", fontWeight: 700, padding: "2px 7px", borderRadius: 10 },
    riskCard: { background: "#f0f7f4", borderLeft: `3px solid ${t.greenLight}`, borderRadius: "0 6px 6px 0", padding: "5px 8px", marginBottom: 5, display: "flex", gap: 6 },
    riskLabel: { fontSize: "0.65em", fontWeight: 600, color: t.greenMid, marginBottom: 2 },
    riskText: { fontSize: "0.6em", color: t.textMain, lineHeight: 1.4 },
    stickyBar: { background: t.white, borderTop: `1px solid ${t.gold}33`, padding: "6px 8px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 },
    footer: { background: t.greenDeep, padding: "10px", textAlign: "center" },
    footerBrand: { fontFamily: `'${t.fontDisplay}', serif`, fontSize: "0.75em", color: t.gold, marginBottom: 2 },
    footerSub: { fontSize: "0.6em", color: `${t.goldPale}66` },
  };

  return (
    <div style={s.wrap}>
      <div style={s.hero}>
        <div style={s.tag}><span style={{ width:5,height:5,background:t.gold,borderRadius:"50%",display:"inline-block"}} />Hồ Sơ Đất Chính Thức</div>
        <div style={s.headline}>Đất 120m² gần chợ Cao Lãnh — sổ riêng, đường ô tô</div>
        <div style={s.sub}>Phù hợp ở hoặc đầu tư — pháp lý rõ ràng</div>
        <div style={s.trust}>
          {["Đã kiểm tra pháp lý","Xem sổ trực tiếp","Thông tin minh bạch"].map(txt => (
            <div key={txt} style={s.trustItem}><div style={s.trustCheck}>✓</div> {txt}</div>
          ))}
        </div>
        <div style={s.ctaRow}>
          <button style={s.ctaCall}>📞 Gọi ngay</button>
          <button style={s.ctaZalo}>💬 Zalo</button>
          <button style={s.ctaDocs}>📄 Xem sổ</button>
        </div>
      </div>
      <div style={s.body}>
        <div style={{ flex: 1 }}>
          <div style={{ background: t.greenMid, borderRadius: t.radius*0.6, aspectRatio:"16/9", marginBottom:7, display:"flex",alignItems:"center",justifyContent:"center",color:t.goldPale, fontSize:"0.7em" }}>
            🖼️ Gallery
          </div>
          <div style={s.stats}>
            {[["Diện tích","120 m²"],["Giá bán","1.26 tỷ"],["Đơn giá","10.5tr/m²"]].map(([l,v]) => (
              <div key={l} style={s.statItem}><span style={s.statLabel}>{l}</span><span style={s.statVal}>{v}</span></div>
            ))}
          </div>
          <div style={{ background:`linear-gradient(135deg,${t.greenDeep},${t.greenMid})`, borderRadius:t.radius*0.6, height:60, display:"flex",alignItems:"center",justifyContent:"center",color:t.goldPale,fontSize:"0.7em" }}>
            📍 Google Maps
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={s.card}>
            <div style={s.cardTitle}>📊 So sánh giá khu vực</div>
            <div style={s.priceGrid}>
              <div style={s.priceCardBase}><div style={s.pcLabel}>Giá khu vực</div><div style={s.pcVal}>12–14 tr/m²</div></div>
              <div style={s.priceCardHL}><div style={s.pcLabelHL}>Lô này</div><div style={s.pcValBig}>10.5 tr/m²</div><span style={s.badge}>🔥 Thấp hơn 15–25%</span></div>
            </div>
          </div>
          <div style={s.card}>
            <div style={s.cardTitle}>🔎 Lưu ý pháp lý</div>
            {[["📋","Quy hoạch","Đã kiểm tra, chưa ảnh hưởng"],["🔌","Hạ tầng","Dự kiến mở rộng 2026–2028"]].map(([ic,lb,tx]) => (
              <div key={lb} style={s.riskCard}><span style={{fontSize:"0.9em"}}>{ic}</span><div><div style={s.riskLabel}>{lb}</div><div style={s.riskText}>{tx}</div></div></div>
            ))}
          </div>
        </div>
      </div>
      <div style={s.stickyBar}>
        {[["📞 Gọi ngay",{background:t.greenDeep,color:t.goldLight}],["💬 Zalo",{background:"#0068ff",color:"#fff"}],["📄 Xem sổ ngay",{background:t.gold,color:t.greenDeep}],["⚡ Hỏi pháp lý",{background:"transparent",color:t.greenMid,border:`1.5px solid ${t.greenLight}`}]].map(([label,btnStyle]) => (
          <button key={label} style={{...btnStyle,padding:"6px 4px",borderRadius:7,fontSize:"0.65em",fontWeight:700,fontFamily:"inherit",cursor:"pointer",border:btnStyle.border||"none"}}>{label}</button>
        ))}
      </div>
      <div style={s.footer}>
        <div style={s.footerBrand}>🏡 Land Dossier</div>
        <div style={s.footerSub}>Hồ sơ đất chuyên nghiệp — minh bạch</div>
      </div>
    </div>
  );
}

export default function LandDossierThemeEditor() {
  const [theme, setTheme]           = useState({ ...DEFAULT_THEME });
  const [activeTab, setActiveTab]   = useState("colors");
  const [copied, setCopied]         = useState(false);
  const [activePreset, setActivePreset] = useState("🌿 Dark Green / Gold (Mặc định)");

  const update = useCallback((key, val) => {
    setTheme(prev => ({ ...prev, [key]: val }));
    setActivePreset("(Tuỳ chỉnh)");
  }, []);

  function applyPreset(name) { setTheme({ ...PRESETS[name] }); setActivePreset(name); }

  function copyCSS() {
    navigator.clipboard.writeText(generateCSS(theme));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function resetDefault() { setTheme({ ...DEFAULT_THEME }); setActivePreset("🌿 Dark Green / Gold (Mặc định)"); }

  const panelStyle = {
    background: "#fff", borderRight: "1px solid #eee",
    width: 280, flexShrink: 0,
    display: "flex", flexDirection: "column", overflow: "hidden",
  };

  const tabStyle = (active) => ({
    flex: 1, padding: "9px 4px",
    background: active ? "#1a4731" : "transparent",
    color: active ? "#e8c96d" : "#555",
    border: "none", cursor: "pointer",
    fontSize: 12, fontWeight: active ? 700 : 400,
    borderBottom: active ? "2px solid #c9a84c" : "2px solid transparent",
    transition: "all 0.15s",
  });

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Be Vietnam Pro', 'Segoe UI', sans-serif", background: "#f5f5f5", overflow: "hidden" }}>

      {/* ── LEFT PANEL ── */}
      <div style={panelStyle}>
        {/* Header */}
        <div style={{ background: "#0d2b1f", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ color: "#e8c96d", fontWeight: 700, fontSize: 14, marginBottom: 2 }}>🎨 Land Dossier</div>
            <div style={{ color: "rgba(245,230,184,0.6)", fontSize: 11 }}>Visual Theme Editor</div>
          </div>
          <a href="/dashboard" style={{ color: "rgba(245,230,184,0.55)", fontSize: 11, textDecoration: "underline", marginTop: 2, whiteSpace: "nowrap" }}>← Dashboard</a>
        </div>

        {/* Presets */}
        <div style={{ padding: "10px 12px", borderBottom: "1px solid #eee", background: "#fafafa" }}>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Bộ màu có sẵn</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {Object.keys(PRESETS).map(name => (
              <button key={name} onClick={() => applyPreset(name)} style={{
                textAlign: "left", padding: "6px 10px",
                background: activePreset === name ? "#e8f4ee" : "transparent",
                border: activePreset === name ? "1.5px solid #2d6a4f" : "1.5px solid #e0e0e0",
                borderRadius: 7, fontSize: 12, cursor: "pointer",
                color: activePreset === name ? "#1a4731" : "#444",
                fontWeight: activePreset === name ? 600 : 400,
                transition: "all 0.15s",
              }}>{name}</button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #eee" }}>
          {[["colors","🎨 Màu sắc"],["layout","📐 Bố cục"],["fonts","✍️ Font"]].map(([id, label]) => (
            <button key={id} style={tabStyle(activeTab === id)} onClick={() => setActiveTab(id)}>{label}</button>
          ))}
        </div>

        {/* Controls */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 20px" }}>
          {activeTab === "colors" && (
            <div>
              <div style={{ fontSize: 11, color: "#888", fontWeight: 700, marginBottom: 8, textTransform:"uppercase", letterSpacing:"0.06em" }}>🌿 Màu nền / chủ đạo</div>
              <ColorSwatch label="Xanh đậm (Hero, Header)" themeKey="greenDeep" value={theme.greenDeep} onChange={update} />
              <ColorSwatch label="Xanh vừa (Mid sections)" themeKey="greenMid" value={theme.greenMid} onChange={update} />
              <ColorSwatch label="Xanh nhạt (Accents)" themeKey="greenLight" value={theme.greenLight} onChange={update} />
              <div style={{ fontSize: 11, color: "#888", fontWeight: 700, margin: "14px 0 8px", textTransform:"uppercase", letterSpacing:"0.06em" }}>✨ Vàng / Accent</div>
              <ColorSwatch label="Vàng chính (Badges, CTA)" themeKey="gold" value={theme.gold} onChange={update} />
              <ColorSwatch label="Vàng sáng (Text on dark)" themeKey="goldLight" value={theme.goldLight} onChange={update} />
              <ColorSwatch label="Vàng nhạt (Backgrounds)" themeKey="goldPale" value={theme.goldPale} onChange={update} />
              <div style={{ fontSize: 11, color: "#888", fontWeight: 700, margin: "14px 0 8px", textTransform:"uppercase", letterSpacing:"0.06em" }}>📄 Nền & Text</div>
              <ColorSwatch label="Nền tổng (Cream)" themeKey="cream" value={theme.cream} onChange={update} />
              <ColorSwatch label="Trắng (Cards)" themeKey="white" value={theme.white} onChange={update} />
              <ColorSwatch label="Text chính" themeKey="textMain" value={theme.textMain} onChange={update} />
              <ColorSwatch label="Text phụ (Muted)" themeKey="textMuted" value={theme.textMuted} onChange={update} />
            </div>
          )}
          {activeTab === "layout" && (
            <div>
              <div style={{ fontSize: 11, color: "#888", fontWeight: 700, marginBottom: 12, textTransform:"uppercase", letterSpacing:"0.06em" }}>📐 Kích thước & Bo góc</div>
              <Slider label="Border radius (Card)" themeKey="radius" value={theme.radius} min={0} max={24} unit="px" onChange={update} />
              <Slider label="Max width trang" themeKey="maxWidth" value={theme.maxWidth} min={800} max={1440} unit="px" onChange={update} />
              <Slider label="Hero padding" themeKey="heropadding" value={theme.heropadding} min={16} max={60} unit="px" onChange={update} />
              <Slider label="Main padding" themeKey="mainPadding" value={theme.mainPadding} min={12} max={40} unit="px" onChange={update} />
              <Slider label="Section gap" themeKey="sectionGap" value={theme.sectionGap} min={8} max={48} unit="px" onChange={update} />
              <Slider label="Card padding" themeKey="cardPadding" value={theme.cardPadding} min={12} max={36} unit="px" onChange={update} />
              <div style={{ fontSize: 11, color: "#888", fontWeight: 700, margin: "16px 0 12px", textTransform:"uppercase", letterSpacing:"0.06em" }}>🌈 Hero Gradient</div>
              <Slider label="Góc gradient (°)" themeKey="heroGradientAngle" value={theme.heroGradientAngle} min={0} max={360} unit="°" onChange={update} />
              <Slider label="Điểm chuyển màu (%)" themeKey="heroGradientMid" value={theme.heroGradientMid} min={20} max={80} unit="%" onChange={update} />
            </div>
          )}
          {activeTab === "fonts" && (
            <div>
              <div style={{ fontSize: 11, color: "#888", fontWeight: 700, marginBottom: 12, textTransform:"uppercase", letterSpacing:"0.06em" }}>✍️ Typography</div>
              <Select label="Font tiêu đề (Display)" themeKey="fontDisplay" value={theme.fontDisplay} options={FONT_DISPLAY_OPTIONS} onChange={update} />
              <div style={{ marginBottom: 12, padding: "8px 10px", background: "#f5f5f5", borderRadius: 7 }}>
                <span style={{ fontFamily: `'${theme.fontDisplay}', serif`, fontSize: 16, color: "#1a4731" }}>Đất 120m² Cao Lãnh</span>
              </div>
              <Select label="Font nội dung (Body)" themeKey="fontBody" value={theme.fontBody} options={FONT_BODY_OPTIONS} onChange={update} />
              <div style={{ marginBottom: 12, padding: "8px 10px", background: "#f5f5f5", borderRadius: 7 }}>
                <span style={{ fontFamily: `'${theme.fontBody}', sans-serif`, fontSize: 13, color: "#444" }}>Pháp lý đầy đủ, sổ hồng riêng tên chủ đất.</span>
              </div>
              <Slider label="Base font size" themeKey="baseFontSize" value={theme.baseFontSize} min={13} max={19} unit="px" onChange={update} />
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ padding: "12px 14px", borderTop: "1px solid #eee", display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={copyCSS} style={{
            background: copied ? "#2d6a4f" : "#0d2b1f",
            color: copied ? "#fff" : "#e8c96d",
            border: "none", borderRadius: 9, padding: "11px 16px",
            fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
          }}>
            {copied ? "✅ Đã copy CSS!" : "📋 Copy CSS vào index.css"}
          </button>
          <button onClick={resetDefault} style={{
            background: "transparent", color: "#888",
            border: "1.5px solid #e0e0e0", borderRadius: 9,
            padding: "8px 16px", fontSize: 12, cursor: "pointer",
          }}>↺ Reset về mặc định</button>
          <div style={{ fontSize: 10, color: "#aaa", textAlign: "center", lineHeight: 1.5 }}>
            Copy CSS → paste vào <code>src/index.css</code><br/>thay toàn bộ phần <code>:root</code>
          </div>
        </div>
      </div>

      {/* ── RIGHT PREVIEW ── */}
      <div style={{ flex: 1, overflow: "auto", padding: "20px 24px", background: "#e8e8e8" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#222" }}>Preview trực quan</div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Thay đổi bên trái → preview cập nhật realtime</div>
          </div>
          <div style={{ background: "#fff", border: "1.5px solid #ddd", borderRadius: 8, padding: "5px 12px", fontSize: 11, color: "#555", fontWeight: 600 }}>
            {activePreset}
          </div>
        </div>

        <div style={{ maxWidth: 480, margin: "0 auto", boxShadow: "0 8px 40px rgba(0,0,0,0.15)", borderRadius: 14, overflow: "hidden" }}>
          <Preview theme={theme} />
        </div>

        <div style={{ maxWidth: 480, margin: "16px auto 0", background: "#1e1e1e", borderRadius: 10, padding: "14px 16px", overflow: "auto" }}>
          <div style={{ color: "#888", fontSize: 10, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Generated CSS — paste vào src/index.css
          </div>
          <pre style={{ color: "#c9c9c9", fontSize: 11, lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {generateCSS(theme)}
          </pre>
        </div>
      </div>
    </div>
  );
}
