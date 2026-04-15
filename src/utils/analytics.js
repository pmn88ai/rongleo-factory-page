// FIX #3: trackEvent — ghi nhận mọi CTA click
// Tích hợp sẵn Google Tag Manager dataLayer
// Thêm GTM snippet vào index.html để bật tracking thật
export function trackEvent(eventName, params = {}) {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({ event: eventName, timestamp: Date.now(), ...params })
  }
  // Bật dòng dưới khi debug, tắt khi production
  // console.log(`[Track] ${eventName}`, params)
}
