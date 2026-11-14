'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, Sparkles, Volume2 } from 'lucide-react'
import { getFrameIntervalMs, getMaxDpr, isMobileRuntime } from '@/lib/perf'

const INTRO_SESSION_KEY = 'lumina_raaos_intro_seen'
const PORTAL_SESSION_KEY = 'lumina_portal_awakening'
const PORTAL_EVENT_NAME = 'lumina:portal-awakening'

/**
 * Triggers the 2.4-second full-screen "Post-Login Holographic Portal Awakening" transition.
 * Called automatically on sign-in (/sign-in), sign-up (/sign-up), or guest entry (/welcome).
 */
export function triggerPortalTransition(userName?: string) {
  if (typeof window === 'undefined') return
  const cleanName = userName?.trim().split(/\s+/)[0] || 'Friend'
  try {
    window.sessionStorage.setItem(
      PORTAL_SESSION_KEY,
      JSON.stringify({ userName: cleanName, ts: Date.now() })
    )
    window.dispatchEvent(
      new CustomEvent(PORTAL_EVENT_NAME, {
        detail: { userName: cleanName },
      })
    )
  } catch {
    // ignore storage blocks
  }
}

/**
 * Plays a warm, champagne-gold harmonic Web Audio chime for the LUMINA · RaaOS Engine boot sequence.
 */
export function playSanctuaryLogoShimmer() {
  if (typeof window === 'undefined') return
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return
  try {
    const ctx = new Ctor()
    const now = ctx.currentTime
    const master = ctx.createGain()
    master.gain.setValueAtTime(0.0001, now)
    master.gain.exponentialRampToValueAtTime(0.05, now + 0.35)
    master.gain.exponentialRampToValueAtTime(0.0005, now + 3.0)
    master.connect(ctx.destination)

    // Warm Lydian/Pentatonic sanctuary harmonic chord
    const notes = [220.0, 277.18, 329.63, 415.3, 493.88, 659.25, 880.0]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const noteGain = ctx.createGain()
      osc.type = i % 2 === 0 ? 'sine' : 'triangle'
      osc.frequency.setValueAtTime(freq, now + i * 0.095)
      noteGain.gain.setValueAtTime(0.001, now + i * 0.095)
      noteGain.gain.exponentialRampToValueAtTime(0.28 / (i + 1), now + i * 0.095 + 0.18)
      noteGain.gain.exponentialRampToValueAtTime(0.0008, now + 2.9)
      osc.connect(noteGain)
      noteGain.connect(master)
      osc.start(now + i * 0.095)
      osc.stop(now + 3.0)
    })

    window.setTimeout(() => {
      ctx.close().catch(() => {})
    }, 3200)
  } catch {
    // ignore audio autoplay restrictions
  }
}

/**
 * 1. World-Class LUMINA / RaaOS Engine ASCII & Starlight Botanical Intro (<LuminaLogoIntro />)
 * - Renders an interactive 60fps HTML5 canvas featuring a depth-sorted, 3D-projected
 *   sacred geometry lotus/lily made of luminous petal filaments, golden-angle phyllotaxis
 *   stardust, and crisp ASCII botanical typography that responds to mouse parallax.
 * - Replayable anytime by clicking the top-left LUMINA emblem in AppShell.
 */
