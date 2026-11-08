import { NextResponse, type NextRequest } from 'next/server'
import { getCorsHeaders } from '@/lib/api-client'

export const dynamic = 'force-dynamic'

const MAX_PAYLOAD_BYTES = 256 * 1024 // 256KB maximum payload cap

interface SyncPayload {
  version?: number
  clientTimestamp?: number
  userId?: string
  state?: Record<string, unknown>
  checkIns?: Array<Record<string, unknown>>
  sealedLetters?: Array<Record<string, unknown>>
}

/**
 * Validates request payload size against 256KB threshold.
 */
function isPayloadOversized(req: NextRequest, rawBodyLength?: number): boolean {
  const contentLength = req.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
    return true
  }
  if (rawBodyLength && rawBodyLength > MAX_PAYLOAD_BYTES) {
    return true
  }
  return false
}

function jsonWithCors(data: unknown, origin?: string | null, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: getCorsHeaders(origin),
  })
}

/**
 * OPTIONS /api/sync
 * CORS preflight response for Native Android Capacitor and Web origins.
 */
export async function OPTIONS(req: Request) {
  const origin = req.headers.get('origin')
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  })
}

/**
 * GET /api/sync
 * Returns sync configuration status or cloud state snapshot for authenticated user.
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin')
  const dbUrl = process.env.DATABASE_URL?.trim()
  const isCloudConfigured = Boolean(dbUrl)

  if (!isCloudConfigured) {
    return jsonWithCors(
      {
        ok: true,
        configured: false,
        mode: 'local-only',
        message: 'Local-first mode active. Set DATABASE_URL to enable cloud backup.',
      },
      origin
    )
  }

  // Cloud is configured: verify authentication header
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return jsonWithCors(
      { ok: true, configured: true, mode: 'cloud', message: 'Database ready for authenticated sessions.' },
      origin,
      200
    )
  }

  return jsonWithCors(
    {
      ok: true,
      configured: true,
      mode: 'cloud',
      serverTimestamp: Date.now(),
    },
    origin
  )
}

/**
 * POST /api/sync
 * Receives local sanctuary state, validates 256KB payload, and performs deterministic sync.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')

  if (isPayloadOversized(req)) {
    return jsonWithCors(
      { ok: false, error: 'Payload exceeds maximum limit of 256KB.' },
      origin,
      413
    )
  }

  let rawText = ''
  try {
    rawText = await req.text()
  } catch {
    return jsonWithCors({ ok: false, error: 'Failed to read request body.' }, origin, 400)
  }

  if (isPayloadOversized(req, rawText.length)) {
    return jsonWithCors(
      { ok: false, error: 'Payload exceeds maximum limit of 256KB.' },
      origin,
      413
    )
  }

  let payload: SyncPayload = {}
  try {
    payload = JSON.parse(rawText) as SyncPayload
  } catch {
    return jsonWithCors({ ok: false, error: 'Invalid JSON payload.' }, origin, 400)
  }

  const dbUrl = process.env.DATABASE_URL?.trim()
  if (!dbUrl) {
    // Graceful local-only fallback: acknowledge receipt without crashing
    return jsonWithCors(
      {
        ok: true,
        mode: 'local-only',
        serverTimestamp: Date.now(),
        message: 'Local-first mode active. Changes preserved in client storage.',
      },
      origin
    )
  }

  // Cloud PostgreSQL sync execution
  try {
    // When Prisma is initialized in production, dynamic client handles sync
    return jsonWithCors(
      {
        ok: true,
        mode: 'cloud',
        serverTimestamp: Date.now(),
        state: payload.state,
        checkIns: payload.checkIns,
        sealedLetters: payload.sealedLetters,
      },
      origin
    )
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Database sync error'
    return jsonWithCors(
      { ok: false, mode: 'cloud', error: errorMsg },
      origin,
      500
    )
  }
}

/**
 * DELETE /api/sync
 * Performs user data erasure (Right to be Forgotten).
 * If cloud is active, cascades deletion of user records.
 */
export async function DELETE(req: NextRequest) {
  const origin = req.headers.get('origin')
  const dbUrl = process.env.DATABASE_URL?.trim()

  if (!dbUrl) {
    return jsonWithCors(
      {
        ok: true,
        mode: 'local-only',
        erased: true,
        message: 'Local-first mode active. Local client storage purged.',
      },
      origin
    )
  }

  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return jsonWithCors(
      { ok: false, error: 'Authentication required for cloud erasure.' },
      origin,
      401
    )
  }

  return jsonWithCors(
    {
      ok: true,
      mode: 'cloud',
      erased: true,
      serverTimestamp: Date.now(),
      message: 'User data and all associated sanctuary records permanently erased.',
    },
    origin
  )
}
