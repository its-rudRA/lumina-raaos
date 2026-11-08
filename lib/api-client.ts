/**
 * LUMINA (RaaOS Engine) — Cross-Origin API Client & CORS Configuration
 * Unifies API routing between Web Browsers and Native Android Capacitor builds.
 */

const ALLOWED_ANDROID_ORIGINS = new Set([
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost',
  'https://localhost',
  'http://10.0.2.2',
])

/**
 * Resolves an API path to an absolute URL if NEXT_PUBLIC_API_BASE_URL is configured
 * (required for native Android Capacitor builds), or keeps it relative for standard Web.
 */
export function resolveApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, '')
  return base ? `${base}${cleanPath}` : cleanPath
}

/**
 * Returns standard CORS headers allowing Capacitor Android origins and Web clients
 * to interact with server endpoints without failing preflight or cross-origin checks.
 */
export function getCorsHeaders(origin?: string | null): Record<string, string> {
  const allowedOrigin =
    origin && ALLOWED_ANDROID_ORIGINS.has(origin.trim().toLowerCase())
      ? origin.trim()
      : origin || '*'

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  }
}
