'use client'

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  Dna,
  Flame,
  Flower2,
  Home,
  Lightbulb,
  Loader2,
  MessageCircleHeart,
  Route,
  Settings,
  SkipForward,
  Sparkles,
  Wind,
} from 'lucide-react'
import { MagicalButton, TiltGlassCard } from '@/components/animation-system'
import { AuthShell } from '@/components/auth-shell'
import { LuminaLoader } from '@/components/lumina-loader'
import { triggerPortalTransition } from '@/components/sanctuary-cinematics'
import { deriveAura, useSanctuary, type Orb } from '@/context/sanctuary-context'

// Three.js is loaded lazily on the client so the route itself renders instantly.
const SanctuaryScene = dynamic(
  () => import('@/components/sanctuary-scene').then(m => m.SanctuaryScene),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 grid place-items-center bg-[#0a0914]" role="status" aria-label="Loading 3D garden">
        <div className="lumina-orb" aria-hidden />
      </div>
    ),
  }
)

const TOTAL = 7
const glass = 'rounded-[24px] border border-white/[0.08] bg-white/[0.045] backdrop-blur-xl'

/* ----------------------------- STEP 1: GARDEN ----------------------------- */
function GardenSandbox() {
  const [tab, setTab] = useState<'aura' | 'garden'>('garden')
  const [orb, setOrb] = useState<Orb>({ x: 50, y: 52 })
  const [blooms, setBlooms] = useState(3)

  return (
    <div className="relative h-[320px] overflow-hidden rounded-[20px] border border-white/[0.1]">
      <SanctuaryScene
        tab={tab}
        orb={orb}
        setOrb={setOrb}
        aura={deriveAura(orb)}
        blooms={blooms}
        checkIns={[]}
        rainPlaying={false}
        immersive={false}
      />
      <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full border border-white/[0.1] bg-[#0b0914]/80 px-3 py-1.5 text-[11px] text-white/60 backdrop-blur-xl">
          {tab === 'garden' ? `${blooms} sample blooms · click a lotus` : 'Drag the wisp to sculpt your aura'}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setBlooms(b => Math.min(b + 1, 12))}
            className="primary-button px-3.5 py-2 text-xs"
          >
            <Flower2 size={13} /> Bloom a sample lotus
          </button>
          <button
            onClick={() => setTab(t => (t === 'garden' ? 'aura' : 'garden'))}
            className="secondary-button bg-[#0b0914]/80 px-3.5 py-2 text-xs backdrop-blur-xl"
          >
            {tab === 'garden' ? 'Sculpt view' : 'Garden view'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------------------------- STEP 2: CHECK-IN ---------------------------- */
const SAMPLE_TAGS = ['Tight chest', 'Overthinking', 'Quietly tired', 'Softly steady']

function CheckInSandbox() {
  const [orb, setOrb] = useState<Orb>({ x: 50, y: 52 })
  const [tags, setTags] = useState<string[]>([])
  const [planted, setPlanted] = useState(false)
  const aura = deriveAura(orb)

  function move(e: PointerEvent<HTMLDivElement>) {
    if (e.type === 'pointermove' && e.buttons !== 1) return
    const r = e.currentTarget.getBoundingClientRect()
    setOrb({
      x: Math.max(4, Math.min(96, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.max(6, Math.min(94, ((e.clientY - r.top) / r.height) * 100)),
    })
    setPlanted(false)
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="aura-wrap !p-0">
        <div
          className="aura-pad !h-[220px] cursor-pointer"
          onPointerDown={move}
          onPointerMove={move}
          role="application"
          aria-label="Emotional compass: click or drag to set pleasantness and energy"
        >
          <span className="crosshair x" />
          <span className="crosshair y" />
          <span className="axis-label axis-left">Unpleasant</span>
          <span className="axis-label axis-right">Pleasant</span>
          <span className="axis-label axis-top">High energy</span>
          <span className="axis-label axis-bottom">Low energy</span>
          <span
            className="aura-orb"
            style={{
              left: `${orb.x}%`,
              top: `${orb.y}%`,
              background: aura.color,
              boxShadow: `0 0 30px ${aura.color}`,
            }}
          />
        </div>
      </div>
      <div className="flex flex-col justify-between gap-4">
        <div>
          <p className="font-serif text-xl" style={{ color: aura.color }}>{aura.label}</p>
          <p className="mt-1 text-xs text-white/50">{aura.note}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {SAMPLE_TAGS.map(t => (
              <button
                key={t}
                aria-pressed={tags.includes(t)}
                onClick={() => {
                  setTags(tags.includes(t) ? tags.filter(x => x !== t) : [...tags, t])
                  setPlanted(false)
                }}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  tags.includes(t)
                    ? 'border-[#e1acc1]/60 bg-[#daa9c2]/20 text-[#f4d9e2]'
                    : 'border-white/[0.09] bg-white/[0.03] text-white/55 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <button onClick={() => setPlanted(true)} disabled={!tags.length} className="primary-button px-4 py-2.5 text-xs">
            <Sparkles size={13} /> Try Sample Check-In
          </button>
          {planted && (
            <p className="mt-3 rounded-2xl border border-[#8ec9bd]/30 bg-[#8ec9bd]/10 p-3 text-xs leading-relaxed text-[#bfe3da]" role="status">
              A glowing seed would now be planted in your garden as a lotus tinted “{aura.label}”, remembering{' '}
              {tags.join(' & ').toLowerCase()}. This was only a sample, so nothing was saved.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ----------------------------- STEP 3: COMPANION --------------------------- */
const MODES = ['The Listener', 'The Grounder', 'The Guide', 'Boundary Coach'] as const
const PROMPTS = [
  'Everything feels urgent right now',
  'I need help protecting my rest',
  'Help me slow down my thoughts',
]
const MODE_BLURB: Record<(typeof MODES)[number], string> = {
  'The Listener': 'Meets you with quiet presence first.',
  'The Grounder': 'Brings you back into your body.',
  'The Guide': 'Offers one small, kind next step.',
  'Boundary Coach': 'Helps you phrase a gentle limit.',
}
const REPLIES: Record<(typeof MODES)[number], string[]> = {
  'The Listener': [
    'That sounds like a lot pressing at once. You don’t have to sort it out right now. I’m here, and we can simply stay with it for a moment.',
    'Wanting to protect your rest is a valid need, not a luxury. Tell me what has been getting in the way, and I’ll just listen.',
    'Racing thoughts are exhausting. Let them spill out here, with no order and no solutions required.',
  ],
  'The Grounder': [
    'Let’s pause the urgency together: drop your shoulders, unclench your jaw, and feel your feet. One slow exhale, then we’ll look again.',
    'Rest begins in the body. Soften your hands, lengthen your exhale, and notice what part of you most wants to lie down.',
    'Try naming five things you can see, then breathe out slowly. Thoughts often loosen when the body feels held.',
  ],
  'The Guide': [
    'When everything feels urgent, little is. What is the single smallest thing that, once done, would make the next hour feel lighter?',
    'Let’s protect rest like an appointment: pick one cutoff time tonight and one thing you’re allowed to leave undone.',
    'Write the loudest thought down, then ask: is this a problem to solve now, or a feeling to carry gently? Decide only the next five minutes.',
  ],
  'Boundary Coach': [
    'A line you could use: “I want to do this well, so I’ll get back to you at [time] after I’ve had space to think.”',
    'Try: “I’m not available after [time]. I’ll pick this up tomorrow when I can give it proper attention.”',
    'Try: “I need a few minutes to slow down before I answer, and I’ll reply once I’ve had that.”',
  ],
}

function CompanionSandbox() {
  const [mode, setMode] = useState<(typeof MODES)[number]>('The Listener')
  const [prompt, setPrompt] = useState<number | null>(null)

  return (
    <div>
      <div className="tab-pill flex-wrap !rounded-2xl">
        {MODES.map(m => (
          <button key={m} onClick={() => setMode(m)} className={mode === m ? 'active' : ''}>
            {m}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-white/45">{MODE_BLURB[mode]}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {PROMPTS.map((p, i) => (
          <button
            key={p}
            onClick={() => setPrompt(i)}
            aria-pressed={prompt === i}
            className={`rounded-full border px-3.5 py-2 text-xs transition ${
              prompt === i
                ? 'border-[#e1acc1]/60 bg-[#daa9c2]/20 text-[#f4d9e2]'
                : 'border-white/[0.09] bg-white/[0.03] text-white/60 hover:text-white'
            }`}
          >
            “{p}”
          </button>
        ))}
      </div>
      <div className="mt-4 min-h-[110px] rounded-2xl border border-white/[0.08] bg-black/20 p-4" aria-live="polite">
        {prompt === null ? (
          <p className="text-xs text-white/35">Choose a sample reflection to hear how {mode} responds.</p>
        ) : (
          <>
            <p className="eyebrow mb-2 flex items-center gap-1.5">
              <MessageCircleHeart size={12} /> {mode}
            </p>
            <p className="font-serif text-lg leading-relaxed text-white/85">{REPLIES[mode][prompt]}</p>
          </>
        )}
      </div>
    </div>
  )
}

/* ------------------------------ STEP 4: BREATH ------------------------------ */
const SAMPLE_SECONDS = 15

function BreathSandbox() {
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!running) return
    const startedAt = Date.now()
    const id = window.setInterval(() => {
      const t = (Date.now() - startedAt) / 1000
      if (t >= SAMPLE_SECONDS) {
        setElapsed(SAMPLE_SECONDS)
        setRunning(false)
      } else setElapsed(t)
    }, 100)
    return () => window.clearInterval(id)
  }, [running])

  const finished = !running && elapsed >= SAMPLE_SECONDS
  const idle = !running && elapsed === 0
  const cycleT = elapsed % 10
  const inhale = cycleT < 4
  const remaining = Math.max(1, Math.ceil(inhale ? 4 - cycleT : 10 - cycleT))
  const label = idle
    ? 'Ready when you are'
    : finished
      ? 'Beautifully done'
      : inhale
        ? `Inhale gently... ${remaining}s`
        : `Exhale slowly... ${remaining}s`

  return (
    <div className="flex flex-col items-center py-2">
      <div className="grid h-[200px] w-full place-items-center">
        <div
          className="grid h-32 w-32 place-items-center rounded-full text-center text-xs text-white/90"
          style={{
            background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,.7), rgba(142,201,189,.55) 55%, rgba(149,132,191,.35))',
            boxShadow: '0 0 0 18px rgba(140,190,182,.08), 0 0 0 38px rgba(140,190,182,.04), 0 0 60px rgba(142,201,189,.3)',
            transform: running ? (inhale ? 'scale(1.3)' : 'scale(0.85)') : 'scale(1)',
            transition: `transform ${running ? (inhale ? 4 : 6) : 0.6}s ease-in-out`,
          }}
          aria-hidden
        >
          <Wind size={22} />
        </div>
      </div>
      <p className="font-serif text-xl text-white" role="status" aria-live="polite">{label}</p>
      <div className="meter mt-3 w-56">
        <span style={{ width: `${(elapsed / SAMPLE_SECONDS) * 100}%` }} />
      </div>
      <button
        className="primary-button mt-5 px-5 py-2.5 text-xs"
        onClick={() => {
          if (running) {
            setRunning(false)
            setElapsed(0)
          } else {
            setElapsed(0)
            setRunning(true)
          }
        }}
      >
        {running ? 'Stop' : finished ? 'Breathe again' : 'Start 15s Sample Breath'}
      </button>
    </div>
  )
}

/* ------------------------------ STEP 5: RELEASE ----------------------------- */
const SAMPLE_WORRY = 'Replaying a conversation I cannot change'

function ReleaseSandbox() {
  const [text, setText] = useState(SAMPLE_WORRY)
  const [phase, setPhase] = useState<'idle' | 'burning' | 'gone'>('idle')
  const timer = useRef<number | null>(null)

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current)
  }, [])

  function burn() {
    setPhase('burning')
    timer.current = window.setTimeout(() => {
      setText('')
      setPhase('gone')
    }, 1500)
  }

  return (
    <div className="relative">
      {phase === 'gone' ? (
        <div className="grid min-h-[170px] place-items-center rounded-2xl border border-white/[0.08] bg-black/20 p-6 text-center">
          <div>
            <Sparkles className="mx-auto mb-2 text-[#efd099]" size={20} />
            <p className="font-serif text-xl text-white/85">Released. Nothing was kept.</p>
            <p className="mt-1 text-xs text-white/45">The parchment is clear and you are lighter for a moment.</p>
            <button
              className="secondary-button mx-auto mt-4 px-4 py-2 text-xs"
              onClick={() => {
                setText(SAMPLE_WORRY)
                setPhase('idle')
              }}
            >
              Reset Sample
            </button>
          </div>
        </div>
      ) : (
        <>
          <textarea
            className={`ritual-textarea ${phase === 'burning' ? 'fading' : ''}`}
            style={phase === 'burning' ? { opacity: 0.3, filter: 'blur(2px)', transition: 'all 1.4s ease-out' } : undefined}
            value={text}
            onChange={e => setText(e.target.value)}
            disabled={phase === 'burning'}
            aria-label="Sample worry to release"
          />
          {phase === 'burning' && (
            <div className="particle-field visible" aria-hidden>
              {Array.from({ length: 12 }, (_, i) => (
                <i key={i} style={{ '--i': i } as React.CSSProperties}>✦</i>
              ))}
            </div>
          )}
          <button
            onClick={burn}
            disabled={phase === 'burning' || !text.trim()}
            className="primary-button mt-4 px-5 py-2.5 text-xs"
          >
            <Flame size={13} /> Burn &amp; Release Sample
          </button>
        </>
      )}
    </div>
  )
}

/* ----------------------------- STEP 6: CALM DNA ----------------------------- */
function CalmDnaSandbox() {
  const { onboarding } = useSanctuary()
  const p = onboarding.preferences
  const [lens, setLens] = useState<'environment' | 'style' | 'pace'>('environment')

  const env = p?.comfortEnvironment || 'Not chosen yet'
  const style = p?.interactionStyle || 'Not chosen yet'
  const time = p?.dailyTime || 'Not chosen yet'

  const lenses = {
    environment: {
      title: 'Atmosphere lens',
      body: p?.comfortEnvironment
        ? `Your sanctuary leans toward “${env}”. Visual and sound choices will softly favor it.`
        : 'Once you choose a comforting environment, your sanctuary will lean toward it.',
    },
    style: {
      title: 'Support lens',
      body: p?.interactionStyle
        ? `You prefer “${style}”, so LUMINA will offer that first and everything else as an option.`
        : 'Once you choose an interaction style, LUMINA will offer it first.',
    },
    pace: {
      title: 'Pace lens',
      body: p?.dailyTime
        ? `Rituals will be shaped around “${time}”, with no pressure to do more.`
        : 'Once you choose a daily time, rituals will be shaped around it.',
    },
  } as const

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Environment', env],
          ['Interaction style', style],
          ['Daily time', time],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <p className="eyebrow">{k}</p>
            <p className="mt-2 font-serif text-lg text-white">{v}</p>
          </div>
        ))}
      </div>
      <div className="tab-pill mt-4 w-fit">
        {(Object.keys(lenses) as Array<keyof typeof lenses>).map(k => (
          <button key={k} onClick={() => setLens(k)} className={lens === k ? 'active' : ''}>
            {lenses[k].title}
          </button>
        ))}
      </div>
      <div className="mt-3 rounded-2xl border border-white/[0.08] bg-black/20 p-4" aria-live="polite">
        <p className="flex items-center gap-2 text-xs text-white/70">
          <Lightbulb size={13} className="text-[#efd099]" /> {lenses[lens].title}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/60">{lenses[lens].body}</p>
        <p className="mt-3 text-[11px] text-white/35">
          Sample lens only. No scores, no diagnoses; just your own choices reflected back.
        </p>
      </div>
    </div>
  )
}

