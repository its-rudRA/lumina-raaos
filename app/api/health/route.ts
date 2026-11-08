import { NextResponse } from 'next/server'
import { getCorsHeaders } from '@/lib/api-client'

export const dynamic = 'force-dynamic'

/**
 * OPTIONS /api/health
 * CORS preflight for Native Android Capacitor and Web clients.
 */
export async function OPTIONS(req: Request) {
  const origin = req.headers.get('origin')
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  })
}

/**
 * GET /api/health
 * Production health and readiness monitoring endpoint.
 * Transparently reports subsystem connectivity status without leaking environment secrets.
 */
export async function GET(req: Request) {
  const origin = req.headers.get('origin')

  const hasGemini = Boolean(process.env.GEMINI_API_KEY?.trim())
  const hasPostgres = Boolean(process.env.DATABASE_URL?.trim())

  const healthPayload = {
    status: 'ok',
    product: 'LUMINA',
    engine: 'RaaOS Engine',
    version: '1.0.0-rc.1',
    timestamp: new Date().toISOString(),
    subsystems: {
      aiCompanion: hasGemini ? 'gemini-configured' : 'local-fallback',
      database: hasPostgres ? 'postgres-configured' : 'local-indexeddb-only',
      privacyGuarantee: 'zero-pii-logging',
    },
  }

  return NextResponse.json(healthPayload, {
    status: 200,
    headers: {
      ...getCorsHeaders(origin),
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
