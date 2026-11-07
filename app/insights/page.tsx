'use client'

import { useState } from 'react'
import { Eye, Moon, Sparkles } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { useSanctuary } from '@/context/sanctuary-context'
import type { BioRhythmState } from '@/lib/db'
import { auraColor, glass, shortDate } from '@/lib/format'

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

function InsightsContent() {
  const { onboarding, companion, sensoryMode, checkIns, bioRhythm, updateBioRhythm, memories } =
    useSanctuary()
  const [note, setNote] = useState(bioRhythm.rhythmNote)
  const prefs = onboarding.preferences
  const total = checkIns.length
  const auraDist = countBy(checkIns, c => [c.auraLabel])
  const tagDist = countBy(checkIns, c => c.tags)
  const recent = checkIns.slice(0, 7)

  const recurringTags =
    tagDist.length > 0
      ? tagDist
          .slice(0, 2)
          .map(([t]) => t)
          .join(' · ')
      : 'Gentle baseline'

  const dna = [
    ['Preferred reset style', prefs?.interactionStyle || 'Acoustic rain & breath'],
    ['Comforting environment', prefs?.comfortEnvironment || 'Starry night'],
    ['Companion mode', companion],
    ['Recurring somatic cues', recurringTags],
    [
      'Sensory mode',
      sensoryMode === 'full' ? 'Full sanctuary' : sensoryMode === 'gentle' ? 'Gentle' : 'Low stimulus',
    ],
  ]

  // Observations are strictly descriptive of the user's own data: no scores, no claims of improvement.
  const observations: string[] = []
  if (total > 0) {
    observations.push(`You have saved ${total} check-in${total === 1 ? '' : 's'} so far.`)
    if (auraDist[0]) {
      observations.push(`You have most often arrived “${auraDist[0][0]}” (${auraDist[0][1]} of ${total}).`)
    }
    if (tagDist[0]) {
      observations.push(
        `“${tagDist[0][0]}” is the cue you have named most often (${tagDist[0][1]} time${tagDist[0][1] === 1 ? '' : 's'}).`
      )
    }
  }
  for (const m of memories.slice(0, 2)) {
    observations.push(`You asked LUMINA to remember: “${m.text}”`)
  }
  if (total < 3) {
    observations.push('Patterns need a few more check-ins before they mean much, so there is no rush.')
  }

  const saveBio = (patch: Partial<BioRhythmState>) =>
    void updateBioRhythm({ ...bioRhythm, ...patch })
  const qualities: Array<[BioRhythmState['sleepQuality'], string]> = [
    ['rested', 'Rested'],
    ['fragmented', 'Fragmented'],
    ['exhausted', 'Exhausted'],
  ]

  return (
    <div className="mx-auto grid w-full max-w-[1200px] gap-5 lg:grid-cols-2">
      <section className={`${glass} p-6 lg:col-span-2`}>
        <p className="eyebrow">Your Personal Calm DNA</p>
        <p className="mt-1 text-xs text-white/45">
          A living reflection of your own choices and check-in cues. Nothing here is a clinical
          diagnosis or fabricated score.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {dna.map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="eyebrow text-[9px]">{k}</p>
              <p className="mt-2 font-serif text-lg text-white">{v}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={`${glass} p-6`}>
        <p className="eyebrow">Emotional Compass Distribution &amp; Recent Mood History</p>
        <p className="mt-1 text-xs text-white/45">
          Visual summary across Pleasantness and Energy from your real IndexedDB check-ins.
        </p>
        {total === 0 ? (
          <p className="mt-4 text-sm text-white/45">
            Save a check-in to see where you tend to arrive on the compass.
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
                  title={`${c.auraLabel} · Pleasantness ${Math.round(c.orb.x)}% · Energy ${Math.round(100 - c.orb.y)}%`}
                >
                  <span
                    className="h-6 w-6 rounded-full"
                    style={{
                      background: auraColor(c.auraLabel),
                      boxShadow: `0 0 12px ${auraColor(c.auraLabel)}88`,
                    }}
                  />
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
        <div className="mt-3 flex flex-wrap gap-2">
          {qualities.map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={bioRhythm.sleepQuality === id}
              onClick={() => saveBio({ sleepQuality: id })}
              className={`rounded-full border px-3 py-1.5 text-xs ${
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
          <Eye size={12} /> User-Approved Observations
        </p>
        <p className="mt-1 text-xs text-white/45">
          Based only on your saved check-ins and memories. LUMINA never fabricates stress scores or
          clinical labels.
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
  )
}

export default function Page() {
  return (
    <AppShell title="Personal Insights" subtitle="Calm DNA & patterns">
      <InsightsContent />
    </AppShell>
  )
}
