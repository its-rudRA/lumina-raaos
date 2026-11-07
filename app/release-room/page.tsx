'use client'

import { useEffect, useRef, useState } from 'react'
import { Cloud, Flame, LockKeyhole, MailOpen, Sparkles, Star } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { useSanctuary } from '@/context/sanctuary-context'
import { glass, shortDate } from '@/lib/format'

type Tab = 'release' | 'jar' | 'letters'

function ReleaseRitual() {
  const [text, setText] = useState('')
  const [style, setStyle] = useState<'fire' | 'mist'>('fire')
  const [phase, setPhase] = useState<'idle' | 'releasing' | 'done'>('idle')
  const timer = useRef<number | null>(null)

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current)
  }, [])

  function release() {
    setPhase('releasing')
    timer.current = window.setTimeout(() => {
      setText('') // discarded from component memory only; never written anywhere
      setPhase('done')
    }, 2200)
  }

  return (
    <section className={`${glass} p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="eyebrow">Digital Release Parchment</p>
        <span className="flex items-center gap-1.5 rounded-full border border-[#8ec9bd]/30 bg-[#8ec9bd]/10 px-3 py-1 text-[11px] text-[#bfe3da]">
          <LockKeyhole size={11} /> Thoughts released on this parchment are permanently discarded and never saved to IndexedDB.
        </span>
      </div>
      <div className="tab-pill mt-4 w-fit">
        <button className={style === 'fire' ? 'active' : ''} onClick={() => setStyle('fire')} disabled={phase === 'releasing'}>
          <Flame size={12} className="mr-1 inline" /> Burn &amp; Release
        </button>
        <button className={style === 'mist' ? 'active' : ''} onClick={() => setStyle('mist')} disabled={phase === 'releasing'}>
          <Cloud size={12} className="mr-1 inline" /> Cloud Dissolve
        </button>
      </div>

      <div className="relative mt-4">
        {phase === 'done' ? (
          <div className="grid min-h-[190px] place-items-center rounded-2xl border border-white/[0.08] bg-black/20 p-6 text-center">
            <div>
              <Sparkles className="mx-auto mb-2 text-[#efd099]" size={22} />
              <p className="font-serif text-2xl text-white/85">Released. Nothing was kept.</p>
              <p className="mt-1 text-xs text-white/45">Take one slow breath into the space it left.</p>
              <button className="secondary-button mx-auto mt-4 px-4 py-2 text-xs" onClick={() => setPhase('idle')}>
                Write another
              </button>
            </div>
          </div>
        ) : (
          <>
            <textarea
              className="ritual-textarea"
              style={phase === 'releasing' ? { opacity: 0.25, filter: 'blur(3px)', transition: 'all 2s ease-out' } : undefined}
              value={text}
              onChange={e => setText(e.target.value)}
              disabled={phase === 'releasing'}
              placeholder="What heavy thought are you ready to set down?"
              aria-label="Worry to release"
            />
            {phase === 'releasing' && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                {Array.from({ length: 18 }, (_, i) =>
                  style === 'fire' ? (
                    <span
                      key={i}
                      className="absolute text-[#efb27a]"
                      style={{
                        left: `${8 + ((i * 5.3) % 84)}%`,
                        bottom: '20%',
                        animation: `starlight 2.2s ease-out ${i * 0.06}s forwards`,
                        ['--i' as string]: i % 12,
                      }}
                    >
                      ✦
                    </span>
                  ) : (
                    <span
                      key={i}
                      className="absolute h-10 w-10 rounded-full bg-[#b8c9e6]/40 blur-xl"
                      style={{
                        left: `${5 + ((i * 5.7) % 85)}%`,
                        bottom: '15%',
                        animation: `mistRise 2.2s ease-out ${i * 0.07}s forwards`,
                      }}
                    />
                  )
                )}
              </div>
            )}
            <button onClick={release} disabled={phase === 'releasing' || !text.trim()} className="primary-button mt-4 px-6 py-3 text-sm">
              {style === 'fire' ? <Flame size={14} /> : <Cloud size={14} />}
              {style === 'fire' ? 'Burn & Release' : 'Dissolve into Mist'}
            </button>
          </>
        )}
      </div>
    </section>
  )
}

function StarJar() {
  const { starJar, addStarJarNote } = useSanctuary()
  const [text, setText] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const open = starJar.find(s => s.id === openId)

  return (
    <section className={`${glass} p-6`}>
      <p className="eyebrow">The star jar</p>
      <p className="mt-1 text-xs text-white/45">Drop in one small thing you survived or appreciated today.</p>
      <form
        className="mt-4 flex gap-2"
        onSubmit={e => {
          e.preventDefault()
          if (!text.trim()) return
          void addStarJarNote(text)
          setText('')
        }}
      >
        <input
          className="companion-input"
          value={text}
          maxLength={160}
          onChange={e => setText(e.target.value)}
          placeholder="One small thing I survived or appreciated today"
          aria-label="Star jar note"
        />
        <button type="submit" disabled={!text.trim()} className="primary-button px-4 py-2.5 text-xs">
          <Star size={13} /> Drop star
        </button>
      </form>

      <div className="mt-5 min-h-[160px] rounded-[28px] border border-white/[0.1] bg-gradient-to-b from-white/[0.03] to-[#efd099]/[0.05] p-4">
        {starJar.length === 0 ? (
          <p className="grid h-[130px] place-items-center text-xs text-white/35">Your jar is empty, and that is okay.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {starJar.map(s => (
              <button
                key={s.id}
                onClick={() => setOpenId(openId === s.id ? null : s.id)}
                aria-pressed={openId === s.id}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition ${
                  openId === s.id
                    ? 'border-[#efd099]/60 bg-[#efd099]/20 text-[#f6e4bd]'
                    : 'border-[#efd099]/25 bg-[#efd099]/[0.07] text-[#efd099]/80 hover:bg-[#efd099]/15'
                }`}
                style={{ boxShadow: '0 0 14px rgba(239,208,153,.15)' }}
              >
                <Star size={11} fill="currentColor" /> {shortDate(s.createdAt)}
              </button>
            ))}
          </div>
        )}
      </div>
      {open && (
        <p className="mt-3 rounded-2xl border border-[#efd099]/25 bg-[#efd099]/10 p-4 font-serif text-lg text-[#f6e4bd]" role="status">
          “{open.text}”
        </p>
      )}
    </section>
  )
}

