'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Bell,
  Check,
  CloudRain,
  Compass,
  Disc3,
  Droplets,
  Moon,
  Music,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Sun,
  Trees,
  Vibrate,
  Volume2,
  VolumeX,
  Waves,
  Wind,
} from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { useRainSeconds, useSanctuary } from '@/context/sanctuary-context'
import type { BioRhythmState } from '@/lib/db'
import { formatClock, glass } from '@/lib/format'

/* ============================================================================
 * 1. 7-LAYER PROCEDURAL WEB AUDIO SOUNDSCAPE MIXER
 * ========================================================================== */

type LayerId = 'rain' | 'ocean' | 'forest' | 'wind' | 'chimes' | 'lofi' | 'drone'

interface LayerDefinition {
  id: LayerId
  name: string
  subtitle: string
  defaultVolume: number
  color: string
  icon: typeof CloudRain
  optionalNote?: string
}

const SOUND_LAYERS: LayerDefinition[] = [
  {
    id: 'rain',
    name: 'Evening Rain',
    subtitle: 'Warm pink-brown rainfall on glass',
    defaultVolume: 68,
    color: '#7ec8b8',
    icon: CloudRain,
  },
  {
    id: 'ocean',
    name: 'Ocean Waves',
    subtitle: 'Slow rhythmic shore swells & ebb',
    defaultVolume: 60,
    color: '#7eb8c8',
    icon: Waves,
  },
  {
    id: 'forest',
    name: 'Forest Ambience',
    subtitle: 'Rustling canopy & soft woodland air',
    defaultVolume: 55,
    color: '#91cabe',
    icon: Trees,
  },
  {
    id: 'wind',
    name: 'Soft Wind',
    subtitle: 'Breezy resonant twilight air currents',
    defaultVolume: 48,
    color: '#b8a4e8',
    icon: Wind,
  },
  {
    id: 'chimes',
    name: 'Gentle Chimes',
    subtitle: 'Unhurried pentatonic sanctuary bells',
    defaultVolume: 42,
    color: '#f3d9a4',
    icon: Bell,
  },
  {
    id: 'lofi',
    name: 'Ambient Lofi',
    subtitle: 'Warm muted Rhodes-style chord bed',
    defaultVolume: 50,
    color: '#e8a4b8',
    icon: Disc3,
  },
  {
    id: 'drone',
    name: 'Warm Harmonic Drone',
    subtitle: 'Optional low ambient pad experience',
    defaultVolume: 38,
    color: '#c8a4e8',
    icon: Music,
    optionalNote:
      'Optional ambient sound experience for atmosphere only—no medical or frequency claims.',
  },
]

interface PresetDefinition {
  id: string
  name: string
  desc: string
  mix: Partial<Record<LayerId, number>>
}

const SOUNDSCAPE_PRESETS: PresetDefinition[] = [
  {
    id: 'rainy-evening',
    name: 'Rainy Evening',
    desc: 'Cozy rainfall, warm lofi chords & soft harmonic warmth',
    mix: { rain: 74, lofi: 45, drone: 28 },
  },
  {
    id: 'quiet-forest',
    name: 'Quiet Forest',
    desc: 'Canopy breeze, soft wind & distant sanctuary chimes',
    mix: { forest: 72, wind: 42, chimes: 34 },
  },
  {
    id: 'moonlit-ocean',
    name: 'Moonlit Ocean',
    desc: 'Slow tidal swells, night wind & warm ambient pad',
    mix: { ocean: 76, wind: 38, drone: 32 },
  },
  {
    id: 'cozy-midnight',
    name: 'Cozy Midnight',
    desc: 'Gentle rain, ambient lofi bed & subtle chimes',
    mix: { rain: 58, lofi: 64, chimes: 24 },
  },
  {
    id: 'gentle-dawn',
    name: 'Gentle Dawn',
    desc: 'Morning forest air, chimes, soft wind & light warmth',
    mix: { forest: 56, chimes: 46, wind: 32, drone: 24 },
  },
  {
    id: 'focus-sanctuary',
    name: 'Focus Sanctuary',
    desc: 'Steady acoustic rain, soft wind & calm lofi texture',
    mix: { rain: 52, wind: 34, lofi: 48 },
  },
]

interface ActiveLayerHandle {
  gain: GainNode
  stop: () => void
}

function createNoiseBuffer(ctx: AudioContext, mode: 'pink' | 'brown' | 'white'): AudioBuffer {
  const length = ctx.sampleRate * 4
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let lastOut = 0
  let b0 = 0
  let b1 = 0
  let b2 = 0
  let b3 = 0
  let b4 = 0
  let b5 = 0
  let b6 = 0

  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    if (mode === 'brown') {
      data[i] = (lastOut + 0.02 * white) / 1.02
      lastOut = data[i]
      data[i] *= 3.2
    } else if (mode === 'pink') {
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.96900 * b2 + white * 0.1538520
      b3 = 0.86650 * b3 + white * 0.3104856
      b4 = 0.55000 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.0168980
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.045
      b6 = white * 0.115926
    } else {
      data[i] = white * 0.2
    }
  }
  return buffer
}

