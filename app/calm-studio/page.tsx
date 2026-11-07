'use client'

import { useEffect, useState } from 'react'
import { Check, CloudRain, Droplets, Pause, Play, RotateCcw, Wind } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { useSanctuary } from '@/context/sanctuary-context'
import type { BioRhythmState } from '@/lib/db'
import { formatClock, glass } from '@/lib/format'

interface Phase {
  label: string
  verb: string
  secs: number
  scale: number
}

const CADENCES: Array<{ id: string; name: string; desc: string; phases: Phase[] }> = [
  {
    id: 'calming',
    name: '4s Inhale / 6s Exhale Calming Breath',
    desc: 'A longer exhale gently signals safety to an overstimulated nervous system.',
    phases: [
      { label: 'Inhale', verb: 'Inhale gently', secs: 4, scale: 1.3 },
      { label: 'Exhale', verb: 'Exhale slowly', secs: 6, scale: 0.85 },
    ],
  },
  {
    id: 'box',
    name: '4-4-4-4 Box Breathing',
    desc: 'Even, steady four-count breath to anchor focus when thoughts scatter.',
    phases: [
      { label: 'Inhale', verb: 'Inhale', secs: 4, scale: 1.3 },
      { label: 'Hold', verb: 'Hold softly', secs: 4, scale: 1.3 },
      { label: 'Exhale', verb: 'Exhale', secs: 4, scale: 0.85 },
      { label: 'Hold', verb: 'Rest empty', secs: 4, scale: 0.85 },
    ],
  },
  {
    id: 'quick',
    name: '60s Quick Reset',
    desc: 'Gentle 3s inhale / 5s exhale rhythm for an immediate one-minute nervous system pause.',
    phases: [
      { label: 'Inhale', verb: 'Breathe in softly', secs: 3, scale: 1.26 },
      { label: 'Exhale', verb: 'Release tension out', secs: 5, scale: 0.86 },
    ],
  },
]

const SESSION_SECONDS = 60

