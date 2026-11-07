'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Cloud,
  Database,
  Flame,
  LockKeyhole,
  MailOpen,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { useSanctuary } from '@/context/sanctuary-context'
import { glass, shortDate, timeAgo } from '@/lib/format'

type Tab = 'release' | 'jar' | 'letters'
type ReleaseStyle = 'fire' | 'starlight' | 'mist'

const RELEASE_REACTIONS = [
  '💗 This helped me',
  '🌿 I feel calmer',
  '🪶 I feel lighter',
  '✨ I feel hopeful',
  '🌙 I need more rest',
]

/* ============================================================================
 * 1. CATHARTIC CANVAS PARTICLE ENGINE (FIRE EMBER, STARLIGHT, CLOUD MIST)
 * ========================================================================== */

interface CanvasParticle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  alpha: number
  decay: number
  color: string
  twinklePhase: number
}

function ReleaseCanvasOverlay({
  style,
  active,
}: {
  style: ReleaseStyle
  active: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const rect = canvas.getBoundingClientRect()
    const width = Math.max(300, rect.width)
    const height = Math.max(180, rect.height)
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    const palettes: Record<ReleaseStyle, string[]> = {
      fire: ['#ffb067', '#ff7b54', '#ffd584', '#e8a4b8', '#f39c6b'],
      starlight: ['#f3d9a4', '#e8a4b8', '#b8a4e8', '#7ec8b8', '#ffffff'],
      mist: ['#b8c9e6', '#91cabe', '#d8e3f5', '#c8b8e8', '#a5d4ca'],
    }
    const palette = palettes[style]
    const count = style === 'mist' ? 42 : 68

    const particles: CanvasParticle[] = Array.from({ length: count }, (_, i) => {
      const color = palette[i % palette.length]
      if (style === 'fire') {
        return {
          x: width * (0.1 + Math.random() * 0.8),
          y: height * (0.55 + Math.random() * 0.4),
          vx: (Math.random() - 0.5) * 1.4,
          vy: -(1.2 + Math.random() * 2.4),
          radius: 2 + Math.random() * 4.2,
          alpha: 0.85 + Math.random() * 0.15,
          decay: 0.006 + Math.random() * 0.008,
          color,
          twinklePhase: Math.random() * Math.PI * 2,
        }
      }
      if (style === 'starlight') {
        return {
          x: width * (0.08 + Math.random() * 0.84),
          y: height * (0.25 + Math.random() * 0.65),
          vx: (Math.random() - 0.5) * 1.1,
          vy: -(0.7 + Math.random() * 1.8),
          radius: 1.8 + Math.random() * 3.4,
          alpha: 0.9,
          decay: 0.005 + Math.random() * 0.007,
          color,
          twinklePhase: Math.random() * Math.PI * 2,
        }
      }
      // Cloud mist
      return {
        x: width * (0.12 + Math.random() * 0.76),
        y: height * (0.35 + Math.random() * 0.55),
        vx: (Math.random() - 0.5) * 0.9,
        vy: -(0.45 + Math.random() * 1.1),
        radius: 16 + Math.random() * 26,
        alpha: 0.36 + Math.random() * 0.22,
        decay: 0.0035 + Math.random() * 0.004,
        color,
        twinklePhase: Math.random() * Math.PI * 2,
      }
    })

    let rafId = 0
    let frame = 0

    const render = () => {
      frame++
      ctx.clearRect(0, 0, width, height)

      for (const p of particles) {
        p.x += p.vx + Math.sin(frame * 0.05 + p.twinklePhase) * 0.35
        p.y += p.vy
        p.alpha = Math.max(0, p.alpha - p.decay)

        if (p.alpha <= 0.01) continue

        ctx.save()
        if (style === 'mist') {
          p.radius += 0.18
          const grad = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.radius)
          grad.addColorStop(0, `${p.color}66`)
          grad.addColorStop(0.55, `${p.color}28`)
          grad.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.globalAlpha = p.alpha
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
          ctx.fill()
        } else if (style === 'starlight') {
          const twinkle = 0.65 + 0.35 * Math.sin(frame * 0.18 + p.twinklePhase)
          ctx.globalAlpha = p.alpha * twinkle
          ctx.shadowBlur = 14
          ctx.shadowColor = p.color
          ctx.fillStyle = p.color
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
          ctx.fill()
        } else {
          // Fire ember
          ctx.globalAlpha = p.alpha
          ctx.shadowBlur = 16
          ctx.shadowColor = p.color
          ctx.fillStyle = p.color
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }

      rafId = window.requestAnimationFrame(render)
    }

    rafId = window.requestAnimationFrame(render)
    return () => window.cancelAnimationFrame(rafId)
  }, [active, style])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-20 h-full w-full rounded-2xl"
      aria-hidden
    />
  )
}

