'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Calendar,
  Clock,
  Flower2,
  HeartHandshake,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { useSanctuary } from '@/context/sanctuary-context'
import { EMOTION_OPTIONS, type CheckInRecord, type EmotionOption } from '@/lib/db'
import { glass, SOMATIC_TAGS, shortDate, timeAgo } from '@/lib/format'

interface CompoundAlchemyResult {
  title: string
  subtitle: string
  description: string
  somaticInvitation: string
  recommendedRoomHref: string
  recommendedRoomLabel: string
}

const CUSTOM_ALCHEMY_MATRIX: Record<string, CompoundAlchemyResult> = {
  'exhausted+peaceful': {
    title: 'Softly Spent & Ready to Rest',
    subtitle: 'Sweet twilight fatigue after giving your best',
    description:
      'Your body is tired, yet your heart is quiet. You have carried enough for today and your nervous system is ready to be held by stillness.',
    somaticInvitation: 'Let your shoulders sink into the cushion and listen to 3 minutes of warm rain.',
    recommendedRoomHref: '/calm-studio',
    recommendedRoomLabel: 'Calm Studio',
  },
  'anxious+hopeful': {
    title: 'Trembling Anticipation',
    subtitle: 'Caring deeply about what comes next',
    description:
      'Butterflies and starlight often travel together. The flutter in your chest is not a sign of failure—it is proof that something meaningful matters to you.',
    somaticInvitation: 'Place one palm over your sternum and take three 4s/6s breaths to anchor the excitement.',
    recommendedRoomHref: '/calm-studio',
    recommendedRoomLabel: 'Calm Studio',
  },
  'loved+sad': {
    title: 'Tenderly Held Grief',
    subtitle: 'Heavy rain warmed by quiet connection',
    description:
      'Sadness and love are deeply intertwined. Even while your heart aches, you are capable of feeling warmth, memory, and gentle companionship.',
    somaticInvitation: 'Allow the heaviness to exist without rushing to fix it—plant a lotus in the garden.',
    recommendedRoomHref: '/garden',
    recommendedRoomLabel: 'Inner Garden',
  },
  'exhausted+overwhelmed': {
    title: 'Overcapacity & Needing Shelter',
    subtitle: 'Too many tabs open on an empty battery',
    description:
      'When exhaustion meets overwhelm, even small decisions feel heavy. Nothing is wrong with you—your bandwidth simply needs protection tonight.',
    somaticInvitation: 'Shrink your timeline to the next 10 minutes only and release one unfinished worry.',
    recommendedRoomHref: '/release-room',
    recommendedRoomLabel: 'Release Room',
  },
  'grounded+grateful': {
    title: 'Rooted Sanctuary Glow',
    subtitle: 'Deep steadiness and quiet appreciation',
    description:
      'You are anchored in the present moment and noticing what feels supportive. This is a beautiful moment to bottle a star for a future rainy day.',
    somaticInvitation: 'Save a gratitude star in your Star Jar so future-you can revisit this warmth.',
    recommendedRoomHref: '/release-room',
    recommendedRoomLabel: 'Release Room',
  },
  'anxious+exhausted': {
    title: 'Wired & Overtired',
    subtitle: 'A tired body with a racing mind',
    description:
      'When you push past exhaustion, your nervous system stays on high alert even when you want to sleep. You deserve extra gentleness right now.',
    somaticInvitation: 'Unclench your jaw, dim the stimulus mode, and let The Grounder talk you down.',
    recommendedRoomHref: '/companion',
    recommendedRoomLabel: 'Soul Companion',
  },
  'frustrated+sad': {
    title: 'Bruised Boundaries',
    subtitle: 'Fire protecting a tender hurt underneath',
    description:
      'Frustration often stands guard over sadness or unmet needs. Both the spark of anger and the quiet ache underneath deserve to be heard.',
    somaticInvitation: 'Pour the raw thought into Burn & Release or craft a protective boundary script.',
    recommendedRoomHref: '/companion',
    recommendedRoomLabel: 'Soul Companion',
  },
  'numb+exhausted': {
    title: 'Protective Low-Power Mode',
    subtitle: 'Your nervous system pulling the velvet curtain',
    description:
      'Numbness is not emptiness—it is your mind’s gentle circuit breaker when you have been carrying too much for too long.',
    somaticInvitation: 'Ask nothing of yourself for the next 15 minutes. Simply rest beside the water.',
    recommendedRoomHref: '/garden',
    recommendedRoomLabel: 'Inner Garden',
  },
  'hopeful+grounded': {
    title: 'Steady Morning Horizon',
    subtitle: 'Calm readiness and quiet self-trust',
    description:
      'You are standing on solid ground while looking forward with gentle optimism—moving at the speed of trust rather than urgency.',
    somaticInvitation: 'Explore today’s micro-activity on your 30-Day Gentle Journey.',
    recommendedRoomHref: '/journey',
    recommendedRoomLabel: 'My Journey',
  },
}

