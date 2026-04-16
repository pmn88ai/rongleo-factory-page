// src/hooks/useSEO.js
// Injects title, meta, og, twitter, canonical into <head>.
// Marks every injected element with data-seo-managed so cleanup
// removes ONLY what this hook added — never pre-existing tags.
import { useEffect } from 'react'

const SITE_URL    = 'https://zenland.vn'
const SITE_NAME   = 'Land Dossier'
const ATTR_MARKER = 'data-seo-managed'

// ── Low-level DOM helpers ────────────────────────────────────

function upsertMeta(attr, name, content) {
  if (!content) return null
  let el = document.querySelector(`meta[${attr}="${CSS.escape(name)}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    el.setAttribute(ATTR_MARKER, 'true')
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
  return el
}

function upsertLink(rel, href) {
  if (!href) return null
  let el = document.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    el.setAttribute(ATTR_MARKER, 'true')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
  return el
}

function removeManaged() {
  document.querySelectorAll(`[${ATTR_MARKER}]`).forEach(el => el.remove())
}

// ── Hook ─────────────────────────────────────────────────────
// pub  — resolved public_data object (or null while loading)
// slug — route slug for canonical URL
export function useSEO(pub, slug) {
  useEffect(() => {
    if (!pub) return

    const headline  = pub.hero?.headline    || ''
    const subLine   = pub.hero?.subHeadline || ''
    const priceStr  = pub.price?.total      || ''
    const legalType = pub.legal?.type       || ''

    const title     = headline
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME
    const desc      = subLine
                   || [priceStr, legalType].filter(Boolean).join(' — ')
                   || `Thông tin chi tiết lô đất tại ${SITE_NAME}`
    const imgUrl    = pub.gallery?.find(g => g.type === 'image')?.url
                   || pub.gallery?.[0]?.url
                   || ''
    const canonical = slug ? `${SITE_URL}/land/${slug}` : ''

    // ── Title ──
    const prevTitle  = document.title
    document.title   = fullTitle

    // ── Standard meta ──
    upsertMeta('name', 'description', desc)

    // ── Open Graph ──
    upsertMeta('property', 'og:type',        'website')
    upsertMeta('property', 'og:site_name',   SITE_NAME)
    upsertMeta('property', 'og:title',       fullTitle)
    upsertMeta('property', 'og:description', desc)
    if (imgUrl)    upsertMeta('property', 'og:image', imgUrl)
    if (canonical) upsertMeta('property', 'og:url',   canonical)

    // ── Twitter ──
    upsertMeta('name', 'twitter:card',        imgUrl ? 'summary_large_image' : 'summary')
    upsertMeta('name', 'twitter:title',       fullTitle)
    upsertMeta('name', 'twitter:description', desc)
    if (imgUrl) upsertMeta('name', 'twitter:image', imgUrl)

    // ── Canonical ──
    if (canonical) upsertLink('canonical', canonical)

    return () => {
      removeManaged()
      document.title = prevTitle || SITE_NAME
    }
  }, [pub, slug])
}
