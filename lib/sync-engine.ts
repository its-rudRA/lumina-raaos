import { resolveApiUrl } from './api-client.ts'
import type {
  BioRhythmState,
  CheckInRecord,
  CompanionMessage,
  JourneyDayReflection,
  SanctuaryState,
  SealedLetter,
  SemanticMemory,
  StarJarNote,
} from './db'

export type SyncStatus =
  | 'idle'
  | 'syncing'
  | 'synced'
  | 'error'
  | 'offline'
  | 'local-only'

const OUTBOX_STORAGE_KEY = 'lumina_sync_outbox'
const LAST_SYNC_KEY = 'lumina_last_synced_at'
const RETRY_DELAYS_MS = [1000, 3000, 9000]
const SYNC_FETCH_TIMEOUT_MS = 8000

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = SYNC_FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export interface SyncPayload {
  version: number
  clientTimestamp: number
  userId?: string
  state: Partial<SanctuaryState>
  checkIns?: CheckInRecord[]
  sealedLetters?: SealedLetter[]
}

export interface SyncResponse {
  ok: boolean
  mode?: 'cloud' | 'local-only'
  serverTimestamp?: number
  state?: Partial<SanctuaryState>
  checkIns?: CheckInRecord[]
  sealedLetters?: SealedLetter[]
  error?: string
}

/**
 * Resolves the sync endpoint URL based on environment.
 * Supports native Android Capacitor builds specifying NEXT_PUBLIC_API_BASE_URL.
 */
export function getSyncApiUrl(): string {
  return resolveApiUrl('/api/sync')
}

/**
 * Deterministic Last-Write-Wins (LWW) and array union-merger for Sanctuary state.
 * Guaranteed idempotent and non-destructive.
 */
