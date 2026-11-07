'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  addCheckIn,
  clearSanctuaryData,
  continueAsGuestUser,
  exportSanctuaryData,
  getCheckIns,
  getSealedLetters,
  loadSanctuaryState,
  patchSanctuaryState,
  registerLocalUser,
  saveSealedLetter,
  signInLocalUser,
  signOutLocalUser,
  updateCheckInReaction,
  type AuthUser,
  type BioRhythmState,
  type CheckInRecord,
  type CompanionMessage,
  type OnboardingStatus,
  type SanctuaryExport,
  type SanctuaryState,
  type SealedLetter,
  type SemanticMemory,
  type StarJarNote,
  type WellnessProfilePreferences,
} from '@/lib/db'

export type Orb = { x: number; y: number }
export type SensoryMode = 'full' | 'gentle' | 'low'
export type ThemeMode = 'night' | 'dawn'
export type MemoryCategory = SemanticMemory['category']
export type AiConnectionStatus = 'gemini' | 'local' | 'offline'

export interface Aura {
  label: string
  color: string
  note: string
}

export const DEFAULT_ORB: Orb = { x: 50, y: 52 }

// Honest empty default: no pre-seeded OCT 27 memories so every memory in the vault is 100% user-created.
export const DEFAULT_MEMORIES: SemanticMemory[] = []

export const DEFAULT_BIO_RHYTHM: BioRhythmState = {
  sleepHours: 7,
  sleepQuality: 'rested',
  rhythmNote: 'Steady baseline rest',
  updatedAt: Date.now(),
}

const DEFAULT_ONBOARDING: OnboardingStatus = {
  introSeen: false,
  profileCompleted: false,
  tutorialCompleted: false,
}

// Multi-tier on-device crisis & acute distress detection (explicit phrases + regex patterns)
const CRISIS_PHRASES = [
  'end my life',
  'ending my life',
  'kill myself',
  'killing myself',
  'suicide',
  'suicidal',
  'want to die',
  'wanna die',
  'wish i was dead',
  'wish i were dead',
  'hurt myself',
  'hurting myself',
  'harm myself',
  'harming myself',
  "can't go on living",
  'cannot go on living',
  'self harm',
  'self-harm',
  'cut myself',
  'cutting myself',
  'overdose',
  'take my own life',
  'better off dead',
  'better off without me',
  'no reason to live',
  'no point in living',
  'want it all to end',
  'end it all tonight',
  'not wake up tomorrow',
  'disappear forever',
  'goodbye forever',
]

