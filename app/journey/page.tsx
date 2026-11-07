'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { EMOTION_OPTIONS } from '@/lib/db'
import { useSanctuary } from '@/context/sanctuary-context'

interface JourneyDay {
  day: number
  title: string
  prompt: string
  roomHref: string
  roomLabel: string
}

interface JourneyWeek {
  weekNumber: number
  title: string
  subtitle: string
  themeBadge: string
  checkpointPrompt: string
  days: JourneyDay[]
}

const EMOJI_QUICK_REACTIONS = [
  '💗 This helped me',
  '🌿 I feel calmer',
  '🫂 I feel understood',
  '✨ I feel hopeful',
  '🌙 I need more rest',
]

const REMINDER_OPTIONS = [
  { id: 'Off', label: 'Off', desc: 'Arrive strictly whenever you feel called' },
  { id: 'Morning arrival', label: 'Morning arrival', desc: 'Gentle morning intention check' },
  { id: 'Evening wind-down', label: 'Evening wind-down', desc: 'Soft twilight nervous system reset' },
  {
    id: 'Late-night study check-in',
    label: 'Late-night study check-in',
    desc: 'Midnight decompression after long study blocks',
  },
]

const JOURNEY_WEEKS: JourneyWeek[] = [
  {
    weekNumber: 1,
    title: 'WEEK 1 — Awareness (Days 1–7)',
    subtitle:
      'Focus on emotional check-ins, gentle somatic self-awareness, and unloading unspoken weight without judgment.',
    themeBadge: 'Chapter I · Awareness',
    checkpointPrompt:
      'Looking back on Week 1 (Awareness), what small moment or room helped you notice how you were truly feeling?',
    days: [
      {
        day: 1,
        title: 'Notice Where the Day Sits',
        prompt: 'Place your hand on your chest or jaw and notice if any quiet tension is waiting to soften.',
        roomHref: '/check-in',
        roomLabel: 'Emotional Check-In',
      },
      {
        day: 2,
        title: 'Name One Honest Weather Pattern',
        prompt: 'Choose one emoji and intensity level for your inner weather without judging whether it is good or bad.',
        roomHref: '/check-in',
        roomLabel: 'Emotional Check-In',
      },
      {
        day: 3,
        title: 'Three Minutes of Acoustic Rain',
        prompt: 'Let the 174Hz + 261Hz warm rain wash over background noise while your shoulders drop.',
        roomHref: '/calm-studio',
        roomLabel: 'Calm Studio',
      },
      {
        day: 4,
        title: 'Plant a Quiet Lotus Seed',
        prompt: 'Visit the 3D pond and plant a bioluminescent lotus seed for whatever emotion you are carrying today.',
        roomHref: '/garden',
        roomLabel: 'Inner Garden',
      },
      {
        day: 5,
        title: 'Speak Without Editing',
        prompt: 'Share one unfiltered sentence with The Listener—no polish or productivity required.',
        roomHref: '/companion',
        roomLabel: 'AI Companion',
      },
      {
        day: 6,
        title: 'Burn One Looping Worry',
        prompt: 'Write down a repetitive thought in the Release Room and let it dissolve into rising embers.',
        roomHref: '/release-room',
        roomLabel: 'Release Room',
      },
      {
        day: 7,
        title: 'Honor Your Sleep Baseline',
        prompt: 'Log how rested, fragmented, or exhausted your sleep felt—with compassion instead of guilt.',
        roomHref: '/insights',
        roomLabel: 'Personal Insights',
      },
    ],
  },
  {
    weekNumber: 2,
    title: 'WEEK 2 — Understanding (Days 8–14)',
    subtitle:
      'Explore recurring triggers, somatic tension cues, and which calming environments help your nervous system settle.',
    themeBadge: 'Chapter II · Understanding',
    checkpointPrompt:
      'Looking back on Week 2 (Understanding), what recurring trigger or calming preference became clearer to you?',
    days: [
      {
        day: 8,
        title: 'Map Your Somatic Signals',
        prompt: 'Notice which physical cue—tight chest, racing thoughts, or low energy—shows up first when you feel stretched.',
        roomHref: '/check-in',
        roomLabel: 'Emotional Check-In',
      },
      {
        day: 9,
        title: 'Save a Calming Anchor Memory',
        prompt: 'Record one comforting preference or grounding reminder in your private Memory Vault.',
        roomHref: '/companion',
        roomLabel: 'AI Companion',
      },
      {
        day: 10,
        title: '4-Second Inhale, 6-Second Exhale',
        prompt: 'Follow five cycles of extended-exhale breathing in the Calm Studio to signal safety to your body.',
        roomHref: '/calm-studio',
        roomLabel: 'Calm Studio',
      },
      {
        day: 11,
        title: '5-4-3-2-1 Sensory Grounding',
        prompt: 'Step through the 5-4-3-2-1 sensory reset to anchor yourself in the room around you.',
        roomHref: '/calm-studio',
        roomLabel: 'Calm Studio',
      },
      {
        day: 12,
        title: 'Explore Your Aura Trajectory',
        prompt: 'Look at your pleasantness and energy balance across recent check-ins with gentle curiosity.',
        roomHref: '/insights',
        roomLabel: 'Personal Insights',
      },
      {
        day: 13,
        title: 'Switch Garden Atmosphere',
        prompt: 'Try Midnight Rain, Golden Dusk, or Aurora Mist in your 3D Garden and notice which light feels safest.',
        roomHref: '/garden',
        roomLabel: 'Inner Garden',
      },
      {
        day: 14,
        title: 'Keep One Small Star of Gratitude',
        prompt: 'Add a quiet moment that felt okay or comforting into your Star Jar.',
        roomHref: '/release-room',
        roomLabel: 'Release Room',
      },
    ],
  },
  {
    weekNumber: 3,
    title: 'WEEK 3 — Gentle Reframing (Days 15–21)',
    subtitle:
      'Practice small, realistic cognitive reframing exercises, softer inner dialogue, and compassionate boundaries.',
    themeBadge: 'Chapter III · Gentle Reframing',
    checkpointPrompt:
      'Looking back on Week 3 (Gentle Reframing), what kinder sentence or boundary gave you breathing room?',
    days: [
      {
        day: 15,
        title: 'Soften an All-or-Nothing Thought',
        prompt: 'Use the Guided Bot thought-reframing flow to turn a harsh self-judgment into a realistic middle ground.',
        roomHref: '/companion',
        roomLabel: 'AI Companion',
      },
      {
        day: 16,
        title: 'Draft a Kind Boundary',
        prompt: 'Switch to Boundary Coach mode and craft one gentle way to protect your rest or bandwidth today.',
        roomHref: '/companion',
        roomLabel: 'AI Companion',
      },
      {
        day: 17,
        title: 'Release Unfinished Expectations',
        prompt: 'Let go of one perfectionistic “should” in the Burn & Release ritual.',
        roomHref: '/release-room',
        roomLabel: 'Release Room',
      },
      {
        day: 18,
        title: 'Validate a Heavy Emotion',
        prompt: 'Click a lotus bloom in the 3D Garden and read its validating reminder that even tired days belong.',
        roomHref: '/garden',
        roomLabel: 'Inner Garden',
      },
      {
        day: 19,
        title: 'Tune Your Sensory Comfort',
        prompt: 'Experiment with Full Sanctuary, Gentle, or Low-Stimulus mode to match your current bandwidth.',
        roomHref: '/calm-studio',
        roomLabel: 'Calm Studio',
      },
      {
        day: 20,
        title: 'Seal a Future Self Letter',
        prompt: 'Write a supportive note to your future self and seal it in the Time Capsule vault.',
        roomHref: '/release-room',
        roomLabel: 'Release Room',
      },
      {
        day: 21,
        title: 'Generate an AI Sanctuary Reflection',
        prompt: 'Synthesize your real check-ins and sleep observations into a non-clinical reflection.',
        roomHref: '/insights',
        roomLabel: 'Personal Insights',
      },
    ],
  },
  {
    weekNumber: 4,
    title: 'WEEK 4 — Reflection (Days 22–30)',
    subtitle:
      'Honor your emotional resilience, celebrate quiet continuity, and weave sustainable self-kindness into everyday life.',
    themeBadge: 'Chapter IV · Reflection',
    checkpointPrompt:
      'Looking back on Week 4 (Reflection), what sanctuary ritual do you want to carry forward at your own pace?',
    days: [
      {
        day: 22,
        title: 'Launch a Sky Wish Lantern',
        prompt: 'Release a glowing lantern from the pond toward the Moon Gate carrying a gentle wish for yourself.',
        roomHref: '/garden',
        roomLabel: 'Inner Garden',
      },
      {
        day: 23,
        title: 'Revisit Your Star Jar',
        prompt: 'Read the small moments of steadiness and gratitude you have collected in your Star Jar.',
        roomHref: '/release-room',
        roomLabel: 'Release Room',
      },
      {
        day: 24,
        title: 'Check In With Zero Urgency',
        prompt: 'Log a check-in simply to witness how you are arriving right now—with nothing to fix.',
        roomHref: '/check-in',
        roomLabel: 'Emotional Check-In',
      },
      {
        day: 25,
        title: 'Review Your Memory Vault',
        prompt: 'Curate which personal anchors, triggers, and boundaries you want to keep in your Memory Vault.',
        roomHref: '/companion',
        roomLabel: 'AI Companion',
      },
      {
        day: 26,
        title: 'Somatic Resonance Check',
        prompt: 'Run a 5-second Somatic Resonance Scan and notice how your rest and emotional battery interact.',
        roomHref: '/insights',
        roomLabel: 'Personal Insights',
      },
      {
        day: 27,
        title: 'Illuminate the Moon Gate',
        prompt: 'Send a luminous ripple across the pond in your 3D Garden to honor every check-in you have planted.',
        roomHref: '/garden',
        roomLabel: 'Inner Garden',
      },
      {
        day: 28,
        title: 'Three Quiet Breaths of Appreciation',
        prompt: 'Pause in the Calm Studio for 60 seconds and thank yourself for showing up gently.',
        roomHref: '/calm-studio',
        roomLabel: 'Calm Studio',
      },
      {
        day: 29,
        title: 'Refresh Your Calm DNA',
        prompt: 'Review your preferred companion voice, theme mode, and comfort environment in Settings.',
        roomHref: '/settings',
        roomLabel: 'Profile & Settings',
      },
      {
        day: 30,
        title: 'Watch Your Emotional Cinema Reel',
        prompt: 'Play your 4-slide Emotional Cinema Reel at the top of this page and celebrate continuing at the speed of trust.',
        roomHref: '/journey',
        roomLabel: 'My Journey',
      },
    ],
  },
]

