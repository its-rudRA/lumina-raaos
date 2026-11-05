export interface CheckInRecord {
  id?: number
  timestamp: number
  orb: { x: number; y: number }
  auraLabel: string
  tags: string[]
}

export interface SealedLetter {
  id?: number
  createdAt: number
  unlockCondition: string
  unlockAt: number
  content: string
}

export interface SanctuaryState {
  key: string
  name: string
  pronouns: string
  gardenBlooms: number
  lastOrb: { x: number; y: number }
  preferredCompanion: string
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

export async function saveSanctuaryState(state: Omit<SanctuaryState, 'key'>): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction('state', 'readwrite')
      tx.objectStore('state').put({ key: 'profile', ...state })
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  } catch {
    // Fallback silently if private browsing blocks IDB
  }
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
