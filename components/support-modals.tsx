'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, ShieldAlert, Wind, X } from 'lucide-react'

export function BreathPacerModal({ onClose }: { onClose: () => void }) {
  const TOTAL = 60
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const startedAt = Date.now()
    const id = window.setInterval(() => {
      const t = (Date.now() - startedAt) / 1000
      setElapsed(Math.min(TOTAL, t))
      if (t >= TOTAL) window.clearInterval(id)
    }, 100)
    return () => window.clearInterval(id)
  }, [])

  const done = elapsed >= TOTAL
  const cycleT = elapsed % 10
  const inhale = cycleT < 4
  const remaining = Math.max(1, Math.ceil(inhale ? 4 - cycleT : 10 - cycleT))

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="60 second breath pacer">
      <div className="modal-card text-center">
        <button onClick={onClose} className="modal-close" aria-label="Close">
          <X />
        </button>
        <p className="eyebrow">60s somatic reset</p>
        <h2 className="mt-2 font-serif text-3xl text-white">Breathe with the circle</h2>
        <div className="grid h-[190px] place-items-center">
          <div
            className="grid h-28 w-28 place-items-center rounded-full text-white/90"
            style={{
              background:
                'radial-gradient(circle at 35% 30%, rgba(255,255,255,.7), rgba(142,201,189,.55) 55%, rgba(149,132,191,.35))',
              boxShadow: '0 0 0 18px rgba(140,190,182,.08), 0 0 0 38px rgba(140,190,182,.04)',
              transform: done ? 'scale(1)' : inhale ? 'scale(1.3)' : 'scale(0.85)',
              transition: `transform ${done ? 0.6 : inhale ? 4 : 6}s ease-in-out`,
            }}
            aria-hidden
          >
            <Wind size={22} />
          </div>
        </div>
        <p className="font-serif text-xl text-white" role="status" aria-live="polite">
          {done ? 'Well done. Notice how you feel.' : inhale ? `Inhale gently... ${remaining}s` : `Exhale slowly... ${remaining}s`}
        </p>
        <div className="meter mx-auto mt-3 w-56">
          <span style={{ width: `${(elapsed / TOTAL) * 100}%` }} />
        </div>
        <button onClick={onClose} className="primary-button mx-auto mt-6">
          {done ? 'I feel a little lighter' : 'End early'}
        </button>
      </div>
    </div>
  )
}

export function SupportModal({
  onClose,
  onBreathPacer,
}: {
  onClose: () => void
  onBreathPacer: () => void
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card wide">
        <button onClick={onClose} className="modal-close" aria-label="Close">
          <X />
        </button>
        <div className="modal-icon">
          <ShieldAlert />
        </div>
        <p className="eyebrow">You deserve support</p>
        <h2 className="mt-2 font-serif text-3xl text-white">Need immediate care?</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/55">
          If you might hurt yourself or someone else, please contact local emergency services
          or a crisis counselor right now. You don&apos;t have to navigate this moment alone.
        </p>

        <div className="mt-5 grid gap-2.5 text-xs">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5">
            <p className="eyebrow text-[9px] text-[#edb4c5]">India · 24/7 Free &amp; Confidential</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-white/80">Tele-MANAS (National Helpline)</span>
              <div className="flex flex-wrap gap-1.5">
                <a href="tel:14416" className="secondary-button py-1.5 px-3 text-[11px]">
                  Call 14416
                </a>
                <a href="tel:18008914416" className="secondary-button py-1.5 px-3 text-[11px]">
                  1800-891-4416
                </a>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-2">
              <span className="text-white/70">Vandrevala Foundation</span>
              <a href="tel:+919999666555" className="secondary-button py-1.5 px-3 text-[11px]">
                +91 9999 666 555
              </a>
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5">
              <p className="eyebrow text-[9px]">US &amp; Canada</p>
              <p className="mt-1 text-white/80">Suicide &amp; Crisis Lifeline</p>
              <a
                href="tel:988"
                className="primary-button mt-2.5 w-full justify-center py-2 text-xs"
              >
                Call or text 988 <ArrowRight size={13} />
              </a>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5">
              <p className="eyebrow text-[9px]">United Kingdom</p>
              <p className="mt-1 text-white/80">NHS Mental Health &amp; Samaritans</p>
              <div className="mt-2.5 flex gap-2">
                <a
                  href="tel:111"
                  className="secondary-button flex-1 justify-center py-2 text-xs"
                >
                  NHS 111
                </a>
                <a
                  href="tel:116123"
                  className="secondary-button flex-1 justify-center py-2 text-xs"
                >
                  116 123
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5">
            <div>
              <p className="eyebrow text-[9px]">International / Everywhere</p>
              <p className="mt-1 text-white/75">
                Verified free, confidential support in 130+ countries
              </p>
            </div>
            <a
              href="https://findahelpline.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="secondary-button py-2 px-3.5 text-xs"
            >
              findahelpline.com <ArrowRight size={13} />
            </a>
          </div>
        </div>

        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          <button onClick={onBreathPacer} className="primary-button justify-center">
            Open 60s breath pacer <Wind size={14} />
          </button>
          <button onClick={onClose} className="secondary-button">
            Stay here and ground with me
          </button>
        </div>
      </div>
    </div>
  )
}
