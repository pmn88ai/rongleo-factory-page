// src/components/RawLibraryModal.jsx
// Facebook-style picker for files already in raw-assets bucket.
// Features: drag-select (rAF + cached rects), sort, full preview.
//
// Props:
//   onConfirm(urls: string[]) — called with selected public URLs
//   onClose()                 — called on cancel / ESC / backdrop click
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { listStorageFiles } from '../lib/supabase'
import S from './RawLibraryModal.module.css'

const BUCKET    = 'raw-assets'
const LIMIT     = 50
const MAX_ITEMS = 300

// ── Helpers ──────────────────────────────────────────────────

function isVideo(file) {
  if (file.mime) return file.mime.startsWith('video/')
  return /\.(mp4|webm|mov)$/i.test(file.url)
}

function fmtSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ── Component ────────────────────────────────────────────────

export default function RawLibraryModal({ onConfirm, onClose }) {
  // Core state
  const [files,      setFiles]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [loadMore,   setLoadMore]   = useState(false)
  const [error,      setError]      = useState(null)
  const [search,     setSearch]     = useState('')
  const [tab,        setTab]        = useState('all')
  const [selected,   setSelected]   = useState(new Set())
  const [offset,     setOffset]     = useState(0)
  const [hasMore,    setHasMore]    = useState(false)
  const [sortMode,   setSortMode]   = useState('newest')
  const [previewIdx, setPreviewIdx] = useState(null)
  const [dragRect,   setDragRect]   = useState(null)  // { x1,y1,x2,y2 } viewport coords

  // ── Refs ─────────────────────────────────────────────────────
  const mountedRef      = useRef(true)   // FIX 4: unmount guard
  const dragPendingRef  = useRef(false)
  const dragActiveRef   = useRef(false)
  const didDragRef      = useRef(false)  // suppresses click after drag
  const dragStartRef    = useRef({ x: 0, y: 0 })
  const itemRefs        = useRef({})     // url → DOM el; cleaned up on unmount
  const cachedRectsRef  = useRef({})     // FIX 1: rects cached at drag-start
  const rafRef          = useRef(null)   // FIX 1: pending rAF id
  const lastMouseRef    = useRef({ x: 0, y: 0 }) // FIX 1: latest mouse pos for rAF
  const visibleLenRef   = useRef(0)      // latest visible.length for keyboard nav

  // ── Side-effects ─────────────────────────────────────────────

  // FIX 4: track mount status to guard setState after unmount
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Scroll lock
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Keyboard: ESC closes preview first then modal; arrows navigate preview
  useEffect(() => {
    function handleKey(e) {
      if (previewIdx !== null) {
        if (e.key === 'ArrowLeft')  setPreviewIdx(i => Math.max(0, i - 1))
        if (e.key === 'ArrowRight') setPreviewIdx(i => Math.min(visibleLenRef.current - 1, i + 1))
        if (e.key === 'Escape')     setPreviewIdx(null)
      } else {
        if (e.key === 'Escape') onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [previewIdx, onClose])

  // ── Data fetching ─────────────────────────────────────────────

  const fetchPage = useCallback(async (off, append = false) => {
    append ? setLoadMore(true) : setLoading(true)
    setError(null)
    try {
      const data = await listStorageFiles(BUCKET, { offset: off, limit: LIMIT })
      // FIX 4: don't setState if modal was closed while fetch was in-flight
      if (!mountedRef.current) return
      setFiles(prev => {
        const combined = append ? [...prev, ...data] : data
        return combined.slice(0, MAX_ITEMS)
      })
      setHasMore(data.length === LIMIT)
      setOffset(off + data.length)
    } catch (e) {
      if (!mountedRef.current) return
      setError(e.message)
    } finally {
      if (mountedRef.current) {
        setLoading(false)
        setLoadMore(false)
      }
    }
  }, [])

  useEffect(() => { fetchPage(0, false) }, [fetchPage])

  // ── Selection ─────────────────────────────────────────────────

  function toggle(url) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(url) ? next.delete(url) : next.add(url)
      return next
    })
  }

  function handleConfirm() {
    onConfirm([...selected])
    onClose()
  }

  // ── Drag-select ───────────────────────────────────────────────
  //
  // Performance strategy (FIX 1):
  //   • Rects are cached ONCE at drag activation (O(N) DOM read, one time)
  //   • Collision checks use the cache — N map lookups per frame, not N DOM reads
  //   • rAF throttle — at most one update per 16 ms regardless of mousemove rate
  //   • lastMouseRef stores the freshest position so rAF always uses latest coords

  const onGridMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    if (e.target.closest('button,a,video')) return
    e.preventDefault()   // block text selection

    dragPendingRef.current = true
    dragActiveRef.current  = false
    dragStartRef.current   = { x: e.clientX, y: e.clientY }

    function handleMove(ev) {
      if (!dragPendingRef.current) return
      const dx = ev.clientX - dragStartRef.current.x
      const dy = ev.clientY - dragStartRef.current.y

      if (!dragActiveRef.current && Math.hypot(dx, dy) > 5) {
        dragActiveRef.current = true
        // Cache all rects ONCE — avoids O(N) getBoundingClientRect per move
        const cache = {}
        Object.entries(itemRefs.current).forEach(([url, el]) => {
          if (el) cache[url] = el.getBoundingClientRect()
        })
        cachedRectsRef.current = cache
      }
      if (!dragActiveRef.current) return

      lastMouseRef.current = { x: ev.clientX, y: ev.clientY }

      // rAF throttle: coalesce rapid mousemove events into one update per frame
      if (rafRef.current) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        const { x: mx, y: my } = lastMouseRef.current
        const rect = {
          x1: dragStartRef.current.x, y1: dragStartRef.current.y,
          x2: mx,                      y2: my,
        }
        setDragRect(rect)

        const sel = {
          left:   Math.min(rect.x1, rect.x2),
          top:    Math.min(rect.y1, rect.y2),
          right:  Math.max(rect.x1, rect.x2),
          bottom: Math.max(rect.y1, rect.y2),
        }
        const newSel = new Set()
        // Collision against CACHED rects — cheap memory ops, no DOM access
        Object.entries(cachedRectsRef.current).forEach(([url, r]) => {
          if (r.left < sel.right && r.right > sel.left && r.top < sel.bottom && r.bottom > sel.top) {
            newSel.add(url)
          }
        })
        setSelected(newSel)
      })
    }

    function handleUp() {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup',   handleUp)
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      cachedRectsRef.current = {}
      if (dragActiveRef.current) {
        didDragRef.current = true
        setTimeout(() => { didDragRef.current = false }, 0)
      }
      dragPendingRef.current = false
      dragActiveRef.current  = false
      setDragRect(null)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup',   handleUp)
  }, [])

  // ── Derived state ─────────────────────────────────────────────

  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      const ta = new Date(a.createdAt).getTime() || 0
      const tb = new Date(b.createdAt).getTime() || 0
      return sortMode === 'newest' ? tb - ta : ta - tb
    })
  }, [files, sortMode])

  const visible = sortedFiles.filter(f => {
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase())
    const matchTab    = tab === 'all'
                      || (tab === 'video' &&  isVideo(f))
                      || (tab === 'image' && !isVideo(f))
    return matchSearch && matchTab
  })

  visibleLenRef.current = visible.length

  const imgCount = files.filter(f => !isVideo(f)).length
  const vidCount = files.filter(f =>  isVideo(f)).length

  // FIX 3: clamp previewIdx when filter/sort shrinks the visible list
  useEffect(() => {
    if (previewIdx === null) return
    if (visible.length === 0)               { setPreviewIdx(null); return }
    if (previewIdx >= visible.length)       setPreviewIdx(visible.length - 1)
  }, [visible.length, previewIdx])  // eslint-disable-line react-hooks/exhaustive-deps

  const safeIdx     = (previewIdx !== null && visible.length > 0)
    ? Math.min(Math.max(0, previewIdx), visible.length - 1)
    : null
  const previewFile = safeIdx !== null ? visible[safeIdx] : null

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className={S.overlay} onClick={onClose}>

      {/* ── Main modal ── */}
      <div className={S.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={S.header}>
          <span className={S.headerTitle}>📁 Thư viện Raw</span>
          <input
            className={S.search}
            placeholder="🔍 Tìm tên file..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <select
            className={S.sortSelect}
            value={sortMode}
            onChange={e => setSortMode(e.target.value)}
            title="Sắp xếp theo"
          >
            <option value="newest">Mới nhất ↓</option>
            <option value="oldest">Cũ nhất ↑</option>
          </select>
          <button className={S.closeBtn} onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        {/* Filter tabs */}
        <div className={S.tabs}>
          <button
            className={`${S.tab} ${tab === 'all' ? S.tabActive : ''}`}
            onClick={() => setTab('all')}
          >
            Tất cả <span className={S.tabCount}>{files.length}</span>
          </button>
          <button
            className={`${S.tab} ${tab === 'image' ? S.tabActive : ''}`}
            onClick={() => setTab('image')}
          >
            🖼 Ảnh <span className={S.tabCount}>{imgCount}</span>
          </button>
          <button
            className={`${S.tab} ${tab === 'video' ? S.tabActive : ''}`}
            onClick={() => setTab('video')}
          >
            🎬 Video <span className={S.tabCount}>{vidCount}</span>
          </button>
          <span className={S.tabSpacer} />
          <span className={S.fileCount}>{visible.length} file{visible.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Grid */}
        <div className={S.grid} onMouseDown={onGridMouseDown}>

          {loading && (
            <div className={S.stateMsg}>⏳ Đang tải thư viện...</div>
          )}

          {!loading && error && (
            <div className={S.stateError}>
              ❌ {error}
              <button onClick={() => fetchPage(0, false)}>Thử lại</button>
            </div>
          )}

          {!loading && !error && visible.length === 0 && (
            <div className={S.stateMsg}>
              {files.length === 0
                ? '📭 Chưa có file nào trong thư viện raw'
                : '🔍 Không tìm thấy file khớp'}
            </div>
          )}

          {visible.map((f, idx) => {
            const isSel = selected.has(f.url)
            return (
              <div
                key={f.url}
                // FIX 2: delete ref on unmount so stale rects don't pollute the cache
                ref={el => {
                  if (el) itemRefs.current[f.url] = el
                  else    delete itemRefs.current[f.url]
                }}
                className={`${S.item} ${isSel ? S.itemSelected : ''}`}
                onClick={() => { if (didDragRef.current) return; toggle(f.url) }}
                title={`${f.name}${f.size ? ` · ${fmtSize(f.size)}` : ''}`}
                data-name={f.name}
              >
                {isVideo(f) ? (
                  <video src={f.url} className={S.thumb} muted preload="metadata" />
                ) : (
                  <img
                    src={f.url}
                    alt={f.name}
                    className={S.thumb}
                    loading="lazy"
                    decoding="async"
                  />
                )}

                <div className={S.itemOverlay} />
                {isVideo(f) && <div className={S.playIcon}>▶</div>}
                <div className={S.checkWrap}>{isSel ? '✓' : ''}</div>
                {isVideo(f) && <div className={S.videoBadge}>▶ video</div>}

                <button
                  className={S.previewBtn}
                  onClick={e => { e.stopPropagation(); setPreviewIdx(idx) }}
                  title="Xem trước"
                  aria-label="Xem trước"
                >
                  🔍
                </button>
              </div>
            )
          })}

          {!loading && hasMore && (
            <div className={S.loadMoreWrap}>
              <button
                className={S.loadMoreBtn}
                onClick={() => fetchPage(offset, true)}
                disabled={loadMore}
              >
                {loadMore ? '⏳ Đang tải...' : 'Tải thêm 50 file'}
              </button>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className={S.bottomBar}>
          <span className={S.selectedCount}>
            {selected.size > 0
              ? `✅ Đã chọn ${selected.size} file`
              : 'Nhấn để chọn · Kéo để chọn nhiều'}
          </span>
          <div className={S.actions}>
            <button className={S.cancelBtn} onClick={onClose}>Huỷ</button>
            <button
              className={S.confirmBtn}
              onClick={handleConfirm}
              disabled={selected.size === 0}
            >
              Dùng{selected.size > 0 ? ` (${selected.size})` : ''}
            </button>
          </div>
        </div>
      </div>{/* /modal */}

      {/* Drag selection rectangle — fixed, pointer-events: none */}
      {dragRect && (
        <div
          className={S.dragRect}
          style={{
            left:   Math.min(dragRect.x1, dragRect.x2),
            top:    Math.min(dragRect.y1, dragRect.y2),
            width:  Math.abs(dragRect.x2 - dragRect.x1),
            height: Math.abs(dragRect.y2 - dragRect.y1),
          }}
        />
      )}

      {/* Full-screen preview overlay */}
      {previewFile && (
        <div
          className={S.previewOverlay}
          onClick={e => { e.stopPropagation(); setPreviewIdx(null) }}
        >
          <div className={S.previewModal} onClick={e => e.stopPropagation()}>

            <div className={S.previewHeader}>
              <button
                className={S.previewNavBtn}
                onClick={() => setPreviewIdx(i => Math.max(0, i - 1))}
                disabled={safeIdx === 0}
                aria-label="File trước"
              >←</button>
              <span className={S.previewName}>{previewFile.name}</span>
              <span className={S.previewCounter}>{safeIdx + 1} / {visible.length}</span>
              <button
                className={S.previewNavBtn}
                onClick={() => setPreviewIdx(i => Math.min(visible.length - 1, i + 1))}
                disabled={safeIdx === visible.length - 1}
                aria-label="File sau"
              >→</button>
              <button
                className={S.previewCloseBtn}
                onClick={() => setPreviewIdx(null)}
                aria-label="Đóng xem trước"
              >✕</button>
            </div>

            <div className={S.previewContent}>
              {isVideo(previewFile) ? (
                // FIX 5: no autoPlay — user can press play; avoids wasting mobile data
                <video
                  key={previewFile.url}
                  src={previewFile.url}
                  className={S.previewMedia}
                  controls
                  muted
                />
              ) : (
                <img
                  key={previewFile.url}
                  src={previewFile.url}
                  alt={previewFile.name}
                  className={S.previewMedia}
                />
              )}
            </div>

            <div className={S.previewFooter}>
              <span className={S.previewMeta}>
                {fmtSize(previewFile.size)}
                {previewFile.createdAt
                  ? ` · ${new Date(previewFile.createdAt).toLocaleDateString('vi-VN')}`
                  : ''}
              </span>
              <button
                className={selected.has(previewFile.url) ? S.previewSelectBtnSel : S.previewSelectBtn}
                onClick={() => toggle(previewFile.url)}
              >
                {selected.has(previewFile.url) ? '✓ Đã chọn' : '+ Chọn file này'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
