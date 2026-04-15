import { useState } from 'react'
import { trackEvent } from '../utils/analytics'
import styles from './ContactBar.module.css'

// FIX #2: "Xem sổ ngay" mở modal ảnh sổ thay vì gọi điện
// FIX #3: Mọi CTA đều track event

export default function ContactBar({ contact }) {
  const [showSoModal, setShowSoModal] = useState(false)

  function handleCall() {
    trackEvent('click_call', { source: 'contact_bar' })
  }
  function handleZalo() {
    trackEvent('click_zalo', { source: 'contact_bar' })
  }
  function handleXemSo() {
    trackEvent('click_xem_so', { source: 'contact_bar' })
    setShowSoModal(true)
  }
  function handleHoiPhapLy() {
    trackEvent('click_hoi_phap_ly', { source: 'contact_bar' })
  }

  return (
    <>
      <div className={styles.bar}>
        <a
          href={`tel:${contact.phone}`}
          className={`${styles.btn} ${styles.btnCall}`}
          onClick={handleCall}
        >
          📞 Gọi ngay
        </a>

        <a
          href={contact.zalo}
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.btn} ${styles.btnZalo}`}
          onClick={handleZalo}
        >
          💬 Zalo
        </a>

        {/* FIX #2: Mở modal xem sổ thay vì fake tel link */}
        <button
          className={`${styles.btn} ${styles.btnDocs}`}
          onClick={handleXemSo}
        >
          📄 Xem sổ ngay
        </button>

        <a
          href={contact.zalo}
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.btn} ${styles.btnLegal}`}
          onClick={handleHoiPhapLy}
        >
          ⚡ Hỏi pháp lý 30s
        </a>
      </div>

      {/* Modal xem sổ */}
      {showSoModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSoModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setShowSoModal(false)}>✕</button>
            <h3 className={styles.modalTitle}>📄 Xem sổ hồng & pháp lý</h3>

            <div className={styles.soPreview}>
              {/* Placeholder — thay bằng ảnh sổ thật */}
              <div className={styles.soPlaceholder}>
                <span className={styles.soIcon}>📗</span>
                <div className={styles.soText}>
                  <strong>Sổ hồng riêng — GCNQSDĐ</strong>
                  <span>Cấp năm 2019 • Đất ở đô thị (ODT)</span>
                  <span>Không tranh chấp, không thế chấp</span>
                </div>
              </div>

              {/* Nếu có ảnh sổ thật, thay src bên dưới */}
              {contact.soImageUrl && (
                <img
                  src={contact.soImageUrl}
                  alt="Ảnh sổ hồng"
                  className={styles.soImg}
                />
              )}

              <p className={styles.soNote}>
                Muốn xem sổ gốc trực tiếp? Liên hệ chủ đất để đặt lịch xem nhà.
              </p>
            </div>

            <div className={styles.modalActions}>
              <a
                href={`tel:${contact.phone}`}
                className={styles.modalCallBtn}
                onClick={() => trackEvent('click_call', { source: 'so_modal' })}
              >
                📞 Gọi xác nhận — {contact.phone}
              </a>
              <a
                href={contact.zalo}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.modalZaloBtn}
                onClick={() => trackEvent('click_zalo', { source: 'so_modal' })}
              >
                💬 Nhắn Zalo ngay
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
