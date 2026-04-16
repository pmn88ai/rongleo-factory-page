// api/chat.js — Vercel serverless function
// Proxies requests to Groq so the API key stays server-side.
//
// Required env var (Vercel dashboard — NO VITE_ prefix so it's never bundled):
//   GROQ_API_KEY=gsk_...
//
// In plain `vite dev` this route doesn't exist — Chatbot.jsx falls back to
// demo mode automatically when the fetch fails or returns non-JSON.

export default async function handler(req, res) {
  // ── Method guard ────────────────────────────────────────────
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end('Method Not Allowed')
  }

  // ── Key guard ───────────────────────────────────────────────
  const key = process.env.GROQ_API_KEY
  if (!key) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured on server' })
  }

  // ── Proxy to Groq ────────────────────────────────────────────
  try {
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify(req.body),
    })

    const data = await upstream.json()
    return res.status(upstream.status).json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
