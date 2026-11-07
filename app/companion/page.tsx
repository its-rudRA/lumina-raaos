'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Plus, Send, Trash2 } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { useSanctuary, type MemoryCategory } from '@/context/sanctuary-context'
import { glass, SOMATIC_TAGS, shortDate, timeAgo } from '@/lib/format'

const PERSONAS: Array<{ name: string; desc: string }> = [
  { name: 'The Listener', desc: 'Meets you with quiet presence before anything else.' },
  { name: 'The Grounder', desc: 'Brings you back into your body with simple cues.' },
  { name: 'The Guide', desc: 'Offers one small, kind next step.' },
  { name: 'Boundary Coach', desc: 'Helps you phrase a gentle, honest limit.' },
]

const STARTERS = [
  'Everything feels urgent right now',
  'I need help protecting my rest',
  'Help me slow down my thoughts',
  'I feel quietly overwhelmed',
]

interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

function CompanionContent() {
  const { companion, setCompanion, companionHistory, sendCompanionThought, memories, addMemory, removeMemory } =
    useSanctuary()
  const [input, setInput] = useState('')
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [listening, setListening] = useState(false)
  const [voiceNote, setVoiceNote] = useState('')
  const [memText, setMemText] = useState('')
  const [memCat, setMemCat] = useState<MemoryCategory>('anchor')
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [companionHistory.length, sending])

  useEffect(
    () => () => {
      try {
        recRef.current?.stop()
      } catch {
        // ignore
      }
    },
    []
  )

  async function send(text: string) {
    const value = text.trim()
    if (!value || sending) return
    setSending(true)
    setInput('')
    setVoiceNote('')
    await sendCompanionThought(value, companion, { tags: activeTags })
    setSending(false)
  }

  function toggleVoice() {
    if (listening && recRef.current) {
      recRef.current.stop()
      setListening(false)
      return
    }
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike
      webkitSpeechRecognition?: new () => SpeechRecognitionLike
    }
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!Ctor) {
      setVoiceNote("Voice venting isn't supported in this browser, but you can type freely.")
      return
    }
    try {
      const rec = new Ctor()
      rec.continuous = false
      rec.interimResults = true
      rec.lang = 'en-US'
      const base = input.trim() ? `${input.trim()} ` : ''
      rec.onresult = e => {
        let t = ''
        for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript
        setInput(`${base}${t}`.trimStart())
      }
      rec.onerror = () => setListening(false)
      rec.onend = () => setListening(false)
      recRef.current = rec
      rec.start()
      setListening(true)
      setVoiceNote('')
    } catch {
      setListening(false)
      setVoiceNote('Microphone access was unavailable. You can still type whenever you are ready.')
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-[1280px] gap-5 xl:grid-cols-[1fr_340px]">
      <div className="flex min-w-0 flex-col gap-5">
        <section className="grid gap-2.5 sm:grid-cols-2">
          {PERSONAS.map(p => (
            <button
              key={p.name}
              onClick={() => setCompanion(p.name)}
              aria-pressed={companion === p.name}
              className={`rounded-2xl border p-4 text-left transition ${
                companion === p.name
                  ? 'border-[#e1acc1]/55 bg-[#daa9c2]/15'
                  : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20'
              }`}
            >
              <p className={`font-serif text-lg ${companion === p.name ? 'text-[#f4d9e2]' : 'text-white/85'}`}>{p.name}</p>
              <p className="mt-0.5 text-xs text-white/45">{p.desc}</p>
            </button>
          ))}
        </section>

        <section className={`${glass} flex min-h-[420px] flex-col p-4 sm:p-5`}>
          <div className="max-h-[440px] flex-1 space-y-3 overflow-y-auto pr-1" aria-live="polite">
            {companionHistory.length === 0 ? (
              <div className="grid h-full min-h-[200px] place-items-center text-center">
                <p className="max-w-xs text-sm text-white/45">
                  Say whatever is here. {companion} will meet you without judgment.
                </p>
              </div>
            ) : (
              companionHistory.map(m => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'rounded-br-md bg-[#daa9c2]/20 text-[#f4d9e2]'
                        : 'rounded-bl-md border border-white/[0.08] bg-white/[0.05] text-white/80'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="eyebrow text-[9px]">
                        {m.role === 'companion' ? m.mode : 'You'}
                      </span>
                      <span className="text-[10px] text-white/35">{timeAgo(m.timestamp)}</span>
                    </div>
                    {m.text}
                  </div>
                </div>
              ))
            )}
            {sending && <p className="text-xs italic text-white/35">{companion} is listening…</p>}
            <div ref={endRef} />
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {STARTERS.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={sending}
                className="rounded-full border border-white/[0.09] bg-white/[0.03] px-3 py-1.5 text-[11px] text-white/55 transition hover:text-white"
              >
                {s}
              </button>
            ))}
          </div>

          <details className="mt-3">
            <summary className="cursor-pointer text-[11px] text-white/40">
              What is present in your body? {activeTags.length ? `(${activeTags.length})` : '(optional)'}
            </summary>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SOMATIC_TAGS.map(t => (
                <button
                  key={t}
                  aria-pressed={activeTags.includes(t)}
                  onClick={() => setActiveTags(activeTags.includes(t) ? activeTags.filter(x => x !== t) : [...activeTags, t])}
                  className={`rounded-full border px-2.5 py-1 text-[11px] ${
                    activeTags.includes(t)
                      ? 'border-[#e1acc1]/60 bg-[#daa9c2]/20 text-[#f4d9e2]'
                      : 'border-white/[0.09] text-white/50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </details>

          <form
            className="mt-3 flex items-center gap-2"
            onSubmit={e => {
              e.preventDefault()
              void send(input)
            }}
          >
            <input
              className="companion-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={listening ? 'Listening…' : 'What is on your mind?'}
              aria-label="Message to your companion"
            />
            <button
              type="button"
              onClick={toggleVoice}
              aria-pressed={listening}
              aria-label={listening ? 'Stop voice venting' : 'Start voice venting'}
              className="mic-button !h-9"
            >
              {listening ? <MicOff size={15} /> : <Mic size={15} />}
            </button>
            <button type="submit" disabled={!input.trim() || sending} className="primary-button px-4 py-2.5 text-xs">
              <Send size={13} /> Send
            </button>
          </form>
          {voiceNote && <p className="mt-2 text-[11px] text-white/45">{voiceNote}</p>}
        </section>

        <p className="text-center text-[11px] leading-relaxed text-white/35">
          LUMINA is a supportive reflection companion, not a therapist or crisis service, and it can&apos;t diagnose or
          treat anything. If you might be in danger, use the Immediate support button above.
        </p>
      </div>

      <aside className={`${glass} h-fit p-5`}>
        <p className="eyebrow text-[#a4d1c8]">Memory vault · user-approved</p>
        <p className="mt-1 text-xs text-white/45">
          Only what you save here is used to personalize replies. Delete anything, anytime.
        </p>
        <ul className="mt-4 grid gap-2">
          {memories.length === 0 && <li className="text-xs text-white/35">No memories saved.</li>}
          {memories.map(m => (
            <li key={m.id} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="eyebrow text-[9px]">{m.category} · {shortDate(m.createdAt)}</span>
                <button onClick={() => void removeMemory(m.id)} aria-label="Delete memory" className="text-white/35 hover:text-[#edb4c5]">
                  <Trash2 size={13} />
                </button>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-white/70">{m.text}</p>
            </li>
          ))}
        </ul>
        <form
          className="mt-4 grid gap-2"
          onSubmit={e => {
            e.preventDefault()
            if (!memText.trim()) return
            void addMemory(memText, memCat)
            setMemText('')
          }}
        >
          <input className="modal-input !text-xs" value={memText} onChange={e => setMemText(e.target.value)} placeholder="Add something to remember…" maxLength={200} />
          <div className="flex gap-2">
            <select
              value={memCat}
              onChange={e => setMemCat(e.target.value as MemoryCategory)}
              className="unlock-select flex-1"
              aria-label="Memory category"
            >
              <option value="anchor">Anchor</option>
              <option value="preference">Preference</option>
              <option value="trigger">Trigger</option>
            </select>
            <button type="submit" disabled={!memText.trim()} className="secondary-button px-3 py-2 text-xs">
              <Plus size={13} /> Add
            </button>
          </div>
        </form>
      </aside>
    </div>
  )
}

export default function Page() {
  return (
    <AppShell title="Soul Companion" subtitle="AI listener & coach">
      <CompanionContent />
    </AppShell>
  )
}