export default function JourneyPage() {
  const {
    name,
    checkIns,
    gardenBlooms,
    starJar,
    companion,
    onboarding,
    bioRhythm,
    journeyCompletedDays,
    journeyReflections,
    journeyWeeklyNotes,
    journeyReminder,
    cinemaReelReaction,
    toggleJourneyDay,
    saveJourneyDayReflection,
    saveJourneyWeeklyNote,
    setJourneyReminder,
    setCinemaReelReaction,
  } = useSanctuary()

  const firstName = name.trim().split(/\s+/)[0] || 'Friend'
  const prefs = onboarding.preferences

  // Emotional Cinema Reel player state
  const [activeSlide, setActiveSlide] = useState(0)
  const [isPlayingReel, setIsPlayingReel] = useState(false)
  const [slideProgress, setSlideProgress] = useState(0)

  // Expandable inline reflection editor per day
  const [openDayEditor, setOpenDayEditor] = useState<number | null>(null)
  const [dayDrafts, setDayDrafts] = useState<Record<number, string>>({})
  const [savedDayFlash, setSavedDayFlash] = useState<number | null>(null)

  // Weekly checkpoint drafts
  const [weeklyDrafts, setWeeklyDrafts] = useState<Record<number, string>>({})
  const [savedWeekFlash, setSavedWeekFlash] = useState<number | null>(null)

  // Active week filter ('all' or 1..4)
  const [selectedWeekTab, setSelectedWeekTab] = useState<'all' | number>('all')

  // Cinema Reel auto-advance timer when playing
  useEffect(() => {
    if (!isPlayingReel) return
    const tickMs = 80
    const slideDurationMs = 5600
    const step = (tickMs / slideDurationMs) * 100

    const id = window.setInterval(() => {
      setSlideProgress(prev => {
        if (prev + step >= 100) {
          setActiveSlide(curr => (curr + 1) % 4)
          return 0
        }
        return prev + step
      })
    }, tickMs)

    return () => window.clearInterval(id)
  }, [isPlayingReel])

  // Real data summaries for the 4-Slide Emotional Cinema Reel
  const reelMetrics = useMemo(() => {
    const emotionCounts: Record<string, { emoji: string; label: string; count: number; color: string }> =
      {}
    const tagCounts: Record<string, number> = {}

    for (const c of checkIns) {
      const label = c.emotionLabel || c.auraLabel || 'Softly Grounded'
      const matchedOpt = EMOTION_OPTIONS.find(
        o => o.id === c.emotionId || o.label.toLowerCase() === label.toLowerCase()
      )
      const emoji = c.emoji || matchedOpt?.emoji || '🌿'
      const color = matchedOpt?.color || '#7ec8b8'
      if (!emotionCounts[label]) {
        emotionCounts[label] = { emoji, label, count: 0, color }
      }
      emotionCounts[label].count += 1

      for (const t of c.tags) {
        tagCounts[t] = (tagCounts[t] || 0) + 1
      }
    }

    const topEmotions = Object.values(emotionCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)

    const topCues = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)

    return {
      topEmotions,
      topCues,
    }
  }, [checkIns])

  const completedSet = useMemo(() => new Set(journeyCompletedDays), [journeyCompletedDays])
  const exploredCount = journeyCompletedDays.length
  const progressPct = Math.min(100, Math.round((exploredCount / 30) * 100))

  const handleSaveDayNote = async (day: number) => {
    const draft = dayDrafts[day] ?? journeyReflections[String(day)]?.note ?? ''
    await saveJourneyDayReflection(day, { note: draft }, true)
    setSavedDayFlash(day)
    window.setTimeout(() => {
      setSavedDayFlash(curr => (curr === day ? null : curr))
    }, 1800)
  }

  const handleSaveWeeklyCheckpoint = async (weekNumber: number) => {
    const text = weeklyDrafts[weekNumber] ?? journeyWeeklyNotes[String(weekNumber)] ?? ''
    await saveJourneyWeeklyNote(weekNumber, text)
    setSavedWeekFlash(weekNumber)
    window.setTimeout(() => {
      setSavedWeekFlash(curr => (curr === weekNumber ? null : curr))
    }, 1800)
  }

  const visibleWeeks =
    selectedWeekTab === 'all'
      ? JOURNEY_WEEKS
      : JOURNEY_WEEKS.filter(w => w.weekNumber === selectedWeekTab)

  return (
    <AppShell>
      <div className="mx-auto max-w-[1380px] space-y-6">
        {/* Top Hero: 30-Day Gentle Journey & Non-Punitive Philosophy */}
        <section className="glass-panel relative overflow-hidden rounded-[28px] p-6 sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-teal/10 blur-3xl"
          />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="pill-badge">30-Day Gentle Journey</span>
                <span className="rounded-full border border-teal/30 bg-teal/10 px-3 py-1 text-[11px] font-medium text-teal">
                  4 Weekly Chapters · Zero Streak Pressure
                </span>
              </div>
              <h1 className="mt-3 font-serif text-2xl font-normal tracking-tight text-ink sm:text-4xl">
                Small daily pauses, at the speed of trust.
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                LUMINA never punishes you for resting or stepping away. Explore any day in any
                order, leave a 1-line reflection when something resonates, or watch your Emotional
                Cinema Reel whenever you want to witness how far you have come.
              </p>
            </div>

            <div className="min-w-[250px] rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
              <div className="flex items-center justify-between text-xs text-muted">
                <span className="uppercase tracking-[0.14em]">Pauses explored</span>
                <span className="font-mono text-ink">{exploredCount} / 30</span>
              </div>
              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal/80 via-lavender/80 to-gold/80 transition-all duration-500"
                  style={{ width: `${Math.max(4, progressPct)}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-muted">
                Missed days never reset your progress. Every check-in and pause stays yours.
              </p>
            </div>
          </div>

          {/* Gentle Sanctuary Reminder Selector */}
          <div className="relative mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-teal">
                    Gentle Sanctuary Reminder Preference
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] text-muted">
                    Non-punitive · Stored on-device
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Choose when you prefer to pause inside LUMINA. Skipping or resting never triggers
                  guilt notifications or lost streaks.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {REMINDER_OPTIONS.map(option => {
                  const active = (journeyReminder || 'Off') === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => void setJourneyReminder(option.id)}
                      title={option.desc}
                      className={`rounded-xl border px-3 py-2 text-xs transition ${
                        active
                          ? 'border-teal/45 bg-teal/15 font-medium text-teal shadow-[0_0_16px_rgba(126,200,184,0.16)]'
                          : 'border-white/10 bg-white/[0.03] text-muted hover:border-white/20 hover:text-ink'
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Interactive 4-Slide Emotional Cinema Reel & Monthly Recap */}
        <section className="glass-panel relative overflow-hidden rounded-[28px] border border-white/12 p-6 sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-lavender/10 blur-3xl"
          />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="pill-badge">Emotional Cinema Reel · Monthly Recap</span>
                <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5 text-[11px] text-gold">
                  Slide {activeSlide + 1} of 4 · Authentic On-Device Data
                </span>
              </div>
              <h2 className="mt-2 font-serif text-xl font-normal text-ink sm:text-2xl">
                Your Sanctuary Story in Four Frames
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSlideProgress(0)
                  setActiveSlide(curr => (curr - 1 + 4) % 4)
                }}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-ink transition hover:border-white/25 hover:bg-white/[0.08]"
              >
                ← Prev
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPlayingReel(p => !p)
                }}
                className={`rounded-xl border px-4 py-2 text-xs font-medium transition ${
                  isPlayingReel
                    ? 'border-gold/45 bg-gold/15 text-gold'
                    : 'border-teal/40 bg-teal/15 text-teal hover:bg-teal/25'
                }`}
              >
                {isPlayingReel ? '⏸ Pause Reel' : '▶ Play Cinema Reel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSlideProgress(0)
                  setActiveSlide(curr => (curr + 1) % 4)
                }}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-ink transition hover:border-white/25 hover:bg-white/[0.08]"
              >
                Next →
              </button>
            </div>
          </div>

          {/* 4 Animated Slide Progress Bars */}
          <div className="mt-5 grid grid-cols-4 gap-2">
            {[
              '1 · Sanctuary Arrival',
              '2 · Emotional Weather',
              '3 · Garden & Star Jar',
              '4 · Speed of Trust',
            ].map((label, idx) => {
              const fill =
                idx < activeSlide ? 100 : idx === activeSlide ? (isPlayingReel ? slideProgress : 100) : 0
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setActiveSlide(idx)
                    setSlideProgress(0)
                  }}
                  className="group text-left"
                >
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal via-lavender to-gold transition-all duration-150"
                      style={{ width: `${fill}%` }}
                    />
                  </div>
                  <p
                    className={`mt-1.5 truncate text-[11px] transition ${
                      idx === activeSlide
                        ? 'font-medium text-ink'
                        : 'text-muted group-hover:text-ink/80'
                    }`}
                  >
                    {label}
                  </p>
                </button>
              )
            })}
          </div>

          {/* Active Cinema Slide Stage */}
          <div className="mt-5 min-h-[230px] rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_20%_20%,rgba(126,200,184,0.12),rgba(13,12,24,0.92)_75%)] p-6 sm:p-8">
            {activeSlide === 0 && (
              <div className="space-y-4">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-teal/30 bg-teal/10 px-3 py-1 text-xs text-teal">
                  Frame 01 · Your Sanctuary Arrival
                </span>
                <h3 className="font-serif text-2xl font-normal text-ink sm:text-3xl">
                  Welcome back, {firstName}. Every arrival here counts.
                </h3>
                <p className="max-w-2xl text-sm leading-relaxed text-muted">
                  Whether you paused for thirty seconds of rain or poured out a heavy midnight
                  thought, your sanctuary has held space for your real emotional weather without
                  judgment.
                </p>
                <div className="grid gap-3 pt-2 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
                      Recorded Check-Ins
                    </p>
                    <p className="mt-1 font-serif text-2xl text-ink">{checkIns.length}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {checkIns.length === 0
                        ? 'Ready whenever you plant your first check-in'
                        : '100% authentic local logs'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
                      Journey Days Explored
                    </p>
                    <p className="mt-1 font-serif text-2xl text-teal">{exploredCount} of 30</p>
                    <p className="mt-0.5 text-xs text-muted">Non-linear · Zero streak penalties</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
                      Restorative Baseline
                    </p>
                    <p className="mt-1 font-serif text-2xl capitalize text-lavender">
                      {bioRhythm.sleepHours}h · {bioRhythm.sleepQuality}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{bioRhythm.rhythmNote}</p>
                  </div>
                </div>
              </div>
            )}

            {activeSlide === 1 && (
              <div className="space-y-4">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-lavender/30 bg-lavender/10 px-3 py-1 text-xs text-lavender">
                  Frame 02 · Emotional Weather & Emojis
                </span>
                <h3 className="font-serif text-2xl font-normal text-ink sm:text-3xl">
                  The emotions and somatic signals you honored.
                </h3>
                {checkIns.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <p className="text-sm text-ink">
                      You haven&apos;t recorded your first emotional check-in yet.
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      LUMINA never invents fake emotional statistics. Once you check in with an
                      emoji or aura, your real top emotions and somatic cues will appear here.
                    </p>
                    <Link
                      href="/check-in"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-teal/35 bg-teal/15 px-3.5 py-2 text-xs font-medium text-teal hover:bg-teal/25"
                    >
                      Open Emotional Check-In →
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-4 pt-1 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
                        Top Recorded Emotions
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {reelMetrics.topEmotions.map(item => (
                          <span
                            key={item.label}
                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-ink"
                          >
                            <span className="text-base">{item.emoji}</span>
                            <span>{item.label}</span>
                            <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[10px] text-muted">
                              {item.count}×
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
                        Most Frequent Somatic Cues
                      </p>
                      {reelMetrics.topCues.length === 0 ? (
                        <p className="mt-3 text-xs text-muted">
                          No somatic tension tags selected yet during your check-ins.
                        </p>
                      ) : (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {reelMetrics.topCues.map(([tag, count]) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-teal/25 bg-teal/10 px-3 py-1.5 text-xs text-teal"
                            >
                              <span>{tag}</span>
                              <span className="font-mono text-[10px] opacity-80">({count})</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSlide === 2 && (
              <div className="space-y-4">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs text-gold">
                  Frame 03 · Your Living Inner Garden & Star Jar
                </span>
                <h3 className="font-serif text-2xl font-normal text-ink sm:text-3xl">
                  {gardenBlooms} bioluminescent lotus blooms & {starJar.length} gratitude stars.
                </h3>
                <p className="max-w-2xl text-sm leading-relaxed text-muted">
                  Even heavy, exhausted, or anxious days bloom with quiet dignity on your sanctuary
                  pond—reminding you that every emotion is allowed to exist safely.
                </p>
                <div className="grid gap-4 pt-1 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
                      Recent Star Jar Notes
                    </p>
                    {starJar.length === 0 ? (
                      <p className="mt-2 text-xs text-muted">
                        Your Star Jar is waiting for your first quiet note of gratitude in the
                        Release Room.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-1.5 text-xs text-ink">
                        {starJar.slice(0, 3).map(star => (
                          <li key={star.id} className="flex items-start gap-2">
                            <span className="text-gold">✦</span>
                            <span className="line-clamp-2">{star.text}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
                      Preferred Calming Atmosphere
                    </p>
                    <p className="mt-2 font-serif text-lg text-ink">
                      {prefs?.comfortEnvironment || 'Rainlit Sanctuary Pond'}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Companion Voice: <span className="text-ink">{companion}</span> · Reminder:{' '}
                      <span className="text-teal">{journeyReminder || 'Off'}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeSlide === 3 && (
              <div className="space-y-4">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose/30 bg-rose/10 px-3 py-1 text-xs text-rose">
                  Frame 04 · Continuing at the Speed of Trust
                </span>
                <h3 className="font-serif text-2xl font-normal text-ink sm:text-3xl">
                  You never have to earn your rest here, {firstName}.
                </h3>
                <p className="max-w-2xl text-sm leading-relaxed text-muted">
                  “Healing and emotional regulation do not move in straight lines. Showing up for a
                  single slow breath on a hard afternoon is just as meaningful as a full reflection.”
                </p>
                <div className="grid gap-3 pt-1 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
                      Personal Calm DNA
                    </p>
                    <p className="mt-1 text-xs text-ink">
                      {prefs?.interactionStyle || 'Gentle listening & unhurried reflection'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
                      Preferred Daily Rhythm
                    </p>
                    <p className="mt-1 text-xs text-ink">
                      {prefs?.dailyTime || 'Whenever a quiet pause opens up'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
                      Sanctuary Promise
                    </p>
                    <p className="mt-1 text-xs text-teal">
                      Private by default · Always under your control
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Emoji Quick Reactions for the Cinema Reel */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <span className="text-xs text-muted">
              How does this recap feel right now? (Tap an emoji reaction):
            </span>
            <div className="flex flex-wrap gap-2">
              {EMOJI_QUICK_REACTIONS.map(reaction => {
                const active = cinemaReelReaction === reaction
                return (
                  <button
                    key={reaction}
                    type="button"
                    onClick={() => void setCinemaReelReaction(reaction)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      active
                        ? 'border-rose/45 bg-rose/15 font-medium text-rose shadow-[0_0_14px_rgba(232,164,184,0.18)]'
                        : 'border-white/10 bg-white/[0.03] text-muted hover:border-white/20 hover:text-ink'
                    }`}
                  >
                    {reaction}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* Week Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedWeekTab('all')}
              className={`rounded-xl border px-3.5 py-2 text-xs font-medium transition ${
                selectedWeekTab === 'all'
                  ? 'border-teal/40 bg-teal/15 text-teal'
                  : 'border-white/10 bg-white/[0.03] text-muted hover:border-white/20 hover:text-ink'
              }`}
            >
              All 4 Weeks (Days 1–30)
            </button>
            {JOURNEY_WEEKS.map(w => (
              <button
                key={w.weekNumber}
                type="button"
                onClick={() => setSelectedWeekTab(w.weekNumber)}
                className={`rounded-xl border px-3.5 py-2 text-xs font-medium transition ${
                  selectedWeekTab === w.weekNumber
                    ? 'border-teal/40 bg-teal/15 text-teal'
                    : 'border-white/10 bg-white/[0.03] text-muted hover:border-white/20 hover:text-ink'
                }`}
              >
                {w.title.split(' (')[0]}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted">
            Click any Day card to mark explored or write an optional 1-line reflection.
          </span>
        </div>

        {/* 4-Week Progression Chapters */}
        <div className="space-y-8">
          {visibleWeeks.map(week => {
            const weekDoneCount = week.days.filter(d => completedSet.has(d.day)).length
            const savedWeeklyText = journeyWeeklyNotes[String(week.weekNumber)] ?? ''
            const currentWeeklyDraft =
              weeklyDrafts[week.weekNumber] !== undefined
                ? weeklyDrafts[week.weekNumber]
                : savedWeeklyText

            return (
              <section
                key={week.weekNumber}
                className="glass-panel rounded-[28px] border border-white/10 p-6 sm:p-8"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="pill-badge">{week.themeBadge}</span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 font-mono text-[11px] text-muted">
                        {weekDoneCount} / {week.days.length} explored
                      </span>
                    </div>
                    <h2 className="mt-2 font-serif text-xl font-normal text-ink sm:text-2xl">
                      {week.title}
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm text-muted">{week.subtitle}</p>
                  </div>
                </div>

                {/* Days Grid for this Week */}
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {week.days.map(item => {
                    const done = completedSet.has(item.day)
                    const savedReflection = journeyReflections[String(item.day)]
                    const isEditorOpen =
                      openDayEditor === item.day || Boolean(savedReflection?.note)
                    const noteValue =
                      dayDrafts[item.day] !== undefined
                        ? dayDrafts[item.day]
                        : savedReflection?.note ?? ''

                    return (
                      <div
                        key={item.day}
                        className={`flex flex-col justify-between rounded-[22px] border p-5 transition ${
                          done
                            ? 'border-teal/40 bg-teal/[0.08] shadow-[0_0_24px_rgba(126,200,184,0.1)]'
                            : 'border-white/10 bg-white/[0.025] hover:border-white/20'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted">
                              Day {String(item.day).padStart(2, '0')}
                            </span>
                            <button
                              type="button"
                              onClick={() => void toggleJourneyDay(item.day)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                                done
                                  ? 'border border-teal/40 bg-teal/20 text-teal'
                                  : 'border border-white/10 bg-white/[0.05] text-muted hover:border-white/25 hover:text-ink'
                              }`}
                            >
                              {done ? '✓ Explored' : 'Mark explored'}
                            </button>
                          </div>

                          <h3 className="mt-3 font-serif text-lg font-normal text-ink">
                            {item.title}
                          </h3>
                          <p className="mt-1.5 text-xs leading-relaxed text-muted">{item.prompt}</p>
                        </div>

                        <div className="mt-4 space-y-3 border-t border-white/10 pt-3.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Link
                              href={item.roomHref}
                              className="inline-flex items-center gap-1 text-xs font-medium text-teal hover:underline"
                            >
                              Open {item.roomLabel} →
                            </Link>
                            <button
                              type="button"
                              onClick={() =>
                                setOpenDayEditor(curr => (curr === item.day ? null : item.day))
                              }
                              className="text-[11px] text-muted underline-offset-2 hover:text-ink hover:underline"
                            >
                              {isEditorOpen
                                ? 'Hide 1-line reflection'
                                : '+ Write a 1-line reflection'}
                            </button>
                          </div>

                          {isEditorOpen && (
                            <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-2.5">
                              <input
                                type="text"
                                value={noteValue}
                                onChange={e =>
                                  setDayDrafts(prev => ({ ...prev, [item.day]: e.target.value }))
                                }
                                placeholder="Write a 1-line reflection (optional)..."
                                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-ink placeholder:text-muted/60 focus:border-teal/40 focus:outline-none"
                              />
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] text-muted">
                                  {savedDayFlash === item.day
                                    ? '✓ Saved & marked explored'
                                    : savedReflection?.note
                                      ? 'Saved on device'
                                      : 'Saves & marks day explored'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => void handleSaveDayNote(item.day)}
                                  className="rounded-lg border border-teal/35 bg-teal/15 px-2.5 py-1 text-[11px] font-medium text-teal hover:bg-teal/25"
                                >
                                  Save note
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Emoji Quick Reactions per Day */}
                          <div className="flex flex-wrap gap-1.5">
                            {EMOJI_QUICK_REACTIONS.map(reaction => {
                              const isChosen = savedReflection?.reaction === reaction
                              return (
                                <button
                                  key={reaction}
                                  type="button"
                                  onClick={() =>
                                    void saveJourneyDayReflection(
                                      item.day,
                                      { reaction },
                                      true
                                    )
                                  }
                                  className={`rounded-full border px-2 py-0.5 text-[10px] transition ${
                                    isChosen
                                      ? 'border-teal/45 bg-teal/20 font-medium text-teal'
                                      : 'border-white/10 bg-white/[0.03] text-muted hover:border-white/20 hover:text-ink'
                                  }`}
                                >
                                  {reaction}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Weekly Reflection Checkpoint Card */}
                <div className="mt-6 rounded-2xl border border-lavender/25 bg-lavender/[0.06] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-lavender">
                        Weekly Reflection Checkpoint · Week {week.weekNumber}
                      </span>
                      <p className="mt-1 text-sm text-ink">{week.checkpointPrompt}</p>
                    </div>
                    {savedWeekFlash === week.weekNumber && (
                      <span className="rounded-full border border-teal/35 bg-teal/15 px-3 py-1 text-xs text-teal">
                        ✓ Weekly checkpoint saved
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
                    <input
                      type="text"
                      value={currentWeeklyDraft}
                      onChange={e =>
                        setWeeklyDrafts(prev => ({
                          ...prev,
                          [week.weekNumber]: e.target.value,
                        }))
                      }
                      placeholder="Record what felt supportive this week (optional)..."
                      className="flex-1 rounded-xl border border-white/12 bg-black/25 px-3.5 py-2.5 text-xs text-ink placeholder:text-muted/65 focus:border-lavender/45 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => void handleSaveWeeklyCheckpoint(week.weekNumber)}
                      className="rounded-xl border border-lavender/40 bg-lavender/15 px-4 py-2.5 text-xs font-medium text-lavender transition hover:bg-lavender/25"
                    >
                      Save Week {week.weekNumber} Reflection
                    </button>
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </AppShell>
  )
}
