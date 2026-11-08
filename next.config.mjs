const isCapacitorAndroid = process.env.CAPACITOR_ANDROID === 'true'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // When building for Capacitor Android APK, enable static HTML/JS export
  ...(isCapacitorAndroid ? { output: 'export' } : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Production OWASP security headers (applied for web server deployments)
  ...(!isCapacitorAndroid
    ? {
        async headers() {
          return [
            {
              source: '/:path*',
              headers: [
                {
                  key: 'X-Content-Type-Options',
                  value: 'nosniff',
                },
                {
                  key: 'X-Frame-Options',
                  value: 'DENY',
                },
                {
                  key: 'Referrer-Policy',
                  value: 'strict-origin-when-cross-origin',
                },
                {
                  key: 'Permissions-Policy',
                  value: 'camera=(), microphone=(), geolocation=()',
                },
              ],
            },
          ]
        },
      }
    : {}),
}

export default nextConfig
