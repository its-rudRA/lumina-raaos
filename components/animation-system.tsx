'use client'

import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import Link from 'next/link'
import * as THREE from 'three'
import { useSanctuary } from '@/context/sanctuary-context'

// ---------------------------------------------------------------------------
// 1. <AnimeSkyWorld /> (AnimatedBackground + AuroraBackground + FloatingParticles)
//    60fps GPU-friendly Makoto Shinkai twilight sky, undulating aurora ribbons,
//    twinkling 4-point celestial stars, 3D-tumbling cherry blossom (sakura)
//    petals, and rising bioluminescent fireflies with mouse parallax.
// ---------------------------------------------------------------------------

export function AnimeSkyWorld({
  intensity = 'full',
  className = '',
}: {
  intensity?: 'full' | 'subtle'
  className?: string
}) {
  const { sensoryMode } = useSanctuary()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pointerRef = useRef<{ x: number; y: number; rawX: number; rawY: number }>({
    x: 0,
    y: 0,
    rawX: -999,
    rawY: -999,
  })
  const modeRef = useRef({ sensoryMode, intensity })

  useEffect(() => {
    modeRef.current = { sensoryMode, intensity }
  }, [sensoryMode, intensity])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    let animId = 0
    let isHidden = typeof document !== 'undefined' ? document.hidden : false
    const isMobileViewport =
      typeof window !== 'undefined' &&
      (window.innerWidth < 768 || /Android/i.test(navigator.userAgent))
    const dpr = isMobileViewport
      ? Math.min(window.devicePixelRatio || 1, 1.35)
      : Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const onMouseMove = (e: globalThis.MouseEvent) => {
      const w = Math.max(1, window.innerWidth)
      const h = Math.max(1, window.innerHeight)
      pointerRef.current = {
        x: (e.clientX / w - 0.5) * 2,
        y: (e.clientY / h - 0.5) * 2,
        rawX: e.clientX,
        rawY: e.clientY,
      }
    }
    window.addEventListener('mousemove', onMouseMove, { passive: true })

    const reducedQuery =
      typeof window !== 'undefined' && 'matchMedia' in window
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null

    const starCount = intensity === 'full' ? 88 : 54
    const stars = Array.from({ length: starCount }, (_, i) => ({
      xNorm: ((i * 73 + 19) % 1000) / 1000,
      yNorm: ((i * 41 + 7) % 1000) / 1000,
      size: i % 9 === 0 ? 2.2 : i % 3 === 0 ? 1.45 : 0.95,
      twinkleSpeed: 0.9 + (i % 7) * 0.35,
      phase: (i * 1.3) % (Math.PI * 2),
      depth: 0.25 + (i % 5) * 0.18,
      isFlare: i % 11 === 0,
      color:
        i % 4 === 0
          ? '#f7dfb2'
          : i % 3 === 0
            ? '#e8b8c7'
            : i % 2 === 0
              ? '#c5b4f0'
              : '#b8ebe0',
    }))

    const sakuraCount = intensity === 'full' ? 26 : 12
    const petals = Array.from({ length: sakuraCount }, (_, i) => ({
      x: ((i * 97) % 100) * 14,
      y: ((i * 61) % 100) * 9,
      vx: -0.35 - (i % 5) * 0.14,
      vy: 0.42 + (i % 4) * 0.16,
      size: 5.5 + (i % 4) * 2.1,
      rot: (i * 0.8) % (Math.PI * 2),
      rotSpeed: 0.012 + (i % 5) * 0.006,
      tumblingPhase: (i * 1.1) % (Math.PI * 2),
      alpha: 0.38 + (i % 4) * 0.14,
      hueShift: i % 3 === 0 ? '#f7cad8' : i % 2 === 0 ? '#eab1c6' : '#f3d9a4',
    }))

    const fireflyCount = intensity === 'full' ? 28 : 14
    const fireflies = Array.from({ length: fireflyCount }, (_, i) => ({
      x: ((i * 83) % 100) * 14,
      y: ((i * 53) % 100) * 9,
      vy: 0.32 + (i % 5) * 0.15,
      radius: 1.6 + (i % 3) * 0.85,
      phase: (i * 1.7) % (Math.PI * 2),
      color: i % 3 === 0 ? '#f3d9a4' : i % 2 === 0 ? '#7ec8b8' : '#e8a4b8',
    }))

    let shootingStar = {
      active: false,
      x: 0,
      y: 0,
      vx: -9,
      vy: 4.2,
      life: 0,
      nextSpawnAt: 3.5,
    }

    let smoothPx = 0
    let smoothPy = 0
    const start = performance.now()
    let lastFrameTime = performance.now()

    const drawScene = (now: number, isLow: boolean) => {
      const t = (now - start) / 1000
      const w = window.innerWidth
      const h = window.innerHeight
      const { sensoryMode: currentSensory, intensity: currentIntensity } = modeRef.current
      const isGentle = !isLow && currentSensory === 'gentle'
      const speedScale = isLow ? 0 : isGentle ? 0.45 : 1.0
      const alphaScale = currentIntensity === 'subtle' ? 0.68 : 1.0

      smoothPx += (pointerRef.current.x - smoothPx) * 0.045
      smoothPy += (pointerRef.current.y - smoothPy) * 0.045

      // 1. Makoto Shinkai Twilight Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h)
      skyGrad.addColorStop(0, '#050610')
      skyGrad.addColorStop(0.42, '#0c091c')
      skyGrad.addColorStop(0.78, '#161029')
      skyGrad.addColorStop(1, '#1d1430')
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, w, h)

      // Horizon nebula glow
      const horizonGlow = ctx.createRadialGradient(
        w * (0.5 + smoothPx * 0.03),
        h * (0.56 + smoothPy * 0.02),
        20,
        w * 0.5,
        h * 0.56,
        Math.max(w, h) * 0.68
      )
      horizonGlow.addColorStop(0, `rgba(232, 164, 184, ${0.15 * alphaScale})`)
      horizonGlow.addColorStop(0.38, `rgba(184, 164, 232, ${0.12 * alphaScale})`)
      horizonGlow.addColorStop(0.72, `rgba(126, 200, 184, ${0.07 * alphaScale})`)
      horizonGlow.addColorStop(1, 'rgba(5, 6, 16, 0)')
      ctx.fillStyle = horizonGlow
      ctx.fillRect(0, 0, w, h)

      // 2. Flowing Multi-Band Aurora Curtains
      if (!isLow) {
        const auroraBands = [
          { color: '184, 164, 232', yRatio: 0.24, amp: 34, speed: 0.35, alpha: 0.11 * alphaScale },
          { color: '232, 164, 184', yRatio: 0.36, amp: 28, speed: -0.28, alpha: 0.095 * alphaScale },
          { color: '126, 200, 184', yRatio: 0.48, amp: 24, speed: 0.22, alpha: 0.085 * alphaScale },
        ]
        for (let b = 0; b < auroraBands.length; b++) {
          const band = auroraBands[b]
          ctx.save()
          ctx.beginPath()
          const baseY = h * band.yRatio + smoothPy * (12 + b * 6)
          ctx.moveTo(0, baseY + 120)
          for (let x = 0; x <= w; x += 32) {
            const wave =
              Math.sin(x * 0.0032 + t * band.speed + b) * band.amp +
              Math.cos(x * 0.007 - t * band.speed * 0.8) * (band.amp * 0.5)
            ctx.lineTo(x, baseY + wave)
          }
          ctx.lineTo(w, baseY + 160)
          ctx.closePath()
          const aGrad = ctx.createLinearGradient(0, baseY - 50, 0, baseY + 150)
          aGrad.addColorStop(0, `rgba(${band.color}, 0)`)
          aGrad.addColorStop(0.45, `rgba(${band.color}, ${band.alpha})`)
          aGrad.addColorStop(1, `rgba(${band.color}, 0)`)
          ctx.fillStyle = aGrad
          ctx.fill()
          ctx.restore()
        }
      }

      // 3. Twinkling Celestial Starfield & Crisp 4-Point Shinkai Star Flares
      const activeStars = isLow ? Math.floor(stars.length * 0.4) : stars.length
      for (let i = 0; i < activeStars; i++) {
        const s = stars[i]
        const sx = ((s.xNorm * w - smoothPx * 22 * s.depth) % w + w) % w
        const sy = ((s.yNorm * h * 0.78 - smoothPy * 16 * s.depth) % (h * 0.82) + h * 0.82) % (h * 0.82)
        const twinkle = isLow
          ? 0.55
          : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.phase))

        ctx.save()
        ctx.globalAlpha = twinkle * alphaScale
        ctx.fillStyle = s.color
        ctx.beginPath()
        ctx.arc(sx, sy, s.size, 0, Math.PI * 2)
        ctx.fill()

        if (s.isFlare && !isLow && twinkle > 0.68) {
          const flareLen = s.size * 4.2 * twinkle
          ctx.strokeStyle = s.color
          ctx.lineWidth = 0.85
          ctx.beginPath()
          ctx.moveTo(sx - flareLen, sy)
          ctx.lineTo(sx + flareLen, sy)
          ctx.moveTo(sx, sy - flareLen)
          ctx.lineTo(sx, sy + flareLen)
          ctx.stroke()
        }
        ctx.restore()
      }

      // 4. Celestial Shooting Star (Full intensity only)
      if (!isLow && currentIntensity === 'full') {
        if (!shootingStar.active && t > shootingStar.nextSpawnAt) {
          shootingStar.active = true
          shootingStar.x = w * (0.55 + Math.sin(t) * 0.28)
          shootingStar.y = h * 0.12
          shootingStar.life = 1.0
        }
        if (shootingStar.active) {
          shootingStar.x += shootingStar.vx * speedScale
          shootingStar.y += shootingStar.vy * speedScale
          shootingStar.life -= 0.022 * speedScale
          if (shootingStar.life <= 0) {
            shootingStar.active = false
            shootingStar.nextSpawnAt = t + 6.5
          } else {
            ctx.save()
            const tailX = shootingStar.x - shootingStar.vx * 11
            const tailY = shootingStar.y - shootingStar.vy * 11
            const sGrad = ctx.createLinearGradient(shootingStar.x, shootingStar.y, tailX, tailY)
            sGrad.addColorStop(0, `rgba(247, 223, 178, ${shootingStar.life * 0.85})`)
            sGrad.addColorStop(0.4, `rgba(232, 164, 184, ${shootingStar.life * 0.45})`)
            sGrad.addColorStop(1, 'rgba(232, 164, 184, 0)')
            ctx.strokeStyle = sGrad
            ctx.lineWidth = 1.8
            ctx.beginPath()
            ctx.moveTo(shootingStar.x, shootingStar.y)
            ctx.lineTo(tailX, tailY)
            ctx.stroke()
            ctx.restore()
          }
        }
      }

      // 5. Crisp Rising Bioluminescent Fireflies (with gentle cursor attraction)
      if (!isLow) {
        for (let i = 0; i < fireflies.length; i++) {
          const f = fireflies[i]
          f.y -= f.vy * speedScale
          f.x += Math.sin(t * 0.9 + f.phase) * 0.42 * speedScale + smoothPx * 0.2
          if (f.y < -20) {
            f.y = h + 15
            f.x = ((i * 97 + Math.floor(t * 20)) % 100) * (w / 100)
          }
          if (f.x < -20) f.x = w + 15
          if (f.x > w + 20) f.x = -15

          const dx = pointerRef.current.rawX - f.x
          const dy = pointerRef.current.rawY - f.y
          const dist = Math.hypot(dx, dy)
          if (dist > 8 && dist < 180) {
            f.x += (dx / dist) * 0.35 * speedScale
            f.y += (dy / dist) * 0.35 * speedScale
          }

          const pulse = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 2.2 + f.phase))
          ctx.save()
          ctx.globalAlpha = pulse * 0.78 * alphaScale
          ctx.shadowBlur = 12
          ctx.shadowColor = f.color
          ctx.fillStyle = f.color
          ctx.beginPath()
          ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }
      }

      // 6. 3D-Tumbling Cherry Blossom (Sakura) Petals
      if (!isLow) {
        for (let i = 0; i < petals.length; i++) {
          const p = petals[i]
          p.x += (p.vx + Math.sin(t * 0.7 + p.tumblingPhase) * 0.28 + smoothPx * 0.35) * speedScale
          p.y += (p.vy + Math.cos(t * 0.9 + p.tumblingPhase) * 0.12) * speedScale
          p.rot += p.rotSpeed * speedScale

          if (p.y > h + 24) {
            p.y = -20
            p.x = ((i * 73 + Math.floor(t * 15)) % 100) * (w / 100)
          }
          if (p.x < -24) p.x = w + 20
          if (p.x > w + 24) p.x = -20

          const tumbleY = 0.35 + 0.65 * Math.abs(Math.cos(t * 1.6 + p.tumblingPhase))
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(p.rot)
          ctx.scale(1, tumbleY)
          ctx.globalAlpha = p.alpha * alphaScale
          ctx.fillStyle = p.hueShift
          ctx.shadowBlur = 8
          ctx.shadowColor = p.hueShift

          const s = p.size
          ctx.beginPath()
          ctx.moveTo(0, s)
          ctx.bezierCurveTo(s * 0.95, s * 0.45, s * 0.85, -s * 0.7, s * 0.2, -s)
          ctx.lineTo(0, -s * 0.72)
          ctx.lineTo(-s * 0.2, -s)
          ctx.bezierCurveTo(-s * 0.85, -s * 0.7, -s * 0.95, s * 0.45, 0, s)
          ctx.closePath()
          ctx.fill()
          ctx.restore()
        }
      }
    }

    const render = (now: number) => {
      if (isHidden) {
        animId = 0
        return
      }

      const { sensoryMode: currentSensory } = modeRef.current
      const isLow = currentSensory === 'low' || Boolean(reducedQuery?.matches)

      // In low stimulus mode or reduced motion, render single static twilight frame and stop continuous loop (0% idle GPU)
      if (isLow) {
        drawScene(now, true)
        animId = 0
        return
      }

      // Delta frame-pacing: 60 FPS (16.5ms) in full mode, 30 FPS (33ms) in gentle mode
      const frameInterval = currentSensory === 'gentle' ? 33 : 16.5
      const deltaSinceLast = now - lastFrameTime
      if (deltaSinceLast < frameInterval) {
        animId = window.requestAnimationFrame(render)
        return
      }
      lastFrameTime = now - (deltaSinceLast % frameInterval)

      animId = window.requestAnimationFrame(render)
      drawScene(now, false)
    }

    const onVisibility = () => {
      isHidden = document.hidden
      if (!isHidden && !animId) {
        const isLow = modeRef.current.sensoryMode === 'low' || Boolean(reducedQuery?.matches)
        if (!isLow) {
          lastFrameTime = performance.now()
          animId = window.requestAnimationFrame(render)
        }
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    animId = window.requestAnimationFrame(render)

    return () => {
      if (animId) window.cancelAnimationFrame(animId)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [intensity, sensoryMode])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-0 h-full w-full ${className}`}
    />
  )
}

export const AnimatedBackground = AnimeSkyWorld
export const AuroraBackground = AnimeSkyWorld
export const FloatingParticles = AnimeSkyWorld

// ---------------------------------------------------------------------------
// 2. <CelestialSanctuaryCore /> (GlowOrb — Real Three.js 3D Centerpiece)
//    Restored full Milestone 14 majestic proportions (256px / 216px / 140px),
//    camera z = 4.25, full sweeping astrolabe rings (up to 1.55), and lush
//    violet-rose aura glow with a wide edge feather so it never clips into a box.
// ---------------------------------------------------------------------------

function createPetalMeshGeometry(length = 0.62, width = 0.25, cup = 0.12): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, 12, 10, 0, Math.PI, 0, Math.PI * 0.55)
  const pos = geo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i)
    const vy = pos.getY(i)
    const vz = pos.getZ(i)
    const u = Math.max(0, Math.min(1, (vy + 0.25) / 1.25))
    const profile = Math.sin(u * Math.PI) * (1 - 0.18 * u)
    const sx = vx * width * profile
    const sy = u * length
    const sz = vz * cup * 0.45 + Math.pow(Math.sin(u * Math.PI), 1.2) * cup + Math.pow(u, 2.1) * 0.08
    pos.setXYZ(i, sx, sy, sz)
  }
  geo.computeVertexNormals()
  return geo
}

function createSoftHaloTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62)
    g.addColorStop(0, 'rgba(255, 245, 250, 0.72)')
    g.addColorStop(0.32, 'rgba(232, 164, 184, 0.36)')
    g.addColorStop(0.68, 'rgba(184, 164, 232, 0.14)')
    g.addColorStop(1, 'rgba(126, 200, 184, 0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

export function CelestialSanctuaryCore({
  size = 'lg',
  interactive = true,
  className = '',
}: {
  size?: 'lg' | 'md' | 'sm'
  interactive?: boolean
  className?: string
}) {
  const { sensoryMode } = useSanctuary()
  const mountRef = useRef<HTMLDivElement | null>(null)
  const pointerRef = useRef<{ x: number; y: number; hovered: boolean }>({
    x: 0,
    y: 0,
    hovered: false,
  })
  const sensoryRef = useRef(sensoryMode)

  useEffect(() => {
    sensoryRef.current = sensoryMode
  }, [sensoryMode])

  const pixelDim = size === 'lg' ? 256 : size === 'md' ? 216 : 140

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      })
    } catch {
      return
    }

    const isMobileViewport =
      typeof window !== 'undefined' &&
      (window.innerWidth < 768 || /Android/i.test(navigator.userAgent))
    const dpr = isMobileViewport
      ? Math.min(window.devicePixelRatio || 1, 1.5)
      : Math.min(window.devicePixelRatio || 1, 2)
    renderer.setPixelRatio(dpr)
    renderer.setSize(pixelDim, pixelDim)
    renderer.setClearColor(0x000000, 0)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.25
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50)
    camera.position.set(0, 0.32, 4.25)
    camera.lookAt(0, 0, 0)

    const geometries: THREE.BufferGeometry[] = []
    const materials: THREE.Material[] = []
    const textures: THREE.Texture[] = []
    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      geometries.push(g)
      return g
    }
    const trackMat = <T extends THREE.Material>(m: T): T => {
      materials.push(m)
      return m
    }

    const ambient = new THREE.AmbientLight(0xf6eaf8, 1.4)
    scene.add(ambient)

    const roseLight = new THREE.PointLight(0xe8a4b8, 3.8, 12)
    roseLight.position.set(2.2, 2.0, 2.8)
    scene.add(roseLight)

    const tealLight = new THREE.PointLight(0x7ec8b8, 3.2, 12)
    tealLight.position.set(-2.4, -1.5, 2.5)
    scene.add(tealLight)

    const goldLight = new THREE.PointLight(0xf3d9a4, 3.5, 12)
    goldLight.position.set(0, 2.6, 1.8)
    scene.add(goldLight)

    const rootGroup = new THREE.Group()
    rootGroup.rotation.x = 0.28
    scene.add(rootGroup)

    // Lush Halo Sprite behind the lotus
    const haloTex = createSoftHaloTexture()
    textures.push(haloTex)
    const haloMat = trackMat(
      new THREE.SpriteMaterial({
        map: haloTex,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )
    const haloSprite = new THREE.Sprite(haloMat)
    haloSprite.scale.set(3.1, 3.1, 1)
    rootGroup.add(haloSprite)

    // 1. Inner Crystalline Soul Pearl
    const pearlGeo = trackGeo(new THREE.IcosahedronGeometry(0.38, 3))
    const pearlMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xfff5fa,
        emissive: 0xe8a4b8,
        emissiveIntensity: 0.78,
        roughness: 0.14,
        metalness: 0.1,
        transmission: 0.65,
        transparent: true,
        opacity: 0.96,
      })
    )
    const pearlMesh = new THREE.Mesh(pearlGeo, pearlMat)
    pearlMesh.position.y = 0.06
    rootGroup.add(pearlMesh)

    // 2. Sculpted 3-Tier Celestial Lotus Chalice
    const lotusGroup = new THREE.Group()
    lotusGroup.position.y = -0.24
    rootGroup.add(lotusGroup)

    const outerPetalGeo = trackGeo(createPetalMeshGeometry(0.74, 0.29, 0.15))
    const midPetalGeo = trackGeo(createPetalMeshGeometry(0.6, 0.24, 0.12))
    const innerPetalGeo = trackGeo(createPetalMeshGeometry(0.46, 0.19, 0.1))

    const outerPetalMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xe8a4b8,
        emissive: 0xd98aa3,
        emissiveIntensity: 0.45,
        roughness: 0.22,
        metalness: 0.08,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
      })
    )
    const midPetalMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xc5b4f0,
        emissive: 0x9b86d6,
        emissiveIntensity: 0.48,
        roughness: 0.18,
        metalness: 0.1,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      })
    )
    const innerPetalMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xf7dfb2,
        emissive: 0xf3d9a4,
        emissiveIntensity: 0.62,
        roughness: 0.15,
        metalness: 0.15,
        transparent: true,
        opacity: 0.94,
        side: THREE.DoubleSide,
      })
    )

    const petalPivots: Array<{ mesh: THREE.Mesh; baseTilt: number; phase: number }> = []

    for (let i = 0; i < 10; i++) {
      const pivot = new THREE.Group()
      pivot.rotation.y = (i / 10) * Math.PI * 2
      const mesh = new THREE.Mesh(outerPetalGeo, outerPetalMat)
      mesh.rotation.x = 0.92
      pivot.add(mesh)
      lotusGroup.add(pivot)
      petalPivots.push({ mesh, baseTilt: 0.92, phase: i * 0.6 })
    }
    for (let i = 0; i < 8; i++) {
      const pivot = new THREE.Group()
      pivot.rotation.y = (i / 8) * Math.PI * 2 + 0.35
      const mesh = new THREE.Mesh(midPetalGeo, midPetalMat)
      mesh.rotation.x = 0.62
      pivot.add(mesh)
      lotusGroup.add(pivot)
      petalPivots.push({ mesh, baseTilt: 0.62, phase: i * 0.8 + 1.0 })
    }
    for (let i = 0; i < 6; i++) {
      const pivot = new THREE.Group()
      pivot.rotation.y = (i / 6) * Math.PI * 2 + 0.2
      const mesh = new THREE.Mesh(innerPetalGeo, innerPetalMat)
      mesh.rotation.x = 0.35
      pivot.add(mesh)
      lotusGroup.add(pivot)
      petalPivots.push({ mesh, baseTilt: 0.35, phase: i * 1.1 + 2.0 })
    }

    // 3. Three Counter-Rotating Sacred Astrolabe Gimbal Rings (Restored Milestone 14 Sweep)
    const ringGeo1 = trackGeo(new THREE.TorusGeometry(1.12, 0.012, 12, 72))
    const ringMat1 = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xf3d9a4,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
      })
    )
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1)
    ring1.rotation.x = Math.PI * 0.36
    rootGroup.add(ring1)

    const ringGeo2 = trackGeo(new THREE.TorusGeometry(1.36, 0.01, 12, 72))
    const ringMat2 = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x7ec8b8,
        transparent: true,
        opacity: 0.52,
        blending: THREE.AdditiveBlending,
      })
    )
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2)
    ring2.rotation.x = -Math.PI * 0.28
    ring2.rotation.y = Math.PI * 0.22
    rootGroup.add(ring2)

    const ringGeo3 = trackGeo(new THREE.TorusGeometry(1.55, 0.009, 12, 72))
    const ringMat3 = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xe8a4b8,
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
      })
    )
    const ring3 = new THREE.Mesh(ringGeo3, ringMat3)
    ring3.rotation.x = Math.PI * 0.45
    ring3.rotation.y = -Math.PI * 0.18
    rootGroup.add(ring3)

    // 4. Orbiting 3D Sakura Petals
    const orbitCount = 24
    const orbitGroup = new THREE.Group()
    rootGroup.add(orbitGroup)
    const orbitPetalsGeo = trackGeo(createPetalMeshGeometry(0.14, 0.08, 0.03))
    const orbitPetalsMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xf7cad8,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      })
    )
    const orbiters: Array<{
      mesh: THREE.Mesh
      radius: number
      angle: number
      speed: number
      yAmp: number
      phase: number
    }> = []

    for (let i = 0; i < orbitCount; i++) {
      const m = new THREE.Mesh(orbitPetalsGeo, orbitPetalsMat)
      const radius = 0.95 + (i % 4) * 0.16
      const angle = (i / orbitCount) * Math.PI * 2
      orbitGroup.add(m)
      orbiters.push({
        mesh: m,
        radius,
        angle,
        speed: 0.35 + (i % 4) * 0.12,
        yAmp: 0.24 + (i % 3) * 0.12,
        phase: i * 0.9,
      })
    }

    let animId = 0
    let isHidden = typeof document !== 'undefined' ? document.hidden : false
    let isIntersecting = true
    let lastFrameTime = performance.now()
    const clock = new THREE.Clock()
    let elapsed = 0
    const targetScaleVec = new THREE.Vector3(1, 1, 1)

    const animate = (now: number) => {
      if (isHidden || !isIntersecting) {
        animId = 0
        return
      }
      animId = window.requestAnimationFrame(animate)

      const isLow = sensoryRef.current === 'low'
      const isGentle = sensoryRef.current === 'gentle'
      // 60 FPS (16.5ms) in full mode, 30 FPS (33ms) in gentle/low mode
      const frameInterval = isLow || isGentle ? 33 : 16.5
      const deltaSinceLast = now - lastFrameTime
      if (deltaSinceLast < frameInterval) {
        return
      }
      lastFrameTime = now - (deltaSinceLast % frameInterval)

      const dt = Math.min(clock.getDelta(), 0.05)
      const speed = isLow ? 0.12 : isGentle ? 0.55 : 1.0
      elapsed += dt * speed

      const hoverBoost = pointerRef.current.hovered ? 1.07 : 1.0
      const breath = (1 + Math.sin(elapsed * 1.6) * 0.045) * hoverBoost

      const targetRotY = pointerRef.current.x * 0.45 + elapsed * 0.22
      const targetRotX = 0.28 + pointerRef.current.y * 0.28
      rootGroup.rotation.y += (targetRotY - rootGroup.rotation.y) * 0.08
      rootGroup.rotation.x += (targetRotX - rootGroup.rotation.x) * 0.08
      targetScaleVec.set(breath, breath, breath)
      rootGroup.scale.lerp(targetScaleVec, 0.08)

      roseLight.position.x = 2.2 + pointerRef.current.x * 1.5
      roseLight.position.y = 2.0 - pointerRef.current.y * 1.5

      pearlMesh.rotation.y = -elapsed * 0.55
      pearlMesh.rotation.z = elapsed * 0.32
      pearlMat.emissiveIntensity =
        0.72 + Math.sin(elapsed * 2.4) * 0.22 + (pointerRef.current.hovered ? 0.25 : 0)

      for (let i = 0; i < petalPivots.length; i++) {
        const p = petalPivots[i]
        p.mesh.rotation.x =
          p.baseTilt +
          Math.sin(elapsed * 1.5 + p.phase) * 0.08 +
          (pointerRef.current.hovered ? 0.08 : 0)
      }

      ring1.rotation.z = elapsed * 0.45
      ring2.rotation.z = -elapsed * 0.34
      ring2.rotation.x = -Math.PI * 0.28 + Math.sin(elapsed * 0.8) * 0.1
      ring3.rotation.z = elapsed * 0.24

      for (let i = 0; i < orbiters.length; i++) {
        const o = orbiters[i]
        const a = o.angle + elapsed * o.speed
        o.mesh.position.set(
          Math.cos(a) * o.radius,
          Math.sin(elapsed * 1.4 + o.phase) * o.yAmp,
          Math.sin(a) * o.radius
        )
        o.mesh.rotation.set(elapsed * 1.1 + o.phase, a, Math.sin(elapsed + o.phase) * 0.5)
      }

      renderer.render(scene, camera)
    }

    const onVisibility = () => {
      isHidden = document.hidden
      if (!isHidden && isIntersecting) {
        clock.getDelta()
        lastFrameTime = performance.now()
        if (!animId) animId = window.requestAnimationFrame(animate)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0]
        isIntersecting = entry ? entry.isIntersecting : true
        if (isIntersecting && !animId && !isHidden) {
          clock.getDelta()
          lastFrameTime = performance.now()
          animId = window.requestAnimationFrame(animate)
        } else if (!isIntersecting && animId) {
          window.cancelAnimationFrame(animId)
          animId = 0
        }
      },
      { threshold: 0.05 }
    )
    observer.observe(container)

    animId = window.requestAnimationFrame(animate)

    return () => {
      if (animId) window.cancelAnimationFrame(animId)
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      geometries.forEach(g => g.dispose())
      materials.forEach(m => m.dispose())
      textures.forEach(t => t.dispose())
      renderer.dispose()
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [pixelDim])

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!interactive) return
    const rect = e.currentTarget.getBoundingClientRect()
    const nx = ((e.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2
    const ny = ((e.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2
    pointerRef.current = {
      x: Math.max(-1, Math.min(1, nx)),
      y: Math.max(-1, Math.min(1, ny)),
      hovered: true,
    }
  }

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerEnter={() => {
        if (interactive) pointerRef.current.hovered = true
      }}
      onPointerLeave={() => {
        pointerRef.current = { x: 0, y: 0, hovered: false }
      }}
      style={{ width: pixelDim, height: pixelDim }}
      className={`relative mx-auto flex shrink-0 items-center justify-center overflow-visible select-none ${
        interactive ? 'cursor-grab active:cursor-grabbing' : ''
      } ${className}`}
      aria-hidden="true"
    >
      {/* Lush dreamy violet-rose ambient aura glow behind the 3D Lotus */}
      <div
        className="pointer-events-none absolute inset-3 rounded-full blur-2xl"
        style={{
          background:
            'radial-gradient(circle, rgba(232,164,184,0.34) 0%, rgba(184,164,232,0.22) 48%, rgba(126,200,184,0.08) 72%, transparent 100%)',
        }}
      />
      <div
        ref={mountRef}
        style={{
          WebkitMaskImage: 'radial-gradient(circle, black 64%, transparent 98%)',
          maskImage: 'radial-gradient(circle, black 64%, transparent 98%)',
        }}
        className="relative z-10 h-full w-full"
      />
    </div>
  )
}

export const GlowOrb = CelestialSanctuaryCore

// ---------------------------------------------------------------------------
// 3. <MagicalButton />
//    Anime-fantasy interactive CTA button with diagonal shimmer sheen,
//    glowing border, scale physics, and a 12-particle sakura/starlight burst.
// ---------------------------------------------------------------------------

interface BurstSpark {
  id: number
  dx: number
  dy: number
  color: string
}

export function MagicalButton({
  variant = 'primary',
  href,
  children,
  className = '',
  onClick,
  disabled,
  type = 'button',
  ...rest
}: {
  variant?: 'primary' | 'glass' | 'ghost'
  href?: string
  children: ReactNode
  className?: string
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const [sparks, setSparks] = useState<BurstSpark[]>([])

  function triggerParticleBurst(e: MouseEvent<HTMLElement>) {
    const colors = ['#f3d9a4', '#e8a4b8', '#7ec8b8', '#c5b4f0']
    const batch: BurstSpark[] = Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2 + (i % 2) * 0.2
      const dist = 26 + (i % 3) * 14
      return {
        id: Date.now() + i,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        color: colors[i % colors.length],
      }
    })
    setSparks(batch)
    window.setTimeout(() => setSparks([]), 600)
    if (onClick) {
      onClick(e as MouseEvent<HTMLButtonElement>)
    }
  }

  const baseStyles =
    'group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-medium transition-all duration-300 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f3d9a4]/70 disabled:pointer-events-none disabled:opacity-45'

  const variantStyles =
    variant === 'primary'
      ? 'border border-[#f7dfb2]/55 bg-gradient-to-r from-[#e8b8c7] via-[#d9c2e8] to-[#f3d9a4] px-6 py-3.5 text-sm font-semibold text-[#16101e] shadow-[0_8px_32px_rgba(232,164,184,0.34),0_0_20px_rgba(243,217,164,0.22)] hover:scale-[1.025] hover:shadow-[0_12px_40px_rgba(232,164,184,0.5),0_0_28px_rgba(243,217,164,0.4)] active:scale-[0.98]'
      : variant === 'glass'
        ? 'border border-white/20 bg-[#1a1333]/68 px-6 py-3.5 text-sm text-white backdrop-blur-xl shadow-[0_8px_28px_rgba(10,6,24,0.32),inset_0_1px_0_rgba(255,255,255,0.14)] hover:scale-[1.02] hover:border-[#e8a4b8]/55 hover:bg-[#231942]/78 hover:text-white hover:shadow-[0_0_28px_rgba(232,164,184,0.28)] active:scale-[0.98]'
        : 'px-4 py-2 text-sm text-[#f0ecfa] hover:text-white active:scale-[0.98]'

  const innerContent = (
    <>
      {variant !== 'ghost' && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -translate-x-[150%] skew-x-[-22deg] bg-gradient-to-r from-transparent via-white/45 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[380%]"
        />
      )}

      {sparks.length > 0 && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center">
          {sparks.map(sp => (
            <span
              key={sp.id}
              className="absolute h-1.5 w-1.5 rounded-full transition-all duration-500 ease-out"
              style={{
                backgroundColor: sp.color,
                boxShadow: `0 0 8px ${sp.color}`,
                transform: `translate(${sp.dx}px, ${sp.dy}px) scale(0.2)`,
                opacity: 0,
              }}
            />
          ))}
        </span>
      )}

      <span className="relative z-10 inline-flex items-center justify-center gap-2">
        {children}
      </span>
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        onClick={e => triggerParticleBurst(e)}
        className={`${baseStyles} ${variantStyles} ${className}`}
      >
        {innerContent}
      </Link>
    )
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={e => triggerParticleBurst(e)}
      className={`${baseStyles} ${variantStyles} ${className}`}
      {...rest}
    >
      {innerContent}
    </button>
  )
}

// ---------------------------------------------------------------------------
// 4. <StaggeredContainer />, <StaggeredItem />, <TiltGlassCard />, <BreathingAnimation />
//    Restored translucent plum-violet frosted glassmorphism (bg-[#16112b]/68)
//    with rAF-throttled 3D tilt and crisp text readability.
// ---------------------------------------------------------------------------

export function StaggeredContainer({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={className}>{children}</div>
}

export function StaggeredItem({
  children,
  index = 0,
  baseDelayMs = 60,
  stepMs = 80,
  className = '',
}: {
  children: ReactNode
  index?: number
  baseDelayMs?: number
  stepMs?: number
  className?: string
}) {
  return (
    <div
      className={`lumina-stagger-item ${className}`}
      style={{
        animationDelay: `${baseDelayMs + index * stepMs}ms`,
      }}
    >
      {children}
    </div>
  )
}

export function TiltGlassCard({
  children,
  className = '',
  maxTiltDeg = 4,
}: {
  children: ReactNode
  className?: string
  maxTiltDeg?: number
}) {
  const cardRef = useRef<HTMLDivElement | null>(null)
  const glowRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number>(0)

  function handleMove(e: PointerEvent<HTMLDivElement>) {
    const el = cardRef.current
    const glow = glowRef.current
    if (!el || !glow) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / Math.max(1, r.width)
    const py = (e.clientY - r.top) / Math.max(1, r.height)
    const rx = (0.5 - py) * maxTiltDeg * 2
    const ry = (px - 0.5) * maxTiltDeg * 2
    const gx = px * 100
    const gy = py * 100

    if (rafRef.current) window.cancelAnimationFrame(rafRef.current)
    rafRef.current = window.requestAnimationFrame(() => {
      el.style.transform = `perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-1.5px)`
      glow.style.opacity = '1'
      glow.style.background = `radial-gradient(340px circle at ${gx.toFixed(1)}% ${gy.toFixed(1)}%, rgba(232, 164, 184, 0.18), rgba(126, 200, 184, 0.08) 45%, transparent 80%)`
    })
  }

  function handleLeave() {
    if (rafRef.current) window.cancelAnimationFrame(rafRef.current)
    const el = cardRef.current
    const glow = glowRef.current
    if (el) {
      el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)'
    }
    if (glow) {
      glow.style.opacity = '0'
    }
  }

  return (
    <div
      ref={cardRef}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      style={{
        willChange: 'transform',
        transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 300ms ease',
      }}
      className={`relative overflow-hidden rounded-[26px] border border-white/15 bg-[#16112b]/68 backdrop-blur-xl shadow-[0_24px_80px_rgba(6,4,18,0.45),inset_0_1px_0_rgba(255,255,255,0.12)] ${className}`}
    >
      <div
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  )
}

export function BreathingAnimation({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`transition-transform duration-1000 ${className}`}
      style={{ animation: 'luminaBreathe 5.5s ease-in-out infinite' }}
    >
      {children}
    </div>
  )
}