/* ------------------------------ STEP 7: ROOMS ------------------------------- */
const ROOMS: Array<{ name: string; icon: typeof Home; text: string }> = [
  { name: 'Home', icon: Home, text: 'Your 3D sanctuary stage, today’s emotional weather and quick rituals.' },
  { name: 'Inner Garden', icon: Flower2, text: 'Wander your bioluminescent pond and revisit each lotus memory.' },
  { name: 'Emotional Check-In', icon: Compass, text: 'Sculpt your aura and plant a gentle seed in seconds.' },
  { name: 'Soul Companion', icon: MessageCircleHeart, text: 'Four supportive modes, plus memories you approve and can delete.' },
  { name: 'Calm Studio', icon: Wind, text: 'Procedural rain, breathing resets and soothing soundscapes.' },
  { name: 'Release Room', icon: Flame, text: 'Burn heavy thoughts into embers, or seal a letter to your future self.' },
  { name: 'Personal Insights', icon: Dna, text: 'Your Calm DNA, drawn only from your own check-ins.' },
  { name: 'My Journey', icon: Route, text: 'A gentle 30-day path with no streaks and no penalties.' },
  { name: 'Profile & Settings', icon: Settings, text: 'Edit preferences, replay this tour, export or erase everything.' },
]

function RoomsSandbox() {
  const [active, setActive] = useState(0)
  const Room = ROOMS[active]
  return (
    <div>
      <div className="grid grid-cols-3 gap-2.5">
        {ROOMS.map((r, i) => {
          const Icon = r.icon
          const on = i === active
          return (
            <button
              key={r.name}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              aria-pressed={on}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-3 text-center text-[11px] transition sm:text-xs ${
                on
                  ? 'border-[#e1acc1]/60 bg-[#daa9c2]/15 text-[#f4d9e2]'
                  : 'border-white/[0.09] bg-white/[0.03] text-white/55 hover:text-white'
              }`}
            >
              <Icon size={18} strokeWidth={1.5} />
              {r.name}
            </button>
          )
        })}
      </div>
      <p className="mt-4 rounded-2xl border border-white/[0.08] bg-black/20 p-4 text-sm leading-relaxed text-white/65" aria-live="polite">
        <strong className="font-serif text-lg font-normal text-white">{Room.name}.</strong> {Room.text}
      </p>
    </div>
  )
}

/* --------------------------------- PAGE ------------------------------------- */
const STEPS: Array<{ title: string; copy: string; body: () => ReactNode }> = [
  {
    title: 'Your Living Inner Garden',
    copy: 'This is your personal sanctuary. It changes as you explore, reflect, and practice gentle wellness activities.',
    body: () => <GardenSandbox />,
  },
  {
    title: 'Gentle Emotional Check-In',
    copy: 'Record how you are arriving using light, energy, and somatic body cues—no long essays required.',
    body: () => <CheckInSandbox />,
  },
  {
    title: 'Meet Your Soul Companion',
    copy: 'Four distinct supportive modes—never a clinical judge, always a calm sounding board.',
    body: () => <CompanionSandbox />,
  },
  {
    title: 'Somatic Breathing Reset',
    copy: 'When your nervous system feels wired, a longer exhale gently signals safety.',
    body: () => <BreathSandbox />,
  },
  {
    title: 'The Release Room Ritual',
    copy: 'Give heavy or repetitive thoughts a symbolic place to dissolve. Thoughts released here are permanently discarded.',
    body: () => <ReleaseSandbox />,
  },
  {
    title: 'Your Personal Calm DNA',
    copy: 'LUMINA observes what genuinely helps you feel steadier from your own check-ins and preferences—without fake scores or clinical labels.',
    body: () => <CalmDnaSandbox />,
  },
  {
    title: 'Your sanctuary is ready.',
    copy: 'Explore every room of LUMINA at your own pace—there are no streaks to lose and no penalties for missed days.',
    body: () => <RoomsSandbox />,
  },
]

export default function TutorialPage() {
  const router = useRouter()
  const { isHydrated, authUser, updateOnboarding } = useSanctuary()
  const [step, setStep] = useState(1)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (isHydrated && !authUser) router.replace('/welcome')
  }, [isHydrated, authUser, router])

  async function finish() {
    setBusy(true)
    triggerPortalTransition(authUser?.name || 'Friend')
    await updateOnboarding({ tutorialCompleted: true })
    router.push('/home')
  }

  if (!isHydrated || !authUser) {
    return <LuminaLoader />
  }

  const current = STEPS[step - 1]

  return (
    <AuthShell>
      <div className="w-full max-w-3xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="eyebrow rounded-full border border-white/[0.1] bg-white/[0.04] px-3.5 py-1.5 text-[10px] text-[#f4d9e2]">
              STEP 3 OF 3 · INTERACTIVE SANCTUARY TOUR
            </span>
            <p className="mt-2 text-xs text-white/45">Step {step} of {TOTAL}</p>
          </div>
          <div className="text-right">
            <button onClick={finish} disabled={busy} className="support-button">
              <SkipForward size={12} /> Skip Tutorial
            </button>
            <p className="mt-1 text-[10px] text-white/35">You can replay this anytime in Settings</p>
          </div>
        </div>

        <div className="meter mb-4" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL} aria-valuenow={step}>
          <span style={{ width: `${(step / TOTAL) * 100}%`, transition: 'width 520ms cubic-bezier(0.16, 1, 0.3, 1)' }} />
        </div>

        <TiltGlassCard className="p-6 sm:p-8" maxTiltDeg={2}>
          <div key={step} className="lumina-stagger-item">
            <h1 className="lumina-hero-title font-serif text-3xl text-white sm:text-4xl">{current.title}</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/60">{current.copy}</p>
            <div className="mt-6">{current.body()}</div>
          </div>

          <div className="mt-8 flex items-center justify-between gap-3">
            {step > 1 ? (
              <button onClick={() => setStep(s => s - 1)} className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white">
                <ArrowLeft size={13} /> Back
              </button>
            ) : (
              <span />
            )}
            {step < TOTAL ? (
              <MagicalButton variant="primary" onClick={() => setStep(s => s + 1)} className="px-6 py-3 text-sm">
                <span>Next</span> <ArrowRight size={14} />
              </MagicalButton>
            ) : (
              <MagicalButton variant="primary" onClick={finish} disabled={busy} className="px-7 py-3 text-sm">
                {busy && <Loader2 size={14} className="animate-spin" />}
                <span>Enter LUMINA</span> <ArrowRight size={14} />
              </MagicalButton>
            )}
          </div>
        </TiltGlassCard>
      </div>
    </AuthShell>
  )
}