function RainConsole() {
  const { rainPlaying, rainSeconds, toggleRain, resetRain } = useSanctuary()
  const countdown = Math.max(0, 180 - (rainSeconds % 180))

  return (
    <section className={`${glass} p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-[#a5d4ca]">Acoustic Rain &amp; Harmonic Pad Studio</p>
          <h2 className="mt-1 font-serif text-2xl text-white">
            Procedural Rain + 174Hz / 261Hz Grounding Synth
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-white/50">
            Real-time pink/brown noise filtered through an 800Hz warm lowpass filter over 174Hz and
            261Hz sine oscillators. Audio persists seamlessly if you explore other sanctuary rooms.
          </p>
        </div>
        <div className={`rain-rings ${rainPlaying ? 'playing' : ''}`} aria-hidden>
          <span />
          <span />
          <span />
          <Droplets size={18} />
        </div>
      </div>

      <div className="mt-6 flex h-16 items-end justify-center gap-1.5" aria-hidden>
        {Array.from({ length: 28 }, (_, i) => (
          <span
            key={i}
            className="w-1.5 origin-bottom rounded-full bg-[#9acfc2]/75"
            style={{
              height: '100%',
              transform: rainPlaying ? undefined : 'scaleY(.22)',
              animation: rainPlaying
                ? `luminaWave ${1.1 + (i % 5) * 0.23}s ease-in-out ${(i % 7) * -0.17}s infinite`
                : undefined,
            }}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-col items-center">
        <p className="eyebrow text-[10px]">3:00 Cycle Countdown</p>
        <p className="mt-1 font-serif text-4xl text-white">{formatClock(countdown)}</p>
        <p className="mt-1 text-[11px] text-white/40">
          Total ambient session time: {formatClock(rainSeconds)}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={toggleRain}
          className="primary-button px-6 py-3 text-sm"
          aria-pressed={rainPlaying}
        >
          {rainPlaying ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}
          {rainPlaying ? 'Pause Acoustic Rain' : 'Play 3:00 Rain & Harmonic Pad'}
        </button>
        <button onClick={resetRain} className="secondary-button px-4 py-3 text-xs">
          <RotateCcw size={13} /> Reset 3:00 Timer
        </button>
      </div>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-white/35">
        <CloudRain size={12} /> Synthesized 100% on-device via Web Audio API
      </p>
    </section>
  )
}

function BreathingStudio() {
  const [cadenceId, setCadenceId] = useState('calming')
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [sessions, setSessions] = useState(0)
  const cadence = CADENCES.find(c => c.id === cadenceId) ?? CADENCES[0]
  const cycleLen = cadence.phases.reduce((a, p) => a + p.secs, 0)

  useEffect(() => {
    if (!running) return
    const startedAt = Date.now()
    const id = window.setInterval(() => {
      const t = (Date.now() - startedAt) / 1000
      if (t >= SESSION_SECONDS) {
        setElapsed(SESSION_SECONDS)
        setRunning(false)
        setSessions(s => s + 1)
      } else setElapsed(t)
    }, 100)
    return () => window.clearInterval(id)
  }, [running])

  let phase = cadence.phases[0]
  let remaining = phase.secs
  const t = elapsed % cycleLen
  let acc = 0
  for (const p of cadence.phases) {
    if (t < acc + p.secs) {
      phase = p
      remaining = Math.max(1, Math.ceil(acc + p.secs - t))
      break
    }
    acc += p.secs
  }

  const idle = !running && elapsed === 0
  const done = !running && elapsed >= SESSION_SECONDS
  const text = idle
    ? 'Ready when you are'
    : done
      ? 'Beautifully done'
      : `${phase.verb}... ${remaining}s`

  return (
    <section className={`${glass} p-6`}>
      <p className="eyebrow">Guided Breathing Studio</p>
      <h2 className="mt-1 font-serif text-2xl text-white">Somatic Breath Pacer</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {CADENCES.map(c => (
          <button
            key={c.id}
            type="button"
            aria-pressed={cadenceId === c.id}
            onClick={() => {
              setCadenceId(c.id)
              setRunning(false)
              setElapsed(0)
            }}
            className={`rounded-full border px-3.5 py-2 text-xs transition ${
              cadenceId === c.id
                ? 'border-[#e1acc1]/60 bg-[#daa9c2]/20 text-[#f4d9e2]'
                : 'border-white/[0.09] bg-white/[0.03] text-white/55 hover:text-white'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-white/45">{cadence.desc}</p>

      <div className="grid h-[220px] place-items-center">
        <div
          className="grid h-32 w-32 place-items-center rounded-full text-white/90"
          style={{
            background:
              'radial-gradient(circle at 35% 30%, rgba(255,255,255,.7), rgba(142,201,189,.55) 55%, rgba(149,132,191,.35))',
            boxShadow:
              '0 0 0 18px rgba(140,190,182,.08), 0 0 0 40px rgba(140,190,182,.04), 0 0 70px rgba(142,201,189,.3)',
            transform: running ? `scale(${phase.scale})` : 'scale(1)',
            transition: `transform ${running ? phase.secs : 0.6}s ease-in-out`,
          }}
          aria-hidden
        >
          <Wind size={24} />
        </div>
      </div>

      <div className="text-center">
        <p className="font-serif text-2xl text-white" role="status" aria-live="polite">
          {text}
        </p>
        <div className="meter mx-auto mt-3 w-64">
          <span style={{ width: `${(elapsed / SESSION_SECONDS) * 100}%` }} />
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            className="primary-button px-6 py-3 text-sm"
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
            {running ? 'Stop Breath Session' : done ? 'Breathe Again' : 'Begin 60s Session'}
          </button>
          <span className="rounded-full border border-white/[0.09] px-3.5 py-2 text-xs text-white/55">
            Completed today: {sessions}
          </span>
        </div>
      </div>
    </section>
  )
}

const GROUNDING_STEPS = [
  {
    step: 'Step 1 · Name it without judging',
    title: 'Name the looping thought quietly',
    body: 'Say to yourself: “My mind is replaying a worry because it is trying to protect me.” Notice it as a sentence, not an emergency.',
  },
  {
    step: 'Step 2 · Loosen the body',
    title: 'Drop your shoulders & unclench your jaw',
    body: 'Press both feet gently into the floor. Let your tongue rest from the roof of your mouth and take one slow exhale.',
  },
  {
    step: 'Step 3 · Shrink the timeline',
    title: 'Return to the next 10 minutes only',
    body: 'You do not have to solve next week tonight. Choose one tiny, kind action for the next ten minutes—water, rest, or stepping away.',
  },
]

function GroundingWalkthrough() {
  const [done, setDone] = useState<boolean[]>([false, false, false])
  const [note, setNote] = useState('')
  const count = done.filter(Boolean).length

  return (
    <section className={`${glass} p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">3-Step Somatic Grounding &amp; Overthinking Interruption</p>
          <h2 className="mt-1 font-serif text-2xl text-white">
            Interrupt the loop gently
          </h2>
        </div>
        <span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1 text-xs text-white/60">
          {count} of 3 complete
        </span>
      </div>

      <ul className="mt-4 grid gap-2.5">
        {GROUNDING_STEPS.map((g, i) => (
          <li key={g.step}>
            <button
              type="button"
              onClick={() => setDone(d => d.map((v, j) => (j === i ? !v : v)))}
              aria-pressed={done[i]}
              className={`flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition ${
                done[i]
                  ? 'border-[#8ec9bd]/45 bg-[#8ec9bd]/12'
                  : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20'
              }`}
            >
              <span
                className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                  done[i]
                    ? 'border-[#8ec9bd] bg-[#8ec9bd] text-[#10231f]'
                    : 'border-white/25'
                }`}
              >
                {done[i] && <Check size={12} />}
              </span>
              <span>
                <span className="eyebrow block text-[9px] text-[#a5d4ca]">{g.step}</span>
                <span className="mt-0.5 block font-serif text-lg text-white">{g.title}</span>
                <span className="mt-1 block text-xs leading-relaxed text-white/55">{g.body}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <input
        className="modal-input mt-4 w-full !text-xs"
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Optional: What is one tiny thing you can do in the next 10 minutes?"
        aria-label="Next 10 minutes intention"
      />

      {count === 3 && (
        <p className="mt-3 text-xs text-[#bfe3da]" role="status">
          You completed all 3 grounding steps. Notice if your shoulders or breath feel even 5%
          softer.
        </p>
      )}
    </section>
  )
}

function RhythmTuner() {
  const { bioRhythm, updateBioRhythm } = useSanctuary()
  const [note, setNote] = useState(bioRhythm.rhythmNote)
  const save = (patch: Partial<BioRhythmState>) => void updateBioRhythm({ ...bioRhythm, ...patch })
  const qualities: Array<[BioRhythmState['sleepQuality'], string]> = [
    ['rested', 'Rested'],
    ['fragmented', 'Fragmented'],
    ['exhausted', 'Exhausted'],
  ]
  return (
    <section className={`${glass} p-6`}>
      <p className="eyebrow">Biological Rhythm &amp; Rest Tuner</p>
      <h2 className="mt-1 font-serif text-2xl text-white">Pace your sanctuary to your rest</h2>
      <p className="mt-1 text-xs text-white/45">
        Optional. Shapes gentle suggestions across LUMINA and stays 100% on your device.
      </p>
      <label className="mt-4 block text-xs text-white/60" htmlFor="sleep-hours">
        Last night&apos;s rest: <strong className="text-white">{bioRhythm.sleepHours}h</strong>
      </label>
      <input
        id="sleep-hours"
        type="range"
        min={4}
        max={10}
        step={0.5}
        value={bioRhythm.sleepHours}
        onChange={e => save({ sleepHours: Number(e.target.value) })}
        className="mt-2 w-full accent-[#e8b8c7]"
      />
      <div className="flex justify-between text-[10px] text-white/30">
        <span>4h</span>
        <span>7h</span>
        <span>10h</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {qualities.map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={bioRhythm.sleepQuality === id}
            onClick={() => save({ sleepQuality: id })}
            className={`rounded-full border px-3.5 py-2 text-xs ${
              bioRhythm.sleepQuality === id
                ? 'border-[#e1acc1]/60 bg-[#daa9c2]/20 text-[#f4d9e2]'
                : 'border-white/[0.09] bg-white/[0.03] text-white/55 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <input
        className="modal-input mt-4 w-full !text-xs"
        value={note}
        maxLength={160}
        onChange={e => setNote(e.target.value)}
        onBlur={() => note !== bioRhythm.rhythmNote && save({ rhythmNote: note })}
        placeholder="Optional rhythm note (e.g., late study night, quiet morning)"
        aria-label="Rhythm note"
      />
    </section>
  )
}

function CalmStudioContent() {
  return (
    <div className="mx-auto grid w-full max-w-[1200px] gap-5 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <RainConsole />
      </div>
      <BreathingStudio />
      <GroundingWalkthrough />
      <div className="lg:col-span-2">
        <RhythmTuner />
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <AppShell title="Calm Studio" subtitle="Rain & somatic breath">
      <CalmStudioContent />
    </AppShell>
  )
}
