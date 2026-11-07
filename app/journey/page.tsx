'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { useSanctuary } from '@/context/sanctuary-context'
import { glass } from '@/lib/format'

interface DayPlan {
  prompt: string
  href: string
  room: string
}

const R = {
  checkin: { href: '/check-in', room: 'Emotional Check-In' },
  garden: { href: '/garden', room: 'Inner Garden' },
  companion: { href: '/companion', room: 'Soul Companion' },
  calm: { href: '/calm-studio', room: 'Calm Studio' },
  release: { href: '/release-room', room: 'Release Room' },
  insights: { href: '/insights', room: 'Personal Insights' },
}
const d = (prompt: string, r: { href: string; room: string }): DayPlan => ({ prompt, ...r })

const WEEKS: Array<{ title: string; theme: string; start: number; days: DayPlan[] }> = [
  {
    title: 'Week 1 (Days 1–7)',
    theme: 'Arriving & Emotional Naming',
    start: 1,
    days: [
      d('Arrive. Explore your garden with no goal.', R.garden),
      d('Make a first check-in: where is your compass today?', R.checkin),
      d('Name one body cue you notice right now.', R.checkin),
      d('Say one honest sentence to your companion.', R.companion),
      d('Listen to three minutes of rain.', R.calm),
      d('Notice what time of day feels softest.', R.checkin),
      d('Look back at what you noticed this week.', R.insights),
    ],
  },
  {
    title: 'Week 2',
    theme: 'Somatic Grounding & Breath',
    start: 8,
    days: [
      d('Try the 4s / 6s calming exhale.', R.calm),
      d('Do the 3-step grounding checklist.', R.calm),
      d('Check in before and after a breath session.', R.checkin),
      d('Try box breathing for one minute.', R.calm),
      d('Let your shoulders drop three times today.', R.calm),
      d('Ask The Grounder for a body-based cue.', R.companion),
      d('Rest. Tune your sleep and rhythm note.', R.calm),
    ],
  },
  {
    title: 'Week 3',
    theme: 'Gentle Boundaries & Release',
    start: 15,
    days: [
      d('Burn one thought that is not yours to carry.', R.release),
      d('Ask Boundary Coach how to phrase a gentle no.', R.companion),
      d('Drop a star: one small thing you appreciated.', R.release),
      d('Notice where you over-explain yourself.', R.checkin),
      d('Write a sealed letter about a boundary you want.', R.release),
      d('Protect one pocket of rest today.', R.calm),
      d('Release something with the cloud mist.', R.release),
    ],
  },
  {
    title: 'Week 4',
    theme: 'Self-Compassion & Integration',
    start: 22,
    days: [
      d('Speak to yourself the way you would to a friend.', R.companion),
      d('Revisit an older lotus memory.', R.garden),
      d('Add a memory that helps you feel steadier.', R.companion),
      d('Drop a star for something you got through.', R.release),
      d('Check in and notice what has shifted, or not.', R.checkin),
      d('Write a letter to yourself a month from now.', R.release),
      d('Review your Calm DNA.', R.insights),
      d('Choose one ritual you want to keep.', R.calm),
      d('Rest in your garden. You showed up.', R.garden),
    ],
  },
]

function JourneyContent() {
  const { journeyCompletedDays, toggleJourneyDay, gardenBlooms, checkIns, starJar } = useSanctuary()
  const [weekIdx, setWeekIdx] = useState(0)
  const week = WEEKS[weekIdx]
  const explored = journeyCompletedDays.length

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <section className={`${glass} p-6`}>
        <p className="eyebrow">Your 30-day gentle path</p>
        <h2 className="mt-1 font-serif text-2xl text-white">
          Your journey moves at the speed of trust—never measured in streaks, and never reset for missed days.
        </h2>
        <p className="mt-2 text-xs text-white/45">Skip days, repeat days, or come back months later. Nothing is lost.</p>
        <div className="meter lavender mt-4"><span style={{ width: `${(explored / 30) * 100}%` }} /></div>
        <p className="mt-2 text-xs text-white/50">{explored} of 30 days explored</p>
      </section>

      <div className="tab-pill mt-5 flex-wrap !rounded-2xl" role="tablist">
        {WEEKS.map((w, i) => (
          <button key={w.title} role="tab" aria-selected={weekIdx === i} className={weekIdx === i ? 'active' : ''} onClick={() => setWeekIdx(i)}>
            {w.title}: {w.theme}
          </button>
        ))}
      </div>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {week.days.map((day, i) => {
          const num = week.start + i
          const done = journeyCompletedDays.includes(num)
          return (
            <li key={num} className={`${glass} p-5 ${done ? '!border-[#8ec9bd]/35' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="eyebrow">Day {num}</span>
                {done && <Check size={14} className="text-[#8ec9bd]" />}
              </div>
              <p className="mt-2 font-serif text-lg leading-snug text-white/90">{day.prompt}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link href={day.href} className="secondary-button px-3 py-1.5 text-xs">
                  {day.room} <ArrowRight size={12} />
                </Link>
                <button
                  onClick={() => void toggleJourneyDay(num)}
                  aria-pressed={done}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    done ? 'border-[#8ec9bd]/50 bg-[#8ec9bd]/15 text-[#bfe3da]' : 'border-white/[0.12] text-white/60 hover:text-white'
                  }`}
                >
                  {done ? 'Explored ✓' : 'Mark Day Explored'}
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <section className={`${glass} mt-6 p-6`}>
        <p className="eyebrow">Monthly emotional cinema</p>
        <p className="mt-1 text-xs text-white/45">A quiet look back at what you have tended.</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ['Garden blooms', Math.max(gardenBlooms, checkIns.length)],
            ['Check-ins', checkIns.length],
            ['Stars in the jar', starJar.length],
            ['Journey days explored', explored],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-center">
              <dd className="font-serif text-3xl text-white">{value}</dd>
              <dt className="mt-1 text-[11px] text-white/45">{label}</dt>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}

export default function Page() {
  return (
    <AppShell title="My Journey" subtitle="30-day gentle path">
      <JourneyContent />
    </AppShell>
  )
}
