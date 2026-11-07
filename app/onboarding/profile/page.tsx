'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { MagicalButton, StaggeredItem, TiltGlassCard } from '@/components/animation-system'
import { AuthShell } from '@/components/auth-shell'
import { ProfileSkeleton } from '@/components/lumina-loader'
import { useSanctuary } from '@/context/sanctuary-context'
import type { WellnessProfilePreferences } from '@/lib/db'

interface Option {
  label: string
  desc?: string
}

interface Question {
  title: string
  multi: boolean
  options: Option[]
}

const QUESTIONS: Question[] = [
  {
    title: 'What brings you to LUMINA?',
    multi: true,
    options: [
      'Daily stress',
      'Academic pressure',
      'Work pressure',
      'Overthinking',
      'Emotional exhaustion',
      'Better emotional awareness',
      'Better relaxation',
      'Personal growth',
      'Other',
    ].map(label => ({ label })),
  },
  {
    title: 'How have you been feeling lately?',
    multi: false,
    options: [
      'Mostly calm',
      'Frequently stressed',
      'Emotionally overwhelmed',
      'Mentally exhausted',
      'Often overthinking',
      'Prefer not to say',
    ].map(label => ({ label })),
  },
  {
    title: 'What would you like LUMINA to help you with?',
    multi: true,
    options: [
      'Relaxation',
      'Emotional expression',
      'Understanding my emotions',
      'Better sleep habits',
      'Building healthy boundaries',
      'Managing overwhelming thoughts',
    ].map(label => ({ label })),
  },
  {
    title: 'What kind of environment feels comforting?',
    multi: false,
    options: [
      { label: 'Rainy and cozy', desc: 'Soft rain on the window, warm lamplight, a blanket.' },
      { label: 'Magical nature', desc: 'Glowing forest paths, fireflies and living gardens.' },
      { label: 'Ocean and water', desc: 'Slow tides, still lakes and the hush of waves.' },
      { label: 'Starry night', desc: 'A wide twilight sky, quiet and endlessly spacious.' },
      { label: 'Minimal and quiet', desc: 'Soft light, gentle motion and very little stimulation.' },
      { label: 'Warm and peaceful', desc: 'Golden dusk, gentle colors and unhurried calm.' },
    ],
  },
  {
    title: 'Which interaction style do you prefer?',
    multi: false,
    options: [
      'AI Listener',
      'Gentle guided exercises',
      'Quiet personal reflection',
      'Interactive 3D experiences',
    ].map(label => ({ label })),
  },
  {
    title: 'How much time would you like to spend daily?',
    multi: false,
    options: ['2 minutes', '5 minutes', '10 minutes', 'Flexible'].map(label => ({ label })),
  },
]

const RHYTHM_PILLS = [
  'Late-night study schedule',
  'Fragmented sleep',
  'Cycle/seasonal energy shifts',
  'Prefer not to say',
]

const TOTAL = 7

