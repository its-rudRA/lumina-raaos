'use client'

import { useState } from 'react'
import {
  Camera,
  Check,
  Compass,
  Droplets,
  Flame,
  Flower2,
  Maximize2,
  Minimize2,
  Palette,
  Sparkles,
  Wind,
  X,
} from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { LazySanctuaryScene } from '@/components/lazy-sanctuary-scene'
import type { GardenAtmospherePreset, GardenCameraPreset } from '@/components/sanctuary-scene'
import { useSanctuary } from '@/context/sanctuary-context'
import type { CheckInRecord } from '@/lib/db'
import { glass, SOMATIC_TAGS, timeAgo } from '@/lib/format'

const CAMERA_PRESETS: Array<{ id: GardenCameraPreset; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'moongate', label: 'Moon Gate' },
  { id: 'pond', label: 'Water Level' },
  { id: 'canopy', label: 'Star Canopy' },
]

const ATMOSPHERE_OPTIONS: Array<{
  id: GardenAtmospherePreset
  label: string
  swatch: string
}> = [
  { id: 'twilight', label: 'Twilight Teal', swatch: '#8ec9bd' },
  { id: 'rose', label: 'Rose Quartz', swatch: '#e7a9bd' },
  { id: 'celestial', label: 'Celestial Indigo', swatch: '#b8a4e8' },
  { id: 'dawn', label: 'Golden Dawn', swatch: '#f3d9a4' },
]

const LANTERN_WHISPERS = [
  'Even on heavy evenings, a quiet light stays warm above the water.',
  'You do not have to carry every thought into tomorrow morning.',
  'Small moments of pause are enough to change the weather inside.',
  'Your pace is allowed to be gentle tonight.',
  'Every return to stillness is its own kind of progress.',
  'Let the parts of today that are finished drift upward.',
  'Breathe into the space between where you were and where you are.',
  'Still waters remember every kindness you offer yourself.',
]

