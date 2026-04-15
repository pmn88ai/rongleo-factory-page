// src/components/ImageUploader.jsx
// Mode A — Supabase Storage: upload file → get public URL → pass URL[]
// Mode B — base64 (fallback when Supabase not configured): resize → base64[]
// Parent receives: onImagesReady(urls: string[])
import { useState, useRef, useCallback } from 'react'
import { uploadImage, isConfigured } from '../lib/supabase'

const MAX_WIDTH    = 1200
const JPEG_QUALITY = 0.8

function resizeToBase64(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const ratio  = Math.min(1, MAX_WIDTH / img.width)
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * ratio)
      canvas.height = Math.round(img.height * ratio)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error(`Cannot load: ${file.name}`)) }
    img.src = objectUrl
  })
}

function base64ToBlob(b64) {
  const [header, data] = b64.split(',')
  const mime = header.match(/:(.*?);/)[1]
  const bin  = atob(data)
  const arr  = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

export default function ImageUploader({ onImagesReady, existingUrls = [], dark = false }) {
  const [previews, setPreviews] = useState(existingUrls)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [mode, setMode]         = useState(null)   // 'cloud' | 'local'
  const inputRef = useRef(null)

  const darkStyle = dark
    ? { border: '2px dashed rgba(201,168,76,0.4)', bg: 'rgba(255,255,255,0.06)' }
    : { border: '2px dashed #d1d5db', bg: '#fafafa' }

  const handleFiles = useCallback(async (files) => {
    if (!files?.length) return
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!imageFiles.length) { setError('Chỉ chấp nhận file ảnh'); return }

    setLoading(true); setError(null)

    const supabase = isConfigured()
    setMode(supabase ? 'cloud' : 'local')

    try {
      let urls
      if (supabase) {
        // Upload to Supabase Storage
        urls = await Promise.all(imageFiles.map(async (file) => {
          // Resize first to save bandwidth
          const b64  = await resizeToBase64(file)
          const blob = base64ToBlob(b64)
          const pseudoFile = new File([blob], file.name, { type: 'image/jpeg' })
          return uploadImage(pseudoFile)
        }))
      } else {
        // Fallback: base64 (sessions only, not saved to DB)
        urls = await Promise.all(imageFiles.map(resizeToBase64))
      }
      setPreviews(prev => {
        const merged = [...prev, ...urls]
        onImagesReady?.(merged)
        return merged
      })
    } catch (err) {
      setError(`Lỗi: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [onImagesReady])

  const handleDrop = useCallback((e) => {
    e.preventDefault(); handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  function removeImage(idx) {
    setPreviews(prev => {
      const next = prev.filter((_, i) => i !== idx)
      onImagesReady?.(next)
      return next
    })
  }

  function clearAll() {
    setPreviews([]); setError(null); onImagesReady?.([])
    if (inputRef.current) inputRef.current.value = ''
  }

  const textColor = dark ? 'rgba(245,230,184,0.85)' : '#555'
  const subColor  = dark ? 'rgba(245,230,184,0.45)' : '#aaa'

  return (
    <div style={{ marginTop: 8 }}>
      {/* Mode indicator */}
      {mode && (
        <div style={{
          marginBottom: 8, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 10px', borderRadius: 20,
          background: mode === 'cloud' ? '#f0fdf4' : '#fef9c3',
          border: `1px solid ${mode === 'cloud' ? '#86efac' : '#fde047'}`,
          color: mode === 'cloud' ? '#16a34a' : '#713f12',
        }}>
          {mode === 'cloud' ? '☁️ Upload lên Supabase Storage' : '💾 Lưu cục bộ (session only)'}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        style={{
          border: darkStyle.border, borderRadius: 10, padding: '18px 16px',
          textAlign: 'center', cursor: 'pointer', background: darkStyle.bg,
          transition: 'background 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}
        onMouseLeave={e => e.currentTarget.style.background = darkStyle.bg}
      >
        <input ref={inputRef} type="file" accept="image/*" multiple
          style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
        {loading ? (
          <div style={{ color: textColor, fontSize: '0.85rem' }}>⏳ Đang xử lý ảnh...</div>
        ) : (
          <>
            <div style={{ fontSize: '1.5rem', marginBottom: 5 }}>📸</div>
            <div style={{ color: textColor, fontSize: '0.83rem', fontWeight: 500 }}>
              Kéo thả hoặc click để chọn ảnh
            </div>
            <div style={{ color: subColor, fontSize: '0.72rem', marginTop: 3 }}>
              {isConfigured()
                ? 'Ảnh sẽ upload lên Supabase Storage → lưu URL vào DB'
                : 'Chưa cấu hình Supabase — ảnh lưu cục bộ (chỉ trong phiên này)'}
            </div>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          marginTop: 8, padding: '8px 12px',
          background: dark ? 'rgba(239,68,68,0.15)' : '#fff5f5',
          border: `1px solid ${dark ? 'rgba(239,68,68,0.3)' : '#fca5a5'}`,
          borderRadius: 7, fontSize: '0.8rem', color: dark ? '#fca5a5' : '#dc2626',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Thumbnails */}
      {previews.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: textColor, fontSize: '0.8rem', fontWeight: 600 }}>
              ✅ {previews.length} ảnh
            </span>
            <button onClick={clearAll} style={{
              background: 'transparent', border: `1px solid ${dark ? 'rgba(239,68,68,0.3)' : '#fca5a5'}`,
              color: dark ? 'rgba(239,68,68,0.8)' : '#dc2626',
              borderRadius: 6, padding: '3px 10px', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit',
            }}>Xoá tất cả</button>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {previews.map((src, i) => (
              <div key={i} style={{
                position: 'relative', width: 72, height: 56, borderRadius: 7,
                overflow: 'hidden', border: `2px solid ${dark ? 'rgba(201,168,76,0.35)' : '#e0e0e0'}`,
                flexShrink: 0,
              }}>
                <img src={src} alt={`Ảnh ${i + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  onClick={(e) => { e.stopPropagation(); removeImage(i) }}
                  style={{
                    position: 'absolute', top: 2, right: 2,
                    background: 'rgba(0,0,0,0.6)', color: '#fff',
                    border: 'none', borderRadius: '50%', width: 18, height: 18,
                    fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
