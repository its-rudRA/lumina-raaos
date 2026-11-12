/**
 * LUMINA — Prisma Client Singleton & Live PostgreSQL Connection Prober
 *
 * Guarantees 100% graceful local-first fallback:
 * If DATABASE_URL is not set, getPrismaClient() returns null immediately,
 * ensuring zero TCP connection attempts or socket leaks in local-only environments.
 */

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export type DbConnectionMode =
  | 'postgres-connected'
  | 'postgres-configured-offline'
  | 'local-indexeddb-only'

export interface DbConnectionCheck {
  connected: boolean
  mode: DbConnectionMode
  latencyMs?: number
  message?: string
}

/**
 * Returns the cached singleton PrismaClient instance when DATABASE_URL is configured.
 * In local-first mode (no DATABASE_URL), returns null immediately without attempting connection.
 */
export function getPrismaClient(): PrismaClient | null {
  const dbUrl = process.env.DATABASE_URL?.trim()
  if (!dbUrl) {
    return null
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    })
  }

  return globalForPrisma.prisma
}

/**
 * Probes the live PostgreSQL database with a strict 2500ms timeout.
 * Returns connectivity status, operational mode, and round-trip query latency.
 */
export async function checkDatabaseConnection(): Promise<DbConnectionCheck> {
  const dbUrl = process.env.DATABASE_URL?.trim()
  if (!dbUrl) {
    return {
      connected: false,
      mode: 'local-indexeddb-only',
      message: 'Local-first architecture active. All data is persisted directly in on-device IndexedDB.',
    }
  }

  const prisma = getPrismaClient()
  if (!prisma) {
    return {
      connected: false,
      mode: 'local-indexeddb-only',
      message: 'Local-first architecture active. Database client uninitialized.',
    }
  }

  const startTime = performance.now()
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('PostgreSQL connection probe timed out (2500ms exceeded)')), 2500)
    )

    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      timeoutPromise,
    ])

    const latencyMs = Math.round(performance.now() - startTime)
    return {
      connected: true,
      mode: 'postgres-connected',
      latencyMs,
      message: `Live PostgreSQL connection verified (${latencyMs}ms round-trip latency).`,
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Database query probe failed'
    return {
      connected: false,
      mode: 'postgres-configured-offline',
      message: `Database configured but currently unreachable (${errorMsg}). Safe local fallback active.`,
    }
  }
}
