export interface CheckInRecord {
  id?: number
  timestamp: number
  orb: { x: number; y: number }
  auraLabel: string
  tags: string[]
  note?: string
}

export interface SealedLetter {
  id?: number
  createdAt: number
  unlockCondition: string
  unlockAt: number
  content: string
}

export interface SemanticMemory {
  id: string
  text: string
  createdAt: number
  category: 'anchor' | 'trigger' | 'preference'
}

export interface BioRhythmState {
  sleepHours: number
  sleepQuality: 'rested' | 'fragmented' | 'exhausted'
  rhythmNote: string
  updatedAt: number
}

export interface AuthUser {
  id: string
  name: string
  email: string
  mode: 'account' | 'guest'
  createdAt: number
}

export interface WellnessProfilePreferences {
  reasons: string[]
  recentFeeling: string
  helpGoals: string[]
  comfortEnvironment: string
  interactionStyle: string
  dailyTime: string
  optionalRhythmNote?: string
  completedAt?: number
}

export interface OnboardingStatus {
  introSeen: boolean
  profileCompleted: boolean
  tutorialCompleted: boolean
  preferences?: WellnessProfilePreferences
}

export interface CompanionMessage {
  id: string
  role: 'user' | 'companion'
  mode: string
  text: string
  timestamp: number
}

export interface StarJarNote {
  id: string
  text: string
  createdAt: number
}

export interface SanctuaryState {
  key: string
  name: string
  pronouns: string
  gardenBlooms: number
  lastOrb: { x: number; y: number }
  preferredCompanion: string
  memories?: SemanticMemory[]
  bioRhythm?: BioRhythmState
  authUser?: AuthUser | null
  onboarding?: OnboardingStatus
  companionHistory?: CompanionMessage[]
  journeyCompletedDays?: number[]
  sensoryMode?: 'full' | 'gentle' | 'low'
  themeMode?: 'night' | 'dawn'
  starJar?: StarJarNote[]
}

const DEFAULT_PROFILE: Omit<SanctuaryState, 'key'> = {
  name: 'Raa',
  pronouns: '',
  gardenBlooms: 3,
  lastOrb: { x: 50, y: 52 },
  preferredCompanion: 'The Listener',
}

