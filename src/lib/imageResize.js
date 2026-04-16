// src/lib/imageResize.js
// Client-side image resize before upload.
//
// Strategy:
//   1. Skip non-images (video stays as-is).
//   2. Scale down to max 1200 × 1200 while keeping aspect ratio.
//   3. Output as WebP (q=0.82) — ~3× smaller than JPEG at same quality.
//      Falls back to JPEG if the browser / canvas doesn't support WebP.
//   4. If original is already small enough AND is JPEG → skip re-encode
//      to avoid quality loss on already-compressed files.
//
// Returns a File object ready to pass to uploadToBucket().

const MAX_PX  = 1200   // longest side limit (px)
const QUALITY = 0.82   // WebP/JPEG quality (0–1)

export async function resizeImage(file) {
  // Non-image (video, pdf) — pass through unchanged
  if (!file.type.startsWith('image/')) return file

  return new Promise((resolve, reject) => {
    const img    = new Image()
    const objURL = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objURL)

      let { naturalWidth: w, naturalHeight: h } = img

      // Scale down only — never upscale
      if (w > MAX_PX || h > MAX_PX) {
        const ratio = Math.min(MAX_PX / w, MAX_PX / h)
        w = Math.round(w * ratio)
        h = Math.round(h * ratio)
      }

      // Already small + already JPEG → skip (don't degrade twice-compressed images)
      if (w === img.naturalWidth && h === img.naturalHeight && file.type === 'image/jpeg') {
        resolve(file)
        return
      }

      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)

      // Try WebP first; fall back to JPEG
      canvas.toBlob(
        blob => {
          if (blob) {
            const baseName = file.name.replace(/\.[^/.]+$/, '')
            resolve(new File([blob], `${baseName}.webp`, { type: 'image/webp' }))
          } else {
            // WebP not supported — try JPEG
            canvas.toBlob(
              jpgBlob => {
                if (!jpgBlob) { resolve(file); return }
                const baseName = file.name.replace(/\.[^/.]+$/, '')
                resolve(new File([jpgBlob], `${baseName}.jpg`, { type: 'image/jpeg' }))
              },
              'image/jpeg',
              QUALITY
            )
          }
        },
        'image/webp',
        QUALITY
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objURL)
      // Can't read the image → upload original unchanged
      resolve(file)
    }

    img.src = objURL
  })
}
