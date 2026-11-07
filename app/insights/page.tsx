'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  ChevronDown,
  Compass,
  Eye,
  HeartHandshake,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  SunMedium,
  Wind,
} from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { SomaticPulseScan } from '@/components/somatic-pulse-scan'
import { useSanctuary, type SensoryMode } from '@/context/sanctuary-context'
import type { BioRhythmState, WellnessProfilePreferences } from '@/lib/db'
import { auraColor, glass, shortDate, timeAgo } from '@/lib/format'

function countBy<T>(items: T[], key: (i: T) => string[]): Array<[string, number]> {
  const map: Record<string, number> = {}
  for (const i of items) for (const k of key(i)) map[k] = (map[k] || 0) + 1
  return Object.entries(map).sort((a, b) => b[1] - a[1])
}

function Bar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  return (
    <li>
      <div className="mb-1 flex justify-between text-xs text-white/65">
        <span>{label}</span>
        <span className="text-white/40">{count} of {total}</span>
      </div>
      <div className="meter">
        <span
          style={{
            width: `${(count / Math.max(1, total)) * 100}%`,
            background: color,
            boxShadow: `0 0 10px ${color}`,
          }}
        />
      </div>
    </li>
  )
}

const ENVIRONMENT_OPTIONS = [
  'Rainy and cozy',
  'Magical nature',
  'Ocean and water',
  'Starry night',
  'Minimal and quiet',
  'Warm and peaceful',
]

const STYLE_OPTIONS = [
  'AI Listener',
  'Gentle guided exercises',
  'Quiet personal reflection',
  'Interactive 3D experiences',
]

const TIME_OPTIONS = ['2 minutes', '5 minutes', '10 minutes', 'Flexible']

const COMPANION_OPTIONS = ['The Listener', 'The Grounder', 'The Guide', 'Boundary Coach']

const INSIGHT_REACTIONS = [
  '💗 This helped me',
  '🌿 I feel calmer',
  '🫂 I feel understood',
  '✨ I feel hopeful',
  '🌙 I need more rest',
]