function spawnSoundLayer(
  ctx: AudioContext,
  id: LayerId,
  initialVolumePct: number
): ActiveLayerHandle {
  const now = ctx.currentTime
  const masterGain = ctx.createGain()
  const targetGain = Math.max(0, Math.min(1, initialVolumePct / 100)) * 0.22
  masterGain.gain.setValueAtTime(0.0001, now)
  masterGain.gain.setTargetAtTime(targetGain, now, 0.35)
  masterGain.connect(ctx.destination)

  const disposers: Array<() => void> = []

  if (id === 'rain') {
    const src = ctx.createBufferSource()
    src.buffer = createNoiseBuffer(ctx, 'brown')
    src.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 820
    filter.Q.value = 0.65
    src.connect(filter)
    filter.connect(masterGain)
    src.start()
    disposers.push(() => {
      try {
        src.stop()
      } catch {
        // ignore
      }
    })
  } else if (id === 'ocean') {
    const src = ctx.createBufferSource()
    src.buffer = createNoiseBuffer(ctx, 'pink')
    src.loop = true

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 340

    const waveGain = ctx.createGain()
    waveGain.gain.value = 0.55

    // Slow 0.12Hz (~8.3s period) tidal swell LFO
    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.12
    const lfoDepth = ctx.createGain()
    lfoDepth.gain.value = 220
    lfo.connect(lfoDepth)
    lfoDepth.connect(filter.frequency)

    src.connect(filter)
    filter.connect(waveGain)
    waveGain.connect(masterGain)
    src.start()
    lfo.start()
    disposers.push(() => {
      try {
        src.stop()
        lfo.stop()
      } catch {
        // ignore
      }
    })
  } else if (id === 'forest') {
    const src = ctx.createBufferSource()
    src.buffer = createNoiseBuffer(ctx, 'pink')
    src.loop = true

    const bandpass = ctx.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.frequency.value = 1150
    bandpass.Q.value = 1.8

    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.18
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 380
    lfo.connect(lfoGain)
    lfoGain.connect(bandpass.frequency)

    src.connect(bandpass)
    bandpass.connect(masterGain)
    src.start()
    lfo.start()

    // Soft intermittent woodland bird/leaf harmonic notes
    const notes = [1046.5, 1174.66, 1318.5, 1567.98]
    const timer = window.setInterval(() => {
      if (ctx.state !== 'running') return
      try {
        const t = ctx.currentTime
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = 'sine'
        const base = notes[Math.floor(Math.random() * notes.length)]
        osc.frequency.setValueAtTime(base, t)
        osc.frequency.exponentialRampToValueAtTime(base * 1.12, t + 0.18)
        g.gain.setValueAtTime(0.0001, t)
        g.gain.linearRampToValueAtTime(0.06, t + 0.06)
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42)
        osc.connect(g)
        g.connect(masterGain)
        osc.start(t)
        osc.stop(t + 0.45)
      } catch {
        // ignore
      }
    }, 3800)

    disposers.push(() => {
      window.clearInterval(timer)
      try {
        src.stop()
        lfo.stop()
      } catch {
        // ignore
      }
    })
  } else if (id === 'wind') {
    const src = ctx.createBufferSource()
    src.buffer = createNoiseBuffer(ctx, 'pink')
    src.loop = true

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 520
    filter.Q.value = 3.2

    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.09
    const lfoDepth = ctx.createGain()
    lfoDepth.gain.value = 260
    lfo.connect(lfoDepth)
    lfoDepth.connect(filter.frequency)

    src.connect(filter)
    filter.connect(masterGain)
    src.start()
    lfo.start()
    disposers.push(() => {
      try {
        src.stop()
        lfo.stop()
      } catch {
        // ignore
      }
    })
  } else if (id === 'chimes') {
    const pentatonic = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5]
    const strikeChime = () => {
      if (ctx.state !== 'running') return
      try {
        const t = ctx.currentTime
        const freq = pentatonic[Math.floor(Math.random() * pentatonic.length)]
        const osc = ctx.createOscillator()
        const overtone = ctx.createOscillator()
        const env = ctx.createGain()
        osc.type = 'sine'
        overtone.type = 'sine'
        osc.frequency.setValueAtTime(freq, t)
        overtone.frequency.setValueAtTime(freq * 2, t)

        env.gain.setValueAtTime(0.0001, t)
        env.gain.linearRampToValueAtTime(0.18, t + 0.04)
        env.gain.exponentialRampToValueAtTime(0.0008, t + 2.8)

        const overtoneGain = ctx.createGain()
        overtoneGain.gain.value = 0.2
        osc.connect(env)
        overtone.connect(overtoneGain)
        overtoneGain.connect(env)
        env.connect(masterGain)

        osc.start(t)
        overtone.start(t)
        osc.stop(t + 2.9)
        overtone.stop(t + 2.9)
      } catch {
        // ignore
      }
    }
    strikeChime()
    const timer = window.setInterval(strikeChime, 3100)
    disposers.push(() => window.clearInterval(timer))
  } else if (id === 'lofi') {
    // Warm Fmaj7 / Dm9 muted electric-piano chord pad with slow tremolo
    const freqs = [174.61, 220.0, 261.63, 329.63, 392.0]
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 460

    const tremolo = ctx.createGain()
    tremolo.gain.value = 0.65

    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.35
    const lfoDepth = ctx.createGain()
    lfoDepth.gain.value = 0.14
    lfo.connect(lfoDepth)
    lfoDepth.connect(tremolo.gain)

    const oscs = freqs.map((f, i) => {
      const o = ctx.createOscillator()
      o.type = i % 2 === 0 ? 'triangle' : 'sine'
      o.frequency.value = f
      const g = ctx.createGain()
      g.gain.value = 0.18
      o.connect(g)
      g.connect(filter)
      o.start()
      return o
    })

    filter.connect(tremolo)
    tremolo.connect(masterGain)
    lfo.start()

    disposers.push(() => {
      try {
        lfo.stop()
        oscs.forEach(o => o.stop())
      } catch {
        // ignore
      }
    })
  } else if (id === 'drone') {
    // Optional Warm Harmonic Drone (purely ambient sound experience)
    const freqs = [130.81, 196.0, 261.63]
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 320

    const oscs = freqs.map(f => {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = f
      const g = ctx.createGain()
      g.gain.value = 0.25
      o.connect(g)
      g.connect(filter)
      o.start()
      return o
    })
    filter.connect(masterGain)

    disposers.push(() => {
      try {
        oscs.forEach(o => o.stop())
      } catch {
        // ignore
      }
    })
  }

  return {
    gain: masterGain,
    stop: () => {
      try {
        const t = ctx.currentTime
        masterGain.gain.cancelScheduledValues(t)
        masterGain.gain.setTargetAtTime(0.0001, t, 0.18)
      } catch {
        // ignore
      }
      window.setTimeout(() => {
        disposers.forEach(fn => fn())
        try {
          masterGain.disconnect()
        } catch {
          // ignore
        }
      }, 280)
    },
  }
}