const CRISIS_PATTERNS: RegExp[] = [
  /\b(want|going|plan|planning|ready|trying)\s+to\s+(die|end\s+it|kill\s+myself|hurt\s+myself|harm\s+myself)\b/i,
  /\b(don'?t|do\s+not)\s+want\s+to\s+(be\s+alive|live\s+anymore|exist\s+anymore|wake\s+up)\b/i,
  /\b(everyone|world)\s+would\s+be\s+better\s+off\s+without\s+me\b/i,
  /\b(can'?t|cannot)\s+(keep\s+living|do\s+this\s+life\s+anymore|stay\s+alive)\b/i,
]

export function containsCrisisSignal(text: string): boolean {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim()
  if (!normalized) return false
  if (CRISIS_PHRASES.some(phrase => normalized.includes(phrase))) return true
  return CRISIS_PATTERNS.some(pattern => pattern.test(normalized))
}

export function deriveAura(orb: Orb): Aura {
  if (orb.x > 64 && orb.y < 42) {
    return {
      label: 'Wired & Overthinking',
      color: '#e7a9bd',
      note: 'There is energy here. Let it soften.',
    }
  }
  if (orb.x < 40 && orb.y > 60) {
    return {
      label: 'Quietly Heavy',
      color: '#9584bf',
      note: 'You can carry less for the next few minutes.',
    }
  }
  return {
    label: 'Softly Grounded',
    color: '#8ec9bd',
    note: 'A small steadiness is already here.',
  }
}

type ProfileData = Omit<SanctuaryState, 'key'>

const INITIAL_PROFILE: ProfileData = {
  name: 'Raa',
  pronouns: '',
  gardenBlooms: 3,
  lastOrb: DEFAULT_ORB,
  preferredCompanion: 'The Listener',
  memories: DEFAULT_MEMORIES,
  aiMemoryEnabled: true,
  bioRhythm: DEFAULT_BIO_RHYTHM,
  authUser: null,
  onboarding: DEFAULT_ONBOARDING,
  companionHistory: [],
  journeyCompletedDays: [],
  sensoryMode: 'full',
  themeMode: 'night',
  starJar: [],
}

interface AudioEngine {
  ctx: AudioContext
  nodes: OscillatorNode[]
  noise: AudioBufferSourceNode
  gain: GainNode
}

function startRainEngine(): AudioEngine | null {
  if (typeof window === 'undefined') return null
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null

  const ctx = new Ctor()
  const masterGain = ctx.createGain()
  masterGain.gain.value = 0.035

  // 174Hz + 261Hz warm harmonic grounding oscillators
  const nodes = [ctx.createOscillator(), ctx.createOscillator()]
  nodes[0].frequency.value = 174
  nodes[1].frequency.value = 261
  nodes.forEach(n => {
    n.type = 'sine'
    n.connect(masterGain)
    n.start()
  })

  // Procedural brown/pink rain noise through a warm 800Hz lowpass
  const bufferSize = ctx.sampleRate * 3
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const output = noiseBuffer.getChannelData(0)
  let lastOut = 0
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1
    output[i] = (lastOut + 0.02 * white) / 1.02
    lastOut = output[i]
    output[i] *= 3.5
  }

  const rainSource = ctx.createBufferSource()
  rainSource.buffer = noiseBuffer
  rainSource.loop = true

  const lowpass = ctx.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 800
  lowpass.Q.value = 0.7

  const rainGain = ctx.createGain()
  rainGain.gain.value = 0.055

  rainSource.connect(lowpass)
  lowpass.connect(rainGain)
  rainGain.connect(ctx.destination)
  rainSource.start()

  masterGain.connect(ctx.destination)
  return { ctx, nodes, noise: rainSource, gain: masterGain }
}

export interface CheckInEmotionPayload {
  emotionId: string
  emoji: string
  emotionLabel: string
  intensity: number
}

export interface SanctuaryContextValue {
  // lifecycle
  isHydrated: boolean
  isLoading: boolean

  // AI & network status
  aiStatus: AiConnectionStatus
  aiThinking: boolean
  aiMemoryEnabled: boolean

  // persisted state
  authUser: AuthUser | null
  onboarding: OnboardingStatus
  name: string
  pronouns: string
  gardenBlooms: number
  orb: Orb
  aura: Aura
  companion: string
  checkIns: CheckInRecord[]
  sealedLetters: SealedLetter[]
  companionHistory: CompanionMessage[]
  memories: SemanticMemory[]
  bioRhythm: BioRhythmState
  journeyCompletedDays: number[]
  sensoryMode: SensoryMode
  themeMode: ThemeMode
  starJar: StarJarNote[]

  // crisis guardrail (set when sendCompanionThought detects an acute signal)
  crisisAlert: boolean
  dismissCrisisAlert: () => void

  // persistent audio
  rainPlaying: boolean
  rainSeconds: number
  toggleRain: () => void
  resetRain: () => void

  // auth
  registerUser: (name: string, email: string, password: string) => Promise<AuthUser>
  signInUser: (email: string, password: string) => Promise<AuthUser>
  continueAsGuest: () => Promise<AuthUser>
  signOutUser: () => Promise<void>

  // onboarding
  updateOnboarding: (partial: Partial<OnboardingStatus>) => Promise<void>
  saveWellnessProfile: (prefs: WellnessProfilePreferences) => Promise<void>
  resetTutorial: () => Promise<void>

  // sanctuary actions
  setOrb: (pos: Orb) => void
  setCompanion: (companion: string) => void
  plantCheckIn: (
    tags: string[],
    note?: string,
    emotion?: CheckInEmotionPayload,
    reaction?: string
  ) => Promise<void>
  reactToCheckIn: (checkInId: number, reaction: string) => Promise<void>
  sealLetter: (text: string, daysToWait?: number, unlockCondition?: string) => Promise<void>
  addStarJarNote: (text: string) => Promise<void>
  sendCompanionThought: (
    text: string,
    modeOverride?: string,
    extra?: { tags?: string[] }
  ) => Promise<string>
  reactToCompanionMessage: (messageId: string, reaction: string) => Promise<void>
  addMemory: (text: string, category: MemoryCategory) => Promise<void>
  editMemory: (id: string, text: string, category: MemoryCategory) => Promise<void>
  toggleMemoryShare: (id: string) => Promise<void>
  setAiMemoryEnabled: (enabled: boolean) => Promise<void>
  removeMemory: (id: string) => Promise<void>
  updateBioRhythm: (bio: BioRhythmState) => Promise<void>
  toggleJourneyDay: (day: number) => Promise<void>
  updateProfileSettings: (updates: {
    name?: string
    pronouns?: string
    sensoryMode?: SensoryMode
    themeMode?: ThemeMode
  }) => Promise<void>

  // data sovereignty
  exportData: () => Promise<SanctuaryExport>
  eraseAllData: () => Promise<void>
}

const SanctuaryContext = createContext<SanctuaryContextValue | null>(null)

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function SanctuaryProvider({ children }: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false)
  const [profile, setProfile] = useState<ProfileData>(INITIAL_PROFILE)
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([])
  const [sealedLetters, setSealedLetters] = useState<SealedLetter[]>([])
  const [crisisAlert, setCrisisAlert] = useState(false)

  const [aiStatus, setAiStatus] = useState<AiConnectionStatus>('local')
  const [aiThinking, setAiThinking] = useState(false)
  const geminiConfiguredRef = useRef(false)

  const [rainPlaying, setRainPlaying] = useState(false)
  const [rainSeconds, setRainSeconds] = useState(0)
  const audioRef = useRef<AudioEngine | null>(null)

  // Always-fresh mirror so async actions never read stale closures.
  const profileRef = useRef<ProfileData>(INITIAL_PROFILE)
  const checkInsRef = useRef<CheckInRecord[]>([])

  const applyProfile = useCallback((next: ProfileData) => {
    profileRef.current = next
    setProfile(next)
  }, [])

  /**
   * Merge a patch into memory immediately (optimistic), then persist to IndexedDB.
   * The write is wrapped in try/catch + a 1500ms timeout so a locked/blocked IndexedDB
   * (e.g. Incognito) can never leave callers awaiting forever.
   */
  const update = useCallback(
    async (patch: Partial<ProfileData>) => {
      applyProfile({ ...profileRef.current, ...patch })
      try {
        await Promise.race([
          patchSanctuaryState(patch),
          new Promise<void>(resolve => window.setTimeout(resolve, 1500)),
        ])
      } catch {
        // State is already updated in memory; persistence is best-effort.
      }
    },
    [applyProfile]
  )

  const adoptStored = useCallback(
    (stored: SanctuaryState | null) => {
      if (!stored) return
      const { key: _key, ...rest } = stored
      void _key
      // Strip any legacy hardcoded OCT 27 (1730000000000) seed memories so the Memory Vault is 100% authentic.
      const cleanedMemories = (rest.memories ?? DEFAULT_MEMORIES).filter(
        m => m.createdAt !== 1730000000000 && m.id !== 'mem-1' && m.id !== 'mem-2'
      )
      applyProfile({
        ...INITIAL_PROFILE,
        ...rest,
        memories: cleanedMemories.map(m => ({
          ...m,
          sharedWithAi: m.sharedWithAi ?? true,
        })),
        aiMemoryEnabled: rest.aiMemoryEnabled ?? true,
        bioRhythm: rest.bioRhythm ?? DEFAULT_BIO_RHYTHM,
        onboarding: rest.onboarding ?? DEFAULT_ONBOARDING,
        companionHistory: rest.companionHistory ?? [],
        journeyCompletedDays: rest.journeyCompletedDays ?? [],
        sensoryMode: rest.sensoryMode ?? 'full',
        themeMode: rest.themeMode ?? 'night',
        starJar: rest.starJar ?? [],
        authUser: rest.authUser ?? null,
        lastOrb: rest.lastOrb ?? DEFAULT_ORB,
      })
    },
    [applyProfile]
  )

  // ---- Check Gemini Backend Status & Network Connectivity ----------------
  useEffect(() => {
    let cancelled = false
    async function checkAiBackend() {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (!cancelled) setAiStatus('offline')
        return
      }
      try {
        const res = await fetch('/api/companion', { method: 'GET' })
        if (!res.ok) {
          if (!cancelled) setAiStatus('local')
          return
        }
        const data = (await res.json()) as { configured?: boolean }
        const configured = Boolean(data.configured)
        geminiConfiguredRef.current = configured
        if (!cancelled) {
          setAiStatus(configured ? 'gemini' : 'local')
        }
      } catch {
        if (!cancelled) {
          setAiStatus(
            typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'local'
          )
        }
      }
    }
    void checkAiBackend()

    const handleOnline = () => {
      setAiStatus(geminiConfiguredRef.current ? 'gemini' : 'local')
      void checkAiBackend()
    }
    const handleOffline = () => {
      setAiStatus('offline')
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      cancelled = true
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // ---- Hydration ---------------------------------------------------------
  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      // Never let a blocked/slow IndexedDB leave routes stuck on a loader.
      const withTimeout = <T,>(p: Promise<T>, fallback: T) =>
        Promise.race([
          p.catch(() => fallback),
          new Promise<T>(resolve => window.setTimeout(() => resolve(fallback), 4000)),
        ])
      const [stored, storedCheckIns, storedLetters] = await Promise.all([
        withTimeout(loadSanctuaryState(), null),
        withTimeout(getCheckIns(), [] as CheckInRecord[]),
        withTimeout(getSealedLetters(), [] as SealedLetter[]),
      ])
      if (cancelled) return
      adoptStored(stored)
      checkInsRef.current = storedCheckIns
      setCheckIns(storedCheckIns)
      setSealedLetters(storedLetters)
      setIsHydrated(true)
    }
    void hydrate()
    return () => {
      cancelled = true
    }
  }, [adoptStored])

  // Reflect sensory/theme preferences on <html> for global styling hooks.
  useEffect(() => {
    if (!isHydrated) return
    document.documentElement.dataset.sensory = profile.sensoryMode ?? 'full'
    document.documentElement.dataset.theme = profile.themeMode ?? 'night'
  }, [isHydrated, profile.sensoryMode, profile.themeMode])

  // ---- Persistent audio (lives at provider level so routes never cut it) ---
  const stopRain = useCallback(() => {
    const engine = audioRef.current
    audioRef.current = null
    if (engine) {
      try {
        engine.noise.stop()
        engine.nodes.forEach(n => n.stop())
      } catch {
        // already stopped
      }
      engine.ctx.close().catch(() => {})
    }
    setRainPlaying(false)
  }, [])

  const toggleRain = useCallback(() => {
    if (audioRef.current) {
      stopRain()
      return
    }
    try {
      const engine = startRainEngine()
      if (!engine) return
      audioRef.current = engine
      setRainPlaying(true)
    } catch {
      audioRef.current = null
      setRainPlaying(false)
    }
  }, [stopRain])

  const resetRain = useCallback(() => {
    stopRain()
    setRainSeconds(0)
  }, [stopRain])

  useEffect(() => {
    if (!rainPlaying) return
    const id = window.setInterval(() => setRainSeconds(s => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [rainPlaying])

  useEffect(() => {
    return () => {
      const engine = audioRef.current
      audioRef.current = null
      engine?.ctx.close().catch(() => {})
    }
  }, [])

  // ---- Auth --------------------------------------------------------------
  const refreshFromDB = useCallback(async () => {
    adoptStored(await loadSanctuaryState())
  }, [adoptStored])

  const registerUser = useCallback(
    async (name: string, email: string, password: string) => {
      const user = await registerLocalUser(name, email, password)
      await refreshFromDB()
      return user
    },
    [refreshFromDB]
  )

  const signInUser = useCallback(
    async (email: string, password: string) => {
      const user = await signInLocalUser(email, password)
      await refreshFromDB()
      return user
    },
    [refreshFromDB]
  )

  const continueAsGuest = useCallback(async () => {
    const user = await continueAsGuestUser()
    await refreshFromDB()
    return user
  }, [refreshFromDB])

  const signOutUser = useCallback(async () => {
    await signOutLocalUser()
    applyProfile({ ...profileRef.current, authUser: null })
  }, [applyProfile])

  // ---- Onboarding --------------------------------------------------------
  const updateOnboarding = useCallback(
    async (partial: Partial<OnboardingStatus>) => {
      const next: OnboardingStatus = {
        ...(profileRef.current.onboarding ?? DEFAULT_ONBOARDING),
        ...partial,
      }
      await update({ onboarding: next })
    },
    [update]
  )

  const saveWellnessProfile = useCallback(
    async (prefs: WellnessProfilePreferences) => {
      const preferences: WellnessProfilePreferences = {
        ...prefs,
        completedAt: prefs.completedAt ?? Date.now(),
      }
      await updateOnboarding({ preferences, profileCompleted: true })
    },
    [updateOnboarding]
  )

  const resetTutorial = useCallback(
    () => updateOnboarding({ tutorialCompleted: false }),
    [updateOnboarding]
  )

  // ---- Sanctuary actions -------------------------------------------------
  const setOrb = useCallback(
    (pos: Orb) => {
      void update({ lastOrb: pos })
    },
    [update]
  )

  const setCompanion = useCallback(
    (companion: string) => {
      void update({ preferredCompanion: companion })
    },
    [update]
  )

  const plantCheckIn = useCallback(
    async (
      tags: string[],
      note?: string,
      emotion?: CheckInEmotionPayload,
      reaction?: string
    ) => {
      const current = profileRef.current
      const orb = current.lastOrb ?? DEFAULT_ORB
      const nextBlooms = current.gardenBlooms + 1
      await update({ gardenBlooms: nextBlooms, lastOrb: orb })
      const trimmed = note?.trim()
      const updated = await addCheckIn({
        timestamp: Date.now(),
        orb,
        auraLabel: deriveAura(orb).label,
        tags: [...tags],
        ...(trimmed ? { note: trimmed } : {}),
        ...(emotion
          ? {
              emotionId: emotion.emotionId,
              emoji: emotion.emoji,
              emotionLabel: emotion.emotionLabel,
              intensity: emotion.intensity,
            }
          : {}),
        ...(reaction ? { reaction } : {}),
      })
      if (updated.length) {
        checkInsRef.current = updated
        setCheckIns(updated)
      }
    },
    [update]
  )

  const reactToCheckIn = useCallback(async (checkInId: number, reaction: string) => {
    const updated = await updateCheckInReaction(checkInId, reaction)
    if (updated.length) {
      checkInsRef.current = updated
      setCheckIns(updated)
    } else {
      setCheckIns(prev =>
        prev.map(c => (c.id === checkInId ? { ...c, reaction } : c))
      )
    }
  }, [])

  const sealLetter = useCallback(
    async (text: string, daysToWait = 1, unlockCondition?: string) => {
      const content = text.trim()
      if (!content) return
      const days = Math.max(1, Math.round(daysToWait))
      const updated = await saveSealedLetter({
        createdAt: Date.now(),
        unlockCondition: unlockCondition ?? (days === 1 ? 'In 1 day' : `In ${days} days`),
        unlockAt: Date.now() + days * 86400000,
        content,
      })
      setSealedLetters(updated)
    },
    []
  )

  const addStarJarNote = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      const next: StarJarNote[] = [
        { id: newId('star'), text: trimmed, createdAt: Date.now() },
        ...(profileRef.current.starJar ?? []),
      ]
      await update({ starJar: next })
    },
    [update]
  )

  const addMemory = useCallback(
    async (text: string, category: MemoryCategory) => {
      const trimmed = text.trim()
      if (!trimmed) return
      const next: SemanticMemory[] = [
        {
          id: newId('mem'),
          text: trimmed,
          createdAt: Date.now(),
          category,
          sharedWithAi: true,
        },
        ...(profileRef.current.memories ?? []),
      ]
      await update({ memories: next })
    },
    [update]
  )

  const editMemory = useCallback(
    async (id: string, text: string, category: MemoryCategory) => {
      const trimmed = text.trim()
      if (!trimmed) return
      const next = (profileRef.current.memories ?? []).map(m =>
        m.id === id ? { ...m, text: trimmed, category, updatedAt: Date.now() } : m
      )
      await update({ memories: next })
    },
    [update]
  )

  const toggleMemoryShare = useCallback(
    async (id: string) => {
      const next = (profileRef.current.memories ?? []).map(m =>
        m.id === id ? { ...m, sharedWithAi: m.sharedWithAi === false ? true : false } : m
      )
      await update({ memories: next })
    },
    [update]
  )

  const setAiMemoryEnabled = useCallback(
    async (enabled: boolean) => {
      await update({ aiMemoryEnabled: enabled })
    },
    [update]
  )

  const removeMemory = useCallback(
    async (id: string) => {
      await update({
        memories: (profileRef.current.memories ?? []).filter(m => m.id !== id),
      })
    },
    [update]
  )

  const reactToCompanionMessage = useCallback(
    async (messageId: string, reaction: string) => {
      const next = (profileRef.current.companionHistory ?? []).map(m =>
        m.id === messageId
          ? { ...m, reaction: m.reaction === reaction ? undefined : reaction }
          : m
      )
      await update({ companionHistory: next })
    },
    [update]
  )

  const updateBioRhythm = useCallback(
    async (bio: BioRhythmState) => {
      await update({ bioRhythm: { ...bio, updatedAt: Date.now() } })
    },
    [update]
  )

  const toggleJourneyDay = useCallback(
    async (day: number) => {
      if (!Number.isInteger(day) || day < 1 || day > 30) return
      const current = profileRef.current.journeyCompletedDays ?? []
      const next = current.includes(day)
        ? current.filter(d => d !== day)
        : [...current, day].sort((a, b) => a - b)
      await update({ journeyCompletedDays: next })
    },
    [update]
  )

  const updateProfileSettings = useCallback(
    async (updates: {
      name?: string
      pronouns?: string
      sensoryMode?: SensoryMode
      themeMode?: ThemeMode
    }) => {
      const patch: Partial<ProfileData> = {}
      if (updates.name !== undefined) patch.name = updates.name.trim() || 'Raa'
      if (updates.pronouns !== undefined) patch.pronouns = updates.pronouns
      if (updates.sensoryMode) patch.sensoryMode = updates.sensoryMode
      if (updates.themeMode) patch.themeMode = updates.themeMode
      if (Object.keys(patch).length) await update(patch)
    },
    [update]
  )

  const sendCompanionThought = useCallback(
    async (text: string, modeOverride?: string, extra?: { tags?: string[] }) => {
      const raw = text.trim()
      if (!raw) return ''

      const current = profileRef.current
      const companionMode = modeOverride || current.preferredCompanion
      const firstName = current.name.trim().split(/\s+/)[0] || 'friend'
      const aura = deriveAura(current.lastOrb ?? DEFAULT_ORB)
      const bio = current.bioRhythm ?? DEFAULT_BIO_RHYTHM
      const memories = current.memories ?? []
      const aiMemoryEnabled = current.aiMemoryEnabled ?? true
      const sharedMemories = aiMemoryEnabled
        ? memories.filter(m => m.sharedWithAi !== false)
        : []

      const now = Date.now()
      const userMessage: CompanionMessage = {
        id: newId('msg'),
        role: 'user',
        mode: companionMode,
        text: raw,
        timestamp: now,
      }

      // Immediately append user message so UI feels responsive
      const historyWithUser = [...(current.companionHistory ?? []), userMessage].slice(-200)
      await update({ companionHistory: historyWithUser })

      let replyText = ''
      let providerUsed: 'gemini' | 'local' = 'local'

      if (containsCrisisSignal(raw)) {
        // On-device crisis guardrail always takes priority over any persona reply.
        replyText = `${firstName}, what you're carrying sounds deeply overwhelming, and your life matters. I am an AI sanctuary, not a crisis professional—please let a real human support you right now.`
        setCrisisAlert(true)
      } else {
        setAiThinking(true)
        const tags = extra?.tags ?? []
        const latestCheckIn = checkInsRef.current[0]

        // Attempt real server-side Gemini 2.5 Flash call if online
        if (typeof navigator === 'undefined' || navigator.onLine) {
          try {
            const res = await fetch('/api/companion', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                mode: 'chat',
                message: raw,
                persona: companionMode,
                userName: firstName,
                pronouns: current.pronouns,
                auraLabel: aura.label,
                emotionEmoji: latestCheckIn?.emoji,
                emotionLabel: latestCheckIn?.emotionLabel,
                emotionIntensity: latestCheckIn?.intensity,
                tags,
                bioRhythm: bio,
                aiMemoryEnabled,
                memories: sharedMemories,
                history: (current.companionHistory ?? []).slice(-6),
              }),
            })
            if (res.ok) {
              const data = (await res.json()) as {
                configured?: boolean
                provider?: 'gemini' | 'local'
                reply?: string | null
              }
              geminiConfiguredRef.current = Boolean(data.configured)
              if (data.reply && data.provider === 'gemini') {
                replyText = data.reply
                providerUsed = 'gemini'
                setAiStatus('gemini')
              } else {
                setAiStatus('local')
              }
            }
          } catch {
            setAiStatus(
              typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'local'
            )
          }
        } else {
          setAiStatus('offline')
        }

        // Transparent Local Mode fallback if Gemini is unconfigured or offline
        if (!replyText) {
          const snippet = raw.length > 68 ? `${raw.slice(0, 68)}…` : raw
          const activeTagsText =
            tags.length > 0 ? ` while holding ${tags.join(' and ').toLowerCase()}` : ''
          const restContext =
            bio.sleepQuality === 'exhausted'
              ? `Because you're running on ${bio.sleepHours}h of exhausted rest, everything feels heavier right now.`
              : bio.sleepQuality === 'fragmented'
                ? `After ${bio.sleepHours}h of fragmented rest, your nervous system deserves extra gentleness.`
                : `With your aura ${aura.label.toLowerCase()}, let's honor your pace.`
          const anchorMemory = sharedMemories[0]?.text
            ? ` Remembering your note: “${sharedMemories[0].text}”`
            : ''

          const responses: Record<string, string> = {
            'The Listener': `I hear you, ${firstName}—especially around “${snippet}”${activeTagsText}. ${restContext} You don't need to shrink or solve this right now.${anchorMemory}`,
            'The Grounder': `Thank you for naming “${snippet}”, ${firstName}. Since you're arriving ${aura.label.toLowerCase()}${activeTagsText}, let's unclench your jaw, drop your shoulders, and take one slow breath.${anchorMemory}`,
            'The Guide': `Holding “${snippet}”${activeTagsText} takes real energy, ${firstName}. ${restContext} What is one smaller, kinder expectation you can set for the next hour?${anchorMemory}`,
            'Boundary Coach': `For “${snippet}”, here is a gentle boundary you can use today, ${firstName}: “I care about doing this well, and right now I need to step back and rest so I can return with a clear head.”${anchorMemory}`,
          }
          replyText = responses[companionMode] ?? responses['The Listener']
          providerUsed = 'local'
        }
        setAiThinking(false)
      }

      const companionMessage: CompanionMessage = {
        id: newId('msg'),
        role: 'companion',
        mode: companionMode,
        text: replyText,
        timestamp: Date.now(),
        provider: providerUsed,
      }
      const finalHistory = [...(profileRef.current.companionHistory ?? []), companionMessage].slice(
        -200
      )
      await update({ companionHistory: finalHistory })
      return replyText
    },
    [update]
  )

  // ---- Data sovereignty --------------------------------------------------
  const exportData = useCallback(() => exportSanctuaryData(), [])

  const eraseAllData = useCallback(async () => {
    stopRain()
    setRainSeconds(0)
    await clearSanctuaryData()
    applyProfile(INITIAL_PROFILE)
    checkInsRef.current = []
    setCheckIns([])
    setSealedLetters([])
    setCrisisAlert(false)
  }, [applyProfile, stopRain])

  const dismissCrisisAlert = useCallback(() => setCrisisAlert(false), [])

  const orb = profile.lastOrb ?? DEFAULT_ORB
  const aura = useMemo(() => deriveAura(orb), [orb])

  const value: SanctuaryContextValue = {
    isHydrated,
    isLoading: !isHydrated,
    aiStatus,
    aiThinking,
    aiMemoryEnabled: profile.aiMemoryEnabled ?? true,
    authUser: profile.authUser ?? null,
    onboarding: profile.onboarding ?? DEFAULT_ONBOARDING,
    name: profile.name,
    pronouns: profile.pronouns,
    gardenBlooms: profile.gardenBlooms,
    orb,
    aura,
    companion: profile.preferredCompanion,
    checkIns,
    sealedLetters,
    companionHistory: profile.companionHistory ?? [],
    memories: profile.memories ?? [],
    bioRhythm: profile.bioRhythm ?? DEFAULT_BIO_RHYTHM,
    journeyCompletedDays: profile.journeyCompletedDays ?? [],
    sensoryMode: profile.sensoryMode ?? 'full',
    themeMode: profile.themeMode ?? 'night',
    starJar: profile.starJar ?? [],
    crisisAlert,
    dismissCrisisAlert,
    rainPlaying,
    rainSeconds,
    toggleRain,
    resetRain,
    registerUser,
    signInUser,
    continueAsGuest,
    signOutUser,
    updateOnboarding,
    saveWellnessProfile,
    resetTutorial,
    setOrb,
    setCompanion,
    plantCheckIn,
    reactToCheckIn,
    sealLetter,
    addStarJarNote,
    sendCompanionThought,
    reactToCompanionMessage,
    addMemory,
    editMemory,
    toggleMemoryShare,
    setAiMemoryEnabled,
    removeMemory,
    updateBioRhythm,
    toggleJourneyDay,
    updateProfileSettings,
    exportData,
    eraseAllData,
  }

  return <SanctuaryContext.Provider value={value}>{children}</SanctuaryContext.Provider>
}

export function useSanctuary(): SanctuaryContextValue {
  const ctx = useContext(SanctuaryContext)
  if (!ctx) throw new Error('useSanctuary must be used inside <SanctuaryProvider>')
  return ctx
}