function ReleaseRitual() {
  const [text, setText] = useState('')
  const [style, setStyle] = useState<ReleaseStyle>('fire')
  const [phase, setPhase] = useState<'idle' | 'releasing' | 'done'>('idle')
  const [reaction, setReaction] = useState<string | null>(null)
  const [releasedCount, setReleasedCount] = useState(0)
  const timer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
    },
    []
  )

  function release() {
    if (!text.trim() || phase === 'releasing') return
    setPhase('releasing')
    setReaction(null)
    timer.current = window.setTimeout(() => {
      setText('') // permanently discarded from component memory only; never written to IndexedDB
      setReleasedCount(c => c + 1)
      setPhase('done')
    }, 2400)
  }

  const styleMeta: Record<
    ReleaseStyle,
    { label: string; cta: string; desc: string; icon: typeof Flame; accent: string }
  > = {
    fire: {
      label: 'Fire Ember Release',
      cta: 'Burn into Rising Embers',
      desc: 'Watch heavy words dissolve into warm golden and coral embers rising into the night.',
      icon: Flame,
      accent: '#ffb067',
    },
    starlight: {
      label: 'Starlight Dissolve',
      cta: 'Dissolve into Starlight',
      desc: 'Transform looping thoughts into shimmering violet and rose-quartz stardust.',
      icon: Sparkles,
      accent: '#f3d9a4',
    },
    mist: {
      label: 'Cloud Mist Dissolve',
      cta: 'Dissolve into Cloud Mist',
      desc: 'Let tense thoughts soften and diffuse into cool, pearlescent twilight mist.',
      icon: Cloud,
      accent: '#91cabe',
    },
  }

  const activeMeta = styleMeta[style]
  const ActiveIcon = activeMeta.icon

  return (
    <section className={`${glass} p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-[#e8a4b8]">Cathartic Canvas Particle Release</p>
          <h2 className="mt-1 font-serif text-2xl text-white">Digital Release Parchment</h2>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-[#8ec9bd]/30 bg-[#8ec9bd]/10 px-3 py-1 text-[11px] text-[#bfe3da]">
          <LockKeyhole size={11} /> Permanently discarded — never saved to IndexedDB or AI memory
        </span>
      </div>

      {/* 3 Release Ritual Mode Selectors */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="tab-pill flex-wrap">
          {(['fire', 'starlight', 'mist'] as const).map(mode => {
            const Icon = styleMeta[mode].icon
            return (
              <button
                key={mode}
                type="button"
                className={style === mode ? 'active' : ''}
                onClick={() => setStyle(mode)}
                disabled={phase === 'releasing'}
              >
                <Icon size={12} className="mr-1.5 inline" />
                {styleMeta[mode].label}
              </button>
            )
          })}
        </div>
        {releasedCount > 0 && (
          <span className="text-[11px] text-white/45">
            Released in this session: {releasedCount}
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-white/50">{activeMeta.desc}</p>

      <div className="relative mt-4">
        {phase === 'done' ? (
          <div className="flex min-h-[230px] flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-black/25 p-6 text-center">
            <Sparkles className="mx-auto mb-2 text-[#efd099]" size={24} />
            <p className="font-serif text-2xl text-white/90">
              Released into the night. Nothing was kept.
            </p>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-white/50">
              Your thought was dissolved in-memory only and permanently erased. Take one slow
              breath into the space it left behind.
            </p>

            {/* Emoji Quick Reactions */}
            <div className="mt-5">
              <p className="mb-2 text-[11px] text-white/45">How does this release feel?</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {RELEASE_REACTIONS.map(r => {
                  const selected = reaction === r
                  return (
                    <button
                      key={r}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setReaction(selected ? null : r)}
                      className={`rounded-full border px-3 py-1 text-xs transition ${
                        selected
                          ? 'border-[#e8a4b8]/65 bg-[#e8a4b8]/20 text-white'
                          : 'border-white/[0.09] bg-white/[0.03] text-white/65 hover:text-white'
                      }`}
                    >
                      {r}
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              type="button"
              className="secondary-button mx-auto mt-5 px-5 py-2.5 text-xs"
              onClick={() => setPhase('idle')}
            >
              Release Another Thought
            </button>
          </div>
        ) : (
          <div className="relative">
            <div className="relative overflow-hidden rounded-2xl">
              <textarea
                className="ritual-textarea !min-h-[175px]"
                style={
                  phase === 'releasing'
                    ? {
                        opacity: 0.12,
                        filter: 'blur(5px)',
                        transform: 'scale(0.98)',
                        transition: 'all 2.2s ease-out',
                      }
                    : undefined
                }
                value={text}
                onChange={e => setText(e.target.value)}
                disabled={phase === 'releasing'}
                placeholder="Write down a heavy, looping, or self-critical thought you are ready to set down..."
                aria-label="Worry to release"
              />
              <ReleaseCanvasOverlay style={style} active={phase === 'releasing'} />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={release}
                disabled={phase === 'releasing' || !text.trim()}
                className="primary-button px-6 py-3 text-sm"
              >
                <ActiveIcon size={14} />
                {phase === 'releasing' ? 'Dissolving...' : activeMeta.cta}
              </button>
              <span className="text-[11px] text-white/40">
                Zero database writes · Dissolves in 2.4s
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

/* ============================================================================
 * 2. INTERACTIVE VISUAL STAR JAR CONSTELLATION (ADD, REVISIT, REMOVE)
 * ========================================================================== */

function hashCoords(id: string, index: number): { x: number; y: number; size: number; color: string } {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const unsigned = Math.abs(h)
  // Keep stars comfortably inside the jar silhouette (x: 16%..84%, y: 18%..82%)
  const x = 16 + ((unsigned + index * 37) % 68)
  const y = 18 + (((unsigned >> 5) + index * 29) % 64)
  const size = 18 + (unsigned % 10)
  const colors = ['#f3d9a4', '#e8a4b8', '#7ec8b8', '#b8a4e8', '#ffd584']
  const color = colors[unsigned % colors.length]
  return { x, y, size, color }
}

function StarJar() {
  const { starJar, addStarJarNote, removeStarJarNote } = useSanctuary()
  const [text, setText] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const activeStar = useMemo(() => {
    if (!starJar.length) return null
    if (selectedId) {
      return starJar.find(s => s.id === selectedId) ?? starJar[0]
    }
    return starJar[0]
  }, [starJar, selectedId])

  const plottedStars = useMemo(
    () =>
      starJar.map((star, idx) => ({
        ...star,
        ...hashCoords(star.id, idx),
      })),
    [starJar]
  )

  async function handleRemove(id: string) {
    await removeStarJarNote(id)
    if (selectedId === id) {
      setSelectedId(null)
    }
  }

  return (
    <section className={`${glass} p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-[#f3d9a4]">Interactive Visual Star Jar</p>
          <h2 className="mt-1 font-serif text-2xl text-white">
            Constellation of Small Mercies &amp; Wins
          </h2>
          <p className="mt-1 text-xs text-white/50">
            Drop in one small thing you survived, noticed, or appreciated today. Click any glowing
            star in the jar to revisit or remove it.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f3d9a4]/35 bg-[#f3d9a4]/12 px-3.5 py-1 text-xs text-[#f6e4bd]">
          <Star size={13} fill="currentColor" />
          {starJar.length} saved star{starJar.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Add Star Form */}
      <form
        className="mt-4 flex flex-wrap gap-2"
        onSubmit={e => {
          e.preventDefault()
          if (!text.trim()) return
          void addStarJarNote(text)
          setText('')
        }}
      >
        <input
          className="companion-input min-w-[220px] flex-1 !py-2.5 !text-xs"
          value={text}
          maxLength={180}
          onChange={e => setText(e.target.value)}
          placeholder="One small thing I survived, noticed, or appreciated today..."
          aria-label="Star jar note"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="primary-button shrink-0 px-5 py-2.5 text-xs"
        >
          <Star size={13} /> Drop Star into Jar
        </button>
      </form>

      {/* Interactive Star Jar Visual Stage + Selected Star Inspector */}
      <div className="mt-5 grid gap-5 lg:grid-cols-12">
        {/* Left: Interactive Visual Constellation Jar */}
        <div
          className="relative min-h-[260px] overflow-hidden rounded-[28px] border border-white/[0.12] p-5 lg:col-span-7"
          style={{
            background:
              'radial-gradient(circle at 50% 25%, rgba(243, 217, 164, 0.12), rgba(184, 164, 232, 0.08) 48%, rgba(8, 11, 18, 0.92) 100%)',
            boxShadow: 'inset 0 0 50px rgba(243, 217, 164, 0.07)',
          }}
        >
          {/* Decorative Jar Rim & Glow */}
          <div
            className="pointer-events-none mx-auto mb-2 h-3 w-32 rounded-full border border-white/15 bg-white/[0.04]"
            aria-hidden
          />

          {plottedStars.length === 0 ? (
            <div className="grid h-[210px] place-items-center text-center">
              <div>
                <Star className="mx-auto mb-2 text-[#f3d9a4]/40" size={26} />
                <p className="font-serif text-lg text-white/70">
                  Your Star Jar is waiting for its first light
                </p>
                <p className="mt-1 text-xs text-white/40">
                  Drop a note above to see your first glowing star appear in the constellation.
                </p>
              </div>
            </div>
          ) : (
            <div className="relative h-[220px] w-full">
              {/* Subtle SVG Constellation Lines connecting recent stars */}
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-0 h-full w-full opacity-35"
                aria-hidden
              >
                {plottedStars.slice(0, 10).map((s, i, arr) => {
                  const next = arr[i + 1]
                  if (!next) return null
                  return (
                    <line
                      key={`${s.id}-${next.id}`}
                      x1={s.x}
                      y1={s.y}
                      x2={next.x}
                      y2={next.y}
                      stroke="#f3d9a4"
                      strokeWidth="0.35"
                      strokeDasharray="1.5 1.5"
                    />
                  )
                })}
              </svg>

              {/* Interactive Glowing Star Nodes */}
              {plottedStars.map(s => {
                const isSelected = activeStar?.id === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    aria-pressed={isSelected}
                    aria-label={`Star from ${shortDate(s.createdAt)}: ${s.text}`}
                    title={s.text}
                    className="group absolute -translate-x-1/2 -translate-y-1/2 rounded-full p-2 transition-transform hover:scale-125 focus:scale-125 focus:outline-none"
                    style={{
                      left: `${s.x}%`,
                      top: `${s.y}%`,
                    }}
                  >
                    <span
                      className="grid place-items-center rounded-full transition-all"
                      style={{
                        width: isSelected ? s.size + 8 : s.size,
                        height: isSelected ? s.size + 8 : s.size,
                        background: `radial-gradient(circle, #ffffff 15%, ${s.color} 60%, transparent 100%)`,
                        boxShadow: isSelected
                          ? `0 0 24px ${s.color}, 0 0 42px ${s.color}`
                          : `0 0 14px ${s.color}aa`,
                      }}
                    >
                      <Star
                        size={isSelected ? 13 : 10}
                        fill="currentColor"
                        className="text-[#1a1523]"
                      />
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: Active Star Inspector & Accessible Star List */}
        <div className="flex flex-col justify-between gap-4 lg:col-span-5">
          {activeStar ? (
            <div className="rounded-2xl border border-[#f3d9a4]/35 bg-[#f3d9a4]/[0.08] p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="eyebrow flex items-center gap-1.5 text-[9px] text-[#f3d9a4]">
                  <Star size={11} fill="currentColor" /> Selected Star ·{' '}
                  {shortDate(activeStar.createdAt)} ({timeAgo(activeStar.createdAt)})
                </span>
                <button
                  type="button"
                  onClick={() => void handleRemove(activeStar.id)}
                  aria-label="Remove this star from Star Jar"
                  className="inline-flex items-center gap-1 rounded-full border border-white/[0.1] bg-black/25 px-2.5 py-1 text-[10px] text-white/60 transition hover:border-[#edb4c5]/50 hover:text-[#edb4c5]"
                >
                  <Trash2 size={11} /> Remove Star
                </button>
              </div>
              <p className="mt-3 font-serif text-xl leading-relaxed text-[#f6e4bd]">
                “{activeStar.text}”
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 text-xs text-white/45">
              No star selected yet. Add a note above to light your first star.
            </div>
          )}

          {/* Accessible Quick-Select Pills for all saved stars */}
          {starJar.length > 0 && (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
              <p className="eyebrow mb-2.5 text-[9px]">All Saved Stars ({starJar.length})</p>
              <div className="flex max-h-[135px] flex-wrap gap-1.5 overflow-y-auto pr-1">
                {starJar.map(s => {
                  const on = activeStar?.id === s.id
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      aria-pressed={on}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] transition ${
                        on
                          ? 'border-[#efd099]/65 bg-[#efd099]/20 text-[#f6e4bd]'
                          : 'border-white/[0.09] bg-white/[0.03] text-white/65 hover:text-white'
                      }`}
                    >
                      <Star size={10} fill="currentColor" className="text-[#efd099]" />
                      <span className="max-w-[140px] truncate">{s.text}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/* ============================================================================
 * 3. SEALED LETTERS TO YOUR FUTURE SELF
 * ========================================================================== */

const UNLOCKS: Array<{ label: string; days: number }> = [
  { label: 'In 7 days', days: 7 },
  { label: 'In 30 days', days: 30 },
  { label: 'Next heavy day', days: 1 },
]

function Letters() {
  const { sealedLetters, sealLetter } = useSanctuary()
  const [text, setText] = useState('')
  const [unlock, setUnlock] = useState(UNLOCKS[0].label)
  const [sealed, setSealed] = useState(false)
  const [openedIds, setOpenedIds] = useState<number[]>([])
  const now = Date.now()

  async function seal() {
    const choice = UNLOCKS.find(u => u.label === unlock) ?? UNLOCKS[0]
    await sealLetter(text, choice.days, choice.label)
    setText('')
    setSealed(true)
    window.setTimeout(() => setSealed(false), 3200)
  }

  return (
    <section className={`${glass} p-6`}>
      <p className="eyebrow text-[#b8a4e8]">Time-Capsule Reflections</p>
      <h2 className="mt-1 font-serif text-2xl text-white">Sealed Letters to Your Future Self</h2>
      <p className="mt-1 text-xs text-white/50">
        Write a compassionate note for a future day. Stored privately in your local IndexedDB
        (`letters` store) and never sent to any AI model.
      </p>
      <textarea
        className="ritual-textarea mt-4"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Dear future me..."
        aria-label="Letter to future self"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <select
          value={unlock}
          onChange={e => setUnlock(e.target.value)}
          className="unlock-select"
          aria-label="Unlock timing"
        >
          {UNLOCKS.map(u => (
            <option key={u.label}>{u.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void seal()}
          disabled={!text.trim()}
          className="primary-button px-5 py-2.5 text-xs"
        >
          <MailOpen size={13} /> Seal Letter
        </button>
        {sealed && (
          <span className="text-xs text-[#bfe3da]" role="status">
            Sealed and kept privately on this device.
          </span>
        )}
      </div>

      <ul className="mt-5 grid gap-2.5">
        {sealedLetters.length === 0 && <li className="text-xs text-white/35">No letters yet.</li>}
        {sealedLetters.map((l, idx) => {
          const id = l.id ?? idx
          const ready =
            now >= l.unlockAt ||
            l.unlockCondition === 'Next heavy day' ||
            openedIds.includes(id)
          return (
            <li key={id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="flex items-center justify-between text-xs text-white/45">
                <span>{l.unlockCondition}</span>
                <span>Written {shortDate(l.createdAt)}</span>
              </div>
              {ready ? (
                <p className="mt-2 font-serif text-base leading-relaxed text-white/85">
                  {l.content}
                </p>
              ) : (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs italic text-white/40">
                    Sealed until {shortDate(l.unlockAt)}
                  </p>
                  <button
                    type="button"
                    className="secondary-button px-3 py-1.5 text-xs"
                    onClick={() => setOpenedIds(p => [...p, id])}
                  >
                    Open early
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/* ============================================================================
 * 4. EXPLICIT PRIVACY & STORAGE TRANSPARENCY PANEL
 * ========================================================================== */

function StorageTransparencyPanel() {
  const { starJar, sealedLetters, memories, aiMemoryEnabled } = useSanctuary()
  const sharedMemoriesCount = memories.filter(m => m.sharedWithAi !== false).length

  return (
    <section className={`${glass} p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="eyebrow flex items-center gap-1.5 text-[#7ec8b8]">
            <ShieldCheck size={12} /> Explicit Privacy &amp; Storage Transparency
          </p>
          <h2 className="mt-1 font-serif text-xl text-white">
            How LUMINA Handles Released vs. Saved Thoughts
          </h2>
        </div>
        <Link href="/settings" className="secondary-button px-3.5 py-1.5 text-xs">
          Manage Memory Vault &amp; Data →
        </Link>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-[#e8a4b8]/25 bg-[#e8a4b8]/[0.05] p-4">
          <p className="eyebrow flex items-center gap-1.5 text-[9px] text-[#e8a4b8]">
            <Flame size={11} /> 1. Permanently Discarded
          </p>
          <p className="mt-1 font-serif text-base text-white">Burn &amp; Dissolve Parchment</p>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            Thoughts released via Fire Ember, Starlight, or Cloud Mist exist only in temporary
            React component state while you type. Once dissolved, they are cleared from memory and{' '}
            <strong className="text-white/85">never written to IndexedDB or shared with AI</strong>.
          </p>
        </div>

        <div className="rounded-2xl border border-[#f3d9a4]/25 bg-[#f3d9a4]/[0.05] p-4">
          <p className="eyebrow flex items-center gap-1.5 text-[9px] text-[#f3d9a4]">
            <Database size={11} /> 2. Stored On-Device Only
          </p>
          <p className="mt-1 font-serif text-base text-white">
            Star Jar ({starJar.length}) &amp; Letters ({sealedLetters.length})
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            Star Jar notes and Sealed Letters are saved locally in your browser&apos;s IndexedDB (
            <code>lumina_sanctuary_db</code>) so you can revisit them anytime. You can remove any
            individual star right here or erase all data in Settings.
          </p>
        </div>

        <div className="rounded-2xl border border-[#7ec8b8]/25 bg-[#7ec8b8]/[0.05] p-4">
          <p className="eyebrow flex items-center gap-1.5 text-[9px] text-[#7ec8b8]">
            <LockKeyhole size={11} /> 3. User-Approved AI Memories
          </p>
          <p className="mt-1 font-serif text-base text-white">
            Memory Vault ({aiMemoryEnabled ? `${sharedMemoriesCount} shared` : 'Sharing OFF'})
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            Only notes you explicitly save to your Memory Vault and mark{' '}
            <strong className="text-white/85">&ldquo;Shared with AI&rdquo;</strong> are used to
            personalize Soul Companion chats and Sanctuary Reflections.
          </p>
        </div>
      </div>
    </section>
  )
}

function ReleaseRoomContent() {
  const [tab, setTab] = useState<Tab>('release')
  const tabs: Array<[Tab, string]> = [
    ['release', 'Burn & Release Rituals'],
    ['jar', 'Interactive Star Jar'],
    ['letters', 'Sealed Letters'],
  ]
  return (
    <div className="mx-auto w-full max-w-[1080px] space-y-5">
      <div className="tab-pill w-fit" role="tablist">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'release' && <ReleaseRitual />}
      {tab === 'jar' && <StarJar />}
      {tab === 'letters' && <Letters />}

      <StorageTransparencyPanel />
    </div>
  )
}

export default function Page() {
  return (
    <AppShell title="Release Room" subtitle="Cathartic canvas rituals, star jar & sealed letters">
      <ReleaseRoomContent />
    </AppShell>
  )
}
