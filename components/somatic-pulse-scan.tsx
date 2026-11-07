'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  CloudRain,
  Compass,
  Flame,
  Pause,
  Radar,
  Sparkles,
  Star,
  Wind,
} from 'lucide-react'
import { BreathPacerModal } from '@/components/support-modals'
import { useSanctuary } from '@/context/sanctuary-context'
import type { BioRhythmState } from '@/lib/db'
import { formatClock, glass, shortDate } from '@/lib/format'

interface SomaticNode {
  id: string
  label: string
  cueTag: string
  zone: string
  x: number
  y: number
  color: string
  impact: { clarity: number; ease: number; battery: number }
}

const SOMATIC_NODES: SomaticNode[] = [
  {
    id: 'mind',
    label: 'Mind & Focus',
    cueTag: 'Overthinking',
    zone: 'Crown · Mental load & thought loops',
    x: 130,
    y: 52,
    color: '#b8a4e8',
    impact: { clarity: -14, ease: -6, battery: -6 },
  },
  {
    id: 'shoulders',
    label: 'Shoulders & Jaw',
    cueTag: 'Restless',
    zone: 'Upper traps & jaw · Held bracing',
    x: 84,
    y: 112,
    color: '#e8a4b8',
    impact: { clarity: -5, ease: -14, battery: -5 },
  },
  {
    id: 'breath',
    label: 'Breath & Chest',
    cueTag: 'Tight chest',
    zone: 'Sternum · Breath depth & cadence',
    x: 130,
    y: 128,
    color: '#7ec8b8',
    impact: { clarity: -6, ease: -12, battery: -6 },
  },
  {
    id: 'heart',
    label: 'Heart & Comfort',
    cueTag: 'Need comfort',
    zone: 'Heart center · Warmth & connection',
    x: 168,
    y: 146,
    color: '#f3d9a4',
    impact: { clarity: 4, ease: 8, battery: 6 },
  },
  {
    id: 'core',
    label: 'Core Energy',
    cueTag: 'Quietly tired',
    zone: 'Solar plexus · Restorative reserve',
    x: 130,
    y: 192,
    color: '#7ec8b8',
    impact: { clarity: -4, ease: -6, battery: -14 },
  },
]

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function playGentleResonanceChime() {
  if (typeof window === 'undefined') return
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return
  try {
    const ctx = new Ctor()
    const now = ctx.currentTime
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.001, now)
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.25)
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 2.4)
    gain.connect(ctx.destination)

    const freqs = [261.63, 329.63, 392.0, 523.25]
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(f, now + idx * 0.12)
      osc.connect(gain)
      osc.start(now + idx * 0.12)
      osc.stop(now + 2.4)
    })
    window.setTimeout(() => {
      ctx.close().catch(() => {})
    }, 2600)
  } catch {
    // ignore audio block
  }
}