function RainCountdownValue() {
  const rainSeconds = useRainSeconds()
  const countdown = Math.max(0, 180 - (rainSeconds % 180))
  return <span className="font-serif text-lg text-white">{formatClock(countdown)}</span>
}

function SoundscapeMixerStudio() {
  const { rainPlaying, toggleRain, resetRain } = useSanctuary()
  const ctxRef = useRef<AudioContext | null>(null)
  const handlesRef = useRef<Partial<Record<LayerId, ActiveLayerHandle>>>({})

  const [activeLayers, setActiveLayers] = useState<Record<LayerId, boolean>>({
    rain: false,
    ocean: false,
    forest: false,
    wind: false,
    chimes: false,
    lofi: false,
    drone: false,
  })
  const [volumes, setVolumes] = useState<Record<LayerId, number>>(() => {
    const init = {} as Record<LayerId, number>
    for (const l of SOUND_LAYERS) init[l.id] = l.defaultVolume
    return init
  })
  const [activePresetId, setActivePresetId] = useState<string | null>(null)

  function ensureAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      ctxRef.current = new Ctor()
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume().catch(() => {})
    }
    return ctxRef.current
  }

  const fadeOutAllStudioLayers = useCallback(() => {
    const handles = handlesRef.current
    for (const key of Object.keys(handles) as LayerId[]) {
      handles[key]?.stop()
      delete handles[key]
    }
    setActiveLayers({
      rain: false,
      ocean: false,
      forest: false,
      wind: false,
      chimes: false,
      lofi: false,
      drone: false,
    })
    setActivePresetId(null)
  }, [])

  // Cleanly stop and disconnect all studio multi-track layers when leaving /calm-studio
  useEffect(() => {
    return () => {
      const handles = handlesRef.current
      for (const key of Object.keys(handles) as LayerId[]) {
        handles[key]?.stop()
        delete handles[key]
      }
      const ctx = ctxRef.current
      ctxRef.current = null
      if (ctx && ctx.state !== 'closed') {
        window.setTimeout(() => {
          ctx.close().catch(() => {})
        }, 320)
      }
    }
  }, [])

  function toggleLayer(id: LayerId) {
    const currentlyOn = activeLayers[id]
    if (currentlyOn) {
      handlesRef.current[id]?.stop()
      delete handlesRef.current[id]
      setActiveLayers(prev => ({ ...prev, [id]: false }))
      setActivePresetId(null)
    } else {
      const ctx = ensureAudioContext()
      if (!ctx) return
      const handle = spawnSoundLayer(ctx, id, volumes[id])
      handlesRef.current[id] = handle
      setActiveLayers(prev => ({ ...prev, [id]: true }))
    }
  }

  function changeVolume(id: LayerId, nextVol: number) {
    setVolumes(prev => ({ ...prev, [id]: nextVol }))
    const handle = handlesRef.current[id]
    const ctx = ctxRef.current
    if (handle && ctx && ctx.state === 'running') {
      const target = Math.max(0, Math.min(1, nextVol / 100)) * 0.22
      handle.gain.gain.setTargetAtTime(target, ctx.currentTime, 0.12)
    }
  }

  function applyPreset(preset: PresetDefinition) {
    const ctx = ensureAudioContext()
    if (!ctx) return

    const nextActive: Record<LayerId, boolean> = {
      rain: false,
      ocean: false,
      forest: false,
      wind: false,
      chimes: false,
      lofi: false,
      drone: false,
    }
    const nextVolumes = { ...volumes }

    for (const layer of SOUND_LAYERS) {
      const targetVol = preset.mix[layer.id]
      if (typeof targetVol === 'number' && targetVol > 0) {
        nextActive[layer.id] = true
        nextVolumes[layer.id] = targetVol
        if (handlesRef.current[layer.id]) {
          const targetGain = Math.max(0, Math.min(1, targetVol / 100)) * 0.22
          handlesRef.current[layer.id]!.gain.gain.setTargetAtTime(
            targetGain,
            ctx.currentTime,
            0.25
          )
        } else {
          handlesRef.current[layer.id] = spawnSoundLayer(ctx, layer.id, targetVol)
        }
      } else {
        if (handlesRef.current[layer.id]) {
          handlesRef.current[layer.id]?.stop()
          delete handlesRef.current[layer.id]
        }
      }
    }

    setVolumes(nextVolumes)
    setActiveLayers(nextActive)
    setActivePresetId(preset.id)
  }

  const activeCount = Object.values(activeLayers).filter(Boolean).length

  return (
    <section className={`${glass} p-6`}>
      {/* Header + Global 3:00 Rain Quick-Bar */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-[#7ec8b8]">7-Layer Procedural Web Audio Soundscape Mixer</p>
          <h2 className="mt-1 font-serif text-2xl text-white sm:text-3xl">
            Sculpt Your Personal Acoustic Atmosphere
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/55">
            Mix up to 7 real-time synthesized layers with smooth gain fades. Multi-track studio
            layers fade out cleanly when you leave Calm Studio, while the 3:00 Sanctuary Rain button
            can follow you across rooms.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[#7ec8b8]/35 bg-[#7ec8b8]/12 px-3 py-1.5 text-xs text-[#c8f3e9]">
            {activeCount} of 7 studio layer{activeCount === 1 ? '' : 's'} active
          </span>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={fadeOutAllStudioLayers}
              className="secondary-button border border-[#e8a4b8]/35 px-3.5 py-1.5 text-xs text-[#f4d9e2]"
            >
              <VolumeX size={13} /> Fade Out All
            </button>
          )}
        </div>
      </div>

      {/* 6 Soundscape Presets Bar */}
      <div className="mt-5 rounded-2xl border border-white/[0.08] bg-black/25 p-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <p className="eyebrow text-[9px] text-[#f3d9a4]">6 One-Click Soundscape Presets</p>
          <span className="text-[11px] text-white/45">
            Click any preset to blend layers automatically, then fine-tune individual sliders below
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {SOUNDSCAPE_PRESETS.map(preset => {
            const selected = activePresetId === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={selected}
                onClick={() => applyPreset(preset)}
                className={`flex flex-col justify-between rounded-xl border p-3 text-left transition ${
                  selected
                    ? 'border-[#7ec8b8]/60 bg-[#7ec8b8]/15 text-white shadow-[0_0_20px_rgba(126,200,184,0.18)]'
                    : 'border-white/[0.08] bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white'
                }`}
              >
                <span className="font-serif text-sm text-white">{preset.name}</span>
                <span className="mt-1 line-clamp-2 text-[10px] leading-snug text-white/45">
                  {preset.desc}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 7-Layer Mixer Grid */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {SOUND_LAYERS.map(layer => {
          const Icon = layer.icon
          const isOn = activeLayers[layer.id]
          const vol = volumes[layer.id]
          return (
            <div
              key={layer.id}
              className={`flex flex-col justify-between rounded-2xl border p-4 transition ${
                isOn
                  ? 'border-[#7ec8b8]/50 bg-[#7ec8b8]/[0.09] shadow-[0_0_24px_rgba(126,200,184,0.12)]'
                  : 'border-white/[0.08] bg-white/[0.03]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[0.1]"
                      style={{
                        background: isOn ? `${layer.color}28` : 'rgba(255,255,255,0.04)',
                        color: layer.color,
                        boxShadow: isOn ? `0 0 14px ${layer.color}55` : undefined,
                      }}
                    >
                      <Icon size={16} />
                    </span>
                    <div>
                      <p className="font-serif text-base text-white">{layer.name}</p>
                      <p className="text-[10px] text-white/45">{layer.subtitle}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-pressed={isOn}
                    aria-label={`${isOn ? 'Pause' : 'Play'} ${layer.name}`}
                    onClick={() => toggleLayer(layer.id)}
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition ${
                      isOn
                        ? 'border-[#7ec8b8]/65 bg-[#7ec8b8]/25 text-white'
                        : 'border-white/[0.12] bg-white/[0.04] text-white/60 hover:text-white'
                    }`}
                  >
                    {isOn ? <Pause size={13} /> : <Play size={13} fill="currentColor" />}
                  </button>
                </div>

                {layer.optionalNote && (
                  <p className="mt-2 rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-1.5 text-[10px] leading-snug text-white/50">
                    {layer.optionalNote}
                  </p>
                )}
              </div>

              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1 text-white/55">
                    <Volume2 size={12} /> Volume
                  </span>
                  <span className="font-medium text-white/80">{vol}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={vol}
                  onChange={e => changeVolume(layer.id, Number(e.target.value))}
                  aria-label={`${layer.name} volume`}
                  className="w-full accent-[#7ec8b8]"
                />
                {/* Live visual activity indicator */}
                <div className="mt-2 flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1.5 text-white/45">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        background: isOn ? layer.color : 'rgba(255,255,255,0.2)',
                        boxShadow: isOn ? `0 0 8px ${layer.color}` : undefined,
                      }}
                    />
                    {isOn ? 'Synthesizing live' : 'Paused'}
                  </span>
                  {isOn && (
                    <span className="flex h-3 items-end gap-0.5" aria-hidden>
                      {[0, 1, 2, 3].map(bar => (
                        <span
                          key={bar}
                          className="w-1 rounded-full"
                          style={{
                            height: '100%',
                            background: layer.color,
                            animation: `luminaWave ${0.9 + bar * 0.2}s ease-in-out infinite`,
                          }}
                        />
                      ))}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Persistent 3:00 Sanctuary Rain Card (follows user across routes) */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/[0.09] bg-black/25 p-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="eyebrow text-[9px] text-[#a5d4ca]">Cross-Room Companion Audio</span>
              <Droplets size={14} className="text-[#91cabe]" />
            </div>
            <p className="mt-1 font-serif text-base text-white">3:00 Sanctuary Rain Timer</p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/50">
              Need rain to keep playing while you visit your 3D Garden or Check-In? Use the
              cross-room 3:00 timer.
            </p>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/50">Cycle countdown:</span>
              <RainCountdownValue />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={toggleRain}
                aria-pressed={rainPlaying}
                className="primary-button flex-1 justify-center !py-2 !text-xs"
              >
                {rainPlaying ? <Pause size={12} /> : <Play size={12} fill="currentColor" />}
                {rainPlaying ? 'Pause 3:00 Rain' : 'Start 3:00 Rain'}
              </button>
              <button
                type="button"
                onClick={resetRain}
                aria-label="Reset 3:00 rain timer"
                className="secondary-button !px-3 !py-2 !text-xs"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ============================================================================
 * 2. UPGRADED BREATHING ORB WITH 4 PATTERNS, VOICE, HAPTICS & EMOJI REACTIONS
 * ========================================================================== */

interface Phase {
  label: string
  verb: string
  secs: number
  scale: number
  ringColor: string
}

const CADENCES: Array<{ id: string; name: string; badge: string; desc: string; phases: Phase[] }> =
  [
    {
      id: 'calming',
      name: 'Calming Exhale (4-6)',
      badge: '4s In · 6s Out',
      desc: 'A longer exhale gently encourages your body to settle after busy or overwhelming moments.',
      phases: [
        { label: 'Inhale', verb: 'Inhale gently', secs: 4, scale: 1.3, ringColor: '#7ec8b8' },
        { label: 'Exhale', verb: 'Exhale slowly', secs: 6, scale: 0.84, ringColor: '#e8a4b8' },
      ],
    },
    {
      id: 'box',
      name: 'Box Breathing (4-4-4-4)',
      badge: '4s · 4s · 4s · 4s',
      desc: 'Even, steady four-count breath to anchor attention when thoughts feel scattered.',
      phases: [
        { label: 'Inhale', verb: 'Inhale steadily', secs: 4, scale: 1.3, ringColor: '#7ec8b8' },
        { label: 'Hold', verb: 'Hold softly', secs: 4, scale: 1.3, ringColor: '#f3d9a4' },
        { label: 'Exhale', verb: 'Exhale smoothly', secs: 4, scale: 0.84, ringColor: '#b8a4e8' },
        { label: 'Rest', verb: 'Rest empty', secs: 4, scale: 0.84, ringColor: '#91cabe' },
      ],
    },
    {
      id: 'deep-rest',
      name: 'Deep Rest (4-7-8)',
      badge: '4s In · 7s Hold · 8s Out',
      desc: 'Unhurried evening cadence designed for winding down before sleep or quiet rest.',
      phases: [
        { label: 'Inhale', verb: 'Inhale quietly', secs: 4, scale: 1.32, ringColor: '#7ec8b8' },
        { label: 'Hold', verb: 'Hold with ease', secs: 7, scale: 1.32, ringColor: '#b8a4e8' },
        { label: 'Exhale', verb: 'Long, slow exhale', secs: 8, scale: 0.82, ringColor: '#e8a4b8' },
      ],
    },
    {
      id: 'coherent',
      name: 'Coherent (5-5)',
      badge: '5s In · 5s Out',
      desc: 'Balanced five-second inhale and five-second exhale for smooth, unhurried steadiness.',
      phases: [
        { label: 'Inhale', verb: 'Breathe in smoothly', secs: 5, scale: 1.28, ringColor: '#7ec8b8' },
        { label: 'Exhale', verb: 'Breathe out smoothly', secs: 5, scale: 0.85, ringColor: '#f3d9a4' },
      ],
    },
  ]

const BREATH_REACTIONS = [
  '💗 This helped me',
  '🌿 I feel calmer',
  '🫂 I feel understood',
  '✨ I feel hopeful',
  '🌙 I need more rest',
]

function speakCue(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.rate = 0.86
    utter.pitch = 0.95
    utter.volume = 0.55
    window.speechSynthesis.speak(utter)
  } catch {
    // ignore speech synthesis blocks
  }
}

function triggerHapticPulse() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(35)
    } catch {
      // ignore
    }
  }
}

function BreathingStudio() {
  const [cadenceId, setCadenceId] = useState('calming')
  const [durationSecs, setDurationSecs] = useState(60)
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [sessions, setSessions] = useState(0)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [hapticsEnabled, setHapticsEnabled] = useState(false)
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null)

  const lastPhaseIndexRef = useRef<number>(-1)
  const cadence = CADENCES.find(c => c.id === cadenceId) ?? CADENCES[0]
  const cycleLen = cadence.phases.reduce((a, p) => a + p.secs, 0)

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel()
        } catch {
          // ignore
        }
      }
    }
  }, [])

  useEffect(() => {
    if (!running) {
      lastPhaseIndexRef.current = -1
      return
    }
    const startedAt = Date.now()
    const id = window.setInterval(() => {
      const t = (Date.now() - startedAt) / 1000
      if (t >= durationSecs) {
        setElapsed(durationSecs)
        setRunning(false)
        setSessions(s => s + 1)
        if (voiceEnabled) speakCue('Session complete. Take a gentle breath.')
      } else {
        setElapsed(t)
      }
    }, 100)
    return () => window.clearInterval(id)
  }, [running, durationSecs, voiceEnabled])

  let phaseIdx = 0
  let phase = cadence.phases[0]
  let remaining = phase.secs
  const t = elapsed % cycleLen
  let acc = 0
  for (let i = 0; i < cadence.phases.length; i++) {
    const p = cadence.phases[i]
    if (t < acc + p.secs) {
      phaseIdx = i
      phase = p
      remaining = Math.max(1, Math.ceil(acc + p.secs - t))
      break
    }
    acc += p.secs
  }

  // Trigger optional voice / haptic cue on phase transitions
  useEffect(() => {
    if (!running) return
    if (lastPhaseIndexRef.current !== phaseIdx) {
      lastPhaseIndexRef.current = phaseIdx
      if (voiceEnabled) speakCue(phase.verb)
      if (hapticsEnabled) triggerHapticPulse()
    }
  }, [running, phaseIdx, phase.verb, voiceEnabled, hapticsEnabled])

  const idle = !running && elapsed === 0
  const done = !running && elapsed >= durationSecs
  const text = idle
    ? 'Ready when you are'
    : done
      ? 'Beautifully done'
      : `${phase.verb}... ${remaining}s`

  return (
    <section className={`${glass} flex flex-col justify-between p-6`}>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="eyebrow text-[#e8a4b8]">Customizable Breathing Orb</p>
            <h2 className="mt-1 font-serif text-2xl text-white">Somatic Breath Pacer</h2>
          </div>
          <div className="flex items-center gap-1.5">
            {[60, 120, 300].map(sec => (
              <button
                key={sec}
                type="button"
                onClick={() => {
                  setDurationSecs(sec)
                  setRunning(false)
                  setElapsed(0)
                }}
                className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                  durationSecs === sec
                    ? 'border-[#7ec8b8]/60 bg-[#7ec8b8]/20 text-white'
                    : 'border-white/[0.08] bg-white/[0.03] text-white/50 hover:text-white'
                }`}
              >
                {sec === 60 ? '1 min' : sec === 120 ? '2 min' : '5 min'}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Breathing Pattern Pills */}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {CADENCES.map(c => {
            const on = cadenceId === c.id
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setCadenceId(c.id)
                  setRunning(false)
                  setElapsed(0)
                }}
                className={`rounded-2xl border p-3 text-left transition ${
                  on
                    ? 'border-[#e1acc1]/60 bg-[#daa9c2]/15 text-[#f4d9e2]'
                    : 'border-white/[0.09] bg-white/[0.03] text-white/65 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-serif text-sm text-white">{c.name}</span>
                  <span className="rounded-full border border-white/[0.1] bg-black/25 px-2 py-0.5 text-[10px] text-[#7ec8b8]">
                    {c.badge}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-white/45">{c.desc}</p>
              </button>
            )
          })}
        </div>

        {/* Optional Voice & Haptic Guidance Toggles */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={voiceEnabled}
            onClick={() => {
              const next = !voiceEnabled
              setVoiceEnabled(next)
              if (!next && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel()
              }
            }}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition ${
              voiceEnabled
                ? 'border-[#7ec8b8]/55 bg-[#7ec8b8]/15 text-[#c8f3e9]'
                : 'border-white/[0.09] bg-white/[0.03] text-white/55 hover:text-white'
            }`}
          >
            <Volume2 size={12} />
            Voice Guidance: {voiceEnabled ? 'On' : 'Off'}
          </button>

          <button
            type="button"
            aria-pressed={hapticsEnabled}
            onClick={() => setHapticsEnabled(h => !h)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition ${
              hapticsEnabled
                ? 'border-[#b8a4e8]/55 bg-[#b8a4e8]/15 text-[#e2d8f8]'
                : 'border-white/[0.09] bg-white/[0.03] text-white/55 hover:text-white'
            }`}
          >
            <Vibrate size={12} />
            Gentle Haptics: {hapticsEnabled ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      {/* Animated Bioluminescent Breathing Orb Stage */}
      <div className="relative my-4 grid h-[215px] place-items-center">
        <div
          className="pointer-events-none absolute h-44 w-44 rounded-full border transition-all duration-700"
          style={{
            borderColor: `${phase.ringColor}40`,
            transform: running ? `scale(${phase.scale * 1.08})` : 'scale(1)',
            transition: `transform ${running ? phase.secs : 0.6}s ease-in-out`,
          }}
          aria-hidden
        />
        <div
          className="grid h-32 w-32 place-items-center rounded-full text-center text-white/95"
          style={{
            background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,.82), ${phase.ringColor}88 55%, rgba(149,132,191,.38))`,
            boxShadow: `0 0 0 18px ${phase.ringColor}18, 0 0 0 38px ${phase.ringColor}0d, 0 0 68px ${phase.ringColor}55`,
            transform: running ? `scale(${phase.scale})` : 'scale(1)',
            transition: `transform ${running ? phase.secs : 0.6}s ease-in-out`,
          }}
          aria-hidden
        >
          <div className="flex flex-col items-center">
            <Wind size={22} />
            <span className="mt-1 font-serif text-xs tracking-wide">
              {running ? phase.label : 'Pause'}
            </span>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="font-serif text-2xl text-white" role="status" aria-live="polite">
          {text}
        </p>
        <div className="meter mx-auto mt-3 w-64">
          <span style={{ width: `${(elapsed / durationSecs) * 100}%` }} />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            className="primary-button px-6 py-3 text-sm"
            onClick={() => {
              if (running) {
                setRunning(false)
                setElapsed(0)
                if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                  window.speechSynthesis.cancel()
                }
              } else {
                setElapsed(0)
                setRunning(true)
              }
            }}
          >
            {running
              ? 'Stop Breath Session'
              : done
                ? 'Breathe Again'
                : `Begin ${durationSecs === 60 ? '60s' : durationSecs === 120 ? '2m' : '5m'} Session`}
          </button>
          <span className="rounded-full border border-white/[0.09] px-3.5 py-2 text-xs text-white/55">
            Completed today: {sessions}
          </span>
        </div>

        {/* Emoji Quick Reactions */}
        <div className="mt-5 border-t border-white/[0.07] pt-3.5">
          <p className="mb-2 text-[11px] text-white/45">
            How does your body feel after pausing here?
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {BREATH_REACTIONS.map(reaction => {
              const on = selectedReaction === reaction
              return (
                <button
                  key={reaction}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSelectedReaction(on ? null : reaction)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                    on
                      ? 'border-[#e8a4b8]/60 bg-[#e8a4b8]/20 text-white'
                      : 'border-white/[0.08] bg-white/[0.03] text-white/60 hover:text-white'
                  }`}
                >
                  {reaction}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ============================================================================
 * 3. SOMATIC GROUNDING WALKTHROUGH & BIOLOGICAL RHYTHM TUNER
 * ========================================================================== */

const GROUNDING_STEPS = [
  {
    step: 'Step 1 · Name it without judging',
    title: 'Name the looping thought quietly',
    body: 'Say to yourself: “My mind is replaying a worry because it is trying to protect me.” Notice it as a sentence, not an emergency.',
  },
  {
    step: 'Step 2 · Loosen the body',
    title: 'Drop your shoulders & unclench your jaw',
    body: 'Press both feet gently into the floor. Let your tongue rest from the roof of your mouth and take one slow exhale.',
  },
  {
    step: 'Step 3 · Shrink the timeline',
    title: 'Return to the next 10 minutes only',
    body: 'You do not have to solve next week tonight. Choose one tiny, kind action for the next ten minutes—water, rest, or stepping away.',
  },
]

const SENSORY_54321_PILLS = [
  { id: 'see', code: '5', label: '5 things you see' },
  { id: 'touch', code: '4', label: '4 textures you feel' },
  { id: 'hear', code: '3', label: '3 quiet sounds' },
  { id: 'scent', code: '2', label: '2 scents in the air' },
  { id: 'breath', code: '1', label: '1 slow anchor breath' },
]

const POSTURE_RELEASE_CUES = [
  'Drop shoulders 1 inch',
  'Unclench back teeth',
  'Soften forehead & brow',
  'Uncurl fingers & palms',
  'Rest tongue softly',
  'Plant both feet flat',
]

function GroundingWalkthrough() {
  const [done, setDone] = useState<boolean[]>([false, false, false])
  const [sensoryChecked, setSensoryChecked] = useState<string[]>(['breath'])
  const [postureChecked, setPostureChecked] = useState<string[]>(['Drop shoulders 1 inch'])
  const [note, setNote] = useState('')
  const count = done.filter(Boolean).length

  const toggleSensory = (id: string) =>
    setSensoryChecked(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))

  const togglePosture = (cue: string) =>
    setPostureChecked(prev => (prev.includes(cue) ? prev.filter(x => x !== cue) : [...prev, cue]))

  return (
    <section className={`${glass} flex flex-col justify-between gap-4 p-6`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">3-Step Somatic Grounding &amp; Overthinking Interruption</p>
            <h2 className="mt-1 font-serif text-2xl text-white">Interrupt the loop gently</h2>
          </div>
          <span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1 text-xs text-white/60">
            {count} of 3 complete
          </span>
        </div>

        <ul className="grid gap-2.5">
          {GROUNDING_STEPS.map((g, i) => (
            <li key={g.step}>
              <button
                type="button"
                onClick={() => setDone(d => d.map((v, j) => (j === i ? !v : v)))}
                aria-pressed={done[i]}
                className={`flex w-full items-start gap-3.5 rounded-2xl border p-3.5 text-left transition ${
                  done[i]
                    ? 'border-[#8ec9bd]/45 bg-[#8ec9bd]/12'
                    : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20'
                }`}
              >
                <span
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                    done[i]
                      ? 'border-[#8ec9bd] bg-[#8ec9bd] text-[#10231f]'
                      : 'border-white/25'
                  }`}
                >
                  {done[i] && <Check size={12} />}
                </span>
                <span>
                  <span className="eyebrow block text-[9px] text-[#a5d4ca]">{g.step}</span>
                  <span className="mt-0.5 block font-serif text-lg text-white">{g.title}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-white/55">{g.body}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        {/* 5-4-3-2-1 Sensory Check-In Micro-Steps */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#7ec8b8]">
              5-4-3-2-1 Sensory Anchor Check-In
            </span>
            <span className="font-mono text-[10px] text-white/45">
              {sensoryChecked.length}/5 anchored
            </span>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {SENSORY_54321_PILLS.map(item => {
              const active = sensoryChecked.includes(item.id)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleSensory(item.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition ${
                    active
                      ? 'border-[#7ec8b8]/55 bg-[#7ec8b8]/18 text-[#d7f7ef]'
                      : 'border-white/[0.08] bg-white/[0.03] text-white/55 hover:text-white'
                  }`}
                >
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-white/10 font-mono text-[9px]">
                    {item.code}
                  </span>
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Quick Posture Release Toggles */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#b8a4e8]">
              Quick Somatic Posture Release
            </span>
            <span className="font-mono text-[10px] text-white/45">
              {postureChecked.length} softened
            </span>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {POSTURE_RELEASE_CUES.map(cue => {
              const on = postureChecked.includes(cue)
              return (
                <button
                  key={cue}
                  type="button"
                  onClick={() => togglePosture(cue)}
                  className={`rounded-xl border px-2.5 py-1.5 text-left text-[11px] transition ${
                    on
                      ? 'border-[#b8a4e8]/55 bg-[#b8a4e8]/18 text-white'
                      : 'border-white/[0.07] bg-white/[0.02] text-white/55 hover:text-white'
                  }`}
                >
                  {on ? '✓ ' : '+ '}
                  {cue}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.07] pt-3">
        <input
          className="modal-input w-full !text-xs"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Optional: What is one tiny thing you can do in the next 10 minutes?"
          aria-label="Next 10 minutes intention"
        />

        {count === 3 && (
          <p className="mt-2.5 text-xs text-[#bfe3da]" role="status">
            You completed all 3 grounding steps. Notice if your shoulders or breath feel even 5%
            softer.
          </p>
        )}
      </div>
    </section>
  )
}

function RhythmTuner() {
  const { bioRhythm, updateBioRhythm } = useSanctuary()
  const [note, setNote] = useState(bioRhythm.rhythmNote)
  const save = (patch: Partial<BioRhythmState>) => void updateBioRhythm({ ...bioRhythm, ...patch })
  const qualities: Array<[BioRhythmState['sleepQuality'], string]> = [
    ['rested', 'Rested'],
    ['fragmented', 'Fragmented'],
    ['exhausted', 'Exhausted'],
  ]
  return (
    <section className={`${glass} p-6`}>
      <p className="eyebrow">Biological Rhythm &amp; Rest Tuner</p>
      <h2 className="mt-1 font-serif text-2xl text-white">Pace your sanctuary to your rest</h2>
      <p className="mt-1 text-xs text-white/45">
        Optional. Shapes gentle suggestions across LUMINA and stays 100% on your device.
      </p>
      <label className="mt-4 block text-xs text-white/60" htmlFor="sleep-hours">
        Last night&apos;s rest: <strong className="text-white">{bioRhythm.sleepHours}h</strong>
      </label>
      <input
        id="sleep-hours"
        type="range"
        min={4}
        max={10}
        step={0.5}
        value={bioRhythm.sleepHours}
        onChange={e => save({ sleepHours: Number(e.target.value) })}
        className="mt-2 w-full accent-[#e8b8c7]"
      />
      <div className="flex justify-between text-[10px] text-white/30">
        <span>4h</span>
        <span>7h</span>
        <span>10h</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {qualities.map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={bioRhythm.sleepQuality === id}
            onClick={() => save({ sleepQuality: id })}
            className={`rounded-full border px-3.5 py-2 text-xs ${
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
        className="modal-input mt-4 w-full !text-xs"
        value={note}
        maxLength={160}
        onChange={e => setNote(e.target.value)}
        onBlur={() => note !== bioRhythm.rhythmNote && save({ rhythmNote: note })}
        placeholder="Optional rhythm note (e.g., late study night, quiet morning)"
        aria-label="Rhythm note"
      />
    </section>
  )
}

function CalmStudioContent() {
  return (
    <div className="mx-auto grid w-full max-w-[1320px] gap-5 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <SoundscapeMixerStudio />
      </div>
      <BreathingStudio />
      <GroundingWalkthrough />
      <div className="lg:col-span-2">
        <RhythmTuner />
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <AppShell title="Calm Studio" subtitle="7-layer soundscape mixer & somatic breath">
      <CalmStudioContent />
    </AppShell>
  )
}
