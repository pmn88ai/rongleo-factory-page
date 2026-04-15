import { useState, useCallback } from 'react'
import styles from './Gallery.module.css'

export default function Gallery({ images = [], videoUrl }) {
  const [active, setActive] = useState(0)
  const [lightbox, setLightbox] = useState(null)
  const [showVideo, setShowVideo] = useState(false)

  const openLightbox = useCallback((idx) => setLightbox(idx), [])
  const closeLightbox = useCallback(() => setLightbox(null), [])
  const prev = useCallback(() => setLightbox(i => (i - 1 + images.length) % images.length), [images.length])
  const next = useCallback(() => setLightbox(i => (i + 1) % images.length), [images.length])

  return (
    <div className={styles.gallery}>
      {/* Main viewer */}
      <div className={styles.mainWrap}>
        {showVideo && videoUrl ? (
          <iframe
            className={styles.video}
            src={videoUrl}
            title="Video lô đất"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <img
            className={styles.mainImg}
            src={images[active]}
            alt={`Ảnh lô đất ${active + 1}`}
            onClick={() => openLightbox(active)}
          />
        )}
        <span className={styles.counter}>{active + 1} / {images.length}</span>
        {videoUrl && (
          <button
            className={styles.videoBtn}
            onClick={() => setShowVideo(v => !v)}
          >
            {showVideo ? '📷 Xem ảnh' : '▶ Xem video'}
          </button>
        )}
      </div>

      {/* Thumbnails */}
      <div className={styles.thumbs}>
        {images.map((src, i) => (
          <button
            key={i}
            className={`${styles.thumb} ${i === active && !showVideo ? styles.thumbActive : ''}`}
            onClick={() => { setShowVideo(false); setActive(i); }}
          >
            <img src={src} alt={`Thumbnail ${i + 1}`} />
          </button>
        ))}
        {videoUrl && (
          <button
            className={`${styles.thumb} ${showVideo ? styles.thumbActive : ''}`}
            onClick={() => setShowVideo(true)}
          >
            <div className={styles.videoThumb}>▶</div>
          </button>
        )}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div className={styles.overlay} onClick={closeLightbox}>
          <button className={styles.close} onClick={closeLightbox}>✕</button>
          <button className={`${styles.nav} ${styles.navLeft}`} onClick={(e) => { e.stopPropagation(); prev(); }}>‹</button>
          <img
            className={styles.lightboxImg}
            src={images[lightbox]}
            alt="Phóng to"
            onClick={e => e.stopPropagation()}
          />
          <button className={`${styles.nav} ${styles.navRight}`} onClick={(e) => { e.stopPropagation(); next(); }}>›</button>
        </div>
      )}
    </div>
  )
}