export function SomaticPulseScan() {
  const {
    orb,
    aura,
    checkIns,
    bioRhythm,
    sensoryMode,
    rainPlaying,
    rainSeconds,
    toggleRain,
    updateBioRhythm,
    plantCheckIn,
    addStarJarNote,
  } = useSanctuary()

  const [activeNodeIds, setActiveNodeIds] = useState<string[]>(['heart'])
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanSavedMsg, setScanSavedMsg] = useState('')

  const [chartMode, setChartMode] = useState<'wave' | 'bars'>('wave')
  const [hoverPointIdx, setHoverPointIdx] = useState<number | null>(null)

  const [breathModalOpen, setBreathModalOpen] = useState(false)
  const [microInput, setMicroInput] = useState('')
  const [microMode, setMicroMode] = useState<'star' | 'release'>('star')
  const [microToast, setMicroToast] = useState('')

  // 10-second resonance scan animation & check-in persistence
  useEffect(() => {
    if (!scanning) return
    const start = Date.now()
    const id = window.setInterval(() => {
      const elapsed = (Date.now() - start) / 1000
      if (elapsed >= 10) {
        setScanProgress(100)
        setScanning(false)
        const selectedTags = SOMATIC_NODES.filter(n => activeNodeIds.includes(n.id)).map(
          n => n.cueTag
        )
        const tagsToPlant = selectedTags.length ? selectedTags : ['Softly steady']
        void plantCheckIn(tagsToPlant, '10s Somatic Resonance Scan')
        setScanSavedMsg(`Scan complete · Planted ${tagsToPlant.join(', ')}`)
        window.setTimeout(() => setScanSavedMsg(''), 4200)
      } else {
        setScanProgress(Math.min(99, Math.round((elapsed / 10) * 100)))
      }
    }, 120)
    return () => window.clearInterval(id)
  }, [scanning, activeNodeIds, plantCheckIn])

  function handleStartScan() {
    if (scanning) {
      setScanning(false)
      setScanProgress(0)
      return
    }
    setScanSavedMsg('')
    setScanProgress(0)
    setScanning(true)
    if (sensoryMode === 'full') {
      playGentleResonanceChime()
    }
  }

  function toggleNode(id: string) {
    setActiveNodeIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  // Real-time telemetry metrics derived from orb, sleep bioRhythm, and toggled somatic nodes
  const telemetry = useMemo(() => {
    const sleepDelta =
      bioRhythm.sleepQuality === 'rested'
        ? (bioRhythm.sleepHours - 7) * 4 + 8
        : bioRhythm.sleepQuality === 'fragmented'
          ? (bioRhythm.sleepHours - 7) * 3 - 7
          : (bioRhythm.sleepHours - 7) * 3 - 16

    let clarity = 72 + (orb.x - 50) * 0.3 + sleepDelta * 0.6
    let ease = 70 + (55 - orb.y) * 0.35 + sleepDelta * 0.55
    let battery = 66 + (orb.x * 0.35 + (100 - orb.y) * 0.25 - 30) + sleepDelta

    for (const node of SOMATIC_NODES) {
      if (activeNodeIds.includes(node.id)) {
        clarity += node.impact.clarity
        ease += node.impact.ease
        battery += node.impact.battery
      }
    }

    const clamp = (v: number) => Math.max(18, Math.min(98, Math.round(v)))
    const c = clamp(clarity)
    const e = clamp(ease)
    const b = clamp(battery)
    const balanceScore = Math.round(c * 0.32 + e * 0.34 + b * 0.34)

    const status =
      balanceScore >= 72
        ? { label: 'Steady Baseline', color: '#7ec8b8' }
        : balanceScore >= 52
          ? { label: 'Gently Recharging', color: '#f3d9a4' }
          : { label: 'High Mental Load', color: '#e8a4b8' }

    return { clarity: c, ease: e, battery: b, balanceScore, status }
  }, [orb, bioRhythm, activeNodeIds])

  // Real telemetry series built strictly from user's recorded check-ins (no fabricated baseline points)
  const series = useMemo(() => {
    const recent = [...checkIns].slice(0, 7).reverse()
    const dateCounts: Record<string, number> = {}
    for (const r of recent) {
      const d = shortDate(r.timestamp)
      dateCounts[d] = (dateCounts[d] || 0) + 1
    }

    return recent.map((record, idx) => {
      const val = Math.max(
        22,
        Math.min(94, Math.round(record.orb.x * 0.6 + (100 - record.orb.y) * 0.4))
      )
      const load = Math.max(18, Math.min(92, Math.round(record.orb.y * 0.65 + 15)))
      const dt = new Date(record.timestamp)
      const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(dt)
      const baseDate = shortDate(record.timestamp)
      const timeStr = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
        .format(dt)
        .replace(/\s+/g, '')
        .toLowerCase()
        .replace('am', 'a')
        .replace('pm', 'p')

      // If multiple check-ins happen on the same calendar date, show the distinct time on the X-axis
      const axisLabel = dateCounts[baseDate] > 1 ? timeStr : baseDate
      const fullLabel = `${baseDate} · ${timeStr}`

      return {
        key: `${record.id ?? record.timestamp}-${idx}`,
        day: weekday || WEEK_LABELS[idx % WEEK_LABELS.length],
        dateLabel: axisLabel,
        fullDateLabel: fullLabel,
        auraLabel: record.emotionLabel || record.auraLabel,
        emoji: record.emoji,
        resonance: val,
        calmIndex: 100 - Math.round(load * 0.45),
      }
    })
  }, [checkIns])

  // Build smooth SVG cubic-bezier path for the Resonance Wave
  const waveGeometry = useMemo(() => {
    const w = 320
    const h = 135
    const padX = 22
    const padY = 18
    const usableW = w - padX * 2
    const usableH = h - padY * 2

    if (!series.length) {
      return { pts: [], primaryLine: '', secondaryLine: '', areaPath: '', w, h }
    }

    const pts = series.map((d, i) => ({
      x:
        series.length === 1
          ? w / 2
          : padX + (i / Math.max(1, series.length - 1)) * usableW,
      y: padY + ((100 - d.resonance) / 100) * usableH,
      calmY: padY + ((100 - d.calmIndex) / 100) * usableH,
      data: d,
    }))

    function smoothPath(coords: Array<{ x: number; y: number }>) {
      if (!coords.length) return ''
      if (coords.length === 1) {
        const y = coords[0].y.toFixed(1)
        return `M ${padX} ${y} L ${(w - padX).toFixed(1)} ${y}`
      }
      let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`
      for (let i = 0; i < coords.length - 1; i++) {
        const p0 = coords[i]
        const p1 = coords[i + 1]
        const cx = ((p0.x + p1.x) / 2).toFixed(1)
        d += ` C ${cx} ${p0.y.toFixed(1)}, ${cx} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`
      }
      return d
    }

    const primaryLine = smoothPath(pts)
    const secondaryLine = smoothPath(pts.map(p => ({ x: p.x, y: p.calmY })))
    const firstX = series.length === 1 ? padX : pts[0].x
    const lastX = series.length === 1 ? w - padX : pts[pts.length - 1].x
    const areaPath = `${primaryLine} L ${lastX.toFixed(1)} ${h} L ${firstX.toFixed(1)} ${h} Z`

    return { pts, primaryLine, secondaryLine, areaPath, w, h }
  }, [series])

  const activeNodeDetail =
    SOMATIC_NODES.find(n => n.id === hoveredNodeId) ??
    SOMATIC_NODES.find(n => activeNodeIds.includes(n.id)) ??
    SOMATIC_NODES[0]

  const saveSleep = (patch: Partial<BioRhythmState>) =>
    void updateBioRhythm({ ...bioRhythm, ...patch })

  async function handleMicroSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = microInput.trim()
    if (!trimmed) return
    if (microMode === 'star') {
      await addStarJarNote(trimmed)
      setMicroToast('Saved to your Star Jar ✦')
    } else {
      setMicroToast('Released into twilight embers — never stored.')
    }
    setMicroInput('')
    window.setTimeout(() => setMicroToast(''), 3200)
  }

  // Semi-circular gauge arc calculation (radius 74, arc length = pi * 74 ≈ 232.5)
  const arcRadius = 74
  const arcLength = Math.PI * arcRadius
  const arcOffset = arcLength * (1 - telemetry.balanceScore / 100)

  return (
    <section
      className="grid gap-5 xl:grid-cols-12"
      aria-label="Live Somatic Pulse and Resonance Telemetry"
    >
      {/* 1. LEFT CARD: LIVE SOMATIC & MIND RESONANCE SCAN */}
      <div className={`${glass} relative flex flex-col justify-between overflow-hidden p-5 sm:p-6 xl:col-span-5`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="eyebrow flex items-center gap-1.5 text-[#7ec8b8]">
              <Radar size={12} /> Live Somatic &amp; Mind Resonance
            </p>
            <h2 className="mt-1 font-serif text-2xl text-white">Bioluminescent Body-Mind Map</h2>
          </div>
          <button
            type="button"
            onClick={handleStartScan}
            className={`support-button text-xs ${
              scanning
                ? 'border-[#7ec8b8]/60 bg-[#7ec8b8]/15 text-[#c8f3e9]'
                : 'border-white/[0.12] bg-white/[0.05] text-white/80 hover:text-white'
            }`}
          >
            <Activity size={13} className={scanning ? 'animate-pulse text-[#7ec8b8]' : 'text-[#e8a4b8]'} />
            <span>{scanning ? `Scanning... ${scanProgress}%` : 'Start 10s Resonance Scan'}</span>
          </button>
        </div>

        {/* Interactive Silhouette Stage */}
        <div className="relative my-4 grid min-h-[285px] place-items-center overflow-hidden rounded-2xl border border-white/[0.08] bg-[#070a12]/90 p-3">
          {/* Subtle Telemetry Grid */}
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(126,200,184,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(184,164,232,0.14) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
            aria-hidden
          />

          {/* Sweeping Horizontal Bioluminescent Scan Line */}
          <div
            className="pointer-events-none absolute inset-x-3 h-[2px]"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(126,200,184,0.85), rgba(232,164,184,0.9), transparent)',
              boxShadow: '0 0 18px rgba(126,200,184,0.65)',
              animation: `somaticScanLine ${scanning ? '2.4s' : '7.5s'} ease-in-out infinite`,
            }}
            aria-hidden
          />

          {/* Floating Telemetry Readouts (Left & Right overlays) */}
          <div className="pointer-events-none absolute left-3 top-3 space-y-2 text-[10px]">
            <div className="rounded-xl border border-white/[0.08] bg-[#0b0e18]/85 px-2.5 py-1.5 backdrop-blur-md">
              <span className="block text-white/40">MENTAL CLARITY</span>
              <span className="font-serif text-base text-[#b8a4e8]">{telemetry.clarity}%</span>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#0b0e18]/85 px-2.5 py-1.5 backdrop-blur-md">
              <span className="block text-white/40">SOMATIC EASE</span>
              <span className="font-serif text-base text-[#7ec8b8]">{telemetry.ease}%</span>
            </div>
          </div>

          <div className="pointer-events-none absolute right-3 top-3 space-y-2 text-right text-[10px]">
            <div className="rounded-xl border border-white/[0.08] bg-[#0b0e18]/85 px-2.5 py-1.5 backdrop-blur-md">
              <span className="block text-white/40">EMOTIONAL BATTERY</span>
              <span className="font-serif text-base text-[#f3d9a4]">{telemetry.battery}%</span>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#0b0e18]/85 px-2.5 py-1.5 backdrop-blur-md">
              <span className="block text-white/40">AURA FIELD</span>
              <span className="font-serif text-xs" style={{ color: aura.color }}>
                {aura.label}
              </span>
            </div>
          </div>

          {/* Artistic Glowing SVG Silhouette + 5 Interactive Somatic Nodes */}
          <svg
            viewBox="0 0 260 250"
            className="relative z-10 h-[250px] w-[260px]"
            role="img"
            aria-label="Interactive somatic silhouette with 5 clickable resonance nodes"
          >
            <defs>
              <radialGradient id="somaticAuraGlow" cx="50%" cy="45%" r="52%">
                <stop offset="0%" stopColor="#7ec8b8" stopOpacity="0.28" />
                <stop offset="55%" stopColor="#b8a4e8" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#080b11" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="silhouetteStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7ec8b8" stopOpacity="0.75" />
                <stop offset="50%" stopColor="#b8a4e8" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#e8a4b8" stopOpacity="0.75" />
              </linearGradient>
            </defs>

            {/* Ambient Halo */}
            <circle cx="130" cy="122" r="98" fill="url(#somaticAuraGlow)" />
            <circle
              cx="130"
              cy="122"
              r="84"
              fill="none"
              stroke="rgba(184,164,232,0.16)"
              strokeDasharray="3 5"
            />

            {/* Head & Crown */}
            <circle
              cx="130"
              cy="52"
              r="24"
              fill="rgba(184,164,232,0.08)"
              stroke="url(#silhouetteStroke)"
              strokeWidth="1.6"
            />
            {/* Neck & Torso Meditative Silhouette */}
            <path
              d="M118 76 C118 86, 108 92, 76 102 C56 108, 48 128, 52 162 C55 188, 72 218, 96 232 L164 232 C188 218, 205 188, 208 162 C212 128, 204 108, 184 102 C152 92, 142 86, 142 76 Z"
              fill="rgba(126,200,184,0.06)"
              stroke="url(#silhouetteStroke)"
              strokeWidth="1.6"
            />
            {/* Central Meridian Axis */}
            <line
              x1="130"
              y1="30"
              x2="130"
              y2="225"
              stroke="rgba(243,217,164,0.22)"
              strokeDasharray="2 4"
            />

            {/* 5 Interactive Somatic Nodes */}
            {SOMATIC_NODES.map(node => {
              const isSelected = activeNodeIds.includes(node.id)
              const isHovered = hoveredNodeId === node.id
              return (
                <g
                  key={node.id}
                  className="cursor-pointer"
                  onClick={() => toggleNode(node.id)}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={`${node.label}: ${node.cueTag}`}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleNode(node.id)
                    }
                  }}
                >
                  {(isSelected || isHovered) && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isSelected ? 17 : 13}
                      fill={node.color}
                      fillOpacity={0.2}
                      stroke={node.color}
                      strokeOpacity={0.65}
                      strokeWidth="1.2"
                    />
                  )}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isSelected ? 7.5 : 5.5}
                    fill={isSelected ? node.color : '#1b2234'}
                    stroke={node.color}
                    strokeWidth="2"
                  />
                </g>
              )
            })}
          </svg>
        </div>

        {/* Node Selector Pills & Active Zone Readout */}
        <div>
          <div className="flex flex-wrap gap-1.5">
            {SOMATIC_NODES.map(node => {
              const on = activeNodeIds.includes(node.id)
              return (
                <button
                  key={node.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleNode(node.id)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                    on
                      ? 'border-[#7ec8b8]/55 bg-[#7ec8b8]/15 text-[#d7f7ef]'
                      : 'border-white/[0.08] bg-white/[0.03] text-white/55 hover:text-white'
                  }`}
                >
                  {node.label}
                </button>
              )
            })}
          </div>
          <p className="mt-2.5 text-xs text-white/50">
            {scanSavedMsg ? (
              <span className="text-[#7ec8b8]">{scanSavedMsg}</span>
            ) : (
              <>
                <strong className="font-medium text-white/75">{activeNodeDetail.label}:</strong>{' '}
                {activeNodeDetail.zone} ({activeNodeDetail.cueTag})
              </>
            )}
          </p>
        </div>
      </div>

      {/* 2. CENTER COLUMN: EMOTIONAL BALANCE GAUGE & RESTORATIVE RECOVERY TUNER */}
      <div className="flex flex-col gap-5 xl:col-span-3">
        {/* Top Sub-card: Radial Arc Gauge */}
        <div className={`${glass} flex flex-1 flex-col items-center justify-between p-5 text-center`}>
          <div className="w-full text-left">
            <p className="eyebrow">Emotional Balance Gauge</p>
            <h3 className="mt-1 font-serif text-xl text-white">Self-Reported Steadiness</h3>
          </div>

          <div className="relative my-2 flex flex-col items-center">
            <svg viewBox="0 0 180 110" className="h-[115px] w-[185px]" aria-hidden>
              <defs>
                <linearGradient id="gaugeArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#e8a4b8" />
                  <stop offset="50%" stopColor="#b8a4e8" />
                  <stop offset="100%" stopColor="#7ec8b8" />
                </linearGradient>
              </defs>
              {/* Background Track */}
              <path
                d="M 16 94 A 74 74 0 0 1 164 94"
                fill="none"
                stroke="rgba(255,255,255,0.09)"
                strokeWidth="12"
                strokeLinecap="round"
              />
              {/* Foreground Active Arc */}
              <path
                d="M 16 94 A 74 74 0 0 1 164 94"
                fill="none"
                stroke="url(#gaugeArcGrad)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={arcLength}
                strokeDashoffset={arcOffset}
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div className="-mt-11 text-center">
              <p className="font-serif text-4xl text-white">{telemetry.balanceScore}%</p>
              <span
                className="mt-1 inline-block rounded-full border px-3 py-0.5 text-[10px] uppercase tracking-wider"
                style={{
                  borderColor: `${telemetry.status.color}55`,
                  background: `${telemetry.status.color}18`,
                  color: telemetry.status.color,
                }}
              >
                {telemetry.status.label}
              </span>
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-white/45">
            Calibrated live from your compass ({Math.round(orb.x)}% pleasantness), somatic scan
            nodes, and rest rhythm.
          </p>
        </div>

        {/* Bottom Sub-card: Restorative Recovery & Sleep Slider */}
        <div className={`${glass} flex flex-col justify-between p-5`}>
          <div>
            <div className="flex items-center justify-between">
              <p className="eyebrow text-[#b8a4e8]">Restorative Recovery Tuner</p>
              <span className="font-serif text-lg text-white">{bioRhythm.sleepHours}h</span>
            </div>
            <p className="mt-1 text-xs text-white/45">
              Drag to recalibrate your emotional battery &amp; resonance gauge.
            </p>

            <input
              type="range"
              min={4}
              max={10}
              step={0.5}
              value={bioRhythm.sleepHours}
              onChange={e => saveSleep({ sleepHours: Number(e.target.value) })}
              aria-label="Sleep hours"
              className="mt-4 w-full accent-[#7ec8b8]"
            />
            <div className="flex justify-between text-[10px] text-white/35">
              <span>4h</span>
              <span>7h</span>
              <span>10h</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-1.5">
            {(['rested', 'fragmented', 'exhausted'] as const).map(q => (
              <button
                key={q}
                type="button"
                aria-pressed={bioRhythm.sleepQuality === q}
                onClick={() => saveSleep({ sleepQuality: q })}
                className={`rounded-xl border px-1 py-1.5 text-center text-[10.5px] font-medium tracking-tight whitespace-nowrap capitalize transition ${
                  bioRhythm.sleepQuality === q
                    ? 'border-[#b8a4e8]/60 bg-[#b8a4e8]/20 text-white'
                    : 'border-white/[0.08] bg-white/[0.03] text-white/60 hover:text-white'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. RIGHT COLUMN: EMOTIONAL RESONANCE OVER TIME + AI MICRO-RITUAL SUGGESTIONS */}
      <div className="flex flex-col gap-5 xl:col-span-4">
        {/* Top Sub-card: Dual Wave & Real Check-In Bar Chart */}
        <div className={`${glass} p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="eyebrow text-[#e8a4b8]">Emotional Resonance Over Time</p>
              <h3 className="mt-0.5 font-serif text-xl text-white">
                {checkIns.length > 0
                  ? `${checkIns.length} Local Check-In${checkIns.length === 1 ? '' : 's'} + Rhythm`
                  : 'Awaiting First Check-In'}
              </h3>
            </div>
            {series.length > 0 && (
              <div className="tab-pill !p-1">
                <button
                  type="button"
                  onClick={() => setChartMode('wave')}
                  className={`!px-2.5 !py-1 !text-[10px] ${chartMode === 'wave' ? 'active' : ''}`}
                >
                  Resonance Wave
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('bars')}
                  className={`!px-2.5 !py-1 !text-[10px] ${chartMode === 'bars' ? 'active' : ''}`}
                >
                  Check-In Bars
                </button>
              </div>
            )}
          </div>

          {series.length === 0 ? (
            <div className="mt-3 flex min-h-[155px] flex-col items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-5 text-center">
              <p className="font-serif text-base text-white/85">
                Your resonance curve will appear here after your first check-in
              </p>
              <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-white/45">
                LUMINA never plots synthetic baseline curves. Record a check-in or run the 10s
                Resonance Scan to begin your authentic timeline.
              </p>
              <Link
                href="/check-in"
                className="secondary-button mt-3 border border-white/[0.1] !px-3.5 !py-1.5 !text-[11px] text-white/80 hover:text-white"
              >
                <Compass size={12} /> Open Emotional Check-In
              </Link>
            </div>
          ) : chartMode === 'wave' ? (
            <div className="mt-3">
              <svg
                viewBox={`0 0 ${waveGeometry.w} ${waveGeometry.h}`}
                className="h-[135px] w-full overflow-visible"
                role="img"
                aria-label="Emotional resonance wave chart"
              >
                <defs>
                  <linearGradient id="waveAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#7ec8b8" stopOpacity="0.38" />
                    <stop offset="60%" stopColor="#b8a4e8" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#080b11" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={waveGeometry.areaPath} fill="url(#waveAreaGrad)" />
                <path
                  d={waveGeometry.secondaryLine}
                  fill="none"
                  stroke="#e8a4b8"
                  strokeOpacity="0.5"
                  strokeWidth="1.6"
                  strokeDasharray="3 3"
                />
                <path
                  d={waveGeometry.primaryLine}
                  fill="none"
                  stroke="#7ec8b8"
                  strokeWidth="2.4"
                />
                {waveGeometry.pts.map((pt, idx) => (
                  <g
                    key={pt.data.key}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoverPointIdx(idx)}
                    onMouseLeave={() => setHoverPointIdx(null)}
                  >
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={hoverPointIdx === idx ? 5.5 : 3.5}
                      fill="#080b11"
                      stroke="#7ec8b8"
                      strokeWidth="2"
                    />
                    <text
                      x={pt.x}
                      y={waveGeometry.h - 2}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.42)"
                      fontSize="9"
                    >
                      {pt.data.dateLabel}
                    </text>
                  </g>
                ))}
              </svg>
              <div className="mt-1 flex items-center justify-between text-[11px] text-white/50">
                {hoverPointIdx !== null && series[hoverPointIdx] ? (
                  <span className="text-[#7ec8b8]">
                    {series[hoverPointIdx].day} ({series[hoverPointIdx].fullDateLabel}):{' '}
                    {series[hoverPointIdx].emoji ? `${series[hoverPointIdx].emoji} ` : ''}
                    {series[hoverPointIdx].auraLabel} · {series[hoverPointIdx].resonance}%
                  </span>
                ) : (
                  <span>Solid teal: Resonance · Dashed rose: Restorative index</span>
                )}
              </div>
            </div>
          ) : (
            <div
              className="mt-4 grid h-[135px] items-end gap-2 px-1 pt-2"
              style={{
                gridTemplateColumns: `repeat(${Math.max(1, series.length)}, minmax(0, 1fr))`,
              }}
            >
              {series.map(item => (
                <div key={item.key} className="flex h-full flex-col items-center justify-end gap-1.5">
                  <div className="relative flex h-[100px] w-full max-w-[36px] items-end justify-center rounded-full bg-white/[0.04] p-1">
                    <span
                      className="w-full rounded-full transition-all duration-500"
                      style={{
                        height: `${item.resonance}%`,
                        background: 'linear-gradient(180deg, #7ec8b8, #e8a4b8)',
                        boxShadow: '0 0 12px rgba(126,200,184,0.3)',
                      }}
                      title={`${item.dateLabel}: ${item.resonance}% (${item.auraLabel})`}
                    />
                  </div>
                  <span className="text-[10px] text-white/45">{item.dateLabel}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Sub-card: AI Micro-Ritual Suggestions & Quick Action Pills */}
        <div className={`${glass} flex flex-1 flex-col justify-between p-5`}>
          <div>
            <p className="eyebrow flex items-center gap-1.5 text-[#f3d9a4]">
              <Sparkles size={12} /> AI Micro-Ritual Suggestions
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBreathModalOpen(true)}
                className="flex items-center gap-2 rounded-2xl border border-white/[0.09] bg-white/[0.035] px-3 py-2.5 text-left text-xs text-white/80 transition hover:border-[#7ec8b8]/50 hover:text-white"
              >
                <Wind size={15} className="shrink-0 text-[#7ec8b8]" />
                <span>
                  <strong className="block font-normal text-white">60s Somatic Breath</strong>
                  <span className="text-[10px] text-white/45">4s/6s pacer</span>
                </span>
              </button>

              <button
                type="button"
                onClick={toggleRain}
                aria-pressed={rainPlaying}
                className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-xs transition ${
                  rainPlaying
                    ? 'border-[#7ec8b8]/60 bg-[#7ec8b8]/15 text-[#d7f7ef]'
                    : 'border-white/[0.09] bg-white/[0.035] text-white/80 hover:border-[#7ec8b8]/50 hover:text-white'
                }`}
              >
                {rainPlaying ? (
                  <Pause size={15} className="shrink-0 text-[#7ec8b8]" />
                ) : (
                  <CloudRain size={15} className="shrink-0 text-[#b8a4e8]" />
                )}
                <span>
                  <strong className="block font-normal text-white">
                    {rainPlaying ? `Rain (${formatClock(rainSeconds)})` : '3:00 Acoustic Rain'}
                  </strong>
                  <span className="text-[10px] text-white/45">174Hz + 261Hz</span>
                </span>
              </button>
            </div>
          </div>

          {/* Inline 1-line Quick Release / Gratitude Star */}
          <form onSubmit={handleMicroSubmit} className="mt-3">
            <div className="mb-1.5 flex items-center justify-between text-[10px]">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMicroMode('star')}
                  className={microMode === 'star' ? 'text-[#f3d9a4] underline' : 'text-white/40'}
                >
                  ✦ Drop Gratitude Star
                </button>
                <button
                  type="button"
                  onClick={() => setMicroMode('release')}
                  className={microMode === 'release' ? 'text-[#e8a4b8] underline' : 'text-white/40'}
                >
                  🔥 Quick Worry Release
                </button>
              </div>
              {microToast && <span className="text-[#7ec8b8]">{microToast}</span>}
            </div>
            <div className="flex gap-2">
              <input
                value={microInput}
                onChange={e => setMicroInput(e.target.value)}
                maxLength={140}
                placeholder={
                  microMode === 'star'
                    ? 'One small win or anchor today...'
                    : 'One thought to dissolve right now...'
                }
                aria-label="Quick micro ritual note"
                className="companion-input !py-2 !text-xs"
              />
              <button
                type="submit"
                disabled={!microInput.trim()}
                className="primary-button shrink-0 !px-3.5 !py-2 !text-xs"
              >
                {microMode === 'star' ? <Star size={12} /> : <Flame size={12} />}
                {microMode === 'star' ? 'Save' : 'Burn'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {breathModalOpen && <BreathPacerModal onClose={() => setBreathModalOpen(false)} />}
    </section>
  )
}
