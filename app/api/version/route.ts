import { NextResponse } from 'next/server'
import { getCorsHeaders } from '@/lib/api-client'

export const dynamic = 'force-dynamic'

/**
 * OPTIONS /api/version
 * CORS preflight for Native Android Capacitor clients checking app updates.
 */
export async function OPTIONS(req: Request) {
  const origin = req.headers.get('origin')
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  })
}

/**
 * GET /api/version
 * Public version manifest endpoint for sideloaded Android APK update notifications.
 */
export async function GET(req: Request) {
  const origin = req.headers.get('origin')

  return NextResponse.json(
    {
      latestVersion: '1.0.0-rc.1',
      downloadUrl: 'https://lumina-raaos.vercel.app/lumina.apk',
      updateMessage: 'A new version of LUMINA is available!',
    },
    {
      status: 200,
      headers: {
        ...getCorsHeaders(origin),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  )
}
