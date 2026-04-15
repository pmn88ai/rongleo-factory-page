// src/components/Chatbot.jsx
// Reads GROQ_API_KEY from localStorage config (set via /config page)
// PROMPT_BUILDERS / QUICK_QUESTIONS / DEMO_MAP / KEYWORDS — per category
import { useState, useRef, useEffect } from 'react'
import { trackEvent } from '../utils/analytics'
import { getConfig } from '../lib/supabase'
import styles from './Chatbot.module.css'

// ─────────────────────────────────────────
// SPEC LABEL MAP (3.5)
// key → human-readable label for AI prompt + display
// ─────────────────────────────────────────
const LABEL_MAP = {
  ram:         'RAM',
  pin:         'Pin',
  camera:      'Camera',
  man_hinh:    'Màn hình',
  chip:        'Chip',
  bo_nho:      'Bộ nhớ trong',
  nam_sx:      'Năm sản xuất',
  mau:         'Màu sắc',
  tinh_trang:  'Tình trạng',
  bao_hanh:    'Bảo hành',
  so_km:       'Số KM',
  dong_co:     'Động cơ',
  hop_so:      'Hộp số',
  nhien_lieu:  'Nhiên liệu',
  nam_dang_ky: 'Năm đăng ký',
  bien_so:     'Biển số',
}

function formatSpecKey(key) {
  return LABEL_MAP[key.toLowerCase()] ||
    key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function buildSpecLines(data) {
  if (!data || typeof data !== 'object') return ''
  return Object.entries(data)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `- ${formatSpecKey(k)}: ${v}`)
    .join('\n')
}

// ─────────────────────────────────────────
// SYSTEM PROMPT BUILDERS (3.2 — closing CTA)
// ─────────────────────────────────────────
const CLOSING_CTA = (p) =>
  `\nLUÔN KẾT THÚC bằng 1 trong:\n- "Gọi ngay: ${p.contact?.phone || ''}"\n- "Nhắn Zalo để hỏi thêm"\n- "Đặt lịch xem trực tiếp: ${p.contact?.phone || ''}"\nChọn lời kêu gọi phù hợp nhất với câu hỏi.`

function buildLandPrompt(p) {
  return `Bạn là trợ lý tư vấn bất động sản chuyên nghiệp, thân thiện, nói tiếng Việt.
Chỉ trả lời dựa trên thông tin lô đất dưới đây. Nếu không chắc: "Để xác nhận chính xác, vui lòng liên hệ trực tiếp."

THÔNG TIN LÔ ĐẤT:
- Tên: ${p.title}
- Vị trí: ${p.location || ''} — ${p.locationDetail || ''}
- Diện tích: ${p.area ? `${p.area}m² (ngang ${p.areaFront}m × sâu ${p.areaDepth}m)` : 'Chưa có'}
- Giá: ${p.price}${p.pricePerM2 ? ` tương đương ${p.pricePerM2} triệu/m²` : ''}
- Pháp lý: ${p.legal?.bookType || 'Sổ hồng'}${p.legal?.landType ? `, loại đất ${p.legal.landType}` : ''}
- Ghi chú pháp lý: ${p.legal?.notes || 'Không tranh chấp'}
- Ưu điểm: ${(p.advantages || []).join('; ') || 'Xem thêm chi tiết'}
- Liên hệ: ${p.contact?.name || 'Chủ đất'} — ${p.contact?.phone || ''}

CÁCH TRẢ LỜI:
1. Ngắn gọn, tối đa 3–4 câu.
2. Nhấn mạnh giá thấp hơn khu vực khi khách hỏi về giá.
3. Nếu khách tỏ ra quan tâm: "Liên hệ ${p.contact?.name || 'chủ đất'} qua ${p.contact?.phone || ''} để đặt lịch xem."
4. Kết thúc bằng 1 câu khuyến khích hành động.
${CLOSING_CTA(p)}`
}

