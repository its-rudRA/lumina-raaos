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
import { EMOTION_OPTIONS, type CheckInRecord, type EmotionOption } from '@/lib/db'
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

const HEAVY_EMOTION_IDS = new Set([
  'sad',
  'exhausted',
  'overwhelmed',
  'anxious',
  'numb',
  'frustrated',
  'restless',
])

function getValidatingWhisperForBloom(bloom: CheckInRecord): string {
  const emotionId = bloom.emotionId?.toLowerCase() || ''
  const label = (bloom.emotionLabel || bloom.auraLabel || '').toLowerCase()
  if (
    HEAVY_EMOTION_IDS.has(emotionId) ||
    label.includes('heavy') ||
    label.includes('wired') ||
    label.includes('sad') ||
    label.includes('exhausted') ||
    label.includes('overwhelmed') ||
    label.includes('anxious') ||
    label.includes('numb')
  ) {
    return 'Even heavy or exhausted moments belong in your sanctuary—this bloom honors that you showed up.'
  }
  return 'This bioluminescent lotus holds a quiet record of your presence—every feeling is welcome on these waters.'
}

function resolveBloomEmotionMeta(bloom: CheckInRecord): {
  emoji: string
  emotionLabel: string
  intensity: number
  color: string
} {
  const matched = EMOTION_OPTIONS.find(
    o =>
      o.id === bloom.emotionId ||
      (bloom.emotionLabel && o.label.toLowerCase() === bloom.emotionLabel.toLowerCase())
  )
  return {
    emoji: bloom.emoji || matched?.emoji || '🌸',
    emotionLabel: bloom.emotionLabel || matched?.label || bloom.auraLabel || 'Softly Grounded',
    intensity: bloom.intensity ?? 3,
    color: matched?.color || '#8ec9bd',
  }
}

