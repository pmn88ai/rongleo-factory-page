// src/components/InfoSection.jsx
// Land-specific info panel: pháp lý, so sánh giá, rủi ro, ưu điểm, phù hợp với ai.
// Chỉ dùng trong LandTemplate — không render cho phone/car.
// Crash-safe: tất cả props đều có giá trị mặc định
import styles from './InfoSection.module.css'

export default function InfoSection({ property }) {
  const {
    legal           = {},
    advantages      = [],
    risks           = [],
    priceComparison = {},
  } = property

  const pc = {
    areaAvgMin: priceComparison.areaAvgMin || 0,
    areaAvgMax: priceComparison.areaAvgMax || 0,
    thisLot:    priceComparison.thisLot    || property.pricePerM2 || 0,
    note:       priceComparison.note       || '',
  }

  const isCheaper = pc.thisLot > 0 && pc.areaAvgMin > 0 && pc.thisLot < pc.areaAvgMin

  return (
    <div className={styles.wrap}>

      {/* So sánh giá */}
      {(pc.thisLot > 0 || pc.areaAvgMin > 0) && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>📊 So sánh giá khu vực</h2>
          <div className={styles.priceCompGrid}>
            <div className={styles.priceCard}>
              <div className={styles.pcLabel}>Giá khu vực</div>
              <div className={styles.pcValue}>
                {pc.areaAvgMin > 0
                  ? `${pc.areaAvgMin}–${pc.areaAvgMax} tr/m²`
                  : 'Chưa có dữ liệu'}
              </div>
            </div>
            <div className={`${styles.priceCard} ${styles.priceCardHighlight}`}>
              <div className={styles.pcLabel}>Lô này</div>
              <div className={styles.pcValueBig}>{pc.thisLot} tr/m²</div>
              {isCheaper && pc.note && (
                <span className={styles.badge}>🔥 {pc.note}</span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Pháp lý */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>📜 Thông tin pháp lý</h2>
        <div className={styles.legalGrid}>
          {[
            ['📗 Loại sổ',     legal.bookType  || 'Sổ hồng (GCNQSDĐ)'],
            ['👤 Chủ sở hữu',  legal.owner     || 'Cá nhân'],
            ['🏷️ Loại đất',   legal.landType  || 'Đất ở đô thị (ODT)'],
            ['📅 Năm cấp sổ',  legal.issueYear || ''],
            ['🔍 Ghi chú',     legal.notes     || ''],
          ].filter(([, val]) => val).map(([label, val]) => (
            <div key={label} className={styles.legalRow}>
              <span className={styles.legalLabel}>{label}</span>
              <span className={styles.legalVal}>{val}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Lưu ý pháp lý */}
      {risks.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>🔎 Lưu ý pháp lý</h2>
          <p className={styles.riskIntro}>
            Các thông tin đã được kiểm tra thực tế — trình bày để khách hàng nắm rõ trước khi quyết định.
          </p>
          <div className={styles.riskList}>
            {risks.map((r, i) => (
              <div key={i} className={styles.riskCard}>
                <span className={styles.riskIcon}>{r.icon}</span>
                <div>
                  <div className={styles.riskLabel}>{r.label}</div>
                  <div className={styles.riskText}>{r.text}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ưu điểm */}
      {advantages.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>✅ Ưu điểm nổi bật</h2>
          <ul className={styles.advList}>
            {advantages.map((a, i) => (
              <li key={i} className={styles.advItem}>
                <span className={styles.check}>✓</span>
                {a}
              </li>
            ))}
          </ul>
        </section>
      )}

    </div>
  )
}