function buildPhonePrompt(p) {
  return `Bạn là trợ lý tư vấn điện thoại chuyên nghiệp, thân thiện, nói tiếng Việt.
Chỉ trả lời dựa trên thông tin máy dưới đây. Nếu không chắc: "Để xác nhận chính xác, vui lòng liên hệ trực tiếp."

THÔNG TIN MÁY:
- Tên: ${p.title}
- Giá: ${p.price}
${buildSpecLines(p.data)}
- Liên hệ: ${p.contact?.name || 'Người bán'} — ${p.contact?.phone || ''}

CÁCH TRẢ LỜI:
1. Ngắn gọn, tối đa 3–4 câu.
2. Nhấn mạnh giá tốt và tình trạng máy khi khách hỏi.
3. Nếu khách tỏ ra quan tâm: "Liên hệ ${p.contact?.name || 'người bán'} qua ${p.contact?.phone || ''} để kiểm tra máy trực tiếp."
4. Kết thúc bằng 1 câu khuyến khích hành động.
${CLOSING_CTA(p)}`
}

function buildCarPrompt(p) {
  return `Bạn là trợ lý tư vấn ô tô chuyên nghiệp, thân thiện, nói tiếng Việt.
Chỉ trả lời dựa trên thông tin xe dưới đây. Nếu không chắc: "Để xác nhận chính xác, vui lòng liên hệ trực tiếp."

THÔNG TIN XE:
- Tên: ${p.title}
- Giá: ${p.price}
- Vị trí: ${p.location || ''}
${buildSpecLines(p.data)}
- Liên hệ: ${p.contact?.name || 'Người bán'} — ${p.contact?.phone || ''}

CÁCH TRẢ LỜI:
1. Ngắn gọn, tối đa 3–4 câu.
2. Nhấn mạnh tình trạng xe và giá cạnh tranh khi khách hỏi.
3. Nếu khách tỏ ra quan tâm: "Liên hệ ${p.contact?.name || 'người bán'} qua ${p.contact?.phone || ''} để đặt lịch test xe."
4. Kết thúc bằng 1 câu khuyến khích hành động.
${CLOSING_CTA(p)}`
}

const PROMPT_BUILDERS = {
  land:  buildLandPrompt,
  phone: buildPhonePrompt,
  car:   buildCarPrompt,
}

// ─────────────────────────────────────────
// KEYWORDS — multi-alias per demo key (3.1)
// ─────────────────────────────────────────
const KEYWORDS = {
  land: {
    'pháp lý': ['pháp lý', 'sổ', 'sổ đỏ', 'sổ hồng', 'giấy tờ', 'tranh chấp', 'quy hoạch'],
    'giá':     ['giá', 'bao nhiêu', 'tiền', 'đắt không', 'rẻ không', 'thương lượng'],
    'vay':     ['vay', 'ngân hàng', 'tín dụng', 'vay được không'],
    'xem':     ['xem', 'đặt lịch', 'đến xem', 'hẹn', 'muốn xem', 'xem thực tế'],
  },
  phone: {
    'tình trạng': ['tình trạng', 'zin', 'like new', 'mới không', 'còn zin', 'đẹp không', 'còn mới', 'trầy không', 'lỗi không'],
    'bảo hành':   ['bảo hành', 'bh', 'còn hạn', 'bảo hành không', 'hết bảo hành'],
    'giá':        ['giá', 'bao nhiêu', 'tiền', 'đắt không', 'thương lượng', 'bớt không'],
    'xem':        ['xem', 'đặt lịch', 'gặp', 'hẹn', 'kiểm tra', 'test', 'xem máy'],
  },
  car: {
    'đâm đụng': ['đâm đụng', 'tai nạn', 'đụng', 'đâm', 'xịt', 'hư', 'lỗi', 'móp', 'rỉ sét'],
    'giá':      ['giá', 'bao nhiêu', 'tiền', 'thương lượng', 'bớt không'],
    'đăng kiểm': ['đăng kiểm', 'đk', 'kiểm định', 'còn hạn đk'],
    'xem':       ['xem', 'đặt lịch', 'test', 'lái thử', 'hẹn', 'xem xe'],
  },
}

function matchDemoKey(msg, demoMap, keywords) {
  const lMsg = msg.toLowerCase()
  for (const key of Object.keys(demoMap)) {
    const aliases = keywords?.[key] || [key]
    if (aliases.some(alias => lMsg.includes(alias))) return key
  }
  return null
}

