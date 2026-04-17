// src/components/Chatbot.jsx — land-only, simple
// Answers: pháp lý / giá / vị trí. Always ends with call/zalo CTA.
// Uses GROQ if configured, demo mode otherwise.
import { useState, useRef, useEffect } from 'react'
import { trackEvent } from '../lib/analytics'
import styles from './Chatbot.module.css'

const QUICK_QUESTIONS = [
  'Pháp lý thế nào?',
  'Giá có thương lượng không?',
  'Vị trí ở đâu?',
  'Đặt lịch xem đất',
]

// Multi-alias keyword → answer key
const KEYWORDS = {
  'pháp lý': ['pháp lý', 'sổ', 'sổ đỏ', 'sổ hồng', 'giấy tờ', 'tranh chấp', 'quy hoạch'],
  'giá':     ['giá', 'bao nhiêu', 'tiền', 'đắt', 'thương lượng', 'bớt'],
  'vị trí':  ['vị trí', 'ở đâu', 'địa chỉ', 'đường', 'phường', 'huyện'],
  'xem':     ['xem', 'đặt lịch', 'hẹn', 'đến xem', 'lịch'],
}

function matchKey(msg) {
  const lMsg = msg.toLowerCase()
  for (const [key, aliases] of Object.entries(KEYWORDS)) {
    if (aliases.some(a => lMsg.includes(a))) return key
  }
  return null
}

function buildDemoAnswer(key, p) {
  const ph  = p.contact?.phone || ''
  const ctl = `\n\n👉 Gọi ngay: ${ph}`
  switch (key) {
    case 'pháp lý':
      return `Đất có ${p.legal?.type || 'sổ hồng riêng'}, loại ${p.legal?.landType || 'đất ở đô thị'}, chủ sở hữu cá nhân. Không tranh chấp, không thế chấp.${ctl}`
    case 'giá':
      return `Giá ${p.price || 'liên hệ'}${p.pricePerM2 ? ` — ${p.pricePerM2} triệu/m²` : ''}. Chủ có thể thương lượng với khách thành tâm.${ctl}`
    case 'vị trí':
      return `Lô đất tọa lạc tại vị trí đã đăng. Liên hệ để xem bản đồ chi tiết và sắp xếp xem thực tế.${ctl}`
    case 'xem':
      return `Bạn có thể đặt lịch xem đất bất kỳ lúc nào. Nên xem sớm vì đang có nhiều người quan tâm!${ctl}`
    default:
      return `Vui lòng liên hệ trực tiếp để được tư vấn chi tiết.${ctl}`
  }
}

function buildSystemPrompt(p) {
  const ph = p.contact?.phone || ''
  const potLine = p.potential ? `- Tiềm năng: ${p.potential.slice(0, 200)}` : ''
  return `Bạn là anh Nam — môi giới bất động sản lâu năm, quen thuộc với thị trường địa phương. Nói chuyện tự nhiên, thân thiện như người quen, không đọc như robot.

Lô đất đang tư vấn:
- Tên: ${p.title}
- Giá: ${p.price}${p.pricePerM2 ? ` (khoảng ${p.pricePerM2} triệu/m²)` : ''}
- Pháp lý: ${p.legal?.type || 'Sổ hồng'}${p.legal?.landType ? `, ${p.legal.landType}` : ''}
${potLine}
- Liên hệ: ${ph}

Cách trả lời:
- Tối đa 2–3 câu ngắn, tự nhiên như nhắn tin zalo
- Dùng "mình" thay "tôi", xưng "bạn" với khách
- Nếu không có thông tin: nói thẳng "Cái này mình cần xác nhận lại với chủ"
- Kết mỗi tin bằng 1 gợi ý hành động ngắn gọn (gọi / nhắn / ra xem) kèm số ${ph}`
}

export default function Chatbot({ property }) {
  const p = property || {}

  const [open,     setOpen]     = useState(false)
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: `Xin chào! 👋 Tôi có thể tư vấn về "${p.title || 'lô đất này'}".\n\nBạn muốn hỏi về pháp lý, giá, hay đặt lịch xem?`,
  }])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  async function send(text) {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')

    // High-intent tracking
    if (/xem|mua|đặt lịch|hẹn|chốt/i.test(msg)) {
      trackEvent('chatbot_high_intent', { slug: p.slug, question: msg })
    }
    trackEvent('chatbot_message', { question: msg })

    const next = [...messages, { role: 'user', content: msg }]
    setMessages(next)
    setLoading(true)

    // Call /api/chat — Groq key stays server-side (api/chat.js).
    // Graceful fallback: if the route isn't available (plain vite dev) or
    // the key isn't configured, we fall back to demo-mode answers.
    try {
      const res  = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:       'llama3-8b-8192',
          messages:    [{ role: 'system', content: buildSystemPrompt(p) }, ...next],
          max_tokens:  300,
          temperature: 0.55,
        }),
      })
      const data  = await res.json()
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
      const reply = data.choices?.[0]?.message?.content || 'Xin lỗi, có lỗi xảy ra.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      // /api/chat unavailable (vite dev) or key not set → demo mode
      const reply = buildDemoAnswer(matchKey(msg), p)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        className={styles.fab}
        onClick={() => { setOpen(o => !o); if (!open) trackEvent('chatbot_open') }}
        aria-label="Mở chatbot tư vấn"
      >
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
            {QUICK_QUESTIONS.map(q => (
              <button key={q} className={styles.quickBtn} onClick={() => send(q)}>{q}</button>
            ))}
          </div>

          <div className={styles.inputRow}>
            <textarea
              className={styles.input}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Hỏi về pháp lý, giá, vị trí..."
              rows={2}
            />
            <button className={styles.sendBtn} onClick={() => send()} disabled={loading || !input.trim()}>→</button>
          </div>
        </div>
      )}
    </>
  )
}