export function mergeSanctuaryStatesLWW(
  local: SanctuaryState,
  remote: Partial<SanctuaryState>,
  remoteCheckIns?: CheckInRecord[],
  remoteLetters?: SealedLetter[]
): SanctuaryState {
  // 1. Monotonic counters
  const mergedBlooms = Math.max(local.gardenBlooms || 0, remote.gardenBlooms || 0)

  // 2. Journey completed days (Set union)
  const localDays = local.journeyCompletedDays || []
  const remoteDays = remote.journeyCompletedDays || []
  const mergedDays = Array.from(new Set([...localDays, ...remoteDays])).sort((a, b) => a - b)

  // 3. BioRhythm comparison
  let mergedBio: BioRhythmState = local.bioRhythm || {
    sleepHours: 7,
    sleepQuality: 'rested',
    rhythmNote: 'Baseline rest',
    updatedAt: 0,
  }
  if (remote.bioRhythm) {
    if (!local.bioRhythm || remote.bioRhythm.updatedAt >= (local.bioRhythm.updatedAt || 0)) {
      mergedBio = remote.bioRhythm
    }
  }

  // 4. Semantic memories (Merge by ID, LWW by updatedAt/createdAt)
  const memoryMap = new Map<string, SemanticMemory>()
  for (const m of local.memories || []) {
    if (m?.id) memoryMap.set(m.id, m)
  }
  for (const rm of remote.memories || []) {
    if (!rm?.id) continue
    const existing = memoryMap.get(rm.id)
    if (!existing) {
      memoryMap.set(rm.id, rm)
    } else {
      const existingTime = existing.updatedAt || existing.createdAt || 0
      const remoteTime = rm.updatedAt || rm.createdAt || 0
      if (remoteTime >= existingTime) {
        memoryMap.set(rm.id, rm)
      }
    }
  }
  const mergedMemories = Array.from(memoryMap.values()).sort(
    (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
  )

  // 5. Star Jar Notes (Merge by ID/createdAt, deduplicate)
  const starMap = new Map<string, StarJarNote>()
  for (const s of local.starJar || []) {
    if (s?.id) starMap.set(s.id, s)
  }
  for (const rs of remote.starJar || []) {
    if (rs?.id && !starMap.has(rs.id)) {
      starMap.set(rs.id, rs)
    }
  }
  const mergedStarJar = Array.from(starMap.values()).sort(
    (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
  )

  // 6. Companion History (Merge by ID, deduplicate, chronological sort)
  const chatMap = new Map<string, CompanionMessage>()
  for (const msg of local.companionHistory || []) {
    if (msg?.id) chatMap.set(msg.id, msg)
  }
  for (const rmsg of remote.companionHistory || []) {
    if (rmsg?.id && !chatMap.has(rmsg.id)) {
      chatMap.set(rmsg.id, rmsg)
    }
  }
  const mergedChat = Array.from(chatMap.values()).sort(
    (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
  )

  // 7. Journey Reflections (Merge dictionary by key, compare updatedAt)
  const mergedReflections: Record<string, JourneyDayReflection> = {
    ...(local.journeyReflections || {}),
  }
  if (remote.journeyReflections) {
    for (const [dayKey, refVal] of Object.entries(remote.journeyReflections)) {
      const existing = mergedReflections[dayKey]
      if (!existing || (refVal.updatedAt || 0) >= (existing.updatedAt || 0)) {
        mergedReflections[dayKey] = refVal
      }
    }
  }

  // 8. Weekly notes
  const mergedWeeklyNotes: Record<string, string> = {
    ...(local.journeyWeeklyNotes || {}),
    ...(remote.journeyWeeklyNotes || {}),
  }

  // 9. Scalars (Remote takes precedence if present and defined, otherwise local)
  return {
    ...local,
    name: remote.name?.trim() || local.name,
    pronouns: remote.pronouns !== undefined ? remote.pronouns : local.pronouns,
    preferredCompanion: remote.preferredCompanion || local.preferredCompanion,
    gardenBlooms: mergedBlooms,
    lastOrb: remote.lastOrb || local.lastOrb,
    sensoryMode: remote.sensoryMode || local.sensoryMode,
    themeMode: remote.themeMode || local.themeMode,
    aiMemoryEnabled:
      remote.aiMemoryEnabled !== undefined ? remote.aiMemoryEnabled : local.aiMemoryEnabled,
    journeyCompletedDays: mergedDays,
    bioRhythm: mergedBio,
    memories: mergedMemories,
    starJar: mergedStarJar,
    companionHistory: mergedChat,
    journeyReflections: mergedReflections,
    journeyWeeklyNotes: mergedWeeklyNotes,
    journeyReminder: remote.journeyReminder || local.journeyReminder,
    cinemaReelReaction: remote.cinemaReelReaction || local.cinemaReelReaction,
    insightReflection: remote.insightReflection || local.insightReflection,
  }
}

/**
 * Merge check-in lists with ID / timestamp deduplication.
 */
export function mergeCheckInLists(
  local: CheckInRecord[],
  remote: CheckInRecord[]
): CheckInRecord[] {
  const map = new Map<string, CheckInRecord>()
  for (const c of local) {
    const key = c.id ? `id-${c.id}` : `time-${c.timestamp}`
    map.set(key, c)
  }
  for (const c of remote) {
    const key = c.id ? `id-${c.id}` : `time-${c.timestamp}`
    if (!map.has(key)) {
      map.set(key, c)
    } else {
      // If remote has updated reaction
      const existing = map.get(key)!
      if (c.reaction && !existing.reaction) {
        map.set(key, { ...existing, reaction: c.reaction })
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp)
}

/**
 * Enqueue a sync payload to localStorage outbox asynchronously so JSON serialization
 * never blocks Android WebView interactions. Coalesces to latest snapshots per user.
 */
let pendingOutboxTimer: ReturnType<typeof setTimeout> | null = null
let pendingOutboxPayload: SyncPayload | null = null

export function enqueueOutbox(payload: SyncPayload): void {
  if (typeof window === 'undefined') return
  pendingOutboxPayload = payload
  if (pendingOutboxTimer !== null) return

  const flush = () => {
    pendingOutboxTimer = null
    const nextPayload = pendingOutboxPayload
    pendingOutboxPayload = null
    if (!nextPayload) return
    try {
      const raw = localStorage.getItem(OUTBOX_STORAGE_KEY)
      const queue: SyncPayload[] = raw ? JSON.parse(raw) : []
      // Coalesce latest snapshot for the same userId (cap to 2 entries total)
      const filtered = Array.isArray(queue)
        ? queue.filter(item => (item.userId ?? 'anon') !== (nextPayload.userId ?? 'anon')).slice(-1)
        : []
      filtered.push(nextPayload)
      localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(filtered))
    } catch (err) {
      console.warn('[SyncEngine] Failed to write outbox to localStorage:', err)
    }
  }

  pendingOutboxTimer = setTimeout(flush, 0)
}

/**
 * Flush any queued items from the outbox.
 */
export async function flushOutbox(authToken?: string): Promise<boolean> {
  if (typeof window === 'undefined') return true
  try {
    const raw = localStorage.getItem(OUTBOX_STORAGE_KEY)
    if (!raw) return true
    const queue: SyncPayload[] = JSON.parse(raw)
    if (!Array.isArray(queue) || queue.length === 0) return true

    const url = getSyncApiUrl()
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i]
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`

      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(item),
      })
      if (!res.ok && res.status !== 404) {
        // Stop flushing if server error
        return false
      }
    }
    localStorage.removeItem(OUTBOX_STORAGE_KEY)
    return true
  } catch (err) {
    console.warn('[SyncEngine] Error flushing outbox:', err)
    return false
  }
}

/**
 * Executes a sync cycle with the server with exponential backoff retry.
 */
export async function performSync(
  localState: SanctuaryState,
  checkIns: CheckInRecord[],
  sealedLetters: SealedLetter[],
  authToken?: string
): Promise<{
  ok: boolean
  status: SyncStatus
  mergedState?: SanctuaryState
  mergedCheckIns?: CheckInRecord[]
  mergedLetters?: SealedLetter[]
  error?: string
}> {
  if (typeof window === 'undefined') {
    return { ok: true, status: 'idle' }
  }

  // If browser is offline, queue to outbox and return immediately
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    enqueueOutbox({
      version: 1,
      clientTimestamp: Date.now(),
      userId: localState.authUser?.id,
      state: localState,
      checkIns,
      sealedLetters,
    })
    return { ok: false, status: 'offline', error: 'Network is offline. Queued for auto-sync.' }
  }

  const url = getSyncApiUrl()
  const payload: SyncPayload = {
    version: 1,
    clientTimestamp: Date.now(),
    userId: localState.authUser?.id,
    state: localState,
    checkIns: checkIns.slice(0, 100), // Cap payload to reasonable size
    sealedLetters,
  }

  let attempt = 0
  while (attempt <= RETRY_DELAYS_MS.length) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`
      }

      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })

      if (res.status === 404 || res.status === 501) {
        // Cloud sync endpoint is absent or not configured (local-first mode)
        return { ok: true, status: 'local-only' }
      }

      const data: SyncResponse = await res.json()

      if (data.mode === 'local-only') {
        return { ok: true, status: 'local-only' }
      }

      if (!res.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      // Merge server response with local state
      const mergedState = mergeSanctuaryStatesLWW(
        localState,
        data.state || {},
        data.checkIns,
        data.sealedLetters
      )
      const mergedCheckIns = mergeCheckInLists(checkIns, data.checkIns || [])
      const mergedLetters = data.sealedLetters && data.sealedLetters.length > 0 ? data.sealedLetters : sealedLetters

      // Update last sync time
      try {
        localStorage.setItem(LAST_SYNC_KEY, Date.now().toString())
      } catch {
        // ignore
      }

      // Flush any queued outbox items
      flushOutbox(authToken).catch(() => {})

      return {
        ok: true,
        status: 'synced',
        mergedState,
        mergedCheckIns,
        mergedLetters,
      }
    } catch (err: unknown) {
      attempt++
      if (attempt <= RETRY_DELAYS_MS.length) {
        const delay = RETRY_DELAYS_MS[attempt - 1]
        await new Promise((resolve) => setTimeout(resolve, delay))
      } else {
        // Final attempt failed — enqueue to outbox and report error
        enqueueOutbox(payload)
        const errorMessage = err instanceof Error ? err.message : 'Sync network error'
        return { ok: false, status: 'error', error: errorMessage }
      }
    }
  }

  return { ok: false, status: 'error', error: 'Sync failed after retries' }
}

/**
 * Register online/offline browser listeners and auto-flush outbox on reconnection.
 */
export function registerSyncListeners(
  onStatusChange: (status: SyncStatus) => void,
  onReconnect?: () => void
): () => void {
  if (typeof window === 'undefined') return () => {}

  // PERF: debounce flaky Android connectivity flaps so we never trigger a burst of sync calls.
  let onlineTimer: ReturnType<typeof setTimeout> | null = null
  const handleOnline = () => {
    if (onlineTimer) clearTimeout(onlineTimer)
    onlineTimer = setTimeout(() => {
      onlineTimer = null
      onStatusChange('syncing')
      flushOutbox()
        .then((ok) => {
          onStatusChange(ok ? 'synced' : 'error')
          if (onReconnect) onReconnect()
        })
        .catch(() => {
          onStatusChange('error')
        })
    }, 1200)
  }

  const handleOffline = () => {
    if (onlineTimer) {
      clearTimeout(onlineTimer)
      onlineTimer = null
    }
    onStatusChange('offline')
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  return () => {
    if (onlineTimer) clearTimeout(onlineTimer)
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}
