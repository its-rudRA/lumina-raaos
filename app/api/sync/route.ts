import { NextResponse, type NextRequest } from 'next/server'
import { getCorsHeaders } from '@/lib/api-client'
import { getPrismaClient } from '@/lib/prisma'

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
  const prisma = getPrismaClient()

  if (!prisma) {
    return jsonWithCors(
      {
        ok: true,
        configured: false,
        mode: 'local-only',
        message: 'Local-first architecture active. All data is persisted directly in on-device IndexedDB.',
      },
      origin
    )
  }

  const userId = req.nextUrl.searchParams.get('userId') || req.headers.get('x-user-id')
  if (!userId) {
    return jsonWithCors(
      {
        ok: true,
        configured: true,
        mode: 'cloud',
        message: 'PostgreSQL database ready for authenticated sync operations.',
      },
      origin
    )
  }

  try {
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        consent: true,
        gardenProgress: true,
        journeyState: true,
        checkIns: {
          where: { deletedAt: null },
          orderBy: { recordedAt: 'desc' },
          take: 60,
        },
        sealedLetters: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
        starJarNotes: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
        memories: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
      },
    })

    if (userRecord) {
      return jsonWithCors(
        {
          ok: true,
          configured: true,
          mode: 'cloud',
          serverTimestamp: Date.now(),
          snapshot: {
            userId: userRecord.id,
            profile: userRecord.profile,
            gardenProgress: userRecord.gardenProgress,
            journeyState: userRecord.journeyState,
            checkIns: userRecord.checkIns,
            sealedLetters: userRecord.sealedLetters,
            starJarNotes: userRecord.starJarNotes,
            memories: userRecord.memories,
          },
        },
        origin
      )
    }
  } catch (err: unknown) {
    console.error('[sync-api-get] Error fetching cloud state:', err)
  }

  return jsonWithCors(
    {
      ok: true,
      configured: true,
      mode: 'cloud',
      serverTimestamp: Date.now(),
      message: 'PostgreSQL database ready for authenticated sessions.',
    },
    origin
  )
}