function synthesizeCompoundAlchemy(
  primary: EmotionOption,
  secondary: EmotionOption
): CompoundAlchemyResult {
  if (primary.id === secondary.id) {
    return {
      title: `Pure ${primary.label} Resonance`,
      subtitle: `Deeply centered in ${primary.emoji} ${primary.label}`,
      description: `You are experiencing a clear, unmistakable wave of ${primary.label.toLowerCase()}. Honoring a single emotion without judgment lets your nervous system settle.`,
      somaticInvitation: `Take one slow breath and notice where ${primary.label.toLowerCase()} sits in your body right now.`,
      recommendedRoomHref: '/garden',
      recommendedRoomLabel: 'Inner Garden',
    }
  }

  const pairKey = [primary.id, secondary.id].sort().join('+')
  const match = CUSTOM_ALCHEMY_MATRIX[pairKey]
  if (match) return match

  const avgPleasant = (primary.pleasantness + secondary.pleasantness) / 2
  const avgEnergy = (primary.energy + secondary.energy) / 2

  const toneWord =
    avgPleasant >= 0.65
      ? 'Luminous Balance'
      : avgPleasant <= 0.35
        ? 'Tender Complexity'
        : 'Bittersweet Crossroads'
  const paceWord =
    avgEnergy >= 0.65
      ? 'high-energy emotional currents'
      : avgEnergy <= 0.35
        ? 'quiet, low-battery stillness'
        : 'gentle, shifting inner tides'

  return {
    title: `${primary.label} & ${secondary.label} (${toneWord})`,
    subtitle: `Holding ${primary.emoji} ${primary.label} alongside ${secondary.emoji} ${secondary.label}`,
    description: `It is completely human to feel ${primary.label.toLowerCase()} and ${secondary.label.toLowerCase()} at the exact same time. Your sanctuary honors these ${paceWord} without forcing you to pick just one.`,
    somaticInvitation: `Breathe into the space between ${primary.emoji} ${primary.label} and ${secondary.emoji} ${secondary.label}, letting both feelings coexist safely.`,
    recommendedRoomHref: avgEnergy > 0.6 ? '/calm-studio' : '/garden',
    recommendedRoomLabel: avgEnergy > 0.6 ? 'Calm Studio' : 'Inner Garden',
  }
}

const EMOTION_VALIDATION_WHISPERS: Record<string, string> = {
  peaceful: '🌸 Peaceful moments are anchors. Let your nervous system memorize how this safety feels.',
  sad: '🌧️ Sadness honors what matters to you. You never have to hide your rain inside LUMINA.',
  exhausted: '🌙 Exhaustion is not a flaw—it is your body asking honestly for shelter and rest.',
  overwhelmed: '🫧 When everything feels like too much, shrinking your horizon to the next 5 minutes is enough.',
  loved: '💗 Connection and warmth soften the sharpest edges of a long week.',
  hopeful: '✨ Hope does not have to be loud; even a tiny spark is enough to light the Moon Gate.',
  grounded: '🌿 Steady roots allow you to weather passing storms without losing your center.',
  frustrated: '🔥 Frustration is often a boundary asking to be spoken or protected.',
  anxious: '🦋 Anxious energy is your mind trying hard to keep you safe. Let your exhale lengthen.',
  numb: '☁️ Feeling numb is a protective pause when your emotional circuit breaker needs quiet.',
  grateful: '🌷 Gratitude turns small, ordinary pauses into lasting sanctuary stars.',
  restless: '🌊 Restless tides mean energy is looking for a gentle channel or a change of air.',
}

