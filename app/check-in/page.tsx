'use client'

import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Calendar,
  Clock,
  Flower2,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { useSanctuary } from '@/context/sanctuary-context'
import { EMOTION_OPTIONS, type CheckInRecord, type EmotionOption } from '@/lib/db'
import { auraColor, fullStamp, glass, SOMATIC_TAGS, timeAgo } from '@/lib/format'

const INTENSITY_LEVELS: Array<{ value: number; label: string }> = [
  { value: 1, label: 'Whisper' },
  { value: 2, label: 'Gentle' },
  { value: 3, label: 'Present' },
  { value: 4, label: 'Strong' },
  { value: 5, label: 'Intense' },
]

const CHECKIN_REACTIONS = [
  '💗 This helped me',
  '🌿 I feel calmer',
  '🫂 I feel understood',
  '✨ I feel hopeful',
  '🌙 I need more rest',
]

function dateKeyFromTimestamp(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

function inferEmojiForRecord(rec: CheckInRecord): {
  emoji: string
  label: string
  color: string
} {
  if (rec.emoji && rec.emotionLabel) {
    const found = EMOTION_OPTIONS.find(e => e.id === rec.emotionId || e.emoji === rec.emoji)
    return {
      emoji: rec.emoji,
      label: rec.emotionLabel,
      color: found?.color ?? auraColor(rec.auraLabel),
    }
  }
  if (rec.auraLabel === 'Wired & Overthinking') {
    return { emoji: '🫧', label: 'Overwhelmed', color: '#b8a4e8' }
  }
  if (rec.auraLabel === 'Quietly Heavy') {
    return { emoji: '🌙', label: 'Exhausted', color: '#9d8ec4' }
  }
  return { emoji: '🌿', label: 'Grounded', color: '#7ec8b8' }
}

function CheckInContent() {
  const { orb, setOrb, aura, checkIns, plantCheckIn, reactToCheckIn } = useSanctuary()
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionOption | null>(
    EMOTION_OPTIONS.find(e => e.id === 'grounded') ?? null
  )
  const [intensity, setIntensity] = useState<number>(3)
  const [tags, setTags] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [selectedReaction, setSelectedReaction] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [selectedCalendarDayKey, setSelectedCalendarDayKey] = useState<string | null>(null)
  const dragRafRef = useRef<number>(0)
  const pendingDragOrbRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    return () => {
      if (dragRafRef.current) window.cancelAnimationFrame(dragRafRef.current)
    }
  }, [])

  function handleSelectEmotion(opt: EmotionOption) {
    setSelectedEmotion(opt)
    setSaved(false)
    // Map pleasantness [0..1] -> orb.x [8..92] and energy [0..1] -> orb.y [88..12]
    const nextX = Math.max(8, Math.min(92, Math.round(opt.pleasantness * 100)))
    const nextY = Math.max(12, Math.min(88, Math.round((1 - opt.energy) * 100)))
    setOrb({ x: nextX, y: nextY })
  }

  function move(e: PointerEvent<HTMLDivElement>) {
    if (e.type === 'pointermove' && e.buttons !== 1) return
    const r = e.currentTarget.getBoundingClientRect()
    const nextOrb = {
      x: Math.max(4, Math.min(96, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.max(6, Math.min(94, ((e.clientY - r.top) / r.height) * 100)),
    }
    if (e.type !== 'pointermove') {
      setOrb(nextOrb)
      setSaved(false)
      return
    }
    pendingDragOrbRef.current = nextOrb
    if (dragRafRef.current) return
    dragRafRef.current = window.requestAnimationFrame(() => {
      dragRafRef.current = 0
      if (pendingDragOrbRef.current) {
        setOrb(pendingDragOrbRef.current)
        pendingDragOrbRef.current = null
        setSaved(false)
      }
    })
  }

  async function save() {
    if (saving) return
    setSaving(true)
    const effectiveTags =
      tags.length > 0
        ? tags
        : selectedEmotion
          ? [selectedEmotion.label]
          : ['Softly steady']
    await plantCheckIn(
      effectiveTags,
      note,
      selectedEmotion
        ? {
            emotionId: selectedEmotion.id,
            emoji: selectedEmotion.emoji,
            emotionLabel: selectedEmotion.label,
            intensity,
          }
        : undefined,
      selectedReaction || undefined
    )
    setTags([])
    setNote('')
    setSaving(false)
    setSaved(true)
  }

  // Group check-ins by local YYYY-MM-DD date key for the Weekly & Monthly Emoji Journal
  const checkInsByDate = useMemo(() => {
    const map = new Map<string, CheckInRecord[]>()
    for (const c of checkIns) {
      const key = dateKeyFromTimestamp(c.timestamp)
      const list = map.get(key) ?? []
      list.push(c)
      map.set(key, list)
    }
    return map
  }, [checkIns])

  // Last 7 days strip
  const weeklyDays = useMemo(() => {
    const days: Array<{
      key: string
      dayName: string
      dayNum: number
      isToday: boolean
      records: CheckInRecord[]
    }> = []
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const key = dateKeyFromTimestamp(d.getTime())
      const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d)
      days.push({
        key,
        dayName,
        dayNum: d.getDate(),
        isToday: i === 0,
        records: checkInsByDate.get(key) ?? [],
      })
    }
    return days
  }, [checkInsByDate])

  // Current Month Calendar Grid
  const monthlyCalendar = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const monthTitle = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    }).format(now)
    const firstDayOfMonth = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const cells: Array<{
      key: string
      dayNum: number | null
      isToday: boolean
      records: CheckInRecord[]
    }> = []

    for (let b = 0; b < firstDayOfMonth; b++) {
      cells.push({ key: `blank-${b}`, dayNum: null, isToday: false, records: [] })
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day)
      const key = dateKeyFromTimestamp(d.getTime())
      cells.push({
        key,
        dayNum: day,
        isToday: day === now.getDate(),
        records: checkInsByDate.get(key) ?? [],
      })
    }
    return { monthTitle, cells }
  }, [checkInsByDate])

  // Emotional Frequency & Mood Distribution
  const emotionDistribution = useMemo(() => {
    if (checkIns.length === 0) return []
    const counts = new Map<
      string,
      { emoji: string; label: string; color: string; count: number; totalIntensity: number }
    >()
    for (const c of checkIns) {
      const info = inferEmojiForRecord(c)
      const prev = counts.get(info.label) ?? {
        emoji: info.emoji,
        label: info.label,
        color: info.color,
        count: 0,
        totalIntensity: 0,
      }
      prev.count += 1
      prev.totalIntensity += c.intensity ?? 3
      counts.set(info.label, prev)
    }
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .map(item => ({
        ...item,
        share: Math.round((item.count / checkIns.length) * 100),
        avgIntensity: (item.totalIntensity / item.count).toFixed(1),
      }))
  }, [checkIns])

  const inspectedDayRecords = selectedCalendarDayKey
    ? (checkInsByDate.get(selectedCalendarDayKey) ?? [])
    : []

  return (
    <div className="mx-auto grid w-full max-w-[1180px] gap-5">
      {/* 1. Cohesive 12-Emotion Emoji Grid + Intensity Selector */}
      <section className={`${glass} p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="eyebrow text-[#e8a4b8]">
              Step 1 · 12-Emotion Cohesive Emoji Expression
            </p>
            <h2 className="mt-1 font-serif text-2xl text-white">
              Which emotional texture feels closest right now?
            </h2>
          </div>
          {selectedEmotion && (
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
              style={{
                borderColor: `${selectedEmotion.color}55`,
                backgroundColor: `${selectedEmotion.color}18`,
                color: selectedEmotion.color,
              }}
            >
              <span className="text-base">{selectedEmotion.emoji}</span>
              {selectedEmotion.label} · Intensity {intensity}/5
            </span>
          )}
        </div>

        {/* 12 Emotion Glass Cards */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {EMOTION_OPTIONS.map(opt => {
            const active = selectedEmotion?.id === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectEmotion(opt)}
                aria-pressed={active}
                className={`group relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3.5 text-center transition duration-300 ${
                  active
                    ? 'scale-[1.03] bg-white/[0.09] text-white shadow-lg'
                    : 'border-white/[0.08] bg-white/[0.025] text-white/70 hover:scale-[1.015] hover:border-white/20 hover:bg-white/[0.05]'
                }`}
                style={
                  active
                    ? {
                        borderColor: `${opt.color}88`,
                        boxShadow: `0 0 26px ${opt.color}30`,
                      }
                    : undefined
                }
              >
                <span className="text-2xl transition-transform duration-300 group-hover:scale-110">
                  {opt.emoji}
                </span>
                <span className="text-xs font-medium tracking-wide">{opt.label}</span>
              </button>
            )
          })}
        </div>

        {/* Emotion Intensity Selector (1 to 5) */}
        {selectedEmotion && (
          <div className="mt-5 flex flex-col gap-2.5 rounded-2xl border border-white/[0.08] bg-[#0b0914]/55 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium text-white/85">
                How strongly is <span style={{ color: selectedEmotion.color }}>{selectedEmotion.emoji} {selectedEmotion.label}</span> present?
              </p>
              <p className="text-[11px] text-white/45">
                Optional intensity scale · helps gently track emotional waves without judgment
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {INTENSITY_LEVELS.map(lvl => {
                const active = intensity === lvl.value
                return (
                  <button
                    key={lvl.value}
                    type="button"
                    onClick={() => setIntensity(lvl.value)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? 'border-[#8ec9bd]/60 bg-[#8ec9bd]/20 text-[#b7ebe0]'
                        : 'border-white/[0.08] bg-white/[0.03] text-white/55 hover:text-white/85'
                    }`}
                  >
                    {lvl.value} · {lvl.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* 2. Emotional Compass + Live Aura Readout + Somatic Tags */}
      <section className={`${glass} grid gap-6 p-6 md:grid-cols-2`}>
        <div>
          <p className="eyebrow">Step 2 · Emotional Compass (Pleasantness vs Energy)</p>
          <h2 className="mt-1 font-serif text-2xl text-white">Fine-tune your luminous aura</h2>
          <p className="mt-1 text-xs text-white/45">
            Your chosen emoji pre-positions the compass, or you can drag anywhere to sculpt it.
          </p>
          <div className="aura-wrap !px-0 !pb-0">
            <div
              className="aura-pad cursor-pointer"
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
                  background: selectedEmotion?.color ?? aura.color,
                  boxShadow: `0 0 34px ${selectedEmotion?.color ?? aura.color}`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-5">
          {/* Live Aura Readout Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="eyebrow">Live Aura Readout</p>
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] px-2.5 py-0.5 text-[10px]"
                style={{ color: selectedEmotion?.color ?? aura.color }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    background: selectedEmotion?.color ?? aura.color,
                    boxShadow: `0 0 8px ${selectedEmotion?.color ?? aura.color}`,
                  }}
                />
                Pleasantness {Math.round(orb.x)}% · Energy {Math.round(100 - orb.y)}%
              </span>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <span
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-3xl"
                style={{
                  background: `radial-gradient(circle at 35% 30%, #fff8, ${selectedEmotion?.color ?? aura.color} 55%, ${selectedEmotion?.color ?? aura.color}55)`,
                  boxShadow: `0 0 50px ${selectedEmotion?.color ?? aura.color}88`,
                  animation: 'luminaBreathe 5s ease-in-out infinite',
                }}
              >
                {selectedEmotion?.emoji ?? '🌿'}
              </span>
              <div aria-live="polite">
                <p
                  className="font-serif text-2xl"
                  style={{ color: selectedEmotion?.color ?? aura.color }}
                >
                  {selectedEmotion ? `${selectedEmotion.label} · ${aura.label}` : aura.label}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-white/55">{aura.note}</p>
              </div>
            </div>
          </div>

          {/* Somatic Body & Mind Tags Selector */}
          <div>
            <p className="eyebrow mb-2.5">Somatic Body &amp; Mind Cues</p>
            <div className="flex flex-wrap gap-2">
              {SOMATIC_TAGS.map(t => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={tags.includes(t)}
                  onClick={() => {
                    setTags(tags.includes(t) ? tags.filter(x => x !== t) : [...tags, t])
                    setSaved(false)
                  }}
                  className={`rounded-full border px-3.5 py-1.5 text-xs transition ${
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
        </div>
      </section>

      {/* 3. Optional Reflection Note + Quick Emoji Reaction + Save CTA */}
      <section className={`${glass} p-6`}>
        <label className="eyebrow" htmlFor="checkin-note">
          Step 3 · Optional Journal Note &amp; Gentle Reaction
        </label>
        <textarea
          id="checkin-note"
          value={note}
          onChange={e => setNote(e.target.value)}
          maxLength={400}
          placeholder="Optional: Add a few words about this moment — never required"
          className="ritual-textarea mt-2 !min-h-[90px] !text-base"
        />

        {/* Quick Reaction Pills */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] text-white/45">How does checking in feel?</span>
          {CHECKIN_REACTIONS.map(r => {
            const active = selectedReaction === r
            return (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedReaction(active ? '' : r)}
                className={`rounded-full border px-3 py-1 text-[11px] transition ${
                  active
                    ? 'border-[#e8a4b8]/60 bg-[#e8a4b8]/20 text-[#fce4ec]'
                    : 'border-white/[0.08] bg-white/[0.025] text-white/55 hover:text-white/85'
                }`}
              >
                {r}
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || (!selectedEmotion && tags.length === 0)}
            className="primary-button px-6 py-3 text-sm"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Flower2 size={14} />}
            Save Emoji Check-In &amp; Plant Lotus Seed
          </button>
        </div>

        {saved && (
          <div
            className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#8ec9bd]/35 bg-[#8ec9bd]/10 p-4 text-xs text-[#bfe3da] sm:flex-row sm:items-center sm:justify-between"
            role="status"
          >
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-2 font-medium">
                <Sparkles size={14} className="text-[#8ec9bd]" />
                Your {selectedEmotion ? `${selectedEmotion.emoji} ${selectedEmotion.label}` : ''}{' '}
                check-in is saved locally and a new bioluminescent lotus has bloomed.
              </span>
              {checkIns[0]?.id !== undefined && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-white/60">Quick reaction:</span>
                  {CHECKIN_REACTIONS.map(r => {
                    const active = checkIns[0]?.reaction === r
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          if (checkIns[0]?.id !== undefined) {
                            void reactToCheckIn(checkIns[0].id, r)
                          }
                        }}
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] transition ${
                          active
                            ? 'border-[#e8a4b8]/65 bg-[#e8a4b8]/25 text-white'
                            : 'border-white/15 bg-white/5 text-white/65 hover:text-white'
                        }`}
                      >
                        {r}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <Link
              href="/garden"
              className="secondary-button shrink-0 px-3.5 py-1.5 text-xs text-white"
            >
              View in 3D Inner Garden <ArrowRight size={12} />
            </Link>
          </div>
        )}
      </section>

      {/* 4. Personal Emotional Emoji Journal (Weekly Strip, Monthly Calendar & Mood Distribution) */}
      <section className={`${glass} space-y-6 p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="eyebrow text-[#8ec9bd]">
              Personal Emotional Emoji Journal · Visual Mood History
            </p>
            <h2 className="mt-1 font-serif text-2xl text-white">
              Your emotional seasons at a glance
            </h2>
          </div>
          <span className="text-xs text-white/45">
            {checkIns.length} total {checkIns.length === 1 ? 'reflection' : 'reflections'} stored
            on-device
          </span>
        </div>

        {/* 4A. Weekly 7-Day Emoji Timeline Strip */}
        <div>
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-medium text-white/75">
              <Clock size={13} className="text-[#8ec9bd]" /> Last 7 Days Emoji Strip
            </p>
            <Link
              href="/emojis"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#b8a4e8] hover:underline"
            >
              Open Emoji Alchemy &amp; Mood Studio →
            </Link>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weeklyDays.map(day => {
              const latest = day.records[0]
              const info = latest ? inferEmojiForRecord(latest) : null
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() =>
                    setSelectedCalendarDayKey(
                      selectedCalendarDayKey === day.key ? null : day.key
                    )
                  }
                  className={`flex flex-col items-center justify-between rounded-2xl border p-3 text-center transition ${
                    day.isToday
                      ? 'border-[#8ec9bd]/45 bg-[#8ec9bd]/10'
                      : 'border-white/[0.07] bg-white/[0.025] hover:border-white/20'
                  }`}
                >
                  <span className="text-[10px] tracking-wider text-white/45 uppercase">
                    {day.dayName}
                  </span>
                  <span className="my-2 flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-[#0b0914]/70 text-xl">
                    {info ? (
                      info.emoji
                    ) : (
                      <span className="text-sm text-[#b8a4e8]/45" title="Rest day">
                        ☽
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] font-medium text-white/80">
                    {info ? info.label : `Day ${day.dayNum}`}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 4B. Monthly Emotional Calendar + Mood Frequency Bars */}
        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          {/* Monthly Emotional Calendar */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0b0914]/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-xs font-medium text-white/80">
                <Calendar size={13} className="text-[#e8a4b8]" /> {monthlyCalendar.monthTitle}
              </p>
              <span className="text-[10px] text-white/45">Click any active day to inspect</span>
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
                const isSelected = selectedCalendarDayKey === cell.key
                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() =>
                      setSelectedCalendarDayKey(isSelected ? null : cell.key)
                    }
                    className={`relative flex h-11 flex-col items-center justify-center rounded-xl border text-xs transition ${
                      isSelected
                        ? 'border-[#8ec9bd] bg-[#8ec9bd]/20'
                        : info
                          ? 'border-white/15 bg-white/[0.06] hover:border-white/30'
                          : cell.isToday
                            ? 'border-[#e8a4b8]/40 bg-white/[0.03]'
                            : 'border-white/[0.05] bg-white/[0.015] text-white/40'
                    }`}
                    style={
                      info && !isSelected
                        ? {
                            borderColor: `${info.color}44`,
                            backgroundColor: `${info.color}12`,
                          }
                        : undefined
                    }
                  >
                    <span className="text-[9px] leading-none text-white/45">{cell.dayNum}</span>
                    {info && <span className="mt-0.5 text-sm leading-none">{info.emoji}</span>}
                  </button>
                )
              })}
            </div>

            {selectedCalendarDayKey && (
              <div className="mt-3 rounded-xl border border-white/[0.09] bg-white/[0.03] p-3">
                <p className="text-[11px] font-medium text-white/75">
                  Entries on {selectedCalendarDayKey} ({inspectedDayRecords.length})
                </p>
                {inspectedDayRecords.length === 0 ? (
                  <p className="mt-1 text-xs text-white/45">
                    No check-ins were saved on this date.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {inspectedDayRecords.map((r, idx) => {
                      const inf = inferEmojiForRecord(r)
                      return (
                        <li
                          key={r.id ?? idx}
                          className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/80"
                        >
                          <span>
                            {inf.emoji} <strong>{inf.label}</strong>
                            {r.intensity ? ` (${r.intensity}/5)` : ''} · {r.tags.join(', ')}
                          </span>
                          <span className="text-[10px] text-white/40">{fullStamp(r.timestamp)}</span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Emotional Frequency & Mood Distribution */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0b0914]/50 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-white/80">
              <BarChart3 size={13} className="text-[#f3d9a4]" /> Emotional Frequency &amp; Mood
              Distribution
            </p>

            {emotionDistribution.length === 0 ? (
              <div className="grid h-48 place-items-center rounded-xl border border-dashed border-white/[0.08] p-4 text-center">
                <p className="max-w-xs text-xs leading-relaxed text-white/45">
                  Your mood distribution bars will appear here as soon as you save your first emoji
                  check-in above.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {emotionDistribution.slice(0, 6).map(item => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-medium text-white/85">
                        <span className="text-base">{item.emoji}</span>
                        {item.label}
                      </span>
                      <span className="text-[11px] text-white/50">
                        {item.count} {item.count === 1 ? 'time' : 'times'} ({item.share}%) · avg
                        intensity {item.avgIntensity}/5
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(8, item.share)}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}

                <p className="pt-2 text-[11px] leading-relaxed text-white/50">
                  Gentle observation: Your most frequent check-in emotion is{' '}
                  <strong className="text-white/85">
                    {emotionDistribution[0].emoji} {emotionDistribution[0].label}
                  </strong>
                  . Every emotional season is welcome here without judgment.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. Previous Check-Ins Timeline */}
      <section className={`${glass} p-6`}>
        <div className="flex items-center justify-between">
          <p className="eyebrow">Previous Check-Ins Timeline ({checkIns.length})</p>
          <span className="text-[11px] text-white/40">Stored 100% on-device in IndexedDB</span>
        </div>
        {checkIns.length === 0 ? (
          <p className="mt-3 text-sm text-white/45">
            No check-ins recorded yet. Your first planted seed will appear here.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {checkIns.map((c, i) => {
              const info = inferEmojiForRecord(c)
              return (
                <li
                  key={c.id ?? `${c.timestamp}-${i}`}
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{info.emoji}</span>
                      <span className="font-serif text-lg" style={{ color: info.color }}>
                        {info.label}
                      </span>
                      <span className="text-xs text-white/45">· {c.auraLabel}</span>
                      {c.intensity && (
                        <span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/65">
                          Intensity {c.intensity}/5
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-white/45">
                      {timeAgo(c.timestamp)} · {fullStamp(c.timestamp)}
                    </span>
                  </div>
                  {c.tags.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {c.tags.map(t => (
                        <span
                          key={t}
                          className="rounded-full border border-white/[0.09] bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-white/70"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {c.note && (
                    <p className="mt-2.5 font-serif text-base italic text-white/75">“{c.note}”</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {CHECKIN_REACTIONS.map(r => {
                      const active = c.reaction === r
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            if (c.id !== undefined) {
                              void reactToCheckIn(c.id, r)
                            }
                          }}
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] transition ${
                            active
                              ? 'border-[#e8a4b8]/60 bg-[#e8a4b8]/20 text-[#fce4ec]'
                              : 'border-white/[0.07] bg-white/[0.02] text-white/45 hover:text-white/80'
                          }`}
                        >
                          {r}
                        </button>
                      )
                    })}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

export default function Page() {
  return (
    <AppShell title="Emotional Check-In" subtitle="12-emotion emoji journal & aura compass">
      <CheckInContent />
    </AppShell>
  )
}