function GardenContent() {
  const {
    orb,
    setOrb,
    aura,
    gardenBlooms,
    checkIns,
    rainPlaying,
    toggleRain,
    plantCheckIn,
    sensoryMode,
  } = useSanctuary()
  const [tab, setTab] = useState<'aura' | 'garden'>('garden')
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionOption>(EMOTION_OPTIONS[6]) // Grounded 🌿
  const [seedIntensity, setSeedIntensity] = useState<number>(3)
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

  function handleSelectEmotionOption(opt: EmotionOption) {
    setSelectedEmotion(opt)
    setOrb({
      x: Math.max(8, Math.min(92, Math.round(opt.energy * 100))),
      y: Math.max(12, Math.min(88, Math.round((1 - opt.pleasantness) * 100))),
    })
  }

  async function handlePlantSeed() {
    if (planting) return
    setPlanting(true)
    const chosenTags = tags.length > 0 ? [...tags] : ['Quietly tired']
    const noteText = seedNote.trim() || undefined
    await plantCheckIn(chosenTags, noteText, {
      emotionId: selectedEmotion.id,
      emoji: selectedEmotion.emoji,
      emotionLabel: selectedEmotion.label,
      intensity: seedIntensity,
    })
    setSeedNote('')
    setShowSeedDrawer(false)
    setTab('garden')
    setIlluminatePulse(p => p + 1)
    setWishToast(
      `${selectedEmotion.emoji} ${selectedEmotion.label} lotus bloom planted on the sanctuary pond.`
    )
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

  const selectedBloomMeta = selectedBloom ? resolveBloomEmotionMeta(selectedBloom) : null

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
          sensoryMode={sensoryMode}
        />

        {/* Compact Single-Row Top Perimeter HUD Bar (never obstructs 3D Sky Lanterns or Moon Gate) */}
        <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-wrap items-center justify-between gap-1.5 sm:inset-x-5">
          {/* Left: Mode Switcher + Compact Hint */}
          <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-full border border-white/[0.1] bg-[#0b0914]/65 px-2 py-1 backdrop-blur-md">
            <button
              onClick={() => setTab('garden')}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                tab === 'garden'
                  ? 'bg-[#8ec9bd]/25 text-[#d7f7ef]'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Garden ({total})
            </button>
            <button
              onClick={() => {
                setTab('aura')
                setSelectedBloom(null)
                setIlluminatedLanternIdx(null)
              }}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                tab === 'aura'
                  ? 'bg-[#e8a4b8]/25 text-[#f4d9e2]'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Aura Wisp
            </button>
            <span className="hidden items-center gap-1 border-l border-white/10 pl-2 pr-1 text-[10px] text-white/50 2xl:inline-flex">
              <Compass size={11} className="text-[#8ec9bd]" />
              {tab === 'garden' ? 'Drag to orbit · Click lotus/lantern' : 'Drag wisp to sculpt'}
            </span>
          </div>

          {/* Right: Camera Presets + Compact Ritual Pills in One Slim Bar */}
          <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-full border border-white/[0.1] bg-[#0b0914]/65 px-2 py-1 backdrop-blur-md">
            {tab === 'garden' && (
              <div className="flex items-center gap-0.5 border-r border-white/10 pr-1.5">
                <Camera size={11} className="mr-1 text-[#8ec9bd]" />
                {CAMERA_PRESETS.map(preset => {
                  const active = cameraPreset === preset.id && !selectedBloom
                  return (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setSelectedBloom(null)
                        setCameraPreset(preset.id)
                      }}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${
                        active
                          ? 'bg-[#8ec9bd]/20 text-[#b7ebe0]'
                          : 'text-white/55 hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  )
                })}
              </div>
            )}

            <button
              onClick={handleReleaseWishLantern}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] text-[#f7dfb2] transition hover:bg-white/[0.08]"
              title="Release a glowing sky lantern toward the Moon Gate"
            >
              <Flame size={12} className="text-[#f4b660]" />
              <span>Wish Lantern</span>
            </button>
            <button
              onClick={() => setIlluminatePulse(p => p + 1)}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] text-white/75 transition hover:bg-white/[0.08] hover:text-white"
            >
              <Sparkles size={12} className="text-[#8ec9bd]" />
              <span className="hidden sm:inline">Illuminate</span>
            </button>
            <button
              onClick={toggleRain}
              aria-pressed={rainPlaying}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] transition ${
                rainPlaying
                  ? 'bg-[#91cabe]/20 text-[#a5d4ca]'
                  : 'text-white/75 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              <Droplets size={12} />
              <span>{rainPlaying ? 'Pause Rain' : 'Rain'}</span>
            </button>
            <button
              onClick={() => setBreathActive(v => !v)}
              aria-pressed={breathActive}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] transition ${
                breathActive
                  ? 'bg-[#e8b8c7]/20 text-[#f4d9e2]'
                  : 'text-white/75 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              <Wind size={12} />
              <span className="hidden md:inline">{breathActive ? '4s/6s' : 'Breath'}</span>
            </button>
            <button
              onClick={() => setImmersive(v => !v)}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-white/75 transition hover:bg-white/[0.08] hover:text-white"
              aria-label={immersive ? 'Standard view' : 'Full-Screen Mode'}
            >
              {immersive ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
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
                    {selectedEmotion.emoji} {selectedEmotion.label} · {aura.label}
                  </p>
                  <p className="mt-1 text-xs text-white/55">
                    {aura.note} · drag the wisp or choose an emoji to sculpt
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
          ) : selectedBloom && selectedBloomMeta ? (
            /* Selected 3D Lotus Bloom Memory Card with Emotion Validation */
            <div className="pointer-events-auto flex flex-col gap-3 rounded-2xl border border-[#8ec9bd]/35 bg-[#0b0914]/92 px-4 py-4 shadow-2xl backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="eyebrow rounded-full border border-[#a4d1c8]/35 bg-[#a4d1c8]/15 px-2.5 py-1 text-[9px] text-[#b7ebe0]">
                    Lotus Memory · {timeAgo(selectedBloom.timestamp)}
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium text-white"
                    style={{
                      borderColor: `${selectedBloomMeta.color}66`,
                      backgroundColor: `${selectedBloomMeta.color}22`,
                    }}
                  >
                    <span>{selectedBloomMeta.emoji}</span>
                    <span>{selectedBloomMeta.emotionLabel}</span>
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-0.5 font-mono text-[10px] text-white/80">
                    Intensity {selectedBloomMeta.intensity}/5
                  </span>
                  <span className="font-serif text-base text-white/90">
                    Aura: {selectedBloom.auraLabel}
                  </span>
                  {selectedBloom.tags.map(t => (
                    <span
                      key={t}
                      className="rounded-full border border-white/[0.1] bg-white/[0.06] px-2.5 py-0.5 text-[11px] text-[#f4d9e2]"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                {selectedBloom.note && (
                  <p className="text-xs italic text-white/80">“{selectedBloom.note}”</p>
                )}

                <p className="text-xs text-[#b7ebe0]/90">
                  ✦ {getValidatingWhisperForBloom(selectedBloom)}
                </p>
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
            <div className="pointer-events-auto flex flex-col gap-3 rounded-2xl border border-white/[0.12] bg-[#0b0914]/88 px-4 py-3.5 shadow-2xl backdrop-blur-xl">
              {showSeedDrawer && (
                <div className="space-y-3 border-b border-white/[0.08] pb-3.5">
                  {/* 12-Emotion Picker + Intensity 1-5 Selector */}
                  <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="mr-1 text-[11px] font-medium text-white/65">
                        12-Emotion Bloom:
                      </span>
                      {EMOTION_OPTIONS.map(opt => {
                        const active = selectedEmotion.id === opt.id
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleSelectEmotionOption(opt)}
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition ${
                              active
                                ? 'border-white/40 bg-white/[0.15] font-medium text-white shadow-sm'
                                : 'border-white/[0.08] bg-white/[0.03] text-white/65 hover:text-white/95'
                            }`}
                            style={
                              active
                                ? {
                                    borderColor: opt.color,
                                    boxShadow: `0 0 12px ${opt.color}44`,
                                  }
                                : undefined
                            }
                          >
                            <span>{opt.emoji}</span>
                            <span>{opt.label}</span>
                          </button>
                        )
                      })}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-white/60">Intensity:</span>
                      {[1, 2, 3, 4, 5].map(level => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setSeedIntensity(level)}
                          className={`h-6 w-6 rounded-full border text-[11px] font-medium transition ${
                            seedIntensity === level
                              ? 'border-[#8ec9bd] bg-[#8ec9bd]/25 text-[#b7ebe0]'
                              : 'border-white/10 bg-white/[0.04] text-white/55 hover:text-white'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Somatic Cues + Note + Sprout Button */}
                  <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="mr-1 text-[11px] font-medium text-white/60">
                        Somatic cues:
                      </span>
                      {SOMATIC_TAGS.map(tag => (
                        <button
                          key={tag}
                          type="button"
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
                        type="button"
                        onClick={handlePlantSeed}
                        disabled={planting}
                        className="primary-button px-3.5 py-1.5 text-xs"
                      >
                        <Check size={13} />{' '}
                        {planting
                          ? 'Planting...'
                          : `Sprout ${selectedEmotion.emoji} ${selectedEmotion.label} Lotus`}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSeedDrawer(false)}
                        className="secondary-button px-2.5 py-1.5 text-xs"
                        aria-label="Close seed drawer"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <p className="font-serif text-base text-white">
                    Your garden is not measured in streaks. It grows whenever you return.
                  </p>
                  <p className="text-xs text-[#e6e1f4]/75">
                    {total} lotus blooms resting on the water · every emotion—bright or heavy—blooms
                    with dignity.
                  </p>
                </div>

                {/* Atmosphere Customizer Pills + Plant Seed Action */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 inline-flex items-center gap-1 text-[10px] tracking-[0.14em] text-[#e6e1f4]/70 uppercase">
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
                              ? 'border-white/35 bg-white/[0.15] text-white shadow-sm'
                              : 'border-white/[0.1] bg-white/[0.04] text-white/75 hover:text-white'
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

                  <button
                    onClick={() => setShowSeedDrawer(v => !v)}
                    className="primary-button shrink-0 px-3.5 py-2 text-xs"
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