function inferEmojiForRecord(record: CheckInRecord): EmotionOption {
  const matched = EMOTION_OPTIONS.find(
    o =>
      o.id === record.emotionId ||
      (record.emotionLabel && o.label.toLowerCase() === record.emotionLabel.toLowerCase()) ||
      o.emoji === record.emoji
  )
  if (matched) return matched
  if (record.auraLabel === 'Wired & Overthinking') return EMOTION_OPTIONS[8] // Anxious 🦋
  if (record.auraLabel === 'Quietly Heavy') return EMOTION_OPTIONS[2] // Exhausted 🌙
  return EMOTION_OPTIONS[6] // Grounded 🌿
}

function formatDateKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

export default function EmojiSanctuaryPage() {
  const { checkIns, plantCheckIn, setOrb } = useSanctuary()

  // Experience A: Emotional Alchemy Blender state
  const [primaryEmotion, setPrimaryEmotion] = useState<EmotionOption>(EMOTION_OPTIONS[0]) // 🌸 Peaceful
  const [secondaryEmotion, setSecondaryEmotion] = useState<EmotionOption>(EMOTION_OPTIONS[2]) // 🌙 Exhausted
  const [blendIntensity, setBlendIntensity] = useState<number>(3)
  const [blendTags, setBlendTags] = useState<string[]>(['Need comfort'])
  const [blendNote, setBlendNote] = useState('')
  const [plantingBlend, setPlantingBlend] = useState(false)
  const [blendToast, setBlendToast] = useState<string | null>(null)

  // Experience B: Interactive Emoji Resonance Bubble Canvas state
  const [focusedBubble, setFocusedBubble] = useState<EmotionOption>(EMOTION_OPTIONS[6])
  const [burstTrigger, setBurstTrigger] = useState<{ emoji: string; color: string; count: number }>({
    emoji: '🌸',
    color: '#e8a4b8',
    count: 0,
  })
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Experience C: Emotional Seasons Calendar state
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null)

  const alchemy = useMemo(
    () => synthesizeCompoundAlchemy(primaryEmotion, secondaryEmotion),
    [primaryEmotion, secondaryEmotion]
  )

  // Real check-in frequency per emotion ID
  const emotionCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const opt of EMOTION_OPTIONS) map[opt.id] = 0
    for (const c of checkIns) {
      const info = inferEmojiForRecord(c)
      map[info.id] = (map[info.id] || 0) + 1
    }
    return map
  }, [checkIns])

  // 60fps Emoji Particle Fountain Canvas when clicking bubbles or planting a blend
  useEffect(() => {
    if (burstTrigger.count === 0) return
    const canvas = particleCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = canvas.parentElement?.clientWidth || 900
    const h = canvas.parentElement?.clientHeight || 400
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const particles = Array.from({ length: 28 }, (_, i) => {
      const angle = (i / 28) * Math.PI * 2 + (Math.random() - 0.5) * 0.3
      const speed = 2.2 + Math.random() * 4.5
      return {
        x: w / 2,
        y: h / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.2,
        rot: (Math.random() - 0.5) * 0.4,
        alpha: 1,
        size: 16 + Math.random() * 12,
        emoji: burstTrigger.emoji,
      }
    })

    let animId = 0
    const animate = () => {
      ctx.clearRect(0, 0, w, h)
      let alive = false
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.11 // gentle gravity
        p.alpha -= 0.018
        if (p.alpha > 0.02) {
          alive = true
          ctx.save()
          ctx.globalAlpha = Math.max(0, p.alpha)
          ctx.font = `${Math.round(p.size)}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(p.emoji, p.x, p.y)
          ctx.restore()
        }
      }
      if (alive) {
        animId = window.requestAnimationFrame(animate)
      } else {
        ctx.clearRect(0, 0, w, h)
      }
    }

    animId = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(animId)
  }, [burstTrigger])

  async function handlePlantBlendedEmotion() {
    if (plantingBlend) return
    setPlantingBlend(true)

    const avgEnergy = (primaryEmotion.energy + secondaryEmotion.energy) / 2
    const avgPleasant = (primaryEmotion.pleasantness + secondaryEmotion.pleasantness) / 2
    setOrb({
      x: Math.max(8, Math.min(92, Math.round(avgEnergy * 100))),
      y: Math.max(12, Math.min(88, Math.round((1 - avgPleasant) * 100))),
    })

    const combinedEmoji =
      primaryEmotion.id === secondaryEmotion.id
        ? primaryEmotion.emoji
        : `${primaryEmotion.emoji}${secondaryEmotion.emoji}`
    const combinedLabel =
      primaryEmotion.id === secondaryEmotion.id
        ? primaryEmotion.label
        : `${primaryEmotion.label} + ${secondaryEmotion.label}`

    const noteToSave =
      blendNote.trim() || `${alchemy.title} — ${alchemy.subtitle}`

    await plantCheckIn(
      blendTags.length ? blendTags : ['Need comfort'],
      noteToSave,
      {
        emotionId: primaryEmotion.id,
        emoji: combinedEmoji,
        emotionLabel: combinedLabel,
        intensity: blendIntensity,
      }
    )

    setBurstTrigger(b => ({
      emoji: primaryEmotion.emoji,
      color: primaryEmotion.color,
      count: b.count + 1,
    }))
    setBlendNote('')
    setBlendToast(
      `Planted ${combinedEmoji} "${alchemy.title}" into your 3D Inner Garden & Emoji Journal!`
    )
    window.setTimeout(() => setBlendToast(null), 4500)
    setPlantingBlend(false)
  }

  // Build Last 7 Days & Monthly Calendar data
  const weeklyDays = useMemo(() => {
    const out: Array<{
      key: string
      dayName: string
      dayNum: number
      isToday: boolean
      records: CheckInRecord[]
    }> = []
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const key = formatDateKey(d.getTime())
      const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d)
      const records = checkIns.filter(c => formatDateKey(c.timestamp) === key)
      out.push({
        key,
        dayName,
        dayNum: d.getDate(),
        isToday: i === 0,
        records,
      })
    }
    return out
  }, [checkIns])

  const monthlyCalendar = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const monthTitle = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    }).format(now)
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const todayKey = formatDateKey(now.getTime())

    const cells: Array<{
      key: string
      dayNum: number | null
      isToday: boolean
      records: CheckInRecord[]
    }> = []

    for (let i = 0; i < firstDay; i++) {
      cells.push({ key: `pad-${i}`, dayNum: null, isToday: false, records: [] })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d)
      const key = formatDateKey(dt.getTime())
      const records = checkIns.filter(c => formatDateKey(c.timestamp) === key)
      cells.push({
        key,
        dayNum: d,
        isToday: key === todayKey,
        records,
      })
    }
    return { monthTitle, cells }
  }, [checkIns])

  const inspectedRecords = useMemo(() => {
    if (!selectedDayKey) return []
    return checkIns.filter(c => formatDateKey(c.timestamp) === selectedDayKey)
  }, [checkIns, selectedDayKey])

  return (
    <AppShell
      title="Emoji Sanctuary"
      subtitle="Emotional Alchemy Blender, Resonance Bubble Canvas & Seasons Calendar"
    >
      <div className="mx-auto max-w-[1380px] space-y-6">
        {/* EXPERIENCE A: EMOTIONAL ALCHEMY BLENDER (MIX 2 EMOTIONS) */}
        <section className={`${glass} relative overflow-hidden p-6 sm:p-8`}>
          <canvas
            ref={particleCanvasRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20 h-full w-full"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl"
            style={{
              background: `radial-gradient(circle, ${primaryEmotion.color}33, ${secondaryEmotion.color}22, transparent 70%)`,
            }}
          />

          <div className="relative z-10 flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.08] pb-5">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="eyebrow flex items-center gap-1.5 rounded-full border border-[#f3d9a4]/35 bg-[#f3d9a4]/10 px-3 py-1 text-[10px] text-[#f7dfb2]">
                  <Wand2 size={12} /> Experience I · Emotional Alchemy Blender
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-white/60">
                  Mix 2 Coexisting Emotions
                </span>
              </div>
              <h2 className="mt-2.5 font-serif text-2xl text-white sm:text-3xl">
                Because humans rarely feel just one thing at a time.
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-white/55">
                Blend a Primary Emotion and a Secondary Undertone below to synthesize your compound
                emotional state and plant a dual-hued lotus bloom in your 3D Inner Garden.
              </p>
            </div>

            <Link
              href="/garden"
              className="secondary-button border border-white/15 px-3.5 py-2 text-xs text-white/85 hover:text-white"
            >
              <Flower2 size={13} className="text-[#7ec8b8]" /> View 3D Inner Garden
            </Link>
          </div>

          <div className="relative z-10 mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            {/* Left: Primary + Secondary Emotion Pickers */}
            <div className="space-y-5">
              {/* Primary Emotion */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-white/80">
                    1. Choose Primary Surface Emotion:
                  </span>
                  <span
                    className="rounded-full border px-2.5 py-0.5 text-xs font-medium text-white"
                    style={{
                      borderColor: `${primaryEmotion.color}66`,
                      backgroundColor: `${primaryEmotion.color}20`,
                    }}
                  >
                    {primaryEmotion.emoji} {primaryEmotion.label}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                  {EMOTION_OPTIONS.map(opt => {
                    const active = primaryEmotion.id === opt.id
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPrimaryEmotion(opt)}
                        className={`flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition ${
                          active
                            ? 'border-white/45 bg-white/[0.14] text-white shadow-md'
                            : 'border-white/[0.08] bg-white/[0.025] text-white/65 hover:border-white/20 hover:text-white'
                        }`}
                        style={
                          active
                            ? {
                                borderColor: opt.color,
                                boxShadow: `0 0 18px ${opt.color}40`,
                              }
                            : undefined
                        }
                      >
                        <span className="text-2xl">{opt.emoji}</span>
                        <span className="mt-1 text-[11px] font-medium">{opt.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Secondary Undertone Emotion */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-white/80">
                    2. Choose Secondary Undertone:
                  </span>
                  <span
                    className="rounded-full border px-2.5 py-0.5 text-xs font-medium text-white"
                    style={{
                      borderColor: `${secondaryEmotion.color}66`,
                      backgroundColor: `${secondaryEmotion.color}20`,
                    }}
                  >
                    {secondaryEmotion.emoji} {secondaryEmotion.label}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                  {EMOTION_OPTIONS.map(opt => {
                    const active = secondaryEmotion.id === opt.id
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSecondaryEmotion(opt)}
                        className={`flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition ${
                          active
                            ? 'border-white/45 bg-white/[0.14] text-white shadow-md'
                            : 'border-white/[0.08] bg-white/[0.025] text-white/65 hover:border-white/20 hover:text-white'
                        }`}
                        style={
                          active
                            ? {
                                borderColor: opt.color,
                                boxShadow: `0 0 18px ${opt.color}40`,
                              }
                            : undefined
                        }
                      >
                        <span className="text-2xl">{opt.emoji}</span>
                        <span className="mt-1 text-[11px] font-medium">{opt.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Intensity + Somatic Cues + Note */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-white/70">Compound Wave Intensity:</span>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setBlendIntensity(level)}
                        className={`h-7 w-7 rounded-full border text-xs font-medium transition ${
                          blendIntensity === level
                            ? 'border-[#8ec9bd] bg-[#8ec9bd]/25 text-white'
                            : 'border-white/10 bg-white/[0.04] text-white/55 hover:text-white'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {SOMATIC_TAGS.map(t => {
                    const on = blendTags.includes(t)
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() =>
                          setBlendTags(on ? blendTags.filter(x => x !== t) : [...blendTags, t])
                        }
                        className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                          on
                            ? 'border-[#e8a4b8]/60 bg-[#e8a4b8]/20 text-white'
                            : 'border-white/[0.08] bg-white/[0.02] text-white/55 hover:text-white'
                        }`}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>

                <input
                  type="text"
                  value={blendNote}
                  onChange={e => setBlendNote(e.target.value)}
                  maxLength={220}
                  placeholder="Optional whisper about this blended feeling..."
                  className="modal-input w-full !py-2 !text-xs"
                />
              </div>
            </div>

            {/* Right: Glowing Alchemy Fusion Orb & Compound State Synthesis Card */}
            <div className="flex flex-col justify-between rounded-3xl border border-white/[0.12] bg-[#0a0814]/85 p-6 shadow-2xl">
              <div className="flex flex-col items-center text-center">
                {/* Animated Dual-Hue Alchemy Fusion Orb */}
                <div className="relative my-2 grid h-40 w-40 place-items-center">
                  <div
                    className="pointer-events-none absolute inset-0 rounded-full blur-xl transition-all duration-500"
                    style={{
                      background: `linear-gradient(135deg, ${primaryEmotion.color}66, ${secondaryEmotion.color}66)`,
                    }}
                  />
                  <div
                    className="relative flex h-32 w-32 items-center justify-center gap-1 rounded-full border border-white/25 shadow-2xl transition-all duration-500"
                    style={{
                      background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.85), ${primaryEmotion.color}99 42%, ${secondaryEmotion.color}99 82%)`,
                      boxShadow: `0 0 42px ${primaryEmotion.color}55, 0 0 75px ${secondaryEmotion.color}44`,
                    }}
                  >
                    <span className="text-4xl drop-shadow">{primaryEmotion.emoji}</span>
                    {primaryEmotion.id !== secondaryEmotion.id && (
                      <span className="text-3xl drop-shadow">{secondaryEmotion.emoji}</span>
                    )}
                  </div>
                </div>

                <span className="mt-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[10px] font-medium tracking-wider text-[#f3d9a4] uppercase">
                  Synthesized Emotional Alchemy
                </span>
                <h3 className="mt-2.5 font-serif text-2xl text-white sm:text-3xl">
                  {alchemy.title}
                </h3>
                <p className="mt-1 text-xs font-medium text-[#b7ebe0]">{alchemy.subtitle}</p>
                <p className="mt-3 text-xs leading-relaxed text-white/70">
                  {alchemy.description}
                </p>

                <div className="mt-4 w-full rounded-2xl border border-[#7ec8b8]/25 bg-[#7ec8b8]/10 p-3.5 text-left">
                  <p className="text-[10px] font-medium tracking-wider text-[#7ec8b8] uppercase">
                    ✦ Gentle Somatic Invitation
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-white/85">
                    {alchemy.somaticInvitation}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-2.5 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => void handlePlantBlendedEmotion()}
                  disabled={plantingBlend}
                  className="primary-button w-full justify-center py-3 text-xs font-medium"
                >
                  <Sparkles size={14} />
                  {plantingBlend
                    ? 'Planting Blended Lotus…'
                    : `Plant ${primaryEmotion.emoji}${
                        primaryEmotion.id !== secondaryEmotion.id ? secondaryEmotion.emoji : ''
                      } Blended Lotus in 3D Garden`}
                </button>

                <div className="flex items-center justify-between text-[11px] text-white/55">
                  <span>Recommended room for this blend:</span>
                  <Link
                    href={alchemy.recommendedRoomHref}
                    className="inline-flex items-center gap-1 font-medium text-[#8ec9bd] hover:underline"
                  >
                    Open {alchemy.recommendedRoomLabel} <ArrowRight size={12} />
                  </Link>
                </div>

                {blendToast && (
                  <p className="rounded-xl border border-[#7ec8b8]/40 bg-[#7ec8b8]/15 px-3 py-2 text-center text-xs text-[#d7f7ef]">
                    ✓ {blendToast}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* EXPERIENCE B: INTERACTIVE EMOJI RESONANCE BUBBLE CANVAS */}
        <section className={`${glass} p-6 sm:p-8`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="eyebrow flex items-center gap-1.5 text-[#e8a4b8]">
                <HeartHandshake size={12} /> Experience II · Interactive 12-Emotion Resonance Bubble
                Stage
              </span>
              <h2 className="mt-1 font-serif text-2xl text-white">
                Tap any emotion bubble to release a particle burst &amp; read its sanctuary whisper
              </h2>
              <p className="mt-1 text-xs text-white/50">
                Each bubble scales organically with how often you have checked in with that feeling
                on this device.
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/65">
              {checkIns.length} recorded check-ins shaping bubble sizes
            </span>
          </div>

          {/* Floating Glowing Bubble Stage */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 rounded-3xl border border-white/[0.08] bg-[radial-gradient(circle_at_50%_40%,rgba(184,164,232,0.14),rgba(8,9,18,0.92)_78%)] p-6 sm:p-8">
            {EMOTION_OPTIONS.map((opt, idx) => {
              const count = emotionCounts[opt.id] || 0
              const sizePx = Math.min(132, 78 + count * 10)
              const isSelected = focusedBubble.id === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setFocusedBubble(opt)
                    setBurstTrigger(b => ({
                      emoji: opt.emoji,
                      color: opt.color,
                      count: b.count + 1,
                    }))
                  }}
                  style={{
                    width: `${sizePx}px`,
                    height: `${sizePx}px`,
                    borderColor: isSelected ? opt.color : `${opt.color}55`,
                    background: `radial-gradient(circle at 30% 30%, ${opt.color}44, ${opt.color}14 70%)`,
                    boxShadow: isSelected
                      ? `0 0 32px ${opt.color}66, inset 0 0 18px ${opt.color}44`
                      : `0 0 18px ${opt.color}22`,
                    animation: `float ${5 + (idx % 4)}s ease-in-out infinite`,
                    animationDelay: `${idx * -0.4}s`,
                  }}
                  className="group relative flex flex-col items-center justify-center rounded-full border transition-transform duration-300 hover:scale-110"
                >
                  <span className="text-2xl sm:text-3xl">{opt.emoji}</span>
                  <span className="mt-1 text-[10px] font-medium text-white/90">{opt.label}</span>
                  {count > 0 && (
                    <span className="mt-0.5 rounded-full bg-black/45 px-1.5 py-0.2 font-mono text-[9px] text-[#f3d9a4]">
                      {count}×
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Focused Emotion Validation Whisper & Quick Alchemy Loader */}
          <div className="mt-5 flex flex-col justify-between gap-4 rounded-2xl border border-white/[0.1] bg-white/[0.03] p-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <span
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border text-2xl"
                style={{
                  borderColor: `${focusedBubble.color}66`,
                  backgroundColor: `${focusedBubble.color}18`,
                }}
              >
                {focusedBubble.emoji}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-lg text-white">{focusedBubble.label}</h3>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 font-mono text-[10px] text-white/60">
                    Logged {emotionCounts[focusedBubble.id] || 0} time
                    {(emotionCounts[focusedBubble.id] || 0) === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-white/75">
                  {EMOTION_VALIDATION_WHISPERS[focusedBubble.id]}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setPrimaryEmotion(focusedBubble)}
                className="secondary-button border border-white/10 px-3 py-1.5 text-xs text-white/85 hover:text-white"
              >
                Use as Primary in Blender
              </button>
              <button
                type="button"
                onClick={() => setSecondaryEmotion(focusedBubble)}
                className="secondary-button border border-white/10 px-3 py-1.5 text-xs text-white/85 hover:text-white"
              >
                Use as Secondary Undertone
              </button>
            </div>
          </div>
        </section>

        {/* EXPERIENCE C: EMOTIONAL SEASONS CALENDAR & 7-DAY EMOJI RIBBON */}
        <section className={`${glass} space-y-6 p-6 sm:p-8`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="eyebrow text-[#7ec8b8]">
                Experience III · Emotional Seasons Calendar &amp; 7-Day Emoji Ribbon
              </p>
              <h2 className="mt-1 font-serif text-2xl text-white">
                Your emotional weather across the week and month
              </h2>
            </div>
            <Link
              href="/check-in"
              className="secondary-button border border-white/10 px-3.5 py-1.5 text-xs text-white/85 hover:text-white"
            >
              Log Single-Emoji Check-In →
            </Link>
          </div>

          {/* 7-Day Emoji Ribbon */}
          <div>
            <p className="mb-2.5 flex items-center gap-1.5 text-xs font-medium text-white/75">
              <Clock size={13} className="text-[#8ec9bd]" /> 7-Day Sanctuary Emoji Ribbon
            </p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
              {weeklyDays.map(day => {
                const latest = day.records[0]
                const info = latest ? inferEmojiForRecord(latest) : null
                const isSelected = selectedDayKey === day.key
                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => setSelectedDayKey(isSelected ? null : day.key)}
                    className={`flex flex-col items-center justify-between rounded-2xl border p-3.5 text-center transition ${
                      isSelected
                        ? 'border-[#8ec9bd] bg-[#8ec9bd]/20'
                        : day.isToday
                          ? 'border-[#8ec9bd]/45 bg-[#8ec9bd]/10'
                          : 'border-white/[0.08] bg-white/[0.025] hover:border-white/20'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between text-[10px] text-white/45">
                      <span className="uppercase">{day.dayName}</span>
                      <span className="font-mono">{day.dayNum}</span>
                    </div>
                    <span
                      className="my-2.5 flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.1] bg-[#0b0914]/75 text-2xl shadow-inner"
                      style={
                        info
                          ? {
                              borderColor: `${info.color}55`,
                              boxShadow: `0 0 16px ${info.color}25`,
                            }
                          : undefined
                      }
                    >
                      {info ? (
                        latest?.emoji || info.emoji
                      ) : (
                        <span className="text-sm text-[#b8a4e8]/45" title="Quiet rest day">
                          ☽
                        </span>
                      )}
                    </span>
                    <span className="truncate text-[11px] font-medium text-white/85">
                      {latest?.emotionLabel || info?.label || 'Rest day'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Monthly Emotional Calendar + Inspected Day Details */}
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0b0914]/55 p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-medium text-white/85">
                  <Calendar size={13} className="text-[#e8a4b8]" /> {monthlyCalendar.monthTitle}
                </p>
                <span className="text-[10px] text-white/45">
                  Click any day to view saved emoji reflections
                </span>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-white/40">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="mt-1 grid grid-cols-7 gap-1.5">
                {monthlyCalendar.cells.map(cell => {
                  if (cell.dayNum === null) {
                    return <div key={cell.key} className="h-11 rounded-xl" />
                  }
                  const latest = cell.records[0]
                  const info = latest ? inferEmojiForRecord(latest) : null
                  const isSelected = selectedDayKey === cell.key
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      onClick={() => setSelectedDayKey(isSelected ? null : cell.key)}
                      className={`relative flex h-11 flex-col items-center justify-center rounded-xl border text-xs transition ${
                        isSelected
                          ? 'border-[#8ec9bd] bg-[#8ec9bd]/25'
                          : info
                            ? 'border-white/15 bg-white/[0.06] hover:border-white/30'
                            : cell.isToday
                              ? 'border-[#e8a4b8]/45 bg-white/[0.04]'
                              : 'border-white/[0.05] bg-white/[0.015] text-white/40'
                      }`}
                      style={
                        info && !isSelected
                          ? {
                              borderColor: `${info.color}44`,
                              backgroundColor: `${info.color}14`,
                            }
                          : undefined
                      }
                    >
                      <span className="text-[9px] leading-none text-white/45">{cell.dayNum}</span>
                      {info ? (
                        <span className="mt-0.5 text-sm leading-none">
                          {latest?.emoji || info.emoji}
                        </span>
                      ) : (
                        <span className="mt-0.5 text-[9px] leading-none text-white/20">☽</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Right: Selected Day Log or Top Emoji Palette Breakdown */}
            <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0b0914]/55 p-5">
              {selectedDayKey ? (
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-[#8ec9bd]">
                      Reflections on {selectedDayKey} ({inspectedRecords.length})
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedDayKey(null)}
                      className="text-[11px] text-white/50 hover:text-white"
                    >
                      Clear selection
                    </button>
                  </div>

                  {inspectedRecords.length === 0 ? (
                    <p className="mt-4 text-xs text-white/50">
                      No check-ins were recorded on this date—every quiet rest day is honored.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                      {inspectedRecords.map((r, i) => {
                        const info = inferEmojiForRecord(r)
                        return (
                          <li
                            key={`${r.timestamp}-${i}`}
                            className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white">
                                <span className="text-base">{r.emoji || info.emoji}</span>
                                <span>{r.emotionLabel || info.label}</span>
                                {r.intensity && (
                                  <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[10px] text-white/70">
                                    Intensity {r.intensity}/5
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] text-white/40">{timeAgo(r.timestamp)}</span>
                            </div>
                            {r.note && (
                              <p className="mt-1.5 text-xs italic text-white/75">“{r.note}”</p>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-xs font-medium text-white/80">
                    Your Most Visited Sanctuary Emotions
                  </p>
                  <p className="mt-1 text-[11px] text-white/45">
                    Click any calendar date on the left to inspect individual notes, or view your
                    cumulative emoji spectrum below.
                  </p>

                  <div className="mt-4 space-y-2.5">
                    {EMOTION_OPTIONS.slice()
                      .sort((a, b) => (emotionCounts[b.id] || 0) - (emotionCounts[a.id] || 0))
                      .slice(0, 6)
                      .map(opt => {
                        const c = emotionCounts[opt.id] || 0
                        const pct =
                          checkIns.length > 0 ? Math.round((c / checkIns.length) * 100) : 0
                        return (
                          <div key={opt.id} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="inline-flex items-center gap-1.5 text-white/85">
                                <span>{opt.emoji}</span>
                                <span>{opt.label}</span>
                              </span>
                              <span className="font-mono text-[11px] text-white/50">
                                {c} ({pct}%)
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.max(c > 0 ? 8 : 2, pct)}%`,
                                  backgroundColor: opt.color,
                                }}
                              />
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}

              <p className="mt-4 border-t border-white/[0.07] pt-3 text-[11px] text-white/45">
                All emoji check-ins and alchemy blends live privately in your browser&apos;s
                IndexedDB.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
