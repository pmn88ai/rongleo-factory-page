import styles from './Map.module.css'

export default function Map({ embedUrl, locationDetail }) {
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(locationDetail)}`

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.pin}>📍</span>
        <div>
          <div className={styles.title}>Vị trí lô đất</div>
          <div className={styles.sub}>{locationDetail}</div>
        </div>
      </div>
      <div className={styles.mapFrame}>
        <iframe
          src={embedUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Vị trí lô đất trên Google Maps"
        />
      </div>
      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.dirBtn}
      >
        🗺️ Chỉ đường đến đây
      </a>
    </div>
  )
}