export default function ProfileOnboardingPage() {
  const router = useRouter()
  const { isHydrated, authUser, onboarding, saveWellnessProfile, setCompanion, updateProfileSettings } =
    useSanctuary()

  const [step, setStep] = useState(1)
  const [reasons, setReasons] = useState<string[]>([])
  const [recentFeeling, setRecentFeeling] = useState('')
  const [helpGoals, setHelpGoals] = useState<string[]>([])
  const [comfortEnvironment, setComfortEnvironment] = useState('')
  const [interactionStyle, setInteractionStyle] = useState('')
  const [dailyTime, setDailyTime] = useState('')
  const [rhythmPills, setRhythmPills] = useState<string[]>([])
  const [rhythmNote, setRhythmNote] = useState('')
  const [seeded, setSeeded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isHydrated && !authUser) router.replace('/welcome')
  }, [isHydrated, authUser, router])

  useEffect(() => {
    router.prefetch('/onboarding/tutorial')
  }, [router])

  useEffect(() => {
    if (!isHydrated || seeded) return
    const p = onboarding?.preferences
    if (p) {
      setReasons(p.reasons)
      setRecentFeeling(p.recentFeeling)
      setHelpGoals(p.helpGoals)
      setComfortEnvironment(p.comfortEnvironment)
      setInteractionStyle(p.interactionStyle)
      setDailyTime(p.dailyTime)
      const note = p.optionalRhythmNote ?? ''
      const pills = RHYTHM_PILLS.filter(pill => note.includes(pill))
      setRhythmPills(pills)
      setRhythmNote(
        pills.reduce((acc, pill) => acc.replace(pill, ''), note).replace(/^[\s·]+|[\s·]+$/g, '')
      )
    }
    setSeeded(true)
  }, [isHydrated, onboarding, seeded])

  if (!isHydrated || !authUser) {
    return <ProfileSkeleton />
  }

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter(v => v !== value) : [...list, value])

  const answers: Array<{
    multi: string[] | null
    single: string
    setMulti?: (v: string[]) => void
    setSingle?: (v: string) => void
  }> = [
    { multi: reasons, single: '', setMulti: setReasons },
    { multi: null, single: recentFeeling, setSingle: setRecentFeeling },
    { multi: helpGoals, single: '', setMulti: setHelpGoals },
    { multi: null, single: comfortEnvironment, setSingle: setComfortEnvironment },
    { multi: null, single: interactionStyle, setSingle: setInteractionStyle },
    { multi: null, single: dailyTime, setSingle: setDailyTime },
  ]

  const canContinue =
    step > 6 ||
    (answers[step - 1].multi ? answers[step - 1].multi!.length > 0 : answers[step - 1].single !== '')

  async function finish(mode: 'save' | 'skip' | 'private') {
    setSaving(true)
    setError('')
    try {
      let optionalRhythmNote: string | undefined
      if (mode === 'private') optionalRhythmNote = 'Prefer not to say'
      else if (mode === 'save') {
        const combined = [...rhythmPills, rhythmNote.trim()].filter(Boolean).join(' · ')
        optionalRhythmNote = combined || undefined
      }

      const preferences: WellnessProfilePreferences = {
        reasons,
        recentFeeling,
        helpGoals,
        comfortEnvironment,
        interactionStyle,
        dailyTime,
        ...(optionalRhythmNote ? { optionalRhythmNote } : {}),
        completedAt: Date.now(),
      }
      const companionChoice = helpGoals.includes('Building healthy boundaries')
        ? 'Boundary Coach'
        : interactionStyle === 'AI Listener'
          ? 'The Listener'
          : interactionStyle === 'Gentle guided exercises'
            ? 'The Grounder'
            : null
      if (companionChoice) setCompanion(companionChoice)

      await Promise.all([
        saveWellnessProfile(preferences),
        comfortEnvironment === 'Minimal and quiet'
          ? updateProfileSettings({ sensoryMode: 'gentle' })
          : Promise.resolve(),
      ])

      router.push('/onboarding/tutorial')
    } catch {
      setError('Something went wrong saving your preferences on this device. Please try again.')
      setSaving(false)
    }
  }

  const q = step <= 6 ? QUESTIONS[step - 1] : null
  const selectedFor = (label: string) =>
    q?.multi ? answers[step - 1].multi!.includes(label) : answers[step - 1].single === label

  function pick(label: string) {
    const a = answers[step - 1]
    if (a.multi && a.setMulti) toggle(a.multi, a.setMulti, label)
    else a.setSingle?.(label)
  }

  return (
    <AuthShell>
      <StaggeredItem index={0} className="w-full max-w-2xl">
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-[11px] text-white/55">
            <span className="eyebrow inline-flex items-center gap-1.5 text-[#f4d9e2]">
              <Sparkles size={11} className="text-[#f3d9a4]" />
              STEP 2 OF 3 · YOUR WELLNESS PROFILE
            </span>
            <span>
              Question {step} of {TOTAL}
            </span>
          </div>
          <div
            className="meter"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={TOTAL}
            aria-valuenow={step}
          >
            <span
              style={{
                width: `${(step / TOTAL) * 100}%`,
                transition: 'width 520ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          </div>
        </div>

        <TiltGlassCard className="p-6 sm:p-8" maxTiltDeg={2.5}>
          <div key={step} className="lumina-stagger-item">
            {q ? (
              <>
                <h1 className="lumina-hero-title font-serif text-3xl text-white sm:text-4xl">
                  {q.title}
                </h1>
                <p className="mt-2 text-xs text-white/50">
                  {q.multi ? 'Select all that feel true.' : 'Choose the one that fits best.'}
                </p>
                <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                  {q.options.map(opt => {
                    const on = selectedFor(opt.label)
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => pick(opt.label)}
                        aria-pressed={on}
                        className={`flex items-start justify-between gap-3 rounded-2xl border p-4 text-left transition-all duration-200 ${
                          on
                            ? 'scale-[1.01] border-[#e8a4b8]/65 bg-gradient-to-r from-[#daa9c2]/22 to-[#8ec9bd]/14 text-[#f4d9e2] shadow-[0_0_24px_rgba(232,164,184,0.2)]'
                            : 'border-white/[0.09] bg-white/[0.03] text-white/70 hover:border-white/25 hover:bg-white/[0.06] hover:text-white'
                        }`}
                      >
                        <span>
                          <span className="block text-sm font-medium">{opt.label}</span>
                          {opt.desc && (
                            <span className="mt-1 block text-[11px] text-white/50">{opt.desc}</span>
                          )}
                        </span>
                        {on && <Check size={15} className="mt-0.5 shrink-0 text-[#f3d9a4]" />}
                      </button>
                    )
                  })}
                </div>
              </>
            ) : (
              <>
                <h1 className="lumina-hero-title font-serif text-3xl text-white sm:text-4xl">
                  Would you like to share any optional sleep or biological rhythm preferences?
                </h1>
                <p className="mt-3 rounded-2xl border border-[#8ec9bd]/30 bg-[#8ec9bd]/10 p-3 text-xs leading-relaxed text-[#bfe3da]">
                  Completely optional. LUMINA never requires sensitive health information, never
                  diagnoses, and you can edit or delete this anytime in Settings.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {RHYTHM_PILLS.map(pill => {
                    const on = rhythmPills.includes(pill)
                    return (
                      <button
                        key={pill}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(rhythmPills, setRhythmPills, pill)}
                        className={`rounded-full border px-3.5 py-2 text-xs transition ${
                          on
                            ? 'border-[#e1acc1]/60 bg-[#daa9c2]/20 text-[#f4d9e2]'
                            : 'border-white/[0.09] bg-white/[0.03] text-white/60 hover:text-white'
                        }`}
                      >
                        {pill}
                      </button>
                    )
                  })}
                </div>
                <label className="field-label">
                  Optional short note
                  <input
                    className="modal-input"
                    value={rhythmNote}
                    maxLength={160}
                    onChange={e => setRhythmNote(e.target.value)}
                    placeholder="Anything about your rhythm you'd like LUMINA to remember"
                  />
                </label>
                {error && (
                  <p className="auth-error mt-4" role="alert">
                    {error}
                  </p>
                )}
              </>
            )}
          </div>

          <p className="mt-6 flex items-start gap-2 text-[11px] leading-relaxed text-white/45">
            <ShieldCheck size={13} className="mt-0.5 shrink-0 text-[#8ec9bd]" />
            <span>
              <strong className="font-medium text-white/65">Why we ask:</strong> Stored 100% on your
              device in IndexedDB to personalize your sanctuary—never shared or used to diagnose.
            </span>
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                disabled={saving}
                className="inline-flex items-center gap-1.5 text-xs text-white/55 hover:text-white"
              >
                <ArrowLeft size={13} /> Back
              </button>
            ) : (
              <span />
            )}

            {q ? (
              <MagicalButton
                type="button"
                variant="primary"
                onClick={() => setStep(s => s + 1)}
                disabled={!canContinue}
                className="px-6 py-3 text-sm"
              >
                <span>Continue</span>
                <ArrowRight size={14} />
              </MagicalButton>
            ) : (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <MagicalButton
                  type="button"
                  variant="glass"
                  onClick={() => finish('skip')}
                  disabled={saving}
                  className="px-4 py-2.5 text-xs"
                >
                  Skip &amp; Continue
                </MagicalButton>
                <MagicalButton
                  type="button"
                  variant="glass"
                  onClick={() => finish('private')}
                  disabled={saving}
                  className="px-4 py-2.5 text-xs"
                >
                  Prefer Not to Say
                </MagicalButton>
                <MagicalButton
                  type="button"
                  variant="primary"
                  onClick={() => finish('save')}
                  disabled={saving}
                  className="px-5 py-2.5 text-xs"
                >
                  {saving && <Loader2 size={13} className="animate-spin" />}
                  <span>Save &amp; Continue to Tutorial</span>
                </MagicalButton>
              </div>
            )}
          </div>
        </TiltGlassCard>
      </StaggeredItem>
    </AuthShell>
  )
}