// ─────────────────────────────────────────
// HIGH INTENT KEYWORDS (3.3)
// ─────────────────────────────────────────
const HIGH_INTENT_KEYS = ['xem', 'mua', 'đặt lịch', 'liên hệ', 'chốt', 'lấy', 'đặt cọc', 'gặp', 'hẹn', 'test', 'lái thử']

// ─────────────────────────────────────────
// QUICK QUESTIONS — per category
// ─────────────────────────────────────────
const QUICK_QUESTIONS = {
  land:  ['Pháp lý thế nào?',        'Giá có thương lượng không?', 'Có thể vay ngân hàng không?', 'Đặt lịch xem đất'],
  phone: ['Máy còn bảo hành không?', 'Giá có thương lượng không?', 'Tình trạng máy thế nào?',    'Đặt lịch xem máy'],
  car:   ['Xe có đâm đụng không?',   'Giá có thương lượng không?', 'Đã đăng kiểm chưa?',         'Đặt lịch test xe'],
}

// ─────────────────────────────────────────
// DEMO MODE ANSWERS — per category
// ─────────────────────────────────────────
const DEMO_MAP = {
  land: (p) => ({
    'pháp lý': `Lô đất có ${p.legal?.bookType || 'sổ hồng riêng'}. Không tranh chấp, không thế chấp.\n\n👉 Gọi ngay: ${p.contact?.phone || ''} để xem sổ gốc trực tiếp!`,
    'giá':     `Lô này ${p.pricePerM2 ? `${p.pricePerM2} triệu/m²` : p.price}. Chủ đất có thể thương lượng với khách thành tâm.\n\n👉 Gọi ${p.contact?.phone || ''} để trao đổi!`,
    'vay':     `Hoàn toàn có thể vay ngân hàng — đất có sổ hồng riêng, pháp lý sạch.\n\n👉 Nhắn Zalo hoặc gọi ${p.contact?.phone || ''} để được tư vấn thêm.`,
    'xem':     `Bạn có thể đặt lịch xem đất bất kỳ lúc nào.\n\n👉 Đặt lịch ngay: ${p.contact?.phone || ''}. Nên xem sớm vì đang có nhiều người quan tâm!`,
  }),
  phone: (p) => ({
    'tình trạng': `Máy ${p.title} tình trạng như mô tả. Bạn có thể test trực tiếp trước khi mua.\n\n👉 Đặt lịch xem máy: ${p.contact?.phone || ''}!`,
    'bảo hành':   `Thông tin bảo hành có trong mô tả sản phẩm. Kiểm tra trực tiếp để xác nhận.\n\n👉 Gọi ngay: ${p.contact?.phone || ''} để xem máy!`,
    'giá':        `Giá ${p.price}. Có thể thương lượng với khách thành tâm.\n\n👉 Gọi ${p.contact?.phone || ''} để trao đổi trực tiếp!`,
    'xem':        `Bạn có thể đặt lịch xem máy bất kỳ lúc nào.\n\n👉 Đặt lịch: ${p.contact?.phone || ''}. Máy đang được nhiều người quan tâm!`,
  }),
  car: (p) => ({
    'đâm đụng': `Xe ${p.title} theo mô tả không đâm đụng. Bạn có thể đưa đến hãng kiểm tra trước khi mua.\n\n👉 Đặt lịch test xe: ${p.contact?.phone || ''}!`,
    'giá':      `Giá ${p.price}. Có thể thương lượng với khách thành tâm.\n\n👉 Gọi ${p.contact?.phone || ''} để trao đổi!`,
    'đăng kiểm': `Thông tin đăng kiểm có trong hồ sơ xe. Liên hệ để xem giấy tờ trực tiếp.\n\n👉 Gọi ngay: ${p.contact?.phone || ''}!`,
    'xem':       `Bạn có thể đặt lịch lái thử bất kỳ lúc nào.\n\n👉 Đặt lịch test xe: ${p.contact?.phone || ''}. Nên xem sớm vì xe đang có nhiều người hỏi!`,
  }),
}