function GardenContent() {
  const { orb, setOrb, aura, gardenBlooms, checkIns, rainPlaying, toggleRain, plantCheckIn } =
    useSanctuary()
  const [tab, setTab] = useState<'aura' | 'garden'>('garden')
  const [tags, setTags] = useState<string[]>(['Need comfort'])
  const [seedNote, setSeedNote] = useState('')
  const [showSeedDrawer, setShowSeedDrawer] = useState(false)
  const [selectedBloom, setSelectedBloom] = useState<CheckInRecord | null>(null)
  const [illuminatedLanternIdx, setIlluminatedLanternIdx] = useState<number | null>(null)
  const [cameraPreset, setCameraPreset] = useState<GardenCameraPreset>('overview')
  const [atmospherePreset, setAtmospherePreset] = useState<GardenAtmospherePreset>('twilight')
  const [wishLanternCount, setWishLanternCount] = useState(0)
  const [wishToast, setWishToast] = useState<string | null>(null)
  const [breathActive, setBreathActive] = useState(false)
  const [illuminatePulse, setIlluminatePulse] = useState(0)
  const [immersive, setImmersive] = useState(false)
  const [planting, setPlanting] = useState(false)

  const total = Math.max(gardenBlooms, checkIns.length)

  async function handlePlantSeed() {
    if (planting) return
    setPlanting(true)
    const chosenTags = tags.length > 0 ? [...tags] : ['Quietly tired']
    const noteText = seedNote.trim() || undefined
    await plantCheckIn(chosenTags, noteText)
    setSeedNote('')
    setShowSeedDrawer(false)
    setTab('garden')
    setIlluminatePulse(p => p + 1)
    setWishToast('New lotus seed planted on the sanctuary pond.')
    setTimeout(() => setWishToast(null), 3800)
    setPlanting(false)
  }

  function handleReleaseWishLantern() {
    setWishLanternCount(c => c + 1)
    setIlluminatePulse(p => p + 1)
    setWishToast('A golden wish lantern is rising from the pond toward the Moon Gate.')
    setTimeout(() => setWishToast(null), 4200)
  }

  function handleLanternClick(index: number) {
    setSelectedBloom(null)
    setIlluminatedLanternIdx(index)
  }

  function handleSelectBloom(record: CheckInRecord | null) {
    setSelectedBloom(record)
    if (record) {
      setIlluminatedLanternIdx(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <div
        className={`${glass} relative w-full overflow-hidden p-2 transition-all duration-500 sm:p-3 ${
          immersive ? 'h-[86vh] min-h-[620px]' : 'h-[70vh] min-h-[540px]'
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
          onSelectBloom={handleSelectBloom}
          illuminatePulse={illuminatePulse}
          cameraPreset={cameraPreset}
          atmospherePreset={atmospherePreset}
          wishLanternCount={wishLanternCount}
          onLanternClick={handleLanternClick}
        />

        {/* Top Floating HUD */}
        <div className="pointer-events-none absolute inset-x-4 top-4 z-10 flex flex-col justify-between gap-2.5 sm:inset-x-6 sm:top-5 xl:flex-row xl:items-start">
          {/* Top-Left HUD: Mode Switcher + Interactive Hint Badge */}
          <div className="flex flex-col items-start gap-2">
            <div className="pointer-events-auto tab-pill bg-[#0c0a16]/85 shadow-lg backdrop-blur-xl">
              <button
                onClick={() => {
                  setTab('garden')
                }}
                className={tab === 'garden' ? 'active' : ''}
              >
                Living Garden ({total} blooms)
              </button>
              <button
                onClick={() => {
                  setTab('aura')
                  setSelectedBloom(null)
                  setIlluminatedLanternIdx(null)
                }}
                className={tab === 'aura' ? 'active' : ''}
              >
                Sculpt Aura Wisp
              </button>
            </div>

            <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-[#0b0914]/75 px-3 py-1 text-[11px] text-white/65 backdrop-blur-xl">
              <Compass size={12} className="text-[#8ec9bd]" />
              <span>
                {tab === 'garden'
                  ? 'Drag to orbit camera · Scroll to zoom · Click any lotus or lantern'
                  : 'Drag the luminous wisp across the pond to sculpt your emotional aura'}
              </span>
            </div>
          </div>

          {/* Top-Right HUD: Camera Angle Presets & Sanctuary Rituals */}
          <div className="flex flex-col items-start gap-2 xl:items-end">
            {tab === 'garden' && (
              <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-full border border-white/[0.11] bg-[#0c0a16]/80 p-1 backdrop-blur-xl">
                <span className="flex items-center gap-1 px-2.5 text-[10px] tracking-[0.14em] text-white/45 uppercase">
                  <Camera size={11} className="text-[#8ec9bd]" /> View
                </span>
                {CAMERA_PRESETS.map(preset => {
                  const active = cameraPreset === preset.id && !selectedBloom
                  return (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setSelectedBloom(null)
                        setCameraPreset(preset.id)
                      }}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                        active
                          ? 'bg-[#8ec9bd]/20 text-[#b7ebe0] shadow-[0_0_12px_rgba(142,201,189,0.25)]'
                          : 'text-white/60 hover:text-white/90'
                      }`}
                    >
                      {preset.label}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
              <button
                onClick={handleReleaseWishLantern}
                className="support-button border-[#f3d9a4]/35 bg-[#0c0a16]/80 text-[#f7dfb2] backdrop-blur-xl hover:border-[#f3d9a4]/60"
              >
                <Flame size={13} className="text-[#f4b660]" /> Release Wish Lantern
              </button>
              <button
                onClick={() => setIlluminatePulse(p => p + 1)}
                className="support-button bg-[#0c0a16]/80 backdrop-blur-xl"
              >
                <Sparkles size={13} className="text-[#8ec9bd]" /> Illuminate Shrine
              </button>
              <button
                onClick={toggleRain}
                aria-pressed={rainPlaying}
                className={`support-button bg-[#0c0a16]/80 backdrop-blur-xl ${
                  rainPlaying ? 'border-[#91cabe]/50 text-[#a5d4ca]' : ''
                }`}
              >
                <Droplets size={13} /> {rainPlaying ? 'Pause Rain' : '3:00 Rain'}
              </button>
              <button
                onClick={() => setBreathActive(v => !v)}
                aria-pressed={breathActive}
                className={`support-button bg-[#0c0a16]/80 backdrop-blur-xl ${
                  breathActive ? 'border-[#e8b8c7]/50 text-[#f4d9e2]' : ''
                }`}
              >
                <Wind size={13} /> {breathActive ? 'Breathing (4s/6s)' : 'Breath Sync'}
              </button>
              <button
                onClick={() => setImmersive(v => !v)}
                className="support-button bg-[#0c0a16]/80 backdrop-blur-xl"
                aria-label={immersive ? 'Standard view' : 'Full-Screen Mode'}
              >
                {immersive ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                <span className="hidden sm:inline">
                  {immersive ? 'Exit Full-Screen' : 'Full-Screen Mode'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Floating Wish / Seed Toast */}
        {wishToast && (
          <div className="pointer-events-none absolute top-28 left-1/2 z-20 -translate-x-1/2 sm:top-24">
            <div className="flex items-center gap-2 rounded-full border border-[#f3d9a4]/40 bg-[#120e1c]/90 px-4 py-2 text-xs text-[#f7dfb2] shadow-xl backdrop-blur-xl">
              <Sparkles size={13} className="text-[#f3d9a4]" />
              <span>{wishToast}</span>
            </div>
          </div>
        )}

        {/* Bottom Floating Glass Dock */}
        <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10 sm:inset-x-6 sm:bottom-5">
          {tab === 'aura' ? (
            <div className="pointer-events-auto flex flex-col gap-3 rounded-2xl border border-white/[0.12] bg-[#0b0914]/85 px-4 py-3.5 shadow-2xl backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full"
                  style={{ background: aura.color, boxShadow: `0 0 14px ${aura.color}` }}
                />
                <div>
                  <p className="font-serif text-lg leading-none" style={{ color: aura.color }}>
                    {aura.label}
                  </p>
                  <p className="mt-1 text-xs text-white/55">
                    {aura.note} · drag the wisp to sculpt
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {SOMATIC_TAGS.slice(0, 6).map(tag => (
                  <button
                    key={tag}
                    onClick={() =>
                      setTags(tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag])
                    }
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
              <button
                onClick={handlePlantSeed}
                disabled={planting}
                className="primary-button shrink-0 justify-center px-4 py-2 text-xs"
              >
                <Flower2 size={14} /> {planting ? 'Planting...' : 'Plant Check-In Seed'}
              </button>
            </div>
          ) : selectedBloom ? (
            /* Selected 3D Lotus Bloom Memory Card */
            <div className="pointer-events-auto flex flex-col gap-3 rounded-2xl border border-[#8ec9bd]/30 bg-[#0b0914]/90 px-4 py-3.5 shadow-2xl backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="eyebrow rounded-full border border-[#a4d1c8]/35 bg-[#a4d1c8]/15 px-2.5 py-1 text-[9px] text-[#b7ebe0]">
                  Lotus Memory · {timeAgo(selectedBloom.timestamp)}
                </span>
                <span className="font-serif text-lg text-white">{selectedBloom.auraLabel}</span>
                {selectedBloom.tags.map(t => (
                  <span
                    key={t}
                    className="rounded-full border border-white/[0.1] bg-white/[0.06] px-2.5 py-0.5 text-[11px] text-[#f4d9e2]"
                  >
                    {t}
                  </span>
                ))}
                {selectedBloom.note && (
                  <span className="text-xs italic text-white/65">“{selectedBloom.note}”</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIlluminatePulse(p => p + 1)}
                  className="secondary-button px-3 py-1.5 text-xs"
                >
                  <Sparkles size={13} className="text-[#8ec9bd]" /> Illuminate Memory
                </button>
                <button
                  onClick={() => setSelectedBloom(null)}
                  className="secondary-button px-3 py-1.5 text-xs"
                >
                  Back to Garden Overview
                </button>
              </div>
            </div>
          ) : illuminatedLanternIdx !== null ? (
            /* Clicked 3D Sky Lantern Reflection Whisper Card */
            <div className="pointer-events-auto flex flex-col gap-3 rounded-2xl border border-[#f3d9a4]/35 bg-[#0b0914]/90 px-4 py-3.5 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3 sm:items-center">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#f3d9a4]/40 bg-[#f3d9a4]/15 text-[#f7dfb2] sm:mt-0">
                  <Flame size={15} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium tracking-[0.16em] text-[#f3d9a4] uppercase">
                      Sky Lantern Illuminated · #{illuminatedLanternIdx + 1}
                    </span>
                  </div>
                  <p className="mt-0.5 font-serif text-base text-white/95">
                    “{LANTERN_WHISPERS[illuminatedLanternIdx % LANTERN_WHISPERS.length]}”
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReleaseWishLantern}
                  className="secondary-button border-[#f3d9a4]/30 px-3 py-1.5 text-xs text-[#f7dfb2]"
                >
                  <Flame size={13} /> Send Another Wish
                </button>
                <button
                  onClick={() => setIlluminatedLanternIdx(null)}
                  className="secondary-button px-3 py-1.5 text-xs"
                >
                  Back to Garden
                </button>
              </div>
            </div>
          ) : (
            /* Default Garden Dock: Atmosphere Customizer + Quick Plant New Check-In Seed */
            <div className="pointer-events-auto flex flex-col gap-3 rounded-2xl border border-white/[0.12] bg-[#0b0914]/85 px-4 py-3 shadow-2xl backdrop-blur-xl">
              {showSeedDrawer && (
                <div className="flex flex-col gap-2.5 border-b border-white/[0.08] pb-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-[11px] font-medium text-white/60">
                      Somatic cues:
                    </span>
                    {SOMATIC_TAGS.map(tag => (
                      <button
                        key={tag}
                        onClick={() =>
                          setTags(
                            tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]
                          )
                        }
                        className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                          tags.includes(tag)
                            ? 'border-[#8ec9bd]/60 bg-[#8ec9bd]/20 text-[#b7ebe0]'
                            : 'border-white/[0.09] bg-white/[0.03] text-white/55 hover:text-white/85'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={seedNote}
                      onChange={e => setSeedNote(e.target.value)}
                      placeholder="Optional whisper for this lotus..."
                      className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs text-white placeholder:text-white/35 focus:border-[#8ec9bd]/50 focus:outline-none sm:w-60"
                    />
                    <button
                      onClick={handlePlantSeed}
                      disabled={planting}
                      className="primary-button px-3.5 py-1.5 text-xs"
                    >
                      <Check size={13} /> {planting ? 'Planting...' : 'Sprout Lotus Now'}
                    </button>
                    <button
                      onClick={() => setShowSeedDrawer(false)}
                      className="secondary-button px-2.5 py-1.5 text-xs"
                      aria-label="Close seed drawer"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-serif text-base text-white/95">
                    Your garden is not measured in streaks. It grows whenever you return.
                  </p>
                  <p className="text-xs text-white/50">
                    {total} lotus blooms resting on the water · click any lotus or floating sky
                    lantern to inspect.
                  </p>
                </div>

                {/* Atmosphere Customizer Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 inline-flex items-center gap-1 text-[10px] tracking-[0.14em] text-white/45 uppercase">
                    <Palette size={11} className="text-[#e7a9bd]" /> Atmosphere
                  </span>
                  {ATMOSPHERE_OPTIONS.map(opt => {
                    const active = atmospherePreset === opt.id
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setAtmospherePreset(opt.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                          active
                            ? 'border-white/30 bg-white/[0.12] text-white shadow-sm'
                            : 'border-white/[0.08] bg-white/[0.03] text-white/60 hover:text-white/90'
                        }`}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: opt.swatch,
                            boxShadow: active ? `0 0 8px ${opt.swatch}` : undefined,
                          }}
                        />
                        {opt.label}
                      </button>
                    )
                  })}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowSeedDrawer(v => !v)}
                    className="primary-button px-3.5 py-2 text-xs"
                  >
                    <Flower2 size={14} /> Plant New Check-In Seed
                  </button>
                </div>
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
