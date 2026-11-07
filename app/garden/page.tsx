'use client'

import { useState } from 'react'
import { Droplets, Flower2, Maximize2, Minimize2, Sparkles, Wind } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { LazySanctuaryScene } from '@/components/lazy-sanctuary-scene'
import { useSanctuary } from '@/context/sanctuary-context'
import type { CheckInRecord } from '@/lib/db'
import { glass, SOMATIC_TAGS, timeAgo } from '@/lib/format'

function GardenContent() {
  const { orb, setOrb, aura, gardenBlooms, checkIns, rainPlaying, toggleRain, plantCheckIn } = useSanctuary()
  const [tab, setTab] = useState<'aura' | 'garden'>('garden')
  const [tags, setTags] = useState<string[]>([])
  const [selectedBloom, setSelectedBloom] = useState<CheckInRecord | null>(null)
  const [breathActive, setBreathActive] = useState(false)
  const [illuminatePulse, setIlluminatePulse] = useState(0)
  const [immersive, setImmersive] = useState(false)
  const [planting, setPlanting] = useState(false)
  const total = Math.max(gardenBlooms, checkIns.length)

  async function plant() {
    setPlanting(true)
    const planted = [...tags]
    setTags([])
    await plantCheckIn(planted)
    setTab('garden')
    setPlanting(false)
  }

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <div
        className={`${glass} relative w-full overflow-hidden p-2 transition-all duration-500 sm:p-3 ${
          immersive ? 'h-[78vh] min-h-[560px]' : 'h-[520px] sm:h-[560px]'
        }`}
      >
        <LazySanctuaryScene
          tab={tab}
          orb={orb}
          setOrb={setOrb}
          aura={aura}
          blooms={gardenBlooms}
          checkIns={checkIns}
          rainPlaying={rainPlaying}
          immersive={immersive}
          breathActive={breathActive}
          selectedBloom={selectedBloom}
          onSelectBloom={setSelectedBloom}
          illuminatePulse={illuminatePulse}
        />

        <div className="pointer-events-none absolute inset-x-4 top-4 z-10 flex flex-wrap items-center justify-between gap-2 sm:inset-x-6 sm:top-5">
          <div className="pointer-events-auto tab-pill bg-[#0c0a16]/80 backdrop-blur-xl">
            <button onClick={() => setTab('aura')} className={tab === 'aura' ? 'active' : ''}>Sculpt Aura</button>
            <button onClick={() => setTab('garden')} className={tab === 'garden' ? 'active' : ''}>
              Living Garden ({total})
            </button>
          </div>
          <div className="pointer-events-auto flex flex-wrap gap-1.5">
            <button
              onClick={toggleRain}
              aria-pressed={rainPlaying}
              className={`support-button bg-[#0c0a16]/75 backdrop-blur-xl ${rainPlaying ? 'border-[#91cabe]/50 text-[#a5d4ca]' : ''}`}
            >
              <Droplets size={13} /> {rainPlaying ? 'Pause Rain' : '3:00 Rain'}
            </button>
            <button
              onClick={() => setBreathActive(v => !v)}
              aria-pressed={breathActive}
              className={`support-button bg-[#0c0a16]/75 backdrop-blur-xl ${breathActive ? 'border-[#e8b8c7]/50 text-[#f4d9e2]' : ''}`}
            >
              <Wind size={13} /> {breathActive ? 'Breathing (4s/6s)' : '60s Breath Reset'}
            </button>
            <button
              onClick={() => setImmersive(v => !v)}
              className="support-button bg-[#0c0a16]/75 backdrop-blur-xl"
              aria-label={immersive ? 'Standard view' : 'Expand view'}
            >
              {immersive ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span className="hidden lg:inline">{immersive ? 'Standard View' : 'Expand View'}</span>
            </button>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10 sm:inset-x-6 sm:bottom-5">
          {tab === 'aura' ? (
            <div className="pointer-events-auto flex flex-col gap-3 rounded-2xl border border-white/[0.11] bg-[#0b0914]/80 px-4 py-3 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: aura.color, boxShadow: `0 0 14px ${aura.color}` }} />
                <div>
                  <p className="font-serif text-lg leading-none" style={{ color: aura.color }}>{aura.label}</p>
                  <p className="mt-1 text-xs text-white/50">{aura.note} · drag the wisp to sculpt</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {SOMATIC_TAGS.slice(0, 5).map(tag => (
                  <button
                    key={tag}
                    onClick={() => setTags(tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag])}
                    className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                      tags.includes(tag)
                        ? 'border-[#e1acc1]/60 bg-[#daa9c2]/20 text-[#f4d9e2]'
                        : 'border-white/[0.09] bg-white/[0.03] text-white/55 hover:text-white/85'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <button onClick={plant} disabled={!tags.length || planting} className="primary-button shrink-0 justify-center px-4 py-2 text-xs">
                <Flower2 size={14} /> Plant check-in
              </button>
            </div>
          ) : (
            <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.11] bg-[#0b0914]/80 px-4 py-3 backdrop-blur-xl">
              {selectedBloom ? (
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="eyebrow rounded-full border border-[#a4d1c8]/30 bg-[#a4d1c8]/10 px-2.5 py-1 text-[9px] text-[#a4d1c8]">
                    Lotus memory · {timeAgo(selectedBloom.timestamp)}
                  </span>
                  <span className="font-serif text-lg text-white">{selectedBloom.auraLabel}</span>
                  {selectedBloom.tags.map(t => (
                    <span key={t} className="rounded-full border border-white/[0.1] bg-white/[0.06] px-2.5 py-0.5 text-[11px] text-[#f4d9e2]">{t}</span>
                  ))}
                  {selectedBloom.note && <span className="text-xs italic text-white/55">“{selectedBloom.note}”</span>}
                </div>
              ) : (
                <div>
                  <p className="font-serif text-base text-white/90">Your garden is not measured in streaks. It grows when you return.</p>
                  <p className="text-xs text-white/45">{total} lotus blooms · click any lotus to inspect its memory.</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {selectedBloom && (
                  <>
                    <button onClick={() => setIlluminatePulse(p => p + 1)} className="secondary-button px-3 py-1.5 text-xs">
                      <Sparkles size={13} /> Illuminate this memory
                    </button>
                    <button onClick={() => setSelectedBloom(null)} className="secondary-button px-3 py-1.5 text-xs">Back to all blooms</button>
                  </>
                )}
                <button onClick={() => setTab('aura')} className="primary-button px-4 py-2 text-xs">Sculpt Aura</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <AppShell title="Inner Garden" subtitle="Your 3D living world">
      <GardenContent />
    </AppShell>
  )
}