const UNLOCKS: Array<{ label: string; days: number }> = [
  { label: 'In 7 days', days: 7 },
  { label: 'In 30 days', days: 30 },
  { label: 'Next heavy day', days: 1 },
]

function Letters() {
  const { sealedLetters, sealLetter } = useSanctuary()
  const [text, setText] = useState('')
  const [unlock, setUnlock] = useState(UNLOCKS[0].label)
  const [sealed, setSealed] = useState(false)
  const [openedIds, setOpenedIds] = useState<number[]>([])
  const now = Date.now()

  async function seal() {
    const choice = UNLOCKS.find(u => u.label === unlock) ?? UNLOCKS[0]
    await sealLetter(text, choice.days, choice.label)
    setText('')
    setSealed(true)
    window.setTimeout(() => setSealed(false), 3200)
  }

  return (
    <section className={`${glass} p-6`}>
      <p className="eyebrow">Sealed letters to your future self</p>
      <textarea
        className="ritual-textarea mt-3"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Dear future me..."
        aria-label="Letter to future self"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <select value={unlock} onChange={e => setUnlock(e.target.value)} className="unlock-select" aria-label="Unlock timing">
          {UNLOCKS.map(u => <option key={u.label}>{u.label}</option>)}
        </select>
        <button onClick={seal} disabled={!text.trim()} className="primary-button px-5 py-2.5 text-xs">
          <MailOpen size={13} /> Seal letter
        </button>
        {sealed && <span className="text-xs text-[#bfe3da]" role="status">Sealed and kept privately on this device.</span>}
      </div>

      <ul className="mt-5 grid gap-2.5">
        {sealedLetters.length === 0 && <li className="text-xs text-white/35">No letters yet.</li>}
        {sealedLetters.map((l, idx) => {
          const id = l.id ?? idx
          const ready = now >= l.unlockAt || l.unlockCondition === 'Next heavy day' || openedIds.includes(id)
          return (
            <li key={id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="flex items-center justify-between text-xs text-white/45">
                <span>{l.unlockCondition}</span>
                <span>Written {shortDate(l.createdAt)}</span>
              </div>
              {ready ? (
                <p className="mt-2 font-serif text-base leading-relaxed text-white/85">{l.content}</p>
              ) : (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs italic text-white/40">Sealed until {shortDate(l.unlockAt)}</p>
                  <button className="secondary-button px-3 py-1.5 text-xs" onClick={() => setOpenedIds(p => [...p, id])}>
                    Open early
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function ReleaseRoomContent() {
  const [tab, setTab] = useState<Tab>('release')
  const tabs: Array<[Tab, string]> = [
    ['release', 'Burn & Release'],
    ['jar', 'Star Jar'],
    ['letters', 'Sealed Letters'],
  ]
  return (
    <div className="mx-auto w-full max-w-[900px]">
      <div className="tab-pill mb-5 w-fit" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'release' && <ReleaseRitual />}
      {tab === 'jar' && <StarJar />}
      {tab === 'letters' && <Letters />}
    </div>
  )
}

export default function Page() {
  return (
    <AppShell title="Release Room" subtitle="Burn & star jar">
      <ReleaseRoomContent />
    </AppShell>
  )
}
