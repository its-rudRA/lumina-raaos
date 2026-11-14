/**
 * LUMINA — Mobile WebView performance helpers.
 * Shared by every canvas / Three.js loop so Android WebView never gets starved.
 */

/** True on Android WebView / Capacitor / narrow touch viewports. */
export function isMobileRuntime(): boolean {
  if (typeof window === 'undefined') return false
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  return (
    window.innerWidth < 768 ||
    /Android|iPhone|iPad|Mobile/i.test(ua) ||
    Boolean((window as unknown as { Capacitor?: unknown }).Capacitor)
  )
}

/** Device-pixel-ratio cap: 1.25 on mobile, `desktopMax` (default 2) elsewhere. */
export function getMaxDpr(desktopMax = 2): number {
  if (typeof window === 'undefined') return 1
  const dpr = window.devicePixelRatio || 1
  return Math.min(dpr, isMobileRuntime() ? 1.25 : desktopMax)
}

/** Minimum ms between decorative frames: >= 33ms (30fps) on mobile. */
export function getFrameIntervalMs(baseMs = 16.5): number {
  return isMobileRuntime() ? Math.max(baseMs, 33) : baseMs
}
