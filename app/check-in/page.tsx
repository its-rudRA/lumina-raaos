'use client'

import { useState, type PointerEvent } from 'react'
import Link from 'next/link'
import { ArrowRight, Flower2, Loader2, Sparkles } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { useSanctuary } from '@/context/sanctuary-context'
import { auraColor, fullStamp, glass, SOMATIC_TAGS, timeAgo } from '@/lib/format'

function CheckInContent() {
  const { orb, setOrb, aura, checkIns, plantCheckIn } = useSanctuary()
  const [tags, setTags] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function move(e: PointerEvent<HTMLDivElement>) {
    if (e.type === 'pointermove' && e.buttons !== 1) return
    const r = e.currentTarget.getBoundingClientRect()
    setOrb({
      x: Math.max(4, Math.min(96, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.max(6, Math.min(94, ((e.clientY - r.top) / r.height) * 100)),
    })
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    await plantCheckIn(tags, note)
    setTags([])
    setNote('')
    setSaving(false)
    setSaved(true)
  }

  return (
    <div className="mx-auto grid w-full max-w-[1120px] gap-5">
      <section className={`${glass} grid gap-6 p-6 md:grid-cols-2`}>
        <div>
          <p className="eyebrow">Emotional Compass · Pleasantness vs Energy</p>
          <h2 className="mt-1 font-serif text-2xl text-white">How are you arriving right now?</h2>
          <p className="mt-1 text-xs text-white/45">
            Drag or click anywhere on the compass to sculpt your current emotional light.
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
                  background: aura.color,
                  boxShadow: `0 0 34px ${aura.color}`,
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
                style={{ color: aura.color }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: aura.color, boxShadow: `0 0 8px ${aura.color}` }}
                />
                Pleasantness {Math.round(orb.x)}% · Energy {Math.round(100 - orb.y)}%
              </span>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <span
                className="h-20 w-20 shrink-0 rounded-full"
                style={{
                  background: `radial-gradient(circle at 35% 30%, #fff8, ${aura.color} 55%, ${aura.color}55)`,
                  boxShadow: `0 0 50px ${aura.color}88`,
                  animation: 'luminaBreathe 5s ease-in-out infinite',
                }}
                aria-hidden
              />
              <div aria-live="polite">
                <p className="font-serif text-2xl" style={{ color: aura.color }}>
                  {aura.label}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-white/55">{aura.note}</p>
              </div>
            </div>
          </div>

          {/* Somatic Body & Mind Tags Selector */}
          <div>
            <p className="eyebrow mb-2.5">Somatic Body &amp; Mind Tags</p>
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

      {/* Optional Reflection Note + Save CTA */}
      <section className={`${glass} p-6`}>
        <label className="eyebrow" htmlFor="checkin-note">
          Optional Journal &amp; Reflection Note
        </label>
        <textarea
          id="checkin-note"
          value={note}
          onChange={e => setNote(e.target.value)}
          maxLength={400}
          placeholder="Optional: Add a few words about this moment — never required"
          className="ritual-textarea mt-2 !min-h-[90px] !text-base"
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving || tags.length === 0}
            className="primary-button px-6 py-3 text-sm"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Flower2 size={14} />}
            Save Check-In &amp; Plant Seed
          </button>
          {tags.length === 0 && (
            <span className="text-[11px] text-white/40">
              Select at least one somatic or mind tag above to plant your seed.
            </span>
          )}
        </div>

        {saved && (
          <div
            className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#8ec9bd]/35 bg-[#8ec9bd]/10 p-4 text-xs text-[#bfe3da]"
            role="status"
          >
            <span className="inline-flex items-center gap-2">
              <Sparkles size={14} className="text-[#8ec9bd]" />
              Your check-in is saved locally and a new bioluminescent lotus seed has bloomed in your
              garden.
            </span>
            <Link href="/garden" className="secondary-button px-3.5 py-1.5 text-xs text-white">
              View in 3D Inner Garden <ArrowRight size={12} />
            </Link>
          </div>
        )}
      </section>

      {/* Previous Check-Ins Timeline */}
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
              const color = auraColor(c.auraLabel)
              return (
                <li
                  key={c.id ?? `${c.timestamp}-${i}`}
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ background: color, boxShadow: `0 0 10px ${color}` }}
                      />
                      <span className="font-serif text-lg" style={{ color }}>
                        {c.auraLabel}
                      </span>
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
                    <p className="mt-2.5 font-serif text-base italic text-white/75">
                      “{c.note}”
                    </p>
                  )}
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
    <AppShell title="Emotional Check-In" subtitle="Compass & aura">
      <CheckInContent />
    </AppShell>
  )
}