const DB_NAME = 'lumina_sanctuary_db'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return reject(new Error('IndexedDB unavailable'))
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('state')) {
        db.createObjectStore('state', { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains('checkins')) {
        db.createObjectStore('checkins', { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains('letters')) {
        db.createObjectStore('letters', { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function loadSanctuaryState(): Promise<SanctuaryState | null> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction('state', 'readonly')
      const req = tx.objectStore('state').get('profile')
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

/**
 * Atomically merges `patch` into the persisted 'profile' record (read-modify-write inside
 * a single transaction), so multi-page fields (auth, onboarding, journey...) are never
 * clobbered by legacy callers that only know the v1 fields.
 */
export async function patchSanctuaryState(
  patch: Partial<Omit<SanctuaryState, 'key'>>
): Promise<SanctuaryState | null> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction('state', 'readwrite')
      const store = tx.objectStore('state')
      let merged: SanctuaryState | null = null
      const getReq = store.get('profile')
      getReq.onsuccess = () => {
        const existing = (getReq.result as SanctuaryState | undefined) ?? undefined
        merged = { ...DEFAULT_PROFILE, ...(existing ?? {}), ...patch, key: 'profile' }
        store.put(merged)
      }
      tx.oncomplete = () => resolve(merged)
      tx.onerror = () => resolve(null)
      tx.onabort = () => resolve(null)
    })
  } catch {
    return null
  }
}

export async function saveSanctuaryState(state: Omit<SanctuaryState, 'key'>): Promise<void> {
  // Merge (never replace) so newer optional fields survive legacy full-state saves.
  await patchSanctuaryState(state)
}

// ---------------------------------------------------------------------------
// Local / demo authentication (100% on-device; nothing ever leaves the browser)
// ---------------------------------------------------------------------------

interface StoredAccount {
  id: string
  name: string
  email: string
  salt: string
  hash: string
  createdAt: number
}

interface AccountsRecord {
  key: 'accounts'
  accounts: StoredAccount[]
}

function randomId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}-${rand}`
}

async function hashCredential(password: string, salt: string): Promise<string> {
  const data = `${salt}:${password}`
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    }
  } catch {
    // fall through to encoded fallback
  }
  return `enc:${btoa(unescape(encodeURIComponent(data)))}`
}

async function readAccounts(): Promise<StoredAccount[]> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const req = db.transaction('state', 'readonly').objectStore('state').get('accounts')
      req.onsuccess = () => resolve((req.result as AccountsRecord | undefined)?.accounts ?? [])
      req.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

async function writeAccounts(accounts: StoredAccount[]): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('state', 'readwrite')
    tx.objectStore('state').put({ key: 'accounts', accounts } satisfies AccountsRecord)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

const FRESH_ONBOARDING: OnboardingStatus = {
  introSeen: false,
  profileCompleted: false,
  tutorialCompleted: false,
}

export async function registerLocalUser(
  name: string,
  email: string,
  password: string
): Promise<AuthUser> {
  const cleanName = name.trim()
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanName) throw new Error('Please share a name so LUMINA knows how to greet you.')
  if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
    throw new Error('Please enter a valid email address.')
  }
  if (!password || password.length < 6) {
    throw new Error('Please choose a password with at least 6 characters.')
  }

  const accounts = await readAccounts()
  if (accounts.some((a) => a.email === cleanEmail)) {
    throw new Error('A sanctuary already exists on this device for that email. Try signing in.')
  }

  const salt = randomId('salt')
  const account: StoredAccount = {
    id: randomId('user'),
    name: cleanName,
    email: cleanEmail,
    salt,
    hash: await hashCredential(password, salt),
    createdAt: Date.now(),
  }
  try {
    await writeAccounts([...accounts, account])
  } catch {
    throw new Error('Local storage is unavailable, so an account cannot be created on this device.')
  }

  const authUser: AuthUser = {
    id: account.id,
    name: account.name,
    email: account.email,
    mode: 'account',
    createdAt: account.createdAt,
  }
  await patchSanctuaryState({ authUser, name: cleanName, onboarding: { ...FRESH_ONBOARDING } })
  return authUser
}

export async function signInLocalUser(email: string, password: string): Promise<AuthUser> {
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanEmail || !password) throw new Error('Please enter your email and password.')

  const accounts = await readAccounts()
  const account = accounts.find((a) => a.email === cleanEmail)
  const hash = account ? await hashCredential(password, account.salt) : null
  if (!account || hash !== account.hash) {
    throw new Error(
      'We could not find a matching account on this device. Check your details, or continue as a guest.'
    )
  }

  const authUser: AuthUser = {
    id: account.id,
    name: account.name,
    email: account.email,
    mode: 'account',
    createdAt: account.createdAt,
  }
  const existing = await loadSanctuaryState()
  await patchSanctuaryState({
    authUser,
    name: account.name,
    onboarding: existing?.onboarding ?? { ...FRESH_ONBOARDING },
  })
  return authUser
}

export async function continueAsGuestUser(): Promise<AuthUser> {
  const existing = await loadSanctuaryState()
  const authUser: AuthUser =
    existing?.authUser?.mode === 'guest'
      ? existing.authUser
      : {
          id: randomId('guest'),
          name: 'Gentle Traveler',
          email: '',
          mode: 'guest',
          createdAt: Date.now(),
        }
  await patchSanctuaryState({
    authUser,
    onboarding: existing?.onboarding ?? { ...FRESH_ONBOARDING },
  })
  return authUser
}

export async function signOutLocalUser(): Promise<void> {
  // Keeps check-ins, blooms, letters and every other local record intact.
  await patchSanctuaryState({ authUser: null })
}

export async function addCheckIn(record: Omit<CheckInRecord, 'id'>): Promise<CheckInRecord[]> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve) => {
      const tx = db.transaction('checkins', 'readwrite')
      tx.objectStore('checkins').add(record)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
    return getCheckIns()
  } catch {
    return []
  }
}

export async function getCheckIns(): Promise<CheckInRecord[]> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction('checkins', 'readonly')
      const req = tx.objectStore('checkins').getAll()
      req.onsuccess = () => resolve((req.result || []).reverse())
      req.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

export async function saveSealedLetter(letter: Omit<SealedLetter, 'id'>): Promise<SealedLetter[]> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve) => {
      const tx = db.transaction('letters', 'readwrite')
      tx.objectStore('letters').add(letter)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
    return getSealedLetters()
  } catch {
    return []
  }
}

export async function getSealedLetters(): Promise<SealedLetter[]> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction('letters', 'readonly')
      const req = tx.objectStore('letters').getAll()
      req.onsuccess = () => resolve((req.result || []).reverse())
      req.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

export interface SanctuaryExport {
  exportedAt: string
  app: string
  state: SanctuaryState | null
  checkins: CheckInRecord[]
  letters: SealedLetter[]
}

export async function exportSanctuaryData(): Promise<SanctuaryExport> {
  const [state, checkins, letters] = await Promise.all([
    loadSanctuaryState(),
    getCheckIns(),
    getSealedLetters(),
  ])
  return {
    exportedAt: new Date().toISOString(),
    app: 'LUMINA by RaaOS',
    state,
    checkins,
    letters,
  }
}

export async function clearSanctuaryData(): Promise<void> {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('lumina-profile')
    }
    const db = await openDB()
    await new Promise<void>((resolve) => {
      const tx = db.transaction(['state', 'checkins', 'letters'], 'readwrite')
      tx.objectStore('state').clear()
      tx.objectStore('checkins').clear()
      tx.objectStore('letters').clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  } catch {
    // Fallback silently if IndexedDB is blocked
  }
}