function InsightsContent() {
  const {
    onboarding,
    companion,
    setCompanion,
    sensoryMode,
    updateProfileSettings,
    saveWellnessProfile,
    checkIns,
    bioRhythm,
    updateBioRhythm,
    memories,
    aiStatus,
    insightReflection,
    insightGenerating,
    generateSanctuaryReflection,
    reactToInsightReflection,
  } = useSanctuary()

  const [note, setNote] = useState(bioRhythm.rhythmNote)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [reflectionNotice, setReflectionNotice] = useState<string | null>(null)
  const prefs = onboarding.preferences
  const total = checkIns.length
  const remainingForReflection = Math.max(0, 3 - total)
  const auraDist = countBy(checkIns, c => [c.emotionLabel || c.auraLabel])
  const tagDist = countBy(checkIns, c => c.tags)
  const recent = checkIns.slice(0, 7)

  async function handleGenerateReflection() {
    setReflectionNotice(null)
    const res = await generateSanctuaryReflection()
    if (!res.ok && res.reason) {
      setReflectionNotice(res.reason)
    }
  }

  function updatePrefField(patch: Partial<WellnessProfilePreferences>) {
    const base: WellnessProfilePreferences = {
      reasons: prefs?.reasons ?? ['Better emotional awareness'],
      recentFeeling: prefs?.recentFeeling ?? 'Mostly calm',
      helpGoals: prefs?.helpGoals ?? ['Relaxation'],
      comfortEnvironment: prefs?.comfortEnvironment ?? 'Starry night',
      interactionStyle: prefs?.interactionStyle ?? 'AI Listener',
      dailyTime: prefs?.dailyTime ?? '5 minutes',
      ...(prefs?.optionalRhythmNote ? { optionalRhythmNote: prefs.optionalRhythmNote } : {}),
      ...patch,
      completedAt: Date.now(),
    }
    void saveWellnessProfile(base)
    setEditingKey(null)
  }

  const dnaCards = [
    {
      id: 'environment',
      label: 'Comforting environment',
      value: prefs?.comfortEnvironment || 'Not chosen yet',
      options: ENVIRONMENT_OPTIONS,
      onSelect: (val: string) => updatePrefField({ comfortEnvironment: val }),
    },
    {
      id: 'style',
      label: 'Interaction style',
      value: prefs?.interactionStyle || 'Not chosen yet',
      options: STYLE_OPTIONS,
      onSelect: (val: string) => updatePrefField({ interactionStyle: val }),
    },
    {
      id: 'time',
      label: 'Daily time',
      value: prefs?.dailyTime || 'Not chosen yet',
      options: TIME_OPTIONS,
      onSelect: (val: string) => updatePrefField({ dailyTime: val }),
    },
    {
      id: 'companion',
      label: 'Preferred companion',
      value: companion,
      options: COMPANION_OPTIONS,
      onSelect: (val: string) => {
        setCompanion(val)
        setEditingKey(null)
      },
    },
    {
      id: 'sensory',
      label: 'Sensory mode',
      value:
        sensoryMode === 'full'
          ? 'Full sanctuary'
          : sensoryMode === 'gentle'
            ? 'Gentle'
            : 'Low stimulus',
      options: ['Full sanctuary', 'Gentle', 'Low stimulus'],
      onSelect: (val: string) => {
        const mapped: SensoryMode =
          val === 'Gentle' ? 'gentle' : val === 'Low stimulus' ? 'low' : 'full'
        void updateProfileSettings({ sensoryMode: mapped })
        setEditingKey(null)
      },
    },
  ]

  // Observations are strictly descriptive of the user's own data: no scores, no claims of improvement.
  const observations: string[] = []
  if (total > 0) {
    observations.push(`You have saved ${total} check-in${total === 1 ? '' : 's'} so far.`)
    if (auraDist[0]) {
      observations.push(
        `You have most often arrived “${auraDist[0][0]}” (${auraDist[0][1]} of ${total}).`
      )
    }
    if (tagDist[0]) {
      observations.push(
        `“${tagDist[0][0]}” is the cue you have named most often (${tagDist[0][1]} time${tagDist[0][1] === 1 ? '' : 's'}).`
      )
    }
  }
  for (const m of memories.filter(mem => mem.sharedWithAi !== false).slice(0, 2)) {
    observations.push(`You asked LUMINA to remember: “${m.text}”`)
  }
  if (total < 3) {
    observations.push(
      'Patterns need a few more check-ins before they mean much, so there is no rush.'
    )
  }

  const saveBio = (patch: Partial<BioRhythmState>) =>
    void updateBioRhythm({ ...bioRhythm, ...patch })
  const qualities: Array<[BioRhythmState['sleepQuality'], string]> = [
    ['rested', 'Rested'],
    ['fragmented', 'Fragmented'],
    ['exhausted', 'Exhausted'],
  ]

  const activeProvider = insightReflection?.provider ?? aiStatus

  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-5">
      {/* 1. LIVE SOMATIC PULSE & RESONANCE TELEMETRY SUITE */}
      <SomaticPulseScan />

      {/* 2. REAL AI SANCTUARY REFLECTION ENGINE */}
      <section
        className={`${glass} relative overflow-hidden p-6`}
        style={{
          background:
            'radial-gradient(circle at 82% 18%, rgba(126, 200, 184, 0.14), transparent 46%), radial-gradient(circle at 14% 85%, rgba(232, 164, 184, 0.14), transparent 50%), rgba(255, 255, 255, 0.04)',
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="eyebrow flex items-center gap-1.5 text-[#7ec8b8]">
                <Sparkles size={12} /> Personalized Sanctuary Reflection
              </p>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${
                  activeProvider === 'gemini'
                    ? 'border-[#7ec8b8]/45 bg-[#7ec8b8]/15 text-[#c8f3e9]'
                    : 'border-[#b8a4e8]/40 bg-[#b8a4e8]/15 text-[#e2d8f8]'
                }`}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: activeProvider === 'gemini' ? '#7ec8b8' : '#b8a4e8',
                    boxShadow: `0 0 8px ${activeProvider === 'gemini' ? '#7ec8b8' : '#b8a4e8'}`,
                  }}
                />
                {activeProvider === 'gemini' ? 'Gemini AI Connected' : 'Local Mode (On-Device)'}
              </span>
              {insightReflection && (
                <span className="text-[11px] text-white/40">
                  Generated {timeAgo(insightReflection.generatedAt)}
                </span>
              )}
            </div>
            <h2 className="mt-1.5 font-serif text-2xl text-white sm:text-3xl">
              Generate My Sanctuary Reflection
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/55">
              Synthesizes your real check-ins, somatic cues, rest rhythm, and approved memories into
              non-clinical observations—distinguishing observed personal correlations from causes
              and never fabricating statistics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {total >= 3 ? (
              <button
                type="button"
                onClick={() => void handleGenerateReflection()}
                disabled={insightGenerating}
                className="primary-button px-5 py-2.5 text-xs"
              >
                <RefreshCw size={13} className={insightGenerating ? 'animate-spin' : ''} />
                <span>
                  {insightGenerating
                    ? 'Weaving Reflection...'
                    : insightReflection
                      ? 'Refresh Sanctuary Reflection'
                      : 'Generate My Sanctuary Reflection'}
                </span>
              </button>
            ) : (
              <Link href="/check-in" className="primary-button px-5 py-2.5 text-xs">
                <Compass size={14} /> Record Check-In ({total}/3) <ArrowRight size={13} />
              </Link>
            )}
          </div>
        </div>

        {reflectionNotice && (
          <div className="mt-4 rounded-2xl border border-[#e8a4b8]/40 bg-[#e8a4b8]/10 px-4 py-3 text-xs text-[#f6dce4]">
            {reflectionNotice}
          </div>
        )}

        {/* Loading State */}
        {insightGenerating && (
          <div className="mt-5 flex flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-black/25 px-6 py-10 text-center">
            <div className="lumina-orb mb-4 !h-14 !w-14" aria-hidden />
            <p className="font-serif text-xl text-white">
              LUMINA is gently weaving your sanctuary reflection...
            </p>
            <p className="mt-1 text-xs text-white/50">
              Reading your check-in compass, somatic cues, rest rhythm, and approved memories with
              care.
            </p>
          </div>
        )}

        {/* Honest Empty / Progress Notice when checkIns.length < 3 */}
        {!insightGenerating && total < 3 && (
          <div className="mt-5 rounded-2xl border border-white/[0.08] bg-black/25 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="font-serif text-lg text-white">
                  Record {remainingForReflection} more emotional check-in
                  {remainingForReflection === 1 ? '' : 's'} to unlock personalized pattern
                  reflections—LUMINA never guesses or fabricates patterns from empty data.
                </p>
                <p className="text-xs text-white/50">
                  Once you have at least 3 check-ins, LUMINA can responsibly reflect on recurring
                  emotions, somatic triggers, rest correlations, and calming strategies that fit
                  you.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {[1, 2, 3].map(step => (
                  <span
                    key={step}
                    className={`grid h-8 w-8 place-items-center rounded-full border text-xs font-medium ${
                      total >= step
                        ? 'border-[#7ec8b8]/60 bg-[#7ec8b8]/20 text-[#c8f3e9]'
                        : 'border-white/[0.1] bg-white/[0.03] text-white/40'
                    }`}
                  >
                    {step}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Ready to generate prompt when >= 3 check-ins exist but no reflection generated yet */}
        {!insightGenerating && total >= 3 && !insightReflection && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#7ec8b8]/30 bg-[#7ec8b8]/[0.07] p-5">
            <div>
              <p className="font-serif text-lg text-white">
                You have {total} saved check-ins ready for reflection.
              </p>
              <p className="mt-1 text-xs text-white/60">
                Click &ldquo;Generate My Sanctuary Reflection&rdquo; above to weave your 7-part
                personal insight summary.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleGenerateReflection()}
              className="secondary-button border border-[#7ec8b8]/40 px-4 py-2 text-xs text-[#c8f3e9]"
            >
              <Sparkles size={13} /> Weave Reflection Now
            </button>
          </div>
        )}

        {/* Rendered 7-Category Sanctuary Reflection */}
        {!insightGenerating && insightReflection && (
          <div className="mt-5 space-y-4">
            {/* Overarching Narrative + Weekly Summary Banner */}
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="rounded-2xl border border-white/[0.09] bg-black/25 p-5 lg:col-span-7">
                <p className="eyebrow text-[#e8a4b8]">Sanctuary Narrative</p>
                <p className="mt-2 font-serif text-lg leading-relaxed text-white/90">
                  “{insightReflection.narrative}”
                </p>
              </div>
              <div className="rounded-2xl border border-[#7ec8b8]/25 bg-[#7ec8b8]/[0.06] p-5 lg:col-span-5">
                <p className="eyebrow text-[#7ec8b8]">1. Weekly Sanctuary Summary</p>
                <p className="mt-2 text-xs leading-relaxed text-white/80">
                  {insightReflection.weeklySummary}
                </p>
              </div>
            </div>

            {/* 6 Editorial Category Cards */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {/* Emotional Patterns */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                <p className="eyebrow flex items-center gap-1.5 text-[#e8a4b8]">
                  <Compass size={12} /> 2. Emotional Patterns
                </p>
                <ul className="mt-3 space-y-2 text-xs leading-relaxed text-white/75">
                  {insightReflection.emotionalPatterns.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e8a4b8]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Common Somatic & Context Triggers */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                <p className="eyebrow flex items-center gap-1.5 text-[#f3d9a4]">
                  <Eye size={12} /> 3. Common Cues &amp; Triggers
                </p>
                <ul className="mt-3 space-y-2 text-xs leading-relaxed text-white/75">
                  {insightReflection.commonTriggers.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f3d9a4]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Calming Strategies */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                <p className="eyebrow flex items-center gap-1.5 text-[#7ec8b8]">
                  <Wind size={12} /> 4. Helpful Calming Strategies
                </p>
                <ul className="mt-3 space-y-2 text-xs leading-relaxed text-white/75">
                  {insightReflection.calmingStrategies.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7ec8b8]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Sleep & Mood Observation (Correlation vs Cause) */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                <p className="eyebrow flex items-center gap-1.5 text-[#b8a4e8]">
                  <Moon size={12} /> 5. Sleep &amp; Mood Observation
                </p>
                <p className="mt-3 text-xs leading-relaxed text-white/75">
                  {insightReflection.sleepMoodObservation}
                </p>
                <p className="mt-2 text-[10px] text-white/40">
                  Framed as an observed personal correlation—never a clinical diagnosis or proven
                  cause.
                </p>
              </div>

              {/* Positive Moments & Anchors */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                <p className="eyebrow flex items-center gap-1.5 text-[#f3d9a4]">
                  <SunMedium size={12} /> 6. Positive Moments &amp; Anchors
                </p>
                <ul className="mt-3 space-y-2 text-xs leading-relaxed text-white/75">
                  {insightReflection.positiveMoments.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f3d9a4]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Gentle Suggestions */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                <p className="eyebrow flex items-center gap-1.5 text-[#91cabe]">
                  <HeartHandshake size={12} /> 7. Gentle Next Suggestions
                </p>
                <ul className="mt-3 space-y-2 text-xs leading-relaxed text-white/75">
                  {insightReflection.gentleSuggestions.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#91cabe]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Emoji Quick Reactions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-3">
              <span className="text-xs text-white/55">
                How does this reflection feel to you right now?
              </span>
              <div className="flex flex-wrap gap-1.5">
                {INSIGHT_REACTIONS.map(reaction => {
                  const selected = insightReflection.reaction === reaction
                  return (
                    <button
                      key={reaction}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => void reactToInsightReflection(reaction)}
                      className={`rounded-full border px-3 py-1 text-xs transition ${
                        selected
                          ? 'border-[#e8a4b8]/65 bg-[#e8a4b8]/20 text-white shadow-[0_0_14px_rgba(232,164,184,0.28)]'
                          : 'border-white/[0.09] bg-white/[0.03] text-white/65 hover:text-white'
                      }`}
                    >
                      {reaction}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 3. INTERACTIVE CALM DNA PROFILE CARDS (CLICK TO SET OR CHANGE INLINE) */}
      <section className={`${glass} p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="eyebrow">Your Personal Calm DNA</p>
            <p className="mt-1 text-xs text-white/45">
              A reflection of your own choices. Click any card below to set or tune it directly.
            </p>
          </div>
          <span className="text-[11px] text-[#7ec8b8]">Click any card to customize</span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {dnaCards.map(card => {
            const isOpen = editingKey === card.id
            const isUnset = card.value === 'Not chosen yet'
            return (
              <div
                key={card.id}
                className={`rounded-2xl border p-4 transition ${
                  isOpen
                    ? 'border-[#7ec8b8]/55 bg-[#7ec8b8]/10'
                    : isUnset
                      ? 'border-[#e8a4b8]/35 bg-[#e8a4b8]/[0.06]'
                      : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setEditingKey(isOpen ? null : card.id)}
                  className="flex w-full items-start justify-between gap-2 text-left"
                >
                  <div>
                    <p className="eyebrow text-[9px]">{card.label}</p>
                    <p
                      className={`mt-2 font-serif text-lg ${
                        isUnset ? 'text-[#e8a4b8]' : 'text-white'
                      }`}
                    >
                      {card.value}
                    </p>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`mt-0.5 shrink-0 text-white/40 transition-transform ${
                      isOpen ? 'rotate-180 text-[#7ec8b8]' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/[0.08] pt-3">
                    {card.options.map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => card.onSelect(opt)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                          card.value === opt
                            ? 'border-[#7ec8b8]/60 bg-[#7ec8b8]/20 text-white'
                            : 'border-white/[0.1] bg-black/25 text-white/65 hover:text-white'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* 4. CHECK-IN DISTRIBUTIONS, BODY CUES, SLEEP RHYTHM & OBSERVATIONS */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className={`${glass} p-6`}>
          <p className="eyebrow">Emotional Compass Distribution &amp; Recent Mood History</p>
          <p className="mt-1 text-xs text-white/45">
            Visual summary across Pleasantness and Energy from your real IndexedDB check-ins.
          </p>
          {total === 0 ? (
            <p className="mt-4 text-sm text-white/45">
              Save a check-in or run the 10s Resonance Scan above to see where you tend to arrive.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {auraDist.map(([label, count]) => (
                <Bar key={label} label={label} count={count} total={total} color={auraColor(label)} />
              ))}
            </ul>
          )}
          {recent.length > 0 && (
            <>
              <p className="eyebrow mt-6">Recent Mood History</p>
              <ul className="mt-3 flex flex-wrap gap-3">
                {recent.map((c, i) => (
                  <li
                    key={c.id ?? `${c.timestamp}-${i}`}
                    className="flex flex-col items-center gap-1"
                    title={`${c.emoji ? `${c.emoji} ` : ''}${c.emotionLabel || c.auraLabel}${c.intensity ? ` (${c.intensity}/5)` : ''} · Pleasantness ${Math.round(c.orb.x)}% · Energy ${Math.round(100 - c.orb.y)}%`}
                  >
                    <span
                      className="grid h-7 w-7 place-items-center rounded-full text-xs"
                      style={{
                        background: auraColor(c.auraLabel),
                        boxShadow: `0 0 12px ${auraColor(c.auraLabel)}88`,
                      }}
                    >
                      {c.emoji || ''}
                    </span>
                    <span className="text-[10px] text-white/40">{shortDate(c.timestamp)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className={`${glass} p-6`}>
          <p className="eyebrow">Most Frequent Somatic Body Cues</p>
          <p className="mt-1 text-xs text-white/45">
            Cues you have named across your local check-ins.
          </p>
          {tagDist.length === 0 ? (
            <p className="mt-4 text-sm text-white/45">
              Cues you tag in check-ins will appear here.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {tagDist.slice(0, 6).map(([label, count]) => (
                <Bar key={label} label={label} count={count} total={total} color="#d99eb2" />
              ))}
            </ul>
          )}
        </section>

        <section className={`${glass} p-6`}>
          <p className="eyebrow flex items-center gap-1.5">
            <Moon size={12} /> Biological Rhythm &amp; Rest Tuner
          </p>
          <p className="mt-1 text-xs text-white/45">
            Log your sleep hours and rest quality to calibrate your sanctuary pacing.
          </p>
          <label className="mt-4 block text-xs text-white/65" htmlFor="insights-sleep-hours">
            Last night&apos;s rest: <strong className="text-white">{bioRhythm.sleepHours}h</strong> (
            {bioRhythm.sleepQuality})
          </label>
          <input
            id="insights-sleep-hours"
            type="range"
            min={4}
            max={10}
            step={0.5}
            value={bioRhythm.sleepHours}
            onChange={e => saveBio({ sleepHours: Number(e.target.value) })}
            className="mt-2 w-full accent-[#e8b8c7]"
          />
          <div className="flex justify-between text-[10px] text-white/30">
            <span>4h</span>
            <span>7h</span>
            <span>10h</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {qualities.map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={bioRhythm.sleepQuality === id}
                onClick={() => saveBio({ sleepQuality: id })}
                className={`rounded-xl border px-1.5 py-1.5 text-center text-[11px] font-medium whitespace-nowrap transition ${
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
            className="modal-input mt-3 w-full !text-xs"
            value={note}
            maxLength={160}
            onChange={e => setNote(e.target.value)}
            onBlur={() => note !== bioRhythm.rhythmNote && saveBio({ rhythmNote: note })}
            placeholder="Optional rhythm note (saved when you click away)"
            aria-label="Rhythm note"
          />
        </section>

        <section className={`${glass} p-6`}>
          <p className="eyebrow flex items-center gap-1.5">
            <ShieldCheck size={12} /> User-Approved Observations
          </p>
          <p className="mt-1 text-xs text-white/45">
            Based only on your saved check-ins and memories. LUMINA never fabricates stress scores
            or clinical labels.
          </p>
          <ul className="mt-4 grid gap-2.5">
            {observations.map(o => (
              <li key={o} className="flex gap-2 text-sm leading-relaxed text-white/70">
                <Sparkles size={13} className="mt-1 shrink-0 text-[#efd099]" /> {o}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <AppShell title="Personal Insights" subtitle="Calm DNA & patterns">
      <InsightsContent />
    </AppShell>
  )
}