export function LuminaLogoIntro({
  forceOpen = false,
  onClose,
}: {
  forceOpen?: boolean
  onClose?: () => void
}) {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  const dismissIntro = useCallback(() => {
    setExiting(true)
    try {
      window.sessionStorage.setItem(INTRO_SESSION_KEY, '1')
    } catch {
      // ignore
    }
    window.setTimeout(() => {
      setVisible(false)
      setExiting(false)
      onClose?.()
    }, 480)
  }, [onClose])

  // Check session storage on mount OR open when forceOpen is true
  useEffect(() => {
    if (forceOpen) {
      setExiting(false)
      setVisible(true)
      playSanctuaryLogoShimmer()
      return
    }
    try {
      const seen = window.sessionStorage.getItem(INTRO_SESSION_KEY)
      if (!seen) {
        setVisible(true)
      }
    } catch {
      // ignore
    }
  }, [forceOpen])

  // Auto-transition after 4.0 seconds when visible
  useEffect(() => {
    if (!visible) return
    const timer = window.setTimeout(() => {
      dismissIntro()
    }, 4000)
    return () => window.clearTimeout(timer)
  }, [visible, dismissIntro])

  // 3D Depth-Sorted Procedural ASCII & Starlight Botanical Lotus Canvas
  useEffect(() => {
    if (!visible) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId = 0
    const dpr = getMaxDpr(2)

    const resize = () => {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const onPointerMove = (e: MouseEvent) => {
      const nx = (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 2
      const ny = (e.clientY / Math.max(1, window.innerHeight) - 0.5) * 2
      pointerRef.current = { x: nx, y: ny }
    }
    window.addEventListener('mousemove', onPointerMove)

    interface BotanicalAsciiNode {
      baseTheta: number
      petalLayer: number
      radiusNorm: number
      cupHeight: number
      zOffset: number
      glyph: string
      color: string
      fontSize: number
    }

    const glyphs = ['✦', '✧', '·', '˚', '◦', '*', ':', '+']
    const palette = ['#f3d9a4', '#7ec8b8', '#e8a4b8', '#b8a4e8', '#f7dfb2']
    const nodes: BotanicalAsciiNode[] = []

    // Sculpted 3-tier 3D Lotus / Lily Petals (Inner crown, middle chalice, outer unfurling petals)
    for (let layer = 0; layer < 3; layer++) {
      const count = 84 + layer * 28
      const k = layer === 0 ? 6 : layer === 1 ? 12 : 8
      for (let i = 0; i < count; i++) {
        const theta = (i / count) * Math.PI * 2
        const petalShape = Math.pow(Math.abs(Math.cos((k * theta) / 2)), 0.75)
        const rNorm = 0.2 + layer * 0.21 + petalShape * (0.38 - layer * 0.04)
        // Cup upward curvature so petals form a 3D chalice
        const cupHeight = -Math.pow(rNorm, 1.45) * (42 - layer * 8) + petalShape * 16
        const zOff = Math.sin(k * theta) * (16 + layer * 8) + cupHeight
        nodes.push({
          baseTheta: theta,
          petalLayer: layer,
          radiusNorm: rNorm,
          cupHeight,
          zOffset: zOff,
          glyph: petalShape > 0.82 ? '✦' : glyphs[(i + layer * 3) % glyphs.length],
          color:
            petalShape > 0.85
              ? '#f7dfb2'
              : palette[(i + layer) % palette.length],
          fontSize: petalShape > 0.82 ? 12 : layer === 0 ? 11 : 10,
        })
      }
    }

    // Golden-angle (137.508°) Phyllotaxis Sacred Seed Core
    const goldenAngle = Math.PI * (3 - Math.sqrt(5))
    for (let n = 0; n < 72; n++) {
      const theta = n * goldenAngle
      const rNorm = Math.sqrt(n / 72) * 0.26
      nodes.push({
        baseTheta: theta,
        petalLayer: -1,
        radiusNorm: rNorm,
        cupHeight: 12,
        zOffset: Math.cos(rNorm * Math.PI * 3) * 16 + 10,
        glyph: n % 4 === 0 ? '✦' : n % 2 === 0 ? '˚' : '·',
        color: n % 2 === 0 ? '#f3d9a4' : '#7ec8b8',
        fontSize: n % 4 === 0 ? 11.5 : 9.5,
      })
    }

    // Ambient converging starlight field
    const stars = Array.from({ length: 72 }, (_, i) => ({
      angle: (i / 72) * Math.PI * 2,
      radius: 50 + ((i * 49) % 440),
      speed: 0.35 + (i % 5) * 0.18,
      size: 1.0 + (i % 3) * 0.85,
      color: palette[i % palette.length],
    }))

    let smoothMx = 0
    let smoothMy = 0
    const start = performance.now()
    const frameInterval = getFrameIntervalMs(16.5)
    const mobile = isMobileRuntime()
    let lastDraw = 0

    const render = (now: number) => {
      if (document.hidden || now - lastDraw < frameInterval) {
        animId = window.requestAnimationFrame(render)
        return
      }
      lastDraw = now
      const t = (now - start) / 1000
      const w = window.innerWidth
      const h = window.innerHeight
      const cx = w / 2
      const cy = Math.max(175, h / 2 - 82)

      smoothMx += (pointerRef.current.x - smoothMx) * 0.085
      smoothMy += (pointerRef.current.y - smoothMy) * 0.085

      ctx.clearRect(0, 0, w, h)

      // 1. Multi-layered Bioluminescent Nebula Backdrop
      const radial = ctx.createRadialGradient(
        cx + smoothMx * 26,
        cy + smoothMy * 26,
        8,
        cx,
        cy,
        390
      )
      radial.addColorStop(0, 'rgba(243, 217, 164, 0.26)')
      radial.addColorStop(0.36, 'rgba(126, 200, 184, 0.16)')
      radial.addColorStop(0.68, 'rgba(232, 164, 184, 0.08)')
      radial.addColorStop(1, 'rgba(5, 6, 13, 0)')
      ctx.fillStyle = radial
      ctx.fillRect(0, 0, w, h)

      // 2. Water-Ripple Reflection Rings Beneath the Lotus
      for (let ring = 0; ring < 3; ring++) {
        const rippleRad = 85 + ring * 48 + Math.sin(t * 2.2 - ring) * 8
        ctx.save()
        ctx.translate(cx + smoothMx * 12, cy + 56 + smoothMy * 8)
        ctx.strokeStyle =
          ring === 0
            ? 'rgba(126, 200, 184, 0.24)'
            : ring === 1
              ? 'rgba(243, 217, 164, 0.18)'
              : 'rgba(232, 164, 184, 0.12)'
        ctx.lineWidth = 1.1
        ctx.setLineDash([4, 8])
        ctx.beginPath()
        ctx.ellipse(0, 0, rippleRad, rippleRad * 0.28, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }

      // 3. Converging Starlight Dust
      for (const s of stars) {
        s.angle += 0.0045 * s.speed
        s.radius -= s.speed * 0.85
        if (s.radius < 20) s.radius = 400
        const sx = cx + Math.cos(s.angle) * s.radius + smoothMx * 18
        const sy = cy + Math.sin(s.angle) * (s.radius * 0.68) + smoothMy * 18
        ctx.save()
        ctx.globalAlpha = Math.min(0.82, (s.radius / 400) * 0.76)
        ctx.fillStyle = s.color
        ctx.beginPath()
        ctx.arc(sx, sy, s.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      // 4. 3D Projected & Depth-Sorted Botanical ASCII Lotus
      const maxFlowerRadius = Math.min(w, h) * 0.22
      const bloomEase = 1 - Math.pow(1 - Math.min(1, t / 1.15), 3)
      const bloomScale = (0.38 + 0.62 * bloomEase) + Math.sin(t * 2.0) * 0.025
      const rotZ = t * 0.34 + smoothMx * 0.48
      const tiltX = 0.56 + smoothMy * 0.34
      const tiltY = smoothMx * 0.34

      // Draw 12 delicate golden/teal radial petal filaments first
      ctx.save()
      for (let p = 0; p < 12; p++) {
        const pAngle = (p / 12) * Math.PI * 2 + rotZ
        const tipR = maxFlowerRadius * 0.88 * bloomScale
        const x0 = Math.cos(pAngle) * tipR
        const y0 = Math.sin(pAngle) * tipR
        const z0 = Math.sin(p * 2 + t * 2) * 18
        const y1 = y0 * Math.cos(tiltX) - z0 * Math.sin(tiltX)
        const z1 = y0 * Math.sin(tiltX) + z0 * Math.cos(tiltX)
        const x2 = x0 * Math.cos(tiltY) + z1 * Math.sin(tiltY)
        const z2 = -x0 * Math.sin(tiltY) + z1 * Math.cos(tiltY)
        const persp = 340 / (340 + z2)
        const tx = cx + x2 * persp
        const ty = cy + y1 * persp

        const grad = ctx.createLinearGradient(cx, cy, tx, ty)
        grad.addColorStop(0, 'rgba(243, 217, 164, 0.32)')
        grad.addColorStop(0.6, p % 2 === 0 ? 'rgba(126, 200, 184, 0.22)' : 'rgba(232, 164, 184, 0.22)')
        grad.addColorStop(1, 'rgba(243, 217, 164, 0.04)')
        ctx.strokeStyle = grad
        ctx.lineWidth = 1.15
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.quadraticCurveTo(
          (cx + tx) * 0.5 + Math.sin(pAngle) * 14,
          (cy + ty) * 0.5 - 12,
          tx,
          ty
        )
        ctx.stroke()
      }
      ctx.restore()

      // Project all botanical ASCII nodes and depth-sort back-to-front
      const projected = nodes.map(nd => {
        const layerSpin =
          nd.petalLayer === -1
            ? -rotZ * 1.25
            : rotZ * (nd.petalLayer % 2 === 0 ? 1 : -0.72)
        const theta = nd.baseTheta + layerSpin
        const r = nd.radiusNorm * maxFlowerRadius * bloomScale

        const x0 = Math.cos(theta) * r
        const y0 = Math.sin(theta) * r
        const z0 = nd.zOffset * Math.sin(t * 2.1 + nd.radiusNorm * 3.8)

        const y1 = y0 * Math.cos(tiltX) - z0 * Math.sin(tiltX)
        const z1 = y0 * Math.sin(tiltX) + z0 * Math.cos(tiltX)
        const x2 = x0 * Math.cos(tiltY) + z1 * Math.sin(tiltY)
        const z2 = -x0 * Math.sin(tiltY) + z1 * Math.cos(tiltY)

        const perspective = 340 / (340 + z2)
        return {
          px: cx + x2 * perspective,
          py: cy + y1 * perspective,
          z2,
          glyph: nd.glyph,
          color: nd.color,
          fontSize: nd.fontSize,
        }
      })

      projected.sort((a, b) => a.z2 - b.z2)

      ctx.save()
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      for (let i = 0; i < projected.length; i++) {
        const pt = projected[i]
        const depthAlpha = Math.max(0.22, Math.min(0.98, 0.6 + (pt.z2 / 56) * 0.38))
        ctx.globalAlpha = depthAlpha
        ctx.font = `600 ${pt.fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`
        ctx.fillStyle = pt.color
        if (!mobile) {
          ctx.shadowColor = pt.color
          ctx.shadowBlur = pt.glyph === '✦' ? 14 : 6
        }
        ctx.fillText(pt.glyph, pt.px, pt.py)
      }
      ctx.restore()

      animId = window.requestAnimationFrame(render)
    }

    animId = window.requestAnimationFrame(render)
    return () => {
      window.cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onPointerMove)
    }
  }, [visible])

  if (!visible) return null

  const titleChars = ['L', 'U', 'M', 'I', 'N', 'A']

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="LUMINA Sanctuary Cinematic Boot Sequence"
      className={`fixed inset-0 z-[120] flex flex-col items-center justify-end overflow-hidden bg-[#05060d]/95 pb-12 backdrop-blur-2xl transition-all duration-500 sm:pb-16 ${
        exiting ? 'scale-105 opacity-0' : 'scale-100 opacity-100'
      }`}
    >
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />

      {/* Lower Cinematic Typography & Telemetry Stage */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <span className="eyebrow mb-3 rounded-full border border-[#f3d9a4]/35 bg-[#f3d9a4]/10 px-3.5 py-1 text-[9.5px] tracking-[0.24em] text-[#f7dfb2] uppercase">
          RaaOS ENGINE · PROCEDURAL BOTANICAL CORE · MOVE CURSOR TO ORBIT
        </span>

        {/* Golden Champagne-Gold Beam Reveal: "L U M I N A" */}
        <div className="mt-1 flex flex-wrap items-center justify-center gap-3 sm:gap-5">
          {titleChars.map((char, idx) => (
            <span
              key={idx}
              className={`font-serif text-4xl font-normal tracking-[0.22em] sm:text-6xl ${
                idx % 2 === 0
                  ? 'text-[#f7dfb2] drop-shadow-[0_0_24px_rgba(243,217,164,0.65)]'
                  : 'text-white drop-shadow-[0_0_20px_rgba(126,200,184,0.55)]'
              }`}
              style={{
                animation: `luminaLetterReveal 0.65s cubic-bezier(0.16, 1, 0.3, 1) ${
                  idx * 0.075
                }s both`,
              }}
            >
              {char}
            </span>
          ))}
        </div>

        <p className="mt-3 text-xs font-medium tracking-[0.24em] text-[#8ec9bd] uppercase">
          LUMINA · Bio-Adaptive Emotional Sanctuary
        </p>
        <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-0.5 text-[9.5px] tracking-[0.18em] text-[#f7dfb2]/80 uppercase">
          Powered by RaaOS Engine · Crafted by Rudra
        </span>
        <p className="mt-2 max-w-lg text-xs leading-relaxed text-white/60">
          Algorithmic starlight lotus, reactive AI soul companion, and 100% on-device emotional
          refuge—calibrated to your nervous system.
        </p>

        {/* Action Bar: Harmonic Chime + Skip / Enter Sanctuary */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => playSanctuaryLogoShimmer()}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#f3d9a4]/35 bg-[#f3d9a4]/[0.08] px-4 py-2 text-xs text-[#f7dfb2] transition hover:border-[#f3d9a4]/70 hover:bg-[#f3d9a4]/15"
          >
            <Volume2 size={13} className="text-[#f3d9a4]" />
            <span>Play Sanctuary Chime</span>
          </button>

          <button
            type="button"
            onClick={dismissIntro}
            className="primary-button px-6 py-2.5 text-xs font-medium shadow-[0_0_28px_rgba(243,217,164,0.3)]"
          >
            <span>Enter LUMINA Sanctuary</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * 2. Post-Login Holographic Portal Awakening (<PortalAwakeningOverlay />)
 * - Triggered automatically after sign-in, sign-up, or guest entry.
 * - Renders a 2.4-second full-screen holographic portal sweep with expanding
 *   bioluminescent teal/rose-quartz rings, floating starlight motes, and personalized
 *   greeting ("Opening LUMINA Sanctuary for {userName}...").
 */
export function PortalAwakeningOverlay({ fallbackName }: { fallbackName?: string }) {
  const [portalUser, setPortalUser] = useState<string | null>(null)
  const [fadingOut, setFadingOut] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const startPortalSequence = useCallback((name: string) => {
    setFadingOut(false)
    setPortalUser(name || 'Friend')
    playSanctuaryLogoShimmer()
    try {
      window.sessionStorage.removeItem(PORTAL_SESSION_KEY)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(PORTAL_SESSION_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as { userName?: string; ts?: number }
        if (!parsed.ts || Date.now() - parsed.ts < 30000) {
          startPortalSequence(parsed.userName || fallbackName || 'Friend')
        } else {
          window.sessionStorage.removeItem(PORTAL_SESSION_KEY)
        }
      }
    } catch {
      // ignore
    }

    const onCustomEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ userName?: string }>).detail
      startPortalSequence(detail?.userName || fallbackName || 'Friend')
    }
    window.addEventListener(PORTAL_EVENT_NAME, onCustomEvent)
    return () => window.removeEventListener(PORTAL_EVENT_NAME, onCustomEvent)
  }, [fallbackName, startPortalSequence])

  // 2.4-second portal sequence
  useEffect(() => {
    if (!portalUser) return
    const fadeTimer = window.setTimeout(() => setFadingOut(true), 1950)
    const doneTimer = window.setTimeout(() => {
      setPortalUser(null)
      setFadingOut(false)
    }, 2400)
    return () => {
      window.clearTimeout(fadeTimer)
      window.clearTimeout(doneTimer)
    }
  }, [portalUser])

  // 60fps Holographic Portal Rings & Starlight Motes Canvas
  useEffect(() => {
    if (!portalUser) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId = 0
    const dpr = getMaxDpr(2)
    const resize = () => {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const motes = Array.from({ length: 44 }, (_, i) => ({
      angle: (i / 44) * Math.PI * 2,
      dist: 18 + (i % 7) * 26,
      speed: 2.0 + (i % 4) * 0.75,
      rot: (i * 0.4) % (Math.PI * 2),
      color: i % 3 === 0 ? '#f3d9a4' : i % 2 === 0 ? '#7ec8b8' : '#e8a4b8',
      size: 4 + (i % 3) * 2.5,
    }))

    const start = performance.now()
    const frameInterval = getFrameIntervalMs(16.5)
    const mobile = isMobileRuntime()
    let lastDraw = 0
    const render = (now: number) => {
      if (document.hidden || now - lastDraw < frameInterval) {
        animId = window.requestAnimationFrame(render)
        return
      }
      lastDraw = now
      const elapsed = (now - start) / 1000
      const w = window.innerWidth
      const h = window.innerHeight
      const cx = w / 2
      const cy = h / 2

      ctx.clearRect(0, 0, w, h)

      // Expanding Bioluminescent Teal / Rose-Quartz / Gold Holographic Portal Rings
      for (let i = 0; i < 5; i++) {
        const progress = Math.min(1, Math.max(0, (elapsed - i * 0.13) / 1.95))
        const radius = 44 + progress * Math.max(w, h) * 0.58
        const alpha = Math.max(0, (1 - progress) * 0.62)
        ctx.save()
        ctx.strokeStyle =
          i % 3 === 0
            ? `rgba(243, 217, 164, ${alpha})`
            : i % 2 === 0
              ? `rgba(126, 200, 184, ${alpha})`
              : `rgba(232, 164, 184, ${alpha})`
        ctx.lineWidth = 2.5 + (1 - progress) * 4.5
        if (!mobile) {
          ctx.shadowColor = i % 2 === 0 ? '#7ec8b8' : '#e8a4b8'
          ctx.shadowBlur = 24
        }
        ctx.beginPath()
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }

      // Floating Starlight Motes & Petals
      for (const m of motes) {
        m.dist += m.speed * 2.2
        m.angle += 0.014
        m.rot += 0.03
        const x = cx + Math.cos(m.angle) * m.dist
        const y = cy + Math.sin(m.angle) * (m.dist * 0.78)
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(m.rot)
        ctx.fillStyle = m.color
        ctx.globalAlpha = 0.75
        if (!mobile) {
          ctx.shadowColor = m.color
          ctx.shadowBlur = 14
        }
        ctx.beginPath()
        ctx.ellipse(0, 0, m.size, m.size * 0.5, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      animId = window.requestAnimationFrame(render)
    }

    animId = window.requestAnimationFrame(render)
    return () => window.cancelAnimationFrame(animId)
  }, [portalUser])

  if (!portalUser) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed inset-0 z-[115] flex flex-col items-center justify-center overflow-hidden bg-[#060812]/92 backdrop-blur-xl transition-opacity duration-500 ${
        fadingOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#f3d9a4]/50 bg-[#7ec8b8]/15 shadow-[0_0_44px_rgba(126,200,184,0.5)]">
          <Sparkles size={26} className="animate-pulse text-[#f3d9a4]" />
        </div>
        <span className="eyebrow rounded-full border border-[#e8a4b8]/35 bg-[#e8a4b8]/10 px-3.5 py-1 text-[10px] tracking-[0.22em] text-[#f4d9e2]">
          LUMINA · HOLOGRAPHIC PORTAL AWAKENING
        </span>
        <h2 className="mt-4 font-serif text-3xl text-white sm:text-4xl">
          Opening LUMINA Sanctuary for <em className="text-[#f3d9a4]">{portalUser}</em>…
        </h2>
        <p className="mt-2 text-xs text-white/65">
          Synchronizing RaaOS Engine · 3D bioluminescent garden, acoustic rain studio, and Calm DNA.
        </p>
      </div>
    </div>
  )
}
