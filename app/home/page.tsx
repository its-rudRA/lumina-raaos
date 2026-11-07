'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CloudRain,
  CloudSun,
  Compass,
  Dna,
  Flame,
  Flower2,
  MessageCircleHeart,
  Pause,
  Play,
  Route,
  Send,
  Sparkles,
  Star,
  Wind,
} from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { SomaticPulseScan } from '@/components/somatic-pulse-scan'
import { useSanctuary } from '@/context/sanctuary-context'
import { EMOTION_OPTIONS } from '@/lib/db'
import { auraColor, formatClock, glass, timeAgo } from '@/lib/format'

function greetingFor(hour: number) {
  if (hour < 5 || hour >= 21) return 'Gentle night'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function HomeContent() {
  const {
    name,
    orb,
    aura,
    gardenBlooms,
    checkIns,
    companion,
    companionHistory,
    onboarding,
    bioRhythm,
    journeyCompletedDays,
    starJar,
    rainPlaying,
    rainSeconds,
    toggleRain,
    sendCompanionThought,
    aiStatus,
    insightReflection,
  } = useSanctuary()
  const [quickPrompt, setQuickPrompt] = useState('')
  const [sendingPrompt, setSendingPrompt] = useState(false)

  const firstName = name.trim().split(/\s+/)[0] || 'friend'
  const latest = checkIns[0]
  const latestEmotionMeta = useMemo(() => {
    if (!latest) return null
    const matched =
      EMOTION_OPTIONS.find(e => e.id === latest.emotionId) ??
      EMOTION_OPTIONS.find(e => e.label.toLowerCase() === (latest.emotionLabel ?? '').toLowerCase())
    return {
      emoji: latest.emoji || matched?.emoji || '🌸',
      label: latest.emotionLabel || matched?.label || latest.auraLabel,
      intensity: latest.intensity ?? 3,
      color: matched?.color || auraColor(latest.auraLabel),
      auraLabel: latest.auraLabel,
      note: latest.note,
      tags: latest.tags,
      timestamp: latest.timestamp,
    }
  }, [latest])

  const totalBlooms = checkIns.length > 0 ? Math.max(gardenBlooms, checkIns.length) : 0
  const latestBloomColor = latestEmotionMeta ? latestEmotionMeta.color : aura.color
  const latestBloomLabel = latestEmotionMeta ? latestEmotionMeta.label : 'Awaiting first bloom'
  const comfortEnv = onboarding.preferences?.comfortEnvironment || 'Starry twilight sanctuary'
  const dailyTime = onboarding.preferences?.dailyTime || '5 minutes'

  const latestCompanionMsg = useMemo(() => {
    const rev = [...companionHistory].reverse()
    return rev.find(m => m.role === 'companion') ?? rev[0] ?? null
  }, [companionHistory])

  // Emotional Battery & Mental Load bars calibrated from recent check-ins + biological rest rhythm
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

    if (!checkIns.length) {
      const battery = Math.max(18, Math.min(94, Math.round(orb.x * 0.65 + (100 - orb.y) * 0.35 + sleepOffset)))
      const load = Math.max(20, Math.min(94, Math.round(orb.y * 0.55 + 22 + loadOffset)))
      return { battery, load }
    }

    const recent = checkIns.slice(0, 5)
    const avgX = recent.reduce((acc, c) => acc + c.orb.x, 0) / recent.length
    const avgY = recent.reduce((acc, c) => acc + c.orb.y, 0) / recent.length
    const heavyTagCount = recent.reduce(
      (acc, c) =>
        acc +
        c.tags.filter(t =>
          ['Tight chest', 'Overthinking', 'Academic pressure', 'Quietly tired', 'Restless'].includes(t)
        ).length,
      0
    )

    const battery = Math.round(
      Math.max(16, Math.min(94, avgX * 0.65 + (100 - avgY) * 0.35 + sleepOffset))
    )
    const load = Math.round(
      Math.max(20, Math.min(95, avgY * 0.55 + Math.min(40, heavyTagCount * 9) + loadOffset))
    )
    return { battery, load }
  }, [checkIns, bioRhythm, orb])

  // Suggested Calming Activity dynamically tailored from onboarding preferences (comfortEnvironment, dailyTime, helpGoals) & somatic cues
  const suggestion = useMemo(() => {
    const goals = onboarding.preferences?.helpGoals ?? []
    const latestCues = latest?.tags ?? []
    const hasChestOrBreathCue = latestCues.some(t =>
      ['Tight chest', 'Restless', 'Shallow breath'].includes(t)
    )
    const hasOverthinkingCue = latestCues.some(t =>
      ['Overthinking', 'Academic pressure', 'Heavy thoughts'].includes(t)
    )

    if (hasChestOrBreathCue || bioRhythm.sleepQuality !== 'rested') {
      return {
        title: `${dailyTime} Somatic Exhale Reset`,
        body: hasChestOrBreathCue
          ? `Because you noted "${latestCues[0]}" in your latest check-in, a 4s inhale / 6s exhale pacer in your ${comfortEnv.toLowerCase()} space can gently ease physical bracing.`
          : `With ${bioRhythm.sleepHours}h of ${bioRhythm.sleepQuality} rest, a ${dailyTime.toLowerCase()} longer-exhale practice signals safety to your nervous system.`,
        href: '/calm-studio',
        cta: 'Open Calm Studio',
        icon: Wind,
        badge: `${dailyTime} · ${comfortEnv}`,
      }
    }

    if (
      hasOverthinkingCue ||
      goals.includes('Emotional expression') ||
      goals.includes('Managing overwhelming thoughts')
    ) {
      return {
        title: 'Burn & Release Parchment',
        body: hasOverthinkingCue
          ? `You recently named "${latestCues[0]}"—give one looping thought a symbolic place to dissolve into rising twilight embers.`
          : `Tailored to your "${goals[0] ?? 'Emotional expression'}" goal (${dailyTime.toLowerCase()} pace): write down one heavy thought and watch it turn to starlight.`,
        href: '/release-room',
        cta: 'Open Release Room',
        icon: Flame,
        badge: `${dailyTime} · Symbolic release`,
      }
    }

    return {
      title: `Acoustic Rain & ${comfortEnv} Pad`,
      body: `Tailored to your "${comfortEnv}" preference and ${dailyTime.toLowerCase()} daily rhythm—real-time pink/brown rain synthesis over 174Hz and 261Hz warm harmonic oscillators.`,
      href: '/calm-studio',
      cta: 'Enter Calm Studio',
      icon: CloudRain,
      badge: `${dailyTime} · ${comfortEnv}`,
    }
  }, [latest, onboarding.preferences, bioRhythm.sleepQuality, bioRhythm.sleepHours, dailyTime, comfortEnv])

  const SuggestionIcon = suggestion.icon
  const completedDays = journeyCompletedDays.length
  const latestStar = starJar[0]

  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-6">
      {/* 1. PERSONALIZED GREETING + DATE + COMFORT ENVIRONMENT BADGE */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">
            {new Intl.DateTimeFormat('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            }).format(new Date())}
          </p>
          <h1 className="mt-1 font-serif text-3xl text-white sm:text-4xl">
            {greetingFor(new Date().getHours())}, <em>{firstName}.</em>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] px-3.5 py-1.5 text-xs text-white/75 backdrop-blur-xl">
            <Sparkles size={13} className="text-[#e8b8c7]" />
            <span>Atmosphere: {comfortEnv}</span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] px-3.5 py-1.5 text-xs text-white/65 backdrop-blur-xl">
            <CloudSun size={13} className="text-[#91cabe]" />
            <span>
              Rest: {bioRhythm.sleepHours}h ({bioRhythm.sleepQuality})
            </span>
          </span>
        </div>
      </section>

      {/* LIVE SOMATIC PULSE & RESONANCE TELEMETRY SUITE */}
      <SomaticPulseScan />

      {/* 2. PRIMARY GATEWAY ROW: TODAY'S CHECK-IN STATUS + LIVING INNER GARDEN GATEWAY */}
      <section className="grid gap-5 lg:grid-cols-12">
        {/* Today's Emotional Check-In Status Card */}
        <div className={`${glass} flex flex-col justify-between p-6 lg:col-span-5`}>
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="eyebrow">Today&apos;s Emotional Check-In</p>
              <span className="text-[11px] text-white/45">
                {latest ? `Last check-in ${timeAgo(latest.timestamp)}` : 'No check-ins recorded yet'}
              </span>
            </div>

            {latestEmotionMeta ? (
              <div className="mt-5 flex items-center gap-4">
                <span
                  className="grid h-16 w-16 shrink-0 place-items-center rounded-full text-2xl"
                  style={{
                    background: `radial-gradient(circle at 35% 30%, #ffffffd0, ${latestEmotionMeta.color} 55%, ${latestEmotionMeta.color}40)`,
                    boxShadow: `0 0 42px ${latestEmotionMeta.color}75`,
                    animation: 'luminaBreathe 5s ease-in-out infinite',
                  }}
                >
                  {latestEmotionMeta.emoji}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className="font-serif text-2xl"
                      style={{ color: latestEmotionMeta.color }}
                    >
                      {latestEmotionMeta.label}
                    </p>
                    <span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-2.5 py-0.5 text-[10px] text-white/70">
                      Intensity {latestEmotionMeta.intensity}/5
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-white/60">
                    {latestEmotionMeta.note
                      ? `“${latestEmotionMeta.note}”`
                      : latestEmotionMeta.tags.length
                        ? `Somatic cues: ${latestEmotionMeta.tags.join(' · ')}`
                        : `Compass aura: ${latestEmotionMeta.auraLabel}`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="flex items-center gap-3.5">
                  <span
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-xl"
                    style={{
                      background: `radial-gradient(circle at 35% 30%, #ffffffd0, ${aura.color} 55%, ${aura.color}40)`,
                      boxShadow: `0 0 28px ${aura.color}65`,
                    }}
                  >
                    🌸
                  </span>
                  <div>
                    <p className="font-serif text-lg text-white">
                      Welcome to your emotional compass, {firstName}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-white/55">
                      Choose an emoji mood, rate intensity (1–5), or drag the 2D compass to plant
                      your first glowing lotus bloom.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Emotional Battery & Mental Load Bars */}
            <div className="mt-5 space-y-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
              <div>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-white/60">Emotional battery</span>
                  <span className="text-white/85">{weatherMetrics.battery}%</span>
                </div>
                <div className="meter">
                  <span style={{ width: `${weatherMetrics.battery}%` }} />
                </div>
              </div>
              <div>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-white/60">Mental load</span>
                  <span className="text-white/85">{weatherMetrics.load}%</span>
                </div>
                <div className="meter lavender">
                  <span style={{ width: `${weatherMetrics.load}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <p className="text-xs text-white/45">
              12 emoji states · 2D compass · Somatic cues
            </p>
            <Link href="/check-in" className="primary-button shrink-0 px-5 py-2.5 text-xs">
              <Compass size={14} /> Check In Now <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Living Inner Garden Atmospheric Gateway Card */}
        <div
          className={`${glass} relative flex flex-col justify-between overflow-hidden p-6 lg:col-span-7`}
          style={{
            background:
              'radial-gradient(circle at 72% 32%, rgba(142, 201, 189, 0.16), transparent 48%), radial-gradient(circle at 24% 78%, rgba(231, 169, 189, 0.15), transparent 52%), rgba(255, 255, 255, 0.04)',
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow text-[#a5d4ca]">3D Bioluminescent Sanctuary</p>
              <h2 className="mt-1 font-serif text-3xl text-white">Your Living Inner Garden</h2>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-white/55">
                Every check-in you plant blooms as a glowing lotus before the Moon Gate. Wander your
                pond, inspect past memories, and release worries into rising embers.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#8ec9bd]/30 bg-[#8ec9bd]/10 px-3.5 py-1.5 text-xs text-[#bfe3da]">
              <Flower2 size={14} />
              {totalBlooms} lotus bloom{totalBlooms === 1 ? '' : 's'}
            </span>
          </div>

          {/* Atmospheric Lotus Pond Preview Motif */}
          <div className="my-6 grid gap-3 rounded-2xl border border-white/[0.08] bg-[#080b12]/65 p-4 sm:grid-cols-3">
            <div className="flex items-center gap-3">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm"
                style={{
                  background: latestBloomColor,
                  boxShadow: `0 0 20px ${latestBloomColor}`,
                }}
              >
                {latestEmotionMeta?.emoji ?? ''}
              </span>
              <div className="min-w-0">
                <p className="eyebrow text-[9px]">Latest bloom tint</p>
                <p className="truncate font-serif text-base text-white">{latestBloomLabel}</p>
              </div>
            </div>

            <div className="border-t border-white/[0.06] pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
              <p className="eyebrow text-[9px]">Recent cues planted</p>
              <p className="mt-1 truncate text-xs text-white/75">
                {latest?.tags?.length
                  ? latest.tags.join(' · ')
                  : 'Plant a check-in to record body cues'}
              </p>
            </div>

            <div className="border-t border-white/[0.06] pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
              <p className="eyebrow text-[9px]">Sanctuary pond state</p>
              <p className="mt-1 text-xs text-[#a5d4ca]">
                {rainPlaying ? 'Gentle rain falling on the water' : 'Still twilight reflections'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-white/45">
              Full interactive WebGL world · Orbit, sculpt &amp; illuminate memories
            </p>
            <Link href="/garden" className="primary-button px-5 py-2.5 text-xs">
              <Flower2 size={14} /> Enter 3D Inner Garden <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      {/* 3. MIDDLE ROW: QUICK SOUL COMPANION + SUGGESTED CALMING ACTIVITY */}
      <section className="grid gap-5 lg:grid-cols-2">
        {/* Quick Soul Companion Card */}
        <div className={`${glass} flex flex-col justify-between p-6`}>
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="companion-avatar">
                  <MessageCircleHeart size={16} />
                </span>
                <div>
                  <p className="eyebrow">Soul Companion</p>
                  <h2 className="font-serif text-2xl text-white">{companion}</h2>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.09] bg-white/[0.03] px-3 py-1 text-[11px] text-white/60">
                <span className="status-dot" />{' '}
                {aiStatus === 'gemini' ? 'Gemini AI Connected' : 'Local Sanctuary Mode'}
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-white/[0.08] bg-black/20 p-4">
              {latestCompanionMsg ? (
                <>
                  <p className="eyebrow text-[9px] text-[#edb4c5]">
                    Latest reflection · {latestCompanionMsg.mode}
                  </p>
                  <p className="mt-1.5 line-clamp-2 font-serif text-base leading-relaxed text-white/85">
                    “{latestCompanionMsg.text}”
                  </p>
                </>
              ) : (
                <p className="font-serif text-base leading-relaxed text-white/75">
                  “Tell me what feels loud right now, {firstName}. We can simply sit with it, ground
                  your body, or take one tiny step together.”
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <form
              onSubmit={async e => {
                e.preventDefault()
                if (!quickPrompt.trim() || sendingPrompt) return
                setSendingPrompt(true)
                const msg = quickPrompt
                setQuickPrompt('')
                await sendCompanionThought(msg, companion)
                setSendingPrompt(false)
              }}
              className="flex items-center gap-2"
            >
              <input
                value={quickPrompt}
                onChange={e => setQuickPrompt(e.target.value)}
                placeholder="Ask your Soul Companion anything..."
                aria-label="Quick message to Soul Companion"
                className="companion-input !py-2.5 !text-xs"
              />
              <button
                type="submit"
                disabled={!quickPrompt.trim() || sendingPrompt}
                className="secondary-button shrink-0 !px-3.5 !py-2.5 !text-xs"
              >
                <Send size={13} />
              </button>
            </form>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-white/45">
                AI Companion + Guided Bot · Voice venting · Memory Vault
              </span>
              <Link href="/companion" className="primary-button px-5 py-2.5 text-xs">
                Open Soul Companion <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>

        {/* Suggested Calming Activity Card */}
        <div className={`${glass} flex flex-col justify-between p-6`}>
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="eyebrow text-[#a5d4ca]">Suggested Calming Activity</p>
                  <span className="rounded-full border border-[#8ec9bd]/30 bg-[#8ec9bd]/10 px-2.5 py-0.5 text-[10px] text-[#bfe3da]">
                    {suggestion.badge}
                  </span>
                </div>
                <h2 className="mt-1 font-serif text-2xl text-white">{suggestion.title}</h2>
              </div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/[0.1] bg-white/[0.04] text-[#a5d4ca]">
                <SuggestionIcon size={18} />
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-white/60">{suggestion.body}</p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
            <button
              type="button"
              onClick={toggleRain}
              aria-pressed={rainPlaying}
              className={`support-button px-4 py-2.5 text-xs ${
                rainPlaying ? 'border-[#91cabe]/50 text-[#a5d4ca]' : ''
              }`}
            >
              {rainPlaying ? <Pause size={13} /> : <Play size={13} fill="currentColor" />}
              <span>
                {rainPlaying
                  ? `Pause 3:00 Rain (${formatClock(rainSeconds)})`
                  : 'Start 3:00 Rain'}
              </span>
            </button>

            <Link href={suggestion.href} className="primary-button px-5 py-2.5 text-xs">
              {suggestion.cta} <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      {/* 4. BOTTOM ROW: MY JOURNEY PROGRESS + RECENT REFLECTION & STAR JAR SUMMARY */}
      <section className="grid gap-5 lg:grid-cols-2">
        {/* 30-Day Journey Progress Card */}
        <div className={`${glass} flex flex-col justify-between p-6`}>
          <div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="eyebrow">30-Day Gentle Path</p>
                <h2 className="mt-1 font-serif text-2xl text-white">
                  {completedDays} of 30 days explored
                </h2>
              </div>
              <Route size={20} className="text-[#c9b9e6]" />
            </div>
            <p className="mt-1.5 text-xs text-white/50">
              Moves at the speed of trust—never measured in streaks, never reset for missed days.
            </p>
            <div className="meter lavender mt-4">
              <span style={{ width: `${(completedDays / 30) * 100}%` }} />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <span className="text-xs text-white/45">
              {completedDays === 0
                ? 'Begin with Day 1 whenever you feel ready'
                : `Next gentle practice: Day ${Math.min(30, completedDays + 1)}`}
            </span>
            <Link href="/journey" className="secondary-button px-4 py-2 text-xs">
              Continue My Journey <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Recent Reflection & Calm DNA Summary Card */}
        <div className={`${glass} flex flex-col justify-between p-6`}>
          <div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="eyebrow">Recent Reflection &amp; Star Jar</p>
                <h2 className="mt-1 font-serif text-2xl text-white">Personal Insights &amp; Calm DNA</h2>
              </div>
              <Dna size={20} className="text-[#edb4c5]" />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3.5">
                <p className="eyebrow text-[9px]">
                  {insightReflection ? 'Latest Sanctuary Reflection' : 'Latest check-in'}
                </p>
                {insightReflection ? (
                  <>
                    <p className="mt-1 line-clamp-2 font-serif text-sm text-white/90">
                      “{insightReflection.narrative}”
                    </p>
                    <p className="mt-1 text-[10px] text-white/45">
                      Generated {timeAgo(insightReflection.generatedAt)}
                    </p>
                  </>
                ) : latestEmotionMeta ? (
                  <>
                    <p
                      className="mt-1 font-serif text-lg"
                      style={{ color: latestEmotionMeta.color }}
                    >
                      {latestEmotionMeta.emoji} {latestEmotionMeta.label} ({latestEmotionMeta.intensity}/5)
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-white/50">
                      {latestEmotionMeta.tags.length
                        ? latestEmotionMeta.tags.join(' · ')
                        : 'Quiet check-in'}{' '}
                      · {timeAgo(latestEmotionMeta.timestamp)}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-white/45">
                    No check-ins recorded yet. Check in 3 times to unlock AI Sanctuary Reflections.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3.5">
                <p className="eyebrow flex items-center gap-1 text-[9px] text-[#efd099]">
                  <Star size={10} fill="currentColor" /> Star Jar ({starJar.length})
                </p>
                {latestStar ? (
                  <p className="mt-1 line-clamp-2 font-serif text-sm text-[#f6e4bd]">
                    “{latestStar.text}”
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-white/45">
                    Save small moments of gratitude in the Release Room.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Link href="/release-room" className="text-xs text-white/50 hover:text-white">
              Open Star Jar &amp; Release Room →
            </Link>
            <Link href="/insights" className="secondary-button px-4 py-2 text-xs">
              View Calm DNA &amp; Insights <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default function Page() {
  return (
    <AppShell>
      <HomeContent />
    </AppShell>
  )
}