// ─────────────────────────────────────────
// GREETING — per category
// ─────────────────────────────────────────
const GREETING = {
  land:  (title) => `Xin chào! 👋 Tôi có thể tư vấn về "${title || 'lô đất này'}".\n\nBạn muốn hỏi về pháp lý, giá, hay đặt lịch xem?`,
  phone: (title) => `Xin chào! 👋 Tôi có thể tư vấn về "${title || 'máy này'}".\n\nBạn muốn hỏi về tình trạng máy, giá, hay đặt lịch xem?`,
  car:   (title) => `Xin chào! 👋 Tôi có thể tư vấn về "${title || 'xe này'}".\n\nBạn muốn hỏi về tình trạng xe, giá, hay đặt lịch test?`,
}

// ─────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────
export default function Chatbot({ property }) {
  const category = property.category || 'land'
  const greeting = (GREETING[category] || GREETING.land)(property.title)

  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState([{ role: 'assistant', content: greeting }])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const endRef = useRef(null)

  // 3.4 — reset conversation when navigating to a different property
  useEffect(() => {
    setMessages([{ role: 'assistant', content: greeting }])
    setInput('')
  }, [property.slug])

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  async function sendMessage(text) {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')

    // 3.3 — high-intent tracking
    const lMsg = msg.toLowerCase()
    if (HIGH_INTENT_KEYS.some(k => lMsg.includes(k))) {
      trackEvent('chatbot_high_intent', { slug: property.slug, category, question: msg })
    }
    trackEvent('chatbot_message', { question: msg, category })

    const newMsgs = [...messages, { role: 'user', content: msg }]
    setMessages(newMsgs)
    setLoading(true)

    const { groq: groqKey } = getConfig()

    if (!groqKey) {
      // 3.1 — multi-alias keyword matching
      const demoMap  = (DEMO_MAP[category] || DEMO_MAP.land)(property)
      const keywords = KEYWORDS[category]
      const key      = matchDemoKey(msg, demoMap, keywords)
      const reply    = key
        ? demoMap[key]
        : `Vui lòng liên hệ trực tiếp: ${property.contact?.phone || 'Chưa có số'}.\n\n💡 Tip: Cấu hình GROQ_API_KEY tại /config để bật AI thật.`
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: reply }])
        setLoading(false)
      }, 600)
      return
    }

    const buildPrompt = PROMPT_BUILDERS[category] || PROMPT_BUILDERS.land

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            { role: 'system', content: buildPrompt(property) },
            ...newMsgs.map(m => ({ role: m.role, content: m.content })),
          ],
          max_tokens: 350,
          temperature: 0.6,
        }),
      })
      const data  = await res.json()
      const reply = data.choices?.[0]?.message?.content || 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Không kết nối được. Vui lòng liên hệ trực tiếp: ${property.contact?.phone || ''}`,
      }])
    } finally {
      setLoading(false)
    }
  }

  const quickQuestions = QUICK_QUESTIONS[category] || QUICK_QUESTIONS.land

  return (
    <>
      <button className={styles.fab} onClick={() => { setOpen(o => !o); if (!open) trackEvent('chatbot_open') }} aria-label="Mở chatbot tư vấn">
        <span className={styles.fabIcon}>{open ? '✕' : '🤖'}</span>
        {!open && <span className={styles.fabLabel}>Hỏi AI</span>}
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <span className={styles.headerDot} />
              <span>Trợ lý tư vấn AI</span>
            </div>
            <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className={styles.messages}>
            {messages.map((m, i) => (
              <div key={i} className={`${styles.msg} ${m.role === 'user' ? styles.msgUser : styles.msgBot}`}>
                {m.content.split('\n').map((line, j, arr) => (
                  <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
                ))}
              </div>
            ))}
            {loading && (
              <div className={`${styles.msg} ${styles.msgBot}`}>
                <span className={styles.dots}><span /><span /><span /></span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className={styles.quickList}>
            {quickQuestions.map(q => (
              <button key={q} className={styles.quickBtn} onClick={() => sendMessage(q)}>{q}</button>
            ))}
          </div>

          <div className={styles.inputRow}>
            <textarea
              className={styles.input}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Hỏi về giá, tình trạng, giấy tờ..."
              rows={2}
            />
            <button className={styles.sendBtn} onClick={() => sendMessage()} disabled={loading || !input.trim()}>→</button>
          </div>
        </div>
      )}
    </>
  )
}