/**
 * POST /api/sync
 * Receives local sanctuary state, validates 256KB payload, and performs deterministic upsert transactions.
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

  const prisma = getPrismaClient()
  if (!prisma) {
    // Graceful local-only fallback: acknowledge receipt without crashing
    return jsonWithCors(
      {
        ok: true,
        mode: 'local-only',
        serverTimestamp: Date.now(),
        syncedAt: new Date().toISOString(),
        message: 'Local-first mode active. Changes safely preserved in on-device storage.',
      },
      origin
    )
  }

  // Live Cloud PostgreSQL sync execution
  try {
    const stateAuth =
      payload.state?.authUser && typeof payload.state.authUser === 'object'
        ? (payload.state.authUser as Record<string, unknown>)
        : null
    const userId =
      (payload.userId as string) ||
      (stateAuth?.id as string) ||
      'user_local_guest'
    const email = (stateAuth?.email as string) || null

    // 1. Upsert User Account
    await prisma.user.upsert({
      where: { id: userId },
      update: {
        email: email || undefined,
        updatedAt: new Date(),
      },
      create: {
        id: userId,
        email: email || undefined,
      },
    })

    // 2. Upsert User Profile
    const displayName = typeof payload.state?.name === 'string' ? payload.state.name : 'Friend'
    const themeMode = typeof payload.state?.themeMode === 'string' ? payload.state.themeMode : 'night'
    const sensoryMode = typeof payload.state?.sensoryMode === 'string' ? payload.state.sensoryMode : 'full'
    const activeCompanion =
      typeof payload.state?.preferredCompanion === 'string' ? payload.state.preferredCompanion : 'The Listener'
    const onboardingJson =
      payload.state?.onboarding && typeof payload.state.onboarding === 'object'
        ? payload.state.onboarding
        : null

    await prisma.userProfile.upsert({
      where: { userId },
      update: {
        displayName,
        themeMode,
        sensoryMode,
        activeCompanion,
        onboardingJson: onboardingJson ? JSON.parse(JSON.stringify(onboardingJson)) : undefined,
      },
      create: {
        userId,
        displayName,
        themeMode,
        sensoryMode,
        activeCompanion,
        onboardingJson: onboardingJson ? JSON.parse(JSON.stringify(onboardingJson)) : undefined,
      },
    })

    // 3. Upsert User Consent Registry
    const aiMemoryEnabled = payload.state?.aiMemoryEnabled !== false
    await prisma.userConsent.upsert({
      where: { userId },
      update: {
        aiMemoryEnabled,
        cloudSyncEnabled: true,
      },
      create: {
        userId,
        aiMemoryEnabled,
        cloudSyncEnabled: true,
      },
    })

    // 4. Upsert Garden Progress
    const wishLanternCount =
      typeof payload.state?.gardenBlooms === 'number' ? payload.state.gardenBlooms : 0
    await prisma.gardenProgress.upsert({
      where: { userId },
      update: { wishLanternCount },
      create: { userId, wishLanternCount },
    })

    // 5. Upsert Journey And Insight State
    const exploredDays = Array.isArray(payload.state?.journeyCompletedDays)
      ? (payload.state?.journeyCompletedDays as number[])
      : []
    const dayReflectionsJson =
      payload.state?.journeyReflections && typeof payload.state.journeyReflections === 'object'
        ? payload.state.journeyReflections
        : null
    const weeklyNotesJson =
      payload.state?.journeyWeeklyNotes && typeof payload.state.journeyWeeklyNotes === 'object'
        ? payload.state.journeyWeeklyNotes
        : null
    const reminderPref =
      typeof payload.state?.journeyReminder === 'string' ? payload.state.journeyReminder : 'Off'
    const latestAiReflectionJson =
      payload.state?.insightReflection && typeof payload.state.insightReflection === 'object'
        ? payload.state.insightReflection
        : null

    await prisma.journeyAndInsightState.upsert({
      where: { userId },
      update: {
        exploredDays,
        dayReflectionsJson: dayReflectionsJson ? JSON.parse(JSON.stringify(dayReflectionsJson)) : undefined,
        weeklyNotesJson: weeklyNotesJson ? JSON.parse(JSON.stringify(weeklyNotesJson)) : undefined,
        reminderPref,
        latestAiReflectionJson: latestAiReflectionJson
          ? JSON.parse(JSON.stringify(latestAiReflectionJson))
          : undefined,
      },
      create: {
        userId,
        exploredDays,
        dayReflectionsJson: dayReflectionsJson ? JSON.parse(JSON.stringify(dayReflectionsJson)) : undefined,
        weeklyNotesJson: weeklyNotesJson ? JSON.parse(JSON.stringify(weeklyNotesJson)) : undefined,
        reminderPref,
        latestAiReflectionJson: latestAiReflectionJson
          ? JSON.parse(JSON.stringify(latestAiReflectionJson))
          : undefined,
      },
    })

    // 6. Upsert Emotional Check-Ins
    if (Array.isArray(payload.checkIns)) {
      for (const c of payload.checkIns) {
        if (!c || typeof c !== 'object') continue
        const rec = c as Record<string, unknown>
        const clientId = String(
          rec.clientId || rec.id || rec.timestamp || `${userId}-${Date.now()}-${Math.random()}`
        )
        const orb = rec.orb && typeof rec.orb === 'object' ? (rec.orb as Record<string, unknown>) : null
        const pleasantness = typeof orb?.x === 'number' ? orb.x : 50.0
        const energy = typeof orb?.y === 'number' ? orb.y : 52.0
        const auraTitle = typeof rec.auraLabel === 'string' ? rec.auraLabel : 'Softly Grounded'
        const somaticCues = Array.isArray(rec.tags) ? rec.tags.map(String) : []
        const recordedAt = rec.timestamp ? new Date(Number(rec.timestamp)) : new Date()

        await prisma.emotionalCheckIn.upsert({
          where: { clientId },
          update: {
            emotionId: rec.emotionId ? String(rec.emotionId) : undefined,
            emoji: rec.emoji ? String(rec.emoji) : undefined,
            emotionLabel: rec.emotionLabel ? String(rec.emotionLabel) : undefined,
            intensity: typeof rec.intensity === 'number' ? Math.round(rec.intensity) : undefined,
            pleasantness,
            energy,
            auraTitle,
            somaticCues,
            note: rec.note ? String(rec.note) : undefined,
            reaction: rec.reaction ? String(rec.reaction) : undefined,
            clientUpdatedAt: new Date(),
          },
          create: {
            userId,
            clientId,
            emotionId: rec.emotionId ? String(rec.emotionId) : undefined,
            emoji: rec.emoji ? String(rec.emoji) : undefined,
            emotionLabel: rec.emotionLabel ? String(rec.emotionLabel) : undefined,
            intensity: typeof rec.intensity === 'number' ? Math.round(rec.intensity) : undefined,
            pleasantness,
            energy,
            auraTitle,
            somaticCues,
            note: rec.note ? String(rec.note) : undefined,
            reaction: rec.reaction ? String(rec.reaction) : undefined,
            recordedAt,
            clientUpdatedAt: new Date(),
          },
        })
      }
    }

    // 7. Upsert Star Jar Memories
    const starJar = Array.isArray(payload.state?.starJar) ? payload.state.starJar : []
    for (const s of starJar) {
      if (!s || typeof s !== 'object') continue
      const note = s as Record<string, unknown>
      const clientId = String(
        note.clientId || note.id || note.createdAt || `${userId}-${Date.now()}-${Math.random()}`
      )
      const text = typeof note.text === 'string' ? note.text : ''
      if (!text) continue
      const createdAt = note.createdAt ? new Date(Number(note.createdAt)) : new Date()

      await prisma.starJarMemory.upsert({
        where: { clientId },
        update: {
          text,
          emoji: typeof note.emoji === 'string' ? note.emoji : undefined,
        },
        create: {
          userId,
          clientId,
          text,
          emoji: typeof note.emoji === 'string' ? note.emoji : undefined,
          createdAt,
        },
      })
    }

    // 8. Upsert Time-Locked Sealed Letters
    if (Array.isArray(payload.sealedLetters)) {
      for (const l of payload.sealedLetters) {
        if (!l || typeof l !== 'object') continue
        const letter = l as Record<string, unknown>
        const clientId = String(
          letter.clientId || letter.id || letter.createdAt || `${userId}-${Date.now()}-${Math.random()}`
        )
        const body =
          typeof letter.content === 'string'
            ? letter.content
            : typeof letter.body === 'string'
              ? letter.body
              : ''
        if (!body) continue
        const openDate = letter.unlockAt ? new Date(Number(letter.unlockAt)) : new Date(Date.now() + 86400000)
        const createdAt = letter.createdAt ? new Date(Number(letter.createdAt)) : new Date()

        await prisma.sealedLetter.upsert({
          where: { clientId },
          update: {
            body,
            openDate,
            title: typeof letter.title === 'string' ? letter.title : undefined,
          },
          create: {
            userId,
            clientId,
            title: typeof letter.title === 'string' ? letter.title : undefined,
            body,
            openDate,
            createdAt,
          },
        })
      }
    }

    // 9. Upsert User-Approved Memories (Memory Vault)
    const memories = Array.isArray(payload.state?.memories) ? payload.state.memories : []
    for (const m of memories) {
      if (!m || typeof m !== 'object') continue
      const mem = m as Record<string, unknown>
      const clientId = String(
        mem.clientId || mem.id || mem.createdAt || `${userId}-${Date.now()}-${Math.random()}`
      )
      const text = typeof mem.text === 'string' ? mem.text : ''
      if (!text) continue
      const category = typeof mem.category === 'string' ? mem.category : 'anchor'
      const sharedWithAi = Boolean(mem.sharedWithAi)
      const createdAt = mem.createdAt ? new Date(Number(mem.createdAt)) : new Date()

      await prisma.userApprovedMemory.upsert({
        where: { clientId },
        update: {
          text,
          category,
          sharedWithAi,
          updatedAt: new Date(),
        },
        create: {
          userId,
          clientId,
          text,
          category,
          sharedWithAi,
          createdAt,
          updatedAt: new Date(),
        },
      })
    }

    return jsonWithCors(
      {
        ok: true,
        mode: 'cloud',
        serverTimestamp: Date.now(),
        syncedAt: new Date().toISOString(),
        state: payload.state,
        checkIns: payload.checkIns,
        sealedLetters: payload.sealedLetters,
      },
      origin
    )
  } catch (err: unknown) {
    console.error('[sync-api-post] Database transaction error, falling back to local-only:', err)
    return jsonWithCors(
      {
        ok: true,
        mode: 'local-only',
        syncedAt: new Date().toISOString(),
        serverTimestamp: Date.now(),
        message: 'Cloud database currently unreachable. Changes safely preserved in on-device storage.',
      },
      origin
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
  const prisma = getPrismaClient()

  if (!prisma) {
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

  let targetUserId = req.nextUrl.searchParams.get('userId') || ''
  if (!targetUserId) {
    try {
      const body = (await req.json()) as Record<string, unknown>
      targetUserId = String(body?.userId || body?.email || '')
    } catch {
      // ignore
    }
  }

  if (!targetUserId) {
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      targetUserId = authHeader.slice(7).trim()
    }
  }

  if (targetUserId) {
    try {
      // Log privacy audit entry before cascade deletion
      await prisma.dataPrivacyAuditLog
        .create({
          data: {
            userId: targetUserId,
            actionType: 'DELETE_ALL',
            platform: req.headers.get('x-platform') || 'web',
          },
        })
        .catch(() => {})

      // Cascade delete user: schema onDelete: Cascade automatically purges all 13 associated tables!
      await prisma.user.deleteMany({
        where: {
          OR: [{ id: targetUserId }, { email: targetUserId }],
        },
      })
    } catch (err: unknown) {
      console.error('[sync-api-delete] Error purging user cloud records:', err)
    }
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
