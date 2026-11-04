'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  BatteryMedium,
  Check,
  ChevronRight,
  CloudSun,
  Droplets,
  Flame,
  Flower2,
  Headphones,
  Heart,
  Leaf,
  LockKeyhole,
  MailOpen,
  Mic,
  Moon,
  Music2,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Star,
  SunMedium,
  Wind,
  X,
  Zap,
} from 'lucide-react'
import { useHydrated } from './hydration-guard'
import {
  addCheckIn,
  type CheckInRecord,
  getCheckIns,
  getSealedLetters,
  loadSanctuaryState,
  saveSanctuaryState,
  saveSealedLetter,
  type SealedLetter,
} from '@/lib/db'

type Mode = 'sanctuary' | 'gentle' | 'exhausted'
type Orb = { x: number; y: number }

interface AudioEngineRef {
  ctx: AudioContext
  nodes: OscillatorNode[]
  noise?: AudioBufferSourceNode
  gain: GainNode
}

interface SpeechRecognitionInstance {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

const glass = 'rounded-[24px] border border-white/[0.08] bg-white/[0.045] backdrop-blur-xl'

export default function Page() {
  const hydrated = useHydrated()
  const [mode, setMode] = useState<Mode>('sanctuary')
  const [tab, setTab] = useState<'garden' | 'aura'>('aura')
  const [ritual, setRitual] = useState<'burn' | 'letter'>('burn')
  const [supportOpen, setSupportOpen] = useState(false)
  const [stuckOpen, setStuckOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [welcomeOpen, setWelcomeOpen] = useState(false)
  const [lettersOpen, setLettersOpen] = useState(false)

  const [step, setStep] = useState(1)
  const [worry, setWorry] = useState('')
  const [released, setReleased] = useState(false)
  const [letter, setLetter] = useState('')
  const [letterSaved, setLetterSaved] = useState(false)
  const [unlock, setUnlock] = useState('Next heavy day')

  const [orb, setOrb] = useState<Orb>({ x: 50, y: 52 })
  const [companion, setCompanion] = useState('The Listener')
  const [thought, setThought] = useState('')
  const [reply, setReply] = useState('')

  const [name, setName] = useState('Raa')
  const [pronouns, setPronouns] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [gardenBlooms, setGardenBlooms] = useState(3)
  const [rainPlaying, setRainPlaying] = useState(false)
  const [listening, setListening] = useState(false)

  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([])
  const [sealedLetters, setSealedLetters] = useState<SealedLetter[]>([])

  const [greeting, setGreeting] = useState('Welcome')
  const [date, setDate] = useState('')

  const audioRef = useRef<AudioEngineRef | null>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  // Clean up Web Audio & Speech Recognition on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.ctx.close().catch(() => {})
        audioRef.current = null
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // ignore
        }
      }
    }
  }, [])

  // Deterministic time + IndexedDB hydration + legacy localStorage migration
  useEffect(() => {
    const now = new Date()
    const hour = now.getHours()
    setGreeting(
      hour < 5 || hour >= 21
        ? 'Gentle night'
        : hour < 12
          ? 'Good morning'
          : hour < 17
            ? 'Good afternoon'
            : 'Good evening'
    )
    setDate(
      new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(now)
    )

    let cancelled = false
    async function hydrateFromDB() {
      let legacyName: string | undefined
      let legacyPronouns: string | undefined

      try {
        const saved = window.localStorage.getItem('lumina-profile')
        if (saved) {
          const parsed = JSON.parse(saved) as { name?: string; pronouns?: string }
          legacyName = parsed.name
          legacyPronouns = parsed.pronouns
        }
      } catch {
        window.localStorage.removeItem('lumina-profile')
      }

      const [storedState, storedCheckIns, storedLetters] = await Promise.all([
        loadSanctuaryState(),
        getCheckIns(),
        getSealedLetters(),
      ])

      if (cancelled) return

      setCheckIns(storedCheckIns)
      setSealedLetters(storedLetters)

      if (storedState) {
        const resolvedName = storedState.name || legacyName || 'Raa'
        const resolvedPronouns = storedState.pronouns ?? legacyPronouns ?? ''
        setName(resolvedName)
        setPronouns(resolvedPronouns)
        setGardenBlooms(typeof storedState.gardenBlooms === 'number' ? storedState.gardenBlooms : 3)
        if (storedState.lastOrb) setOrb(storedState.lastOrb)
        if (storedState.preferredCompanion) setCompanion(storedState.preferredCompanion)

        if (legacyName !== undefined || legacyPronouns !== undefined) {
          window.localStorage.removeItem('lumina-profile')
        }
      } else if (legacyName !== undefined || legacyPronouns !== undefined) {
        const migratedName = legacyName || 'Raa'
        const migratedPronouns = legacyPronouns || ''
        setName(migratedName)
        setPronouns(migratedPronouns)
        await saveSanctuaryState({
          name: migratedName,
          pronouns: migratedPronouns,
          gardenBlooms: 3,
          lastOrb: { x: 50, y: 52 },
          preferredCompanion: 'The Listener',
        })
        window.localStorage.removeItem('lumina-profile')
      }
    }

    hydrateFromDB()
    return () => {
      cancelled = true
    }
  }, [])

  const persistState = useCallback(
    (overrides?: Partial<{
      name: string
      pronouns: string
      gardenBlooms: number
      lastOrb: Orb
      preferredCompanion: string
    }>) => {
      void saveSanctuaryState({
        name: overrides?.name ?? name,
        pronouns: overrides?.pronouns ?? pronouns,
        gardenBlooms: overrides?.gardenBlooms ?? gardenBlooms,
        lastOrb: overrides?.lastOrb ?? orb,
        preferredCompanion: overrides?.preferredCompanion ?? companion,
      })
    },
    [name, pronouns, gardenBlooms, orb, companion]
  )

  const handleOrbChange = useCallback(
    (nextOrb: Orb) => {
      setOrb(nextOrb)
      persistState({ lastOrb: nextOrb })
    },
    [persistState]
  )

  const handleCompanionChange = useCallback(
    (nextCompanion: string) => {
      setCompanion(nextCompanion)
      setReply('')
      persistState({ preferredCompanion: nextCompanion })
    },
    [persistState]
  )

  const firstName = (hydrated ? name : 'Raa').trim().split(/\s+/)[0] || 'friend'

  const aura = useMemo(
    () =>
      orb.x > 64 && orb.y < 42
        ? {
            label: 'Wired & Overthinking',
            color: '#e7a9bd',
            note: 'There is energy here. Let it soften.',
          }
        : orb.x < 40 && orb.y > 60
          ? {
              label: 'Quietly Heavy',
              color: '#9584bf',
              note: 'You can carry less for the next few minutes.',
            }
          : {
              label: 'Softly Grounded',
              color: '#8ec9bd',
              note: 'A small steadiness is already here.',
            },
    [orb]
  )

  // Dynamic Emotional Weather derived from recent check-ins (falls back to gentle defaults)
  const weatherMetrics = useMemo(() => {
    if (!checkIns.length) {
      return {
        battery: 42,
        load: 78,
        summaryFirst: 'Softly',
        summaryEm: 'cloudy',
        note: 'Your last few mornings felt heavy.',
        subnote: 'Start slowly today.',
      }
    }
    const recent = checkIns.slice(0, 5)
    const avgX = recent.reduce((acc, c) => acc + c.orb.x, 0) / recent.length
    const avgY = recent.reduce((acc, c) => acc + c.orb.y, 0) / recent.length
    const heavyTagCount = recent.reduce(
      (acc, c) =>
        acc +
        c.tags.filter(t =>
          ['Tight chest', 'Overthinking', 'Academic pressure', 'Quietly tired'].includes(t)
        ).length,
      0
    )

    const battery = Math.round(Math.max(18, Math.min(92, avgX * 0.65 + (100 - avgY) * 0.35)))
    const load = Math.round(
      Math.max(22, Math.min(94, avgY * 0.55 + Math.min(40, heavyTagCount * 9)))
    )

    const latestAura = recent[0]?.auraLabel || 'Softly Grounded'
    const summaryFirst =
      latestAura === 'Wired & Overthinking'
        ? 'Restless &'
        : latestAura === 'Quietly Heavy'
          ? 'Softly'
          : 'Gently'
    const summaryEm =
      latestAura === 'Wired & Overthinking'
        ? 'breezy'
        : latestAura === 'Quietly Heavy'
          ? 'cloudy'
          : 'clearing'

    return {
      battery,
      load,
      summaryFirst,
      summaryEm,
      note: `Across ${checkIns.length} check-in${checkIns.length === 1 ? '' : 's'}, your pace is ${latestAura.toLowerCase()}.`,
      subnote: 'Start slowly today.',
    }
  }, [checkIns])

  if (mode === 'exhausted') {
    return (
      <LowStimulus
        onBack={() => setMode('sanctuary')}
        onSupport={() => setSupportOpen(true)}
        supportOpen={supportOpen}
        onClose={() => setSupportOpen(false)}
        rainPlaying={rainPlaying}
        onRain={() => toggleRain(rainPlaying, setRainPlaying, audioRef)}
      />
    )
  }

  function saveProfile() {
    persistState({ name, pronouns })
    setWelcomeOpen(false)
  }

  function companionReply() {
    if (!thought.trim()) return
    const responses: Record<string, string> = {
      'The Listener': `I hear you, ${firstName}. That sounds like a lot to hold. You don't need to make it smaller here.`,
      'The Grounder': `Let's come back to now, ${firstName}. Feel your feet and name one thing that is steady.`,
      'The Guide': `A tiny CBT step, ${firstName}: what is one kinder, more accurate thought you could try on for this moment?`,
      'Boundary Coach': `Here is a kind boundary: “I care about this, and I don't have the capacity to discuss it right now. I'll come back when I can.”`,
    }
    setReply(responses[companion])
    setThought('')
  }

  function toggleVoiceVent() {
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop()
      setListening(false)
      return
    }

    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance
    }
    const SpeechRec = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SpeechRec) {
      setReply(
        `Voice venting isn't supported in this browser, ${firstName}, but you can type freely below.`
      )
      return
    }

    try {
      const recognition = new SpeechRec()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'

      const baseThought = thought.trim() ? `${thought.trim()} ` : ''
      recognition.onresult = event => {
        let transcript = ''
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript
        }
        setThought(`${baseThought}${transcript}`.trimStart())
      }
      recognition.onerror = () => {
        setListening(false)
      }
      recognition.onend = () => {
        setListening(false)
      }

      recognitionRef.current = recognition
      recognition.start()
      setListening(true)
    } catch {
      setListening(false)
      setReply(
        `Microphone access was unavailable, ${firstName}. You can still share by typing whenever you're ready.`
      )
    }
  }

  async function plant() {
    const nextBlooms = gardenBlooms + 1
    setGardenBlooms(nextBlooms)
    const plantedTags = [...tags]
    setTags([])
    setTab('garden')
    persistState({ gardenBlooms: nextBlooms, lastOrb: orb })
    const updated = await addCheckIn({
      timestamp: Date.now(),
      orb,
      auraLabel: aura.label,
      tags: plantedTags,
    })
    if (updated.length) setCheckIns(updated)
  }

  function release() {
    setWorry('')
    setReleased(true)
    setTimeout(() => setReleased(false), 2600)
  }

  async function handleSealLetter() {
    if (!letter.trim()) {
      if (sealedLetters.length > 0) setLettersOpen(true)
      return
    }
    const unlockAt =
      unlock === 'In 7 days' ? Date.now() + 7 * 86400000 : Date.now() + 86400000
    const updated = await saveSealedLetter({
      createdAt: Date.now(),
      unlockCondition: unlock,
      unlockAt,
      content: letter.trim(),
    })
    setSealedLetters(updated)
    setLetter('')
    setLetterSaved(true)
    setTimeout(() => setLetterSaved(false), 3200)
  }

  const waitingCount = sealedLetters.length

  return (
    <main
      className={`min-h-screen overflow-hidden px-4 pb-12 text-[#eeeaf3] sm:px-8 ${
        mode === 'gentle' ? 'gentle-mode' : ''
      }`}
    >
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />
      <div className="aurora aurora-three" />

      <nav className="relative z-10 mx-auto flex max-w-[1440px] items-center justify-between border-b border-white/[0.07] py-5">
        <div className="flex items-center gap-3">
          <div className="brand-mark">
            <Sparkles size={16} />
          </div>
          <div>
            <p className="font-serif text-lg tracking-[0.2em] text-white">LUMINA</p>
            <p className="hidden text-[10px] uppercase tracking-[0.18em] text-white/40 sm:block">
              your emotional sanctuary
            </p>
          </div>
        </div>
        <p className="hidden text-center font-serif text-sm italic text-white/45 lg:block">
          You don&apos;t have to be happy to be worthy of peace.
        </p>
        <div className="flex items-center gap-2">
          <button onClick={() => setSupportOpen(true)} className="support-button">
            <ShieldAlert size={14} />
            <span className="hidden sm:inline">Immediate support</span>
          </button>
          <button onClick={() => setWelcomeOpen(true)} className="profile-pill">
            <span>{firstName.slice(0, 1).toUpperCase()}</span>
            {firstName}
          </button>
          <button
            onClick={() => setMode('exhausted')}
            aria-label="Switch to low stimulus mode"
            className="icon-button"
          >
            <Moon size={16} />
          </button>
        </div>
      </nav>

      <div className="relative z-10 mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 py-5">
        <div>
          <p className="eyebrow" suppressHydrationWarning>
            {hydrated ? date : '\u00A0'}
          </p>
          <h1 className="mt-1 font-serif text-3xl text-white sm:text-4xl" suppressHydrationWarning>
            {hydrated ? greeting : 'Welcome'}, <em>{firstName}.</em>
          </h1>
        </div>
        <ModeToggle mode={mode} setMode={setMode} />
      </div>

      <div className="relative z-10 mx-auto grid max-w-[1440px] gap-5 xl:grid-cols-[1fr_1.25fr_0.88fr]">
        <section className="flex flex-col gap-5">
          <div className={`${glass} p-6`}>
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="eyebrow">Today&apos;s check-in</p>
                <h2 className="mt-2 font-serif text-2xl text-white">Emotional weather</h2>
              </div>
              <CloudSun className="text-[#e7b0ba]" size={26} strokeWidth={1.3} />
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="font-serif text-4xl">
                  {weatherMetrics.summaryFirst}{' '}
                  <em className="text-[#dbaebf]">{weatherMetrics.summaryEm}</em>
                </p>
                <p className="mt-2 text-xs text-white/45">No need to clear the sky today.</p>
              </div>
              <SunMedium className="text-[#e6c88d]" size={31} />
            </div>
            <div className="mt-7 grid grid-cols-2 gap-3">
              <Metric
                icon={<BatteryMedium />}
                label="Emotional battery"
                value={`${weatherMetrics.battery}%`}
                progress={`${weatherMetrics.battery}%`}
                tone="rose"
              />
              <Metric
                icon={<Wind />}
                label="Mental load"
                value={`${weatherMetrics.load}%`}
                progress={`${weatherMetrics.load}%`}
                tone="lavender"
              />
            </div>
            <p className="mt-6 border-l border-[#d5aebf]/60 pl-3 text-sm leading-relaxed text-white/60">
              {weatherMetrics.note}{' '}
              <span className="text-white/85">{weatherMetrics.subnote}</span>
            </p>
          </div>

          <div className={`${glass} p-6`}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="eyebrow">A tiny interruption</p>
                <h2 className="mt-2 font-serif text-xl text-white">I&apos;m stuck in my head</h2>
              </div>
              <Zap size={19} className="text-[#e4c784]" />
            </div>
            <p className="mb-5 text-sm leading-relaxed text-white/45">
              Let&apos;s make a little room around the thought. No fixing required.
            </p>
            <button
              onClick={() => {
                setStuckOpen(true)
                setStep(1)
              }}
              className="primary-button w-full"
            >
              Open a gentle reset <ArrowRight size={15} />
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-5">
          <div className={`${glass} relative min-h-[445px] overflow-hidden p-6 sm:p-8`}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="eyebrow">Your inner landscape</p>
                <h2 className="mt-2 font-serif text-3xl text-white">
                  How are you <em>arriving?</em>
                </h2>
              </div>
              <div className="tab-pill">
                <button
                  onClick={() => setTab('aura')}
                  className={tab === 'aura' ? 'active' : ''}
                >
                  Aura
                </button>
                <button
                  onClick={() => setTab('garden')}
                  className={tab === 'garden' ? 'active' : ''}
                >
                  Garden
                </button>
              </div>
            </div>
            {tab === 'aura' ? (
              <AuraPad
                orb={orb}
                setOrb={handleOrbChange}
                aura={aura}
                tags={tags}
                setTags={setTags}
                plant={plant}
              />
            ) : (
              <Garden blooms={gardenBlooms} />
            )}
          </div>

          <div className={`${glass} flex items-center justify-between gap-4 p-5`}>
            <div className="flex items-center gap-3">
              <div className="mini-orb">
                <Flower2 size={17} />
              </div>
              <div>
                <p className="font-serif text-lg text-white">{gardenBlooms} gentle returns</p>
                <p className="text-xs text-white/40">Your garden grows when you return.</p>
              </div>
            </div>
            <button
              onClick={() => setTab('garden')}
              className="round-arrow"
              aria-label="Open garden"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-5">
          <div className={`${glass} p-6`}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="eyebrow">Soul companion</p>
                <h2 className="mt-2 font-serif text-2xl text-white">Here with you.</h2>
              </div>
              <div className="companion-avatar">
                <Headphones size={17} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {['The Listener', 'The Grounder', 'The Guide', 'Boundary Coach'].map(item => (
                <button
                  key={item}
                  onClick={() => handleCompanionChange(item)}
                  className={`mode-pill ${companion === item ? 'selected' : ''}`}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-white/[0.06] bg-black/10 p-4">
              <p className="min-h-[48px] text-sm leading-relaxed text-white/70">
                {reply ||
                  (companion === 'The Listener'
                    ? 'I am here. You don’t need to make this make sense.'
                    : companion === 'The Grounder'
                      ? 'Let’s notice three things that are steady around you.'
                      : companion === 'The Guide'
                        ? 'We can take one kind, doable step together.'
                        : 'Your peace is allowed to have a boundary.')}
              </p>
              <div className="mt-4 flex gap-2">
                <input
                  value={thought}
                  onChange={e => setThought(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                      companionReply()
                    }
                  }}
                  placeholder={
                    listening
                      ? 'Listening gently... speak freely'
                      : `Tell ${companion === 'The Listener' ? 'me' : 'your companion'} what is here...`
                  }
                  className="companion-input"
                />
                <button
                  onClick={companionReply}
                  className="round-arrow"
                  aria-label="Send thought"
                >
                  <ArrowRight size={15} />
                </button>
                <button
                  onClick={toggleVoiceVent}
                  aria-pressed={listening}
                  title={listening ? 'Stop voice vent' : 'Voice vent'}
                  className={`mic-button transition ${
                    listening
                      ? 'animate-pulse ring-2 ring-[#91cabe]/60 bg-[#91cabe]/25 text-white'
                      : ''
                  }`}
                  aria-label="Voice vent"
                >
                  <Mic size={15} />
                </button>
              </div>
            </div>
          </div>

          <div className={`${glass} p-6`}>
            <div className="flex items-center gap-3">
              <div className="calm-dna">
                <Heart size={16} fill="currentColor" />
              </div>
              <div>
                <p className="eyebrow">Personal calm DNA</p>
                <p className="mt-1 font-serif text-lg text-white">Your gentle pattern</p>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-3 text-xs">
              <DNA icon={<Droplets />} label="Best reset" value="Rain + slow breathing" />
              <DNA
                icon={<Music2 />}
                label="Preferred style"
                value={companion.replace(/^The\s+/i, '') + ' mode'}
              />
              <DNA
                icon={<Leaf />}
                label="Soft spot"
                value={checkIns[0]?.auraLabel || 'Quiet mornings'}
              />
            </div>
            <button
              onClick={() => setProfileOpen(true)}
              className="mt-5 flex items-center gap-2 text-xs text-white/40 transition hover:text-white"
            >
              View your full profile <ChevronRight size={13} />
            </button>
          </div>
        </section>
      </div>

      <section className="relative z-10 mx-auto mt-5 grid max-w-[1440px] gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className={`${glass} p-6 sm:p-8`}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Release room</p>
              <h2 className="mt-2 font-serif text-2xl text-white">A place to put it down.</h2>
            </div>
            <div className="tab-pill">
              <button
                onClick={() => setRitual('burn')}
                className={ritual === 'burn' ? 'active' : ''}
              >
                Burn &amp; release
              </button>
              <button
                onClick={() => setRitual('letter')}
                className={ritual === 'letter' ? 'active' : ''}
              >
                Future self
              </button>
            </div>
          </div>

          {ritual === 'burn' ? (
            <div>
              <div className={`particle-field ${released ? 'visible' : ''}`}>
                {Array.from({ length: 12 }, (_, i) => (
                  <i key={i} style={{ '--i': i } as React.CSSProperties}>
                    ✦
                  </i>
                ))}
              </div>
              <textarea
                value={worry}
                onChange={e => setWorry(e.target.value)}
                placeholder="What feels too loud to carry right now?"
                className={`ritual-textarea ${released ? 'fading' : ''}`}
              />
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xs text-white/35">
                  <LockKeyhole size={12} className="mr-1 inline" />
                  Never saved. Released tonight.
                </p>
                <button onClick={release} className="primary-button">
                  {released ? (
                    <>
                      <Sparkles size={15} />
                      Dissolved
                    </>
                  ) : (
                    <>
                      <Flame size={15} />
                      Dissolve into starlight
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <textarea
                value={letter}
                onChange={e => setLetter(e.target.value)}
                placeholder={`Dear ${firstName}, when this day feels overwhelming...`}
                className="ritual-textarea"
              />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={unlock}
                    onChange={e => setUnlock(e.target.value)}
                    className="unlock-select"
                  >
                    <option>Next heavy day</option>
                    <option>In 7 days</option>
                  </select>
                  {waitingCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setLettersOpen(true)}
                      className="secondary-button text-xs"
                    >
                      <MailOpen size={13} />
                      View {waitingCount} sealed {waitingCount === 1 ? 'letter' : 'letters'}
                    </button>
                  )}
                </div>
                <button onClick={handleSealLetter} className="primary-button">
                  {letterSaved || (!letter.trim() && waitingCount > 0) ? (
                    <>
                      <Check size={15} />
                      {waitingCount || 1} sealed {waitingCount === 1 ? 'letter' : 'letters'} waiting
                    </>
                  ) : (
                    <>
                      <Star size={15} />
                      Seal for {firstName}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={`${glass} flex flex-col justify-between p-6 sm:p-8`}>
          <div>
            <p className="eyebrow">A soft reset</p>
            <h2 className="mt-2 font-serif text-2xl text-white">Rain for your nervous system.</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/45">
              Three minutes of rain and slow breathing. You don&apos;t need to do anything else.
            </p>
          </div>
          <div className="mt-7 flex items-center justify-between">
            <div className={`rain-rings ${rainPlaying ? 'playing' : ''}`}>
              <span />
              <span />
              <span />
              <Droplets size={18} />
            </div>
            <button
              onClick={() => toggleRain(rainPlaying, setRainPlaying, audioRef)}
              className="primary-button"
            >
              {rainPlaying ? (
                <>
                  <span className="pause-bars" />
                  Pause rain
                </>
              ) : (
                <>
                  <Play size={14} fill="currentColor" />
                  Begin 3:00
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {supportOpen && <SupportModal onClose={() => setSupportOpen(false)} />}
      {stuckOpen && (
        <StuckModal step={step} setStep={setStep} onClose={() => setStuckOpen(false)} />
      )}
      {profileOpen && (
        <ProfileModal
          name={firstName}
          pronouns={pronouns}
          companion={companion}
          checkIns={checkIns}
          gardenBlooms={gardenBlooms}
          onClose={() => setProfileOpen(false)}
        />
      )}
      {welcomeOpen && (
        <WelcomeModal
          name={name}
          setName={setName}
          pronouns={pronouns}
          setPronouns={setPronouns}
          save={saveProfile}
          onClose={() => setWelcomeOpen(false)}
        />
      )}
      {lettersOpen && (
        <LettersModal
          firstName={firstName}
          letters={sealedLetters}
          onClose={() => setLettersOpen(false)}
        />
      )}
    </main>
  )
}

function toggleRain(
  playing: boolean,
  setPlaying: (v: boolean) => void,
  ref: React.MutableRefObject<AudioEngineRef | null>
) {
  if (playing) {
    ref.current?.ctx.close().catch(() => {})
    ref.current = null
    setPlaying(false)
    return
  }

  const ctx = new AudioContext()
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

  // Procedural brown/pink rain noise buffer filtered through a warm 800Hz lowpass filter
  const bufferSize = ctx.sampleRate * 3
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const output = noiseBuffer.getChannelData(0)
  let lastOut = 0.0
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
  ref.current = { ctx, nodes, noise: rainSource, gain: masterGain }
  setPlaying(true)
}

function ModeToggle({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  return (
    <div className="mode-toggle">
      <span className="eyebrow hidden sm:block">sensory setting</span>
      {[
        ['sanctuary', 'Full sanctuary'],
        ['gentle', 'Gentle'],
        ['exhausted', 'Low stimulus'],
      ].map(([id, label]) => (
        <button
          key={id}
          onClick={() => setMode(id as Mode)}
          className={mode === id ? 'active' : ''}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function Metric({
  icon,
  label,
  value,
  progress,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  progress: string
  tone: string
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-white/45">
          {icon}
          {label}
        </span>
        <span className="text-white/75">{value}</span>
      </div>
      <div className={`meter ${tone}`}>
        <span style={{ width: progress }} />
      </div>
    </div>
  )
}

function DNA({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[#bba9d3]">{icon}</span>
      <span className="text-white/40">{label}</span>
      <span className="ml-auto text-right text-white/75">{value}</span>
    </div>
  )
}

function AuraPad({
  orb,
  setOrb,
  aura,
  tags,
  setTags,
  plant,
}: {
  orb: Orb
  setOrb: (v: Orb) => void
  aura: { label: string; color: string; note: string }
  tags: string[]
  setTags: (v: string[]) => void
  plant: () => void
}) {
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setOrb({
      x: Math.max(8, Math.min(92, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.max(12, Math.min(88, ((e.clientY - r.top) / r.height) * 100)),
    })
  }
  const choices = [
    'Tight chest',
    'Overthinking',
    'Academic pressure',
    'Quietly tired',
    'Need comfort',
  ]
  return (
    <div className="aura-wrap">
      <div className="axis-label axis-left">low energy</div>
      <div className="axis-label axis-right">high energy</div>
      <div className="axis-label axis-top">pleasant</div>
      <div className="axis-label axis-bottom">tender</div>
      <div
        className="aura-pad"
        onPointerDown={move}
        onPointerMove={e => e.buttons === 1 && move(e)}
      >
        <div className="crosshair x" />
        <div className="crosshair y" />
        <div
          className="aura-orb"
          style={{
            left: `${orb.x}%`,
            top: `${orb.y}%`,
            background: aura.color,
            boxShadow: `0 0 35px ${aura.color}, 0 0 80px ${aura.color}66`,
          }}
        />
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="font-serif text-2xl" style={{ color: aura.color }}>
            {aura.label}
          </p>
          <p className="mt-1 text-xs text-white/45">{aura.note}</p>
        </div>
        <span className="text-xs text-white/30">drag the light</span>
      </div>
      <div className="tag-row">
        {choices.map(tag => (
          <button
            key={tag}
            onClick={() =>
              setTags(tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag])
            }
            className={tags.includes(tag) ? 'selected' : ''}
          >
            {tag}
          </button>
        ))}
      </div>
      <button onClick={plant} disabled={!tags.length} className="plant-button">
        <Flower2 size={14} />
        Plant this check-in into your Garden
      </button>
    </div>
  )
}

function Garden({ blooms }: { blooms: number }) {
  return (
    <div className="garden">
      <div className="stars">
        ✦　·　✧　　·　✦
        <br />
        　·　✧　·　　✦
      </div>
      {Array.from({ length: Math.min(blooms, 8) }, (_, i) => (
        <div
          key={i}
          className={`lotus lotus-${i % 3}`}
          style={{ left: `${20 + ((i * 17) % 65)}%`, top: `${38 + ((i * 13) % 30)}%` }}
        >
          <Flower2 />
        </div>
      ))}
      <div className="garden-ground" />
      <p className="garden-copy">
        Your inner garden is not measured
        <br />
        in streaks. It grows when you return.
      </p>
    </div>
  )
}

function SupportModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <button onClick={onClose} className="modal-close" aria-label="Close">
          <X />
        </button>
        <div className="modal-icon">
          <ShieldAlert />
        </div>
        <p className="eyebrow">You deserve support</p>
        <h2 className="mt-2 font-serif text-3xl text-white">Need immediate care?</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/55">
          If you might hurt yourself or someone else, please contact local emergency services
          now. You don&apos;t have to navigate this moment alone.
        </p>
        <div className="mt-6 grid gap-3">
          <a href="tel:988" className="primary-button justify-center">
            Call or text 988 <ArrowRight size={15} />
          </a>
          <button onClick={onClose} className="secondary-button">
            Stay here and ground with me
          </button>
        </div>
        <p className="mt-5 text-center text-[11px] text-white/30">
          US &amp; Canada · For other regions, contact your local crisis line.
        </p>
      </div>
    </div>
  )
}

function StuckModal({
  step,
  setStep,
  onClose,
}: {
  step: number
  setStep: (n: number) => void
  onClose: () => void
}) {
  const items = [
    'Name the repeating thought',
    'Name the feeling',
    'Reality check',
    '60s breath pacer',
    'Release or reframe',
  ]
  return (
    <div className="modal-backdrop">
      <div className="modal-card wide">
        <button onClick={onClose} className="modal-close" aria-label="Close">
          <X />
        </button>
        <div className="flex items-center gap-2 text-xs text-[#dcaec0]">
          {items.map((_, i) => (
            <span key={i} className={`step-dot ${i + 1 <= step ? 'done' : ''}`}>
              {i + 1}
            </span>
          ))}
        </div>
        <p className="eyebrow mt-7">A gentle reset · step {step} of 5</p>
        <h2 className="mt-2 font-serif text-3xl text-white">{items[step - 1]}</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/50">
          {step === 1
            ? 'What sentence keeps looping in the background?'
            : step === 2
              ? 'Where does that thought land in your body?'
              : step === 3
                ? 'Is this happening now, or is your mind predicting it?'
                : step === 4
                  ? 'Follow the circle. Inhale as it grows, exhale as it softens.'
                  : 'You can release the thought, or choose a kinder frame for it.'}
        </p>
        {step === 4 && (
          <div className="breath-orb">
            <span>Breathe</span>
          </div>
        )}
        <div className="mt-8 flex justify-between gap-3">
          <button
            onClick={() => step > 1 && setStep(step - 1)}
            className="secondary-button"
            disabled={step === 1}
          >
            Back
          </button>
          <button
            onClick={() => (step < 5 ? setStep(step + 1) : onClose())}
            className="primary-button"
          >
            {step === 5 ? 'I feel a little lighter' : 'Continue'} <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

function ProfileModal({
  name,
  pronouns,
  companion,
  checkIns,
  gardenBlooms,
  onClose,
}: {
  name: string
  pronouns: string
  companion: string
  checkIns: CheckInRecord[]
  gardenBlooms: number
  onClose: () => void
}) {
  // Derive top recurring tags and dominant aura from IndexedDB check-ins
  const tagCounts: Record<string, number> = {}
  const auraCounts: Record<string, number> = {}
  for (const c of checkIns) {
    auraCounts[c.auraLabel] = (auraCounts[c.auraLabel] || 0) + 1
    for (const t of c.tags) {
      tagCounts[t] = (tagCounts[t] || 0) + 1
    }
  }
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t)
  const dominantAura = Object.entries(auraCounts).sort((a, b) => b[1] - a[1])[0]?.[0]

  const memoryInsight =
    checkIns.length > 0
      ? `Across ${checkIns.length} local check-in${
          checkIns.length === 1 ? '' : 's'
        } (${gardenBlooms} garden blooms), you most often arrive ${
          dominantAura?.toLowerCase() || 'softly grounded'
        } and lean on ${companion}.`
      : 'You soften with rain, quiet mornings, and being met without advice.'

  const energyDrainers =
    topTags.length > 0
      ? `${topTags.join(' · ')} · explaining yourself`
      : 'Urgency · too many tabs · explaining yourself'

  return (
    <div className="modal-backdrop">
      <div className="modal-card wide profile-modal">
        <button onClick={onClose} className="modal-close" aria-label="Close">
          <X />
        </button>
        <p className="eyebrow">
          your emotional twin {pronouns ? `· ${pronouns}` : ''}
        </p>
        <h2 className="mt-2 font-serif text-3xl text-white">{name}&apos;s Calm DNA</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/50">
          A living reflection of what helps you return to yourself. Nothing here is a
          diagnosis; just patterns you&apos;ve noticed.
        </p>
        <div className="insight-grid">
          <div>
            <p className="eyebrow">memory insights</p>
            <p className="mt-2 text-sm text-white/75">{memoryInsight}</p>
          </div>
          <div>
            <p className="eyebrow">energy drainers</p>
            <p className="mt-2 text-sm text-[#e5b6c6]">{energyDrainers}</p>
          </div>
          <div>
            <p className="eyebrow">restorers</p>
            <p className="mt-2 text-sm text-[#a4d1c8]">
              Slow breathing · {companion.toLowerCase()} · warm light · one honest sentence
            </p>
          </div>
        </div>
        <button onClick={onClose} className="primary-button mt-7">
          Keep this close <Heart size={14} fill="currentColor" />
        </button>
      </div>
    </div>
  )
}

function LettersModal({
  firstName,
  letters,
  onClose,
}: {
  firstName: string
  letters: SealedLetter[]
  onClose: () => void
}) {
  const [openedIds, setOpenedIds] = useState<number[]>([])
  const now = Date.now()

  return (
    <div className="modal-backdrop">
      <div className="modal-card wide">
        <button onClick={onClose} className="modal-close" aria-label="Close">
          <X />
        </button>
        <p className="eyebrow">future self archive</p>
        <h2 className="mt-2 font-serif text-3xl text-white">
          Letters waiting for {firstName}
        </h2>
        <p className="mt-2 text-sm text-white/50">
          Kept privately in your sanctuary on this device. Open whenever today feels heavy.
        </p>
        <div className="mt-5 flex max-h-[320px] flex-col gap-3 overflow-y-auto pr-1">
          {letters.map((item, idx) => {
            const id = item.id ?? idx
            const isReady =
              now >= item.unlockAt ||
              item.unlockCondition === 'Next heavy day' ||
              openedIds.includes(id)
            return (
              <div
                key={id}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"
              >
                <div className="flex items-center justify-between text-xs text-white/45">
                  <span>{item.unlockCondition}</span>
                  <span>
                    {new Intl.DateTimeFormat('en-US', {
                      month: 'short',
                      day: 'numeric',
                    }).format(new Date(item.createdAt))}
                  </span>
                </div>
                {isReady ? (
                  <p className="mt-2 font-serif text-base leading-relaxed text-white/85">
                    {item.content}
                  </p>
                ) : (
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs italic text-white/40">
                      Sealed until{' '}
                      {new Intl.DateTimeFormat('en-US', {
                        month: 'short',
                        day: 'numeric',
                      }).format(new Date(item.unlockAt))}
                    </p>
                    <button
                      onClick={() => setOpenedIds(prev => [...prev, id])}
                      className="secondary-button py-1.5 px-3 text-xs"
                    >
                      Open early
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <button onClick={onClose} className="primary-button mt-6">
          Close archive <Check size={14} />
        </button>
      </div>
    </div>
  )
}

function WelcomeModal({
  name,
  setName,
  pronouns,
  setPronouns,
  save,
  onClose,
}: {
  name: string
  setName: (v: string) => void
  pronouns: string
  setPronouns: (v: string) => void
  save: () => void
  onClose: () => void
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <button onClick={onClose} className="modal-close" aria-label="Close">
          <X />
        </button>
        <div className="modal-icon">
          <Sparkles />
        </div>
        <p className="eyebrow">your sanctuary, your pace</p>
        <h2 className="mt-2 font-serif text-3xl text-white">Enter your sanctuary</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/50">
          Tell LUMINA what to call you. This stays on your device.
        </p>
        <label className="field-label">
          Name
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            className="modal-input"
            placeholder="Your name"
          />
        </label>
        <label className="field-label">
          Pronouns or comfort preference <span>(optional)</span>
          <input
            value={pronouns}
            onChange={e => setPronouns(e.target.value)}
            className="modal-input"
            placeholder="she/her · gentle reminders"
          />
        </label>
        <button onClick={save} className="primary-button mt-2 w-full justify-center">
          Save my sanctuary <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}

function LowStimulus({
  onBack,
  onSupport,
  supportOpen,
  onClose,
  rainPlaying,
  onRain,
}: {
  onBack: () => void
  onSupport: () => void
  supportOpen: boolean
  onClose: () => void
  rainPlaying: boolean
  onRain: () => void
}) {
  return (
    <main className="low-stimulus">
      <div className="low-top">
        <button onClick={onBack} className="low-back">
          <RotateCcw size={14} /> return to sanctuary
        </button>
        <button onClick={onSupport} className="support-button">
          <ShieldAlert size={14} /> support
        </button>
      </div>
      <div className="low-center">
        <div className="low-moon">
          <Moon size={27} />
        </div>
        <p className="eyebrow">exhausted / low-stimulus mode</p>
        <h1 className="mt-4 font-serif text-4xl text-white">
          Let&apos;s keep things
          <br />
          <em>simple tonight.</em>
        </h1>
        <p className="mt-5 max-w-sm text-center text-sm leading-relaxed text-white/45">
          No dashboards. No decisions. Just a little room to rest.
        </p>
        <button onClick={onRain} className="primary-button mt-9 px-8">
          {rainPlaying ? <span className="pause-bars" /> : <Play size={15} fill="currentColor" />}
          {rainPlaying ? 'Pause rain' : 'Help me rest · 3:00'}
        </button>
        <p className="mt-5 flex items-center gap-2 text-xs text-white/25">
          <Droplets size={13} />
          rain + slow breathing
        </p>
      </div>
      {supportOpen && <SupportModal onClose={onClose} />}
    </main>
  )
}
