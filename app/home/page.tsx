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
  Maximize2,
  Mic,
  Minimize2,
  Moon,
  Music2,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  SunMedium,
  Wind,
  X,
  Zap,
} from 'lucide-react'
import { formatRelativeTime, SanctuaryScene } from '@/components/sanctuary-scene'
import { useHydrated } from '../hydration-guard'
import { AppShell } from '@/components/app-shell'
import { useSanctuary } from '@/context/sanctuary-context'
import {
  type BioRhythmState,
  type CheckInRecord,
  exportSanctuaryData,
  type SealedLetter,
} from '@/lib/db'


type Mode = 'sanctuary' | 'gentle' | 'exhausted'
type Orb = { x: number; y: number }

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
  return (
    <AppShell>
      <HomeContent />
    </AppShell>
  )
}

function HomeContent() {
  const hydrated = useHydrated()
  const {
    name,
    pronouns,
    gardenBlooms,
    orb,
    aura,
    companion,
    checkIns,
    sealedLetters,
    memories,
    bioRhythm,
    sensoryMode,
    rainPlaying,
    toggleRain,
    setOrb,
    setCompanion,
    plantCheckIn,
    sealLetter,
    addMemory,
    removeMemory,
    updateBioRhythm,
    updateProfileSettings,
    sendCompanionThought,
    eraseAllData,
  } = useSanctuary()

  // The shell's sensory setting is the single source of truth for the page mode.
  const mode: Mode =
    sensoryMode === 'gentle' ? 'gentle' : sensoryMode === 'low' ? 'exhausted' : 'sanctuary'
  const setMode = (m: Mode) =>
    void updateProfileSettings({
      sensoryMode: m === 'gentle' ? 'gentle' : m === 'exhausted' ? 'low' : 'full',
    })

  const [tab, setTab] = useState<'garden' | 'aura'>('aura')
  const [ritual, setRitual] = useState<'burn' | 'letter'>('burn')
  const [immersive, setImmersive] = useState(false)
  const [stuckOpen, setStuckOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [lettersOpen, setLettersOpen] = useState(false)

  const [step, setStep] = useState(1)
  const [worry, setWorry] = useState('')
  const [released, setReleased] = useState(false)
  const [letter, setLetter] = useState('')
  const [letterSaved, setLetterSaved] = useState(false)
  const [unlock, setUnlock] = useState('Next heavy day')

  const [thought, setThought] = useState('')
  const [reply, setReply] = useState('')

  const [tags, setTags] = useState<string[]>([])
  const [breathActive, setBreathActive] = useState(false)
  const [listening, setListening] = useState(false)

  const [selectedBloom, setSelectedBloom] = useState<CheckInRecord | null>(null)
  const [releaseBurstCount, setReleaseBurstCount] = useState(0)
  const [illuminatePulse, setIlluminatePulse] = useState(0)

  const [memoryVaultOpen, setMemoryVaultOpen] = useState(false)
  const [newMemoryText, setNewMemoryText] = useState('')
  const [newMemoryCategory, setNewMemoryCategory] = useState<'anchor' | 'trigger' | 'preference'>(
    'anchor'
  )

  const [inWorldReleaseOpen, setInWorldReleaseOpen] = useState(false)
  const [inWorldWorry, setInWorldWorry] = useState('')
  const [inWorldToast, setInWorldToast] = useState('')

  const [greeting, setGreeting] = useState('Welcome')
  const [date, setDate] = useState('')

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  // Stop speech recognition on unmount (audio now lives in the shared provider).
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // ignore
        }
      }
    }
  }, [])

  // Deterministic greeting + date
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
  }, [])

  const handleCompanionChange = useCallback(
    (nextCompanion: string) => {
      setCompanion(nextCompanion)
      setReply('')
    },
    [setCompanion]
  )


  const firstName = (hydrated ? name : 'Raa').trim().split(/\s+/)[0] || 'friend'

  // Dynamic Emotional Weather derived from recent check-ins + biological rest rhythm
  const weatherMetrics = useMemo(() => {
    const sleepOffset =
      bioRhythm.sleepQuality === 'rested'
        ? Math.round((bioRhythm.sleepHours - 7) * 4) + 8
        : bioRhythm.sleepQuality === 'fragmented'
          ? -8 + Math.round((bioRhythm.sleepHours - 7) * 3)
          : -18 + Math.round((bioRhythm.sleepHours - 7) * 3)

    const loadOffset =
      bioRhythm.sleepQuality === 'exhausted'
        ? 12
        : bioRhythm.sleepQuality === 'fragmented'
          ? 6
          : -4

    const restSubnote =
      bioRhythm.sleepQuality === 'exhausted'
        ? `With ${bioRhythm.sleepHours}h of exhausted rest, lower the bar and move gently.`
        : bioRhythm.sleepQuality === 'fragmented'
          ? `After ${bioRhythm.sleepHours}h of fragmented rest, give yourself extra pauses today.`
          : `Grounded by ${bioRhythm.sleepHours}h of steady rest—pace yourself kindly.`

    if (!checkIns.length) {
      const battery = Math.max(15, Math.min(94, 42 + sleepOffset))
      const load = Math.max(20, Math.min(94, 78 + loadOffset))
      return {
        battery,
        load,
        summaryFirst: bioRhythm.sleepQuality === 'exhausted' ? 'Quietly' : 'Softly',
        summaryEm: bioRhythm.sleepQuality === 'rested' ? 'steady' : 'cloudy',
        note: 'Your sanctuary is calibrated to your rest rhythm.',
        subnote: restSubnote,
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

    const battery = Math.round(
      Math.max(16, Math.min(94, avgX * 0.65 + (100 - avgY) * 0.35 + sleepOffset))
    )
    const load = Math.round(
      Math.max(20, Math.min(95, avgY * 0.55 + Math.min(40, heavyTagCount * 9) + loadOffset))
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
      subnote: restSubnote,
    }
  }, [checkIns, bioRhythm])

  if (mode === 'exhausted') {
    return (
      <LowStimulus
        onBack={() => setMode('sanctuary')}
        rainPlaying={rainPlaying}
        onRain={toggleRain}
      />
    )
  }


  async function handleEraseSanctuaryData() {
    await eraseAllData()
    setTags([])
    setThought('')
    setReply('')
    setLetter('')
    setWorry('')
    setProfileOpen(false)
  }

  function handleAddMemory() {
    const trimmed = newMemoryText.trim()
    if (!trimmed) return
    void addMemory(trimmed, newMemoryCategory)
    setNewMemoryText('')
  }

  function handleDeleteMemory(id: string) {
    void removeMemory(id)
  }

  function handleUpdateBioRhythm(patch: Partial<BioRhythmState>) {
    void updateBioRhythm({ ...bioRhythm, ...patch })
  }


  async function companionReply() {
    const raw = thought.trim()
    if (!raw) return
    setThought('')
    // Crisis guardrail + history live in the shared provider; a detected crisis signal
    // sets crisisAlert, which makes the app shell open the support modal automatically.
    const text = await sendCompanionThought(raw, companion, { tags })
    setReply(text)
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
    const plantedTags = [...tags]
    setTags([])
    setTab('garden')
    await plantCheckIn(plantedTags)
  }


  function release() {
    setWorry('')
    setReleased(true)
    setReleaseBurstCount(c => c + 1)
    setTimeout(() => setReleased(false), 2600)
  }

  async function handleSealLetter() {
    if (!letter.trim()) {
      if (sealedLetters.length > 0) setLettersOpen(true)
      return
    }
    await sealLetter(letter, unlock === 'In 7 days' ? 7 : 1, unlock)
    setLetter('')
    setLetterSaved(true)
    setTimeout(() => setLetterSaved(false), 3200)
  }


  const waitingCount = sealedLetters.length

  return (
    <div className={`relative mx-auto w-full max-w-[1440px] ${mode === 'gentle' ? 'gentle-mode' : ''}`}>

      <div className="relative z-10 mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 py-4">
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

      {/* FULL-WIDTH PANORAMIC 3D SANCTUARY STAGE */}
      <section className="relative z-10 mx-auto w-full max-w-[1440px]">
        <SanctuaryStage
          tab={tab}
          setTab={setTab}
          orb={orb}
          setOrb={setOrb}
          aura={aura}
          tags={tags}
          setTags={setTags}
          plant={plant}
          blooms={gardenBlooms}
          checkIns={checkIns}
          rainPlaying={rainPlaying}
          onToggleRain={() => toggleRain()}
          breathActive={breathActive || (stuckOpen && step === 4)}
          onToggleBreath={() => setBreathActive(v => !v)}
          inWorldReleaseOpen={inWorldReleaseOpen}
          setInWorldReleaseOpen={setInWorldReleaseOpen}
          inWorldWorry={inWorldWorry}
          setInWorldWorry={setInWorldWorry}
          inWorldToast={inWorldToast}
          onBurnInWorldWorry={() => {
            setInWorldReleaseOpen(false)
            setInWorldWorry('')
            setReleaseBurstCount(c => c + 1)
            setInWorldToast('Dissolved into 60 rising embers across your sanctuary pond.')
            setTimeout(() => setInWorldToast(''), 3400)
          }}
          weatherMetrics={weatherMetrics}
          immersive={immersive}
          setImmersive={setImmersive}
          selectedBloom={selectedBloom}
          setSelectedBloom={setSelectedBloom}
          releaseBurstCount={releaseBurstCount}
          illuminatePulse={illuminatePulse}
          onIlluminateBloom={() => setIlluminatePulse(p => p + 1)}
        />
      </section>

      {/* 3-COLUMN SANCTUARY CHAMBERS BELOW THE PANORAMIC STAGE */}
      <div className="relative z-10 mx-auto mt-5 grid max-w-[1440px] gap-5 xl:grid-cols-3">
        {/* CHAMBER 1: Emotional Weather + Biological Rhythm & Rest Tuner + Overthinking Reset */}
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

            {/* Biological Rhythm & Rest Tuner */}
            <div className="mt-5 rounded-2xl border border-white/[0.07] bg-black/15 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="eyebrow text-[9px] text-[#a4d1c8]">
                  Biological rhythm &amp; rest
                </p>
                <span className="text-xs text-white/65">{bioRhythm.sleepHours}h rest</span>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {(
                  [
                    ['rested', 'Rested'],
                    ['fragmented', 'Fragmented'],
                    ['exhausted', 'Exhausted'],
                  ] as const
                ).map(([qId, qLabel]) => (
                  <button
                    key={qId}
                    type="button"
                    onClick={() => handleUpdateBioRhythm({ sleepQuality: qId })}
                    className={`mode-pill py-1 px-2.5 text-[11px] ${
                      bioRhythm.sleepQuality === qId ? 'selected' : ''
                    }`}
                  >
                    {qLabel}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-[10px] text-white/40">4h</span>
                <input
                  type="range"
                  min={4}
                  max={10}
                  step={0.5}
                  value={bioRhythm.sleepHours}
                  onChange={e =>
                    handleUpdateBioRhythm({ sleepHours: parseFloat(e.target.value) })
                  }
                  aria-label="Hours of rest last night"
                  className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-white/10 accent-[#d99eb2]"
                />
                <span className="text-[10px] text-white/40">10h</span>
              </div>
            </div>
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
              onClick={() => setTab(tab === 'garden' ? 'aura' : 'garden')}
              className="round-arrow"
              aria-label="Open garden"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </section>

        {/* CHAMBER 2: Soul Companion (with User-Approved Memory Vault) + Personal Calm DNA */}
        <section className="flex flex-col gap-5">
          <div className={`${glass} p-6`}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="eyebrow">Soul companion</p>
                <h2 className="mt-2 font-serif text-2xl text-white">Here with you.</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMemoryVaultOpen(v => !v)}
                  aria-expanded={memoryVaultOpen}
                  className={`support-button py-1.5 px-3 text-[11px] ${
                    memoryVaultOpen ? 'border-[#e8b8c7]/50 text-[#f4d9e2]' : ''
                  }`}
                >
                  <Sparkles size={12} />
                  <span>Memory Vault ({memories.length})</span>
                </button>
                <div className="companion-avatar">
                  <Headphones size={17} />
                </div>
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
              <p className="mt-3 text-[10px] leading-relaxed text-white/30">
                LUMINA is a non-clinical reflection space, not medical or crisis care.
              </p>
            </div>

            {/* User-Approved Semantic Memory Vault Drawer */}
            {memoryVaultOpen && (
              <div className="mt-4 rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                <div className="flex items-center justify-between">
                  <p className="eyebrow text-[9px] text-[#e8b8c7]">
                    Memory Vault (User-Approved · On-Device)
                  </p>
                  <LockKeyhole size={12} className="text-white/35" />
                </div>
                <p className="mt-1 text-[11px] text-white/45">
                  Personal anchors &amp; boundaries LUMINA holds for you. Delete any memory with
                  one click.
                </p>

                <div className="mt-3 flex max-h-[150px] flex-col gap-2 overflow-y-auto pr-1">
                  {memories.length === 0 ? (
                    <p className="text-xs italic text-white/35">
                      No saved memories. Add a gentle reminder below.
                    </p>
                  ) : (
                    memories.map(m => (
                      <div
                        key={m.id}
                        className="flex items-start justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs"
                      >
                        <div>
                          <span className="eyebrow text-[8px] text-[#a4d1c8]">
                            {m.category}
                          </span>
                          <p className="mt-0.5 text-white/80">{m.text}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteMemory(m.id)}
                          aria-label="Delete memory"
                          className="text-white/35 transition hover:text-white"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <select
                    value={newMemoryCategory}
                    onChange={e =>
                      setNewMemoryCategory(
                        e.target.value as 'anchor' | 'trigger' | 'preference'
                      )
                    }
                    className="unlock-select py-1.5 px-2.5 text-[10px]"
                  >
                    <option value="anchor">Anchor</option>
                    <option value="preference">Preference</option>
                    <option value="trigger">Trigger</option>
                  </select>
                  <input
                    value={newMemoryText}
                    onChange={e => setNewMemoryText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddMemory()
                    }}
                    placeholder="e.g., Remind me to step back during late-night study spirals"
                    className="companion-input py-1.5 text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={handleAddMemory}
                    className="secondary-button py-1.5 px-3 text-[11px]"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
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

        {/* CHAMBER 3: Release Room (Burn & Release + Future Self Letters) + 3:00 Rain Grounding */}
        <section className="flex flex-col gap-5">
          <div className={`${glass} p-6`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Release room</p>
                <h2 className="mt-1.5 font-serif text-2xl text-white">
                  A place to put it down.
                </h2>
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
                        {waitingCount || 1} sealed {waitingCount === 1 ? 'letter' : 'letters'}{' '}
                        waiting
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

          <div className={`${glass} flex flex-col justify-between p-6`}>
            <div>
              <p className="eyebrow">A soft reset</p>
              <h2 className="mt-1.5 font-serif text-2xl text-white">
                Rain for your nervous system.
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-white/45">
                Three minutes of rain and slow breathing. You don&apos;t need to do anything
                else.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <div className={`rain-rings ${rainPlaying ? 'playing' : ''}`}>
                <span />
                <span />
                <span />
                <Droplets size={18} />
              </div>
              <button
                onClick={() => toggleRain()}
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
      </div>

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
          onEraseAll={handleEraseSanctuaryData}
          onClose={() => setProfileOpen(false)}
        />
      )}
      {lettersOpen && (
        <LettersModal
          firstName={firstName}
          letters={sealedLetters}
          onClose={() => setLettersOpen(false)}
        />
      )}
    </div>
  )
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

function SanctuaryStage({
  tab,
  setTab,
  orb,
  setOrb,
  aura,
  tags,
  setTags,
  plant,
  blooms,
  checkIns,
  rainPlaying,
  onToggleRain,
  breathActive,
  onToggleBreath,
  inWorldReleaseOpen,
  setInWorldReleaseOpen,
  inWorldWorry,
  setInWorldWorry,
  inWorldToast,
  onBurnInWorldWorry,
  weatherMetrics,
  immersive,
  setImmersive,
  selectedBloom,
  setSelectedBloom,
  releaseBurstCount,
  illuminatePulse,
  onIlluminateBloom,
}: {
  tab: 'aura' | 'garden'
  setTab: (v: 'aura' | 'garden') => void
  orb: Orb
  setOrb: (v: Orb) => void
  aura: { label: string; color: string; note: string }
  tags: string[]
  setTags: (v: string[]) => void
  plant: () => void
  blooms: number
  checkIns: CheckInRecord[]
  rainPlaying: boolean
  onToggleRain: () => void
  breathActive: boolean
  onToggleBreath: () => void
  inWorldReleaseOpen: boolean
  setInWorldReleaseOpen: (fn: (v: boolean) => boolean) => void
  inWorldWorry: string
  setInWorldWorry: (v: string) => void
  inWorldToast: string
  onBurnInWorldWorry: () => void
  weatherMetrics: {
    battery: number
    load: number
    summaryFirst: string
    summaryEm: string
  }
  immersive: boolean
  setImmersive: (fn: (v: boolean) => boolean) => void
  selectedBloom: CheckInRecord | null
  setSelectedBloom: (b: CheckInRecord | null) => void
  releaseBurstCount: number
  illuminatePulse: number
  onIlluminateBloom: () => void
}) {
  const choices = [
    'Tight chest',
    'Overthinking',
    'Academic pressure',
    'Quietly tired',
    'Need comfort',
  ]
  const totalBlooms = Math.max(blooms, checkIns.length)

  return (
    <div
      className={`${glass} relative w-full overflow-hidden p-2 transition-all duration-500 sm:p-3 ${
        immersive ? 'h-[74vh] min-h-[560px]' : 'h-[460px] sm:h-[500px]'
      }`}
    >
      {/* 3D WebGL Sanctuary Canvas */}
      <SanctuaryScene
        tab={tab}
        orb={orb}
        setOrb={setOrb}
        aura={aura}
        blooms={blooms}
        checkIns={checkIns}
        rainPlaying={rainPlaying}
        immersive={immersive}
        breathActive={breathActive}
        selectedBloom={selectedBloom}
        onSelectBloom={setSelectedBloom}
        releaseBurstCount={releaseBurstCount}
        illuminatePulse={illuminatePulse}
      />

      {/* TOP-LEFT FLOATING PILL (Weather Summary Badge + Mode Switcher) */}
      <div className="pointer-events-none absolute left-4 right-4 top-4 z-10 flex flex-wrap items-center justify-between gap-2 sm:left-6 sm:right-6 sm:top-5">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-white/[0.1] bg-[#0c0a16]/75 px-3.5 py-1.5 text-[11px] text-white/75 backdrop-blur-xl md:flex">
            <CloudSun size={14} className="text-[#e7b0ba]" />
            <span>
              {weatherMetrics.summaryFirst} <em>{weatherMetrics.summaryEm}</em>
            </span>
            <span className="text-white/25">·</span>
            <span>Battery {weatherMetrics.battery}%</span>
            <span className="text-white/25">·</span>
            <span>Load {weatherMetrics.load}%</span>
          </div>

          <div className="tab-pill bg-[#0c0a16]/80 backdrop-blur-xl">
            <button
              onClick={() => setTab('aura')}
              className={tab === 'aura' ? 'active' : ''}
            >
              Sculpt Aura
            </button>
            <button
              onClick={() => setTab('garden')}
              className={tab === 'garden' ? 'active' : ''}
            >
              Living Garden ({totalBlooms} blooms)
            </button>
          </div>
        </div>

        {/* TOP-RIGHT FLOATING PILLS (One-Click Ritual Triggers + Expand View) */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
          <button
            onClick={onToggleRain}
            aria-pressed={rainPlaying}
            className={`support-button bg-[#0c0a16]/75 backdrop-blur-xl ${
              rainPlaying ? 'border-[#91cabe]/50 text-[#a5d4ca]' : ''
            }`}
          >
            <Droplets size={13} />
            <span>{rainPlaying ? 'Pause Rain' : '3:00 Rain'}</span>
          </button>
          <button
            onClick={onToggleBreath}
            aria-pressed={breathActive}
            className={`support-button bg-[#0c0a16]/75 backdrop-blur-xl ${
              breathActive ? 'border-[#e8b8c7]/50 text-[#f4d9e2]' : ''
            }`}
          >
            <Wind size={13} />
            <span>{breathActive ? 'Breathing (4s/6s)' : '60s Breath Reset'}</span>
          </button>
          <button
            onClick={() => setInWorldReleaseOpen(v => !v)}
            aria-pressed={inWorldReleaseOpen}
            className={`support-button bg-[#0c0a16]/75 backdrop-blur-xl ${
              inWorldReleaseOpen ? 'border-[#f0bf9c]/60 text-[#f4d9c6]' : ''
            }`}
          >
            <Flame size={13} />
            <span>Release Worry</span>
          </button>
          <button
            onClick={() => setImmersive(v => !v)}
            aria-label={immersive ? 'Exit Expand View' : 'Expand View'}
            title={immersive ? 'Standard View' : 'Expand View'}
            className="support-button bg-[#0c0a16]/75 backdrop-blur-xl"
          >
            {immersive ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span className="hidden lg:inline">
              {immersive ? 'Standard View' : 'Expand View'}
            </span>
          </button>
        </div>
      </div>

      {/* IN-WORLD BURN & RELEASE RITUAL OVERLAY (Inside 3D Sanctuary Stage) */}
      {inWorldReleaseOpen && (
        <div className="pointer-events-auto absolute right-4 top-16 z-20 w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-[#f0bf9c]/30 bg-[#0d0a18]/90 p-4 shadow-2xl backdrop-blur-2xl sm:right-6 sm:top-16">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="eyebrow text-[#f0bf9c]">In-World Sanctuary Ritual</p>
              <h3 className="mt-1 font-serif text-lg text-white">Burn &amp; release into the Moon Gate</h3>
            </div>
            <button
              onClick={() => setInWorldReleaseOpen(() => false)}
              aria-label="Close in-world release ritual"
              className="rounded-full border border-white/[0.1] bg-white/[0.04] p-1 text-white/60 transition hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-white/55">
            Write a thought you refuse to carry anymore. It is never stored — it dissolves directly into 60 rising embers across the water.
          </p>
          <textarea
            value={inWorldWorry}
            onChange={e => setInWorldWorry(e.target.value)}
            placeholder="I am releasing the pressure to..."
            className="sanctuary-input mt-3 min-h-[72px] text-xs"
          />
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              onClick={() => setInWorldReleaseOpen(() => false)}
              className="secondary-button py-1.5 px-3 text-xs"
            >
              Cancel
            </button>
            <button
              onClick={onBurnInWorldWorry}
              disabled={!inWorldWorry.trim()}
              className="primary-button py-1.5 px-3.5 text-xs"
            >
              <Flame size={13} />
              Burn into embers
            </button>
          </div>
        </div>
      )}

      {/* IN-WORLD FLOATING CONFIRMATION TOAST */}
      {inWorldToast && (
        <div className="pointer-events-none absolute left-1/2 top-16 z-20 -translate-x-1/2 rounded-full border border-[#f0bf9c]/40 bg-[#0d0a18]/85 px-4 py-2 text-xs text-[#f6decb] shadow-lg backdrop-blur-xl">
          <span className="inline-flex items-center gap-2">
            <Sparkles size={13} className="text-[#f0bf9c]" />
            {inWorldToast}
          </span>
        </div>
      )}

      {/* BOTTOM FLOATING GLASS DOCK (Inside the 3D Canvas) */}
      <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 sm:bottom-5 sm:left-6 sm:right-6">
        {tab === 'aura' ? (
          <div className="pointer-events-auto flex flex-col gap-3 rounded-2xl border border-white/[0.11] bg-[#0b0914]/80 px-4 py-3 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
            {/* Left: Current Aura Dot, Title & Short Note */}
            <div className="flex items-center gap-3">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{
                  background: aura.color,
                  boxShadow: `0 0 14px ${aura.color}`,
                }}
              />
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-serif text-lg leading-none" style={{ color: aura.color }}>
                    {aura.label}
                  </p>
                  <span className="hidden text-[10px] uppercase tracking-wider text-white/30 sm:inline">
                    · drag wisp to sculpt
                  </span>
                </div>
                <p className="mt-1 text-xs text-white/50">{aura.note}</p>
              </div>
            </div>

            {/* Center: 5 Somatic Tag Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {choices.map(tag => (
                <button
                  key={tag}
                  onClick={() =>
                    setTags(tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag])
                  }
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                    tags.includes(tag)
                      ? 'border-[#e1acc1]/60 bg-[#daa9c2]/20 text-[#f4d9e2]'
                      : 'border-white/[0.09] bg-white/[0.03] text-white/55 hover:text-white/85'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Right: High-Contrast Plant Check-In CTA */}
            <button
              onClick={plant}
              disabled={!tags.length}
              className="primary-button shrink-0 justify-center py-2 px-4 text-xs"
            >
              <Flower2 size={14} />
              Plant check-in
            </button>
          </div>
        ) : (
          <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.11] bg-[#0b0914]/80 px-4 py-3 backdrop-blur-xl">
            {selectedBloom ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="eyebrow rounded-full border border-[#a4d1c8]/30 bg-[#a4d1c8]/10 px-2.5 py-1 text-[9px] text-[#a4d1c8]">
                  Lotus Memory · {formatRelativeTime(selectedBloom.timestamp)}
                </span>
                <span className="font-serif text-lg text-white">
                  {selectedBloom.auraLabel}
                </span>
                {selectedBloom.tags.map(t => (
                  <span
                    key={t}
                    className="rounded-full border border-white/[0.1] bg-white/[0.06] px-2.5 py-0.5 text-[11px] text-[#f4d9e2]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : (
              <div>
                <p className="font-serif text-base text-white/90">
                  Your inner garden is not measured in streaks. It grows when you return.
                </p>
                <p className="text-xs text-white/45">
                  {totalBlooms} bioluminescent lotus blooms floating before the Moon Gate · Click
                  any lotus to inspect its memory.
                </p>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {selectedBloom && (
                <>
                  <button
                    onClick={onIlluminateBloom}
                    className="secondary-button border-[#a4d1c8]/40 bg-[#a4d1c8]/15 py-1.5 px-3 text-xs text-[#d6f2ec] hover:bg-[#a4d1c8]/25"
                  >
                    <Sparkles size={13} />
                    Illuminate this memory
                  </button>
                  <button
                    onClick={() => setSelectedBloom(null)}
                    className="secondary-button py-1.5 px-3 text-xs"
                  >
                    Back to all blooms
                  </button>
                </>
              )}
              <button
                onClick={() => setTab('aura')}
                className="primary-button py-2 px-4 text-xs"
              >
                Sculpt Aura <ArrowRight size={13} />
              </button>
            </div>
          </div>
        )}
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
  onEraseAll,
  onClose,
}: {
  name: string
  pronouns: string
  companion: string
  checkIns: CheckInRecord[]
  gardenBlooms: number
  onEraseAll: () => Promise<void>
  onClose: () => void
}) {
  const [confirmErase, setConfirmErase] = useState(false)
  const [exported, setExported] = useState(false)

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

  async function handleExportBackup() {
    const payload = await exportSanctuaryData()
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'lumina-sanctuary-backup.json'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setExported(true)
    setTimeout(() => setExported(false), 2600)
  }

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

        <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow text-[9px] text-[#a4d1c8]">
              Your Data Sovereignty (100% On-Device)
            </p>
            <LockKeyhole size={13} className="text-white/40" />
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-white/50">
            Zero cloud databases or telemetry. Your reflections live exclusively in this
            browser&apos;s IndexedDB.
          </p>
          <div className="mt-3.5 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleExportBackup}
              className="secondary-button py-2 px-3.5 text-xs"
            >
              {exported ? (
                <>
                  <Check size={13} /> Backup downloaded
                </>
              ) : (
                'Export Sanctuary Backup (.json)'
              )}
            </button>
            {!confirmErase ? (
              <button
                type="button"
                onClick={() => setConfirmErase(true)}
                className="secondary-button py-2 px-3.5 text-xs text-[#edb4c5]"
              >
                Erase All Local Data
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void onEraseAll()}
                  className="primary-button py-2 px-3.5 text-xs"
                >
                  Confirm permanent erase
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmErase(false)}
                  className="secondary-button py-2 px-3 text-xs"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        <button onClick={onClose} className="primary-button mt-6">
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

function LowStimulus({
  onBack,
  rainPlaying,
  onRain,
}: {
  onBack: () => void
  rainPlaying: boolean
  onRain: () => void
}) {
  return (
    <div className="low-stimulus !min-h-[70vh] rounded-[24px]">
      <div className="low-top">
        <button onClick={onBack} className="low-back">
          <RotateCcw size={14} /> return to sanctuary
        </button>
      </div>
      <div className="low-center !min-h-[55vh]">
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
    </div>
  )
}
