'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { CheckInRecord } from '@/lib/db'

export interface SanctuarySceneProps {
  tab: 'aura' | 'garden'
  orb: { x: number; y: number }
  setOrb: (v: { x: number; y: number }) => void
  aura: { label: string; color: string; note: string }
  blooms: number
  checkIns: CheckInRecord[]
  rainPlaying: boolean
  immersive: boolean
}

const MAX_LOTUSES = 24
const PARTICLE_COUNT = 120
const LANTERN_COUNT = 8

function colorForAuraLabel(label?: string, index = 0): number {
  if (label === 'Wired & Overthinking') return 0xe7a9bd
  if (label === 'Quietly Heavy') return 0x9584bf
  if (label === 'Softly Grounded') return 0x8ec9bd
  const palette = [0xe7a9bd, 0x8ec9bd, 0xb8a4d9]
  return palette[index % palette.length]
}

export function SanctuaryScene({
  tab,
  orb,
  setOrb,
  aura,
  blooms,
  checkIns,
  rainPlaying,
  immersive,
}: SanctuarySceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Live mutable refs so the 60fps WebGL loop reads fresh React props without recreating the WebGL context
  const liveRef = useRef({
    tab,
    orb,
    auraColor: aura.color,
    blooms: Math.max(blooms, checkIns.length),
    checkIns,
    rainPlaying,
    immersive,
    pointerParallax: { x: 0, y: 0 },
  })

  useEffect(() => {
    liveRef.current.tab = tab
    liveRef.current.orb = orb
    liveRef.current.auraColor = aura.color
    liveRef.current.blooms = Math.max(blooms, checkIns.length)
    liveRef.current.checkIns = checkIns
    liveRef.current.rainPlaying = rainPlaying
    liveRef.current.immersive = immersive
  }, [tab, orb, aura.color, blooms, checkIns, rainPlaying, immersive])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth || 640
    const height = container.clientHeight || 420

    // 1. Scene, Fog, Camera & Renderer
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x090712, 0.045)

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 100)
    camera.position.set(0, 0.85, 6.2)
    const currentLookAt = new THREE.Vector3(0, 0.1, 0)
    const targetLookAt = new THREE.Vector3(0, 0.1, 0)
    const targetCamPos = new THREE.Vector3(0, 0.85, 6.2)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(width, height)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    // Disposables tracker for zero memory leaks
    const geometries: THREE.BufferGeometry[] = []
    const materials: THREE.Material[] = []
    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      geometries.push(g)
      return g
    }
    const trackMat = <T extends THREE.Material>(m: T): T => {
      materials.push(m)
      return m
    }

    // Lights: Ambient moonlight + hemisphere + dynamic Aura point light + rim light
    const ambientLight = new THREE.AmbientLight(0x28233d, 1.35)
    scene.add(ambientLight)

    const hemiLight = new THREE.HemisphereLight(0x8ec9bd, 0x120d1d, 0.9)
    scene.add(hemiLight)

    const auraLight = new THREE.PointLight(new THREE.Color(liveRef.current.auraColor), 5.2, 18, 1.4)
    auraLight.position.set(0, 0.8, 1.5)
    scene.add(auraLight)

    const moonRimLight = new THREE.DirectionalLight(0xdcccf0, 0.9)
    moonRimLight.position.set(-5, 8, -4)
    scene.add(moonRimLight)

    // 2. Reflective Sanctuary Water Plane (y = -1.6)
    const waterGeo = trackGeo(new THREE.PlaneGeometry(36, 36, 64, 64))
    waterGeo.rotateX(-Math.PI / 2)
    const waterBasePositions = new Float32Array(
      (waterGeo.attributes.position as THREE.BufferAttribute).array
    )
    const waterMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x101c24,
        emissive: 0x091118,
        emissiveIntensity: 0.45,
        roughness: 0.18,
        metalness: 0.78,
        transparent: true,
        opacity: 0.92,
      })
    )
    const waterMesh = new THREE.Mesh(waterGeo, waterMat)
    waterMesh.position.y = -1.6
    scene.add(waterMesh)

    // Subtle glowing ripple rings beneath the core on the water surface
    const rippleRingGeo = trackGeo(new THREE.RingGeometry(0.65, 0.72, 48))
    rippleRingGeo.rotateX(-Math.PI / 2)
    const rippleRingMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(liveRef.current.auraColor),
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      })
    )
    const rippleRing = new THREE.Mesh(rippleRingGeo, rippleRingMat)
    rippleRing.position.set(0, -1.55, 0)
    scene.add(rippleRing)

    // 3. The 3D Morphing Aura Core + Soft Outer Glow Halo
    const coreGroup = new THREE.Group()
    scene.add(coreGroup)

    const coreGeo = trackGeo(new THREE.IcosahedronGeometry(1.15, 32))
    const coreBasePositions = new Float32Array(
      (coreGeo.attributes.position as THREE.BufferAttribute).array
    )
    const coreMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(liveRef.current.auraColor),
        emissive: new THREE.Color(liveRef.current.auraColor),
        emissiveIntensity: 0.65,
        roughness: 0.18,
        metalness: 0.12,
        transmission: 0.45,
        thickness: 1.2,
        clearcoat: 1,
        clearcoatRoughness: 0.15,
      })
    )
    const coreMesh = new THREE.Mesh(coreGeo, coreMat)
    coreGroup.add(coreMesh)

    const haloGeo = trackGeo(new THREE.SphereGeometry(1.58, 32, 32))
    const haloMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(liveRef.current.auraColor),
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
      })
    )
    const haloMesh = new THREE.Mesh(haloGeo, haloMat)
    coreGroup.add(haloMesh)

    // Inner orbital silk ring around the Aura Core
    const orbitRingGeo = trackGeo(new THREE.TorusGeometry(1.42, 0.015, 16, 80))
    const orbitRingMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
      })
    )
    const orbitRing = new THREE.Mesh(orbitRingGeo, orbitRingMat)
    orbitRing.rotation.x = Math.PI / 2.6
    coreGroup.add(orbitRing)

    // 4. 3D Bioluminescent Inner Garden (Up to 24 Procedural Lotus Blooms on Water)
    const gardenGroup = new THREE.Group()
    scene.add(gardenGroup)

    const padGeo = trackGeo(new THREE.CylinderGeometry(0.46, 0.42, 0.03, 24))
    const outerPetalGeo = trackGeo(new THREE.ConeGeometry(0.14, 0.42, 7))
    outerPetalGeo.translate(0, 0.21, 0)
    const innerPetalGeo = trackGeo(new THREE.ConeGeometry(0.11, 0.34, 7))
    innerPetalGeo.translate(0, 0.17, 0)
    const heartGeo = trackGeo(new THREE.SphereGeometry(0.13, 14, 14))

    const padMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x1d3b38,
        emissive: 0x0b1f1d,
        roughness: 0.65,
        metalness: 0.1,
      })
    )

    interface LotusEntry {
      group: THREE.Group
      petalMat: THREE.MeshStandardMaterial
      heartMat: THREE.MeshBasicMaterial
      baseX: number
      baseZ: number
      phase: number
      currentScale: number
    }

    const lotuses: LotusEntry[] = []
    for (let i = 0; i < MAX_LOTUSES; i++) {
      // Golden-angle spiral archipelago around the sanctuary pond
      const angle = i * 2.39996 + 0.4
      const radius = 1.9 + Math.sqrt(i) * 1.38
      const baseX = Math.cos(angle) * radius
      const baseZ = Math.sin(angle) * (radius * 0.78) - 0.6

      const lotusGroup = new THREE.Group()
      lotusGroup.position.set(baseX, -1.56, baseZ)

      const pad = new THREE.Mesh(padGeo, padMat)
      lotusGroup.add(pad)

      const tintHex = colorForAuraLabel(liveRef.current.checkIns[i]?.auraLabel, i)
      const petalMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: tintHex,
          emissive: tintHex,
          emissiveIntensity: 0.55,
          roughness: 0.3,
          metalness: 0.1,
        })
      )

      // 8 outer petals
      for (let p = 0; p < 8; p++) {
        const pAngle = (p / 8) * Math.PI * 2
        const petalPivot = new THREE.Group()
        petalPivot.rotation.y = pAngle
        const petal = new THREE.Mesh(outerPetalGeo, petalMat)
        petal.rotation.z = 0.72
        petalPivot.add(petal)
        lotusGroup.add(petalPivot)
      }

      // 6 inner petals
      for (let p = 0; p < 6; p++) {
        const pAngle = (p / 6) * Math.PI * 2 + 0.4
        const petalPivot = new THREE.Group()
        petalPivot.rotation.y = pAngle
        const petal = new THREE.Mesh(innerPetalGeo, petalMat)
        petal.rotation.z = 0.38
        petalPivot.add(petal)
        lotusGroup.add(petalPivot)
      }

      const heartMat = trackMat(
        new THREE.MeshBasicMaterial({
          color: 0xf7e3b5,
        })
      )
      const heart = new THREE.Mesh(heartGeo, heartMat)
      heart.position.y = 0.1
      lotusGroup.add(heart)

      lotusGroup.scale.setScalar(0.001)
      lotusGroup.visible = false
      gardenGroup.add(lotusGroup)

      lotuses.push({
        group: lotusGroup,
        petalMat,
        heartMat,
        baseX,
        baseZ,
        phase: i * 0.77,
        currentScale: 0.001,
      })
    }

    // Floating Warm Spirit Lanterns (#e6c88d)
    const lanternGeo = trackGeo(new THREE.OctahedronGeometry(0.18, 2))
    const lanternGlowGeo = trackGeo(new THREE.SphereGeometry(0.34, 16, 16))
    const lanternMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xe6c88d,
      })
    )
    const lanternGlowMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xe6c88d,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
      })
    )

    interface LanternEntry {
      group: THREE.Group
      baseX: number
      baseY: number
      baseZ: number
      phase: number
    }
    const lanterns: LanternEntry[] = []
    for (let i = 0; i < LANTERN_COUNT; i++) {
      const lGroup = new THREE.Group()
      const core = new THREE.Mesh(lanternGeo, lanternMat)
      const glow = new THREE.Mesh(lanternGlowGeo, lanternGlowMat)
      lGroup.add(core)
      lGroup.add(glow)

      const angle = (i / LANTERN_COUNT) * Math.PI * 2 + 0.3
      const radius = 3.6 + (i % 3) * 1.4
      const baseX = Math.cos(angle) * radius
      const baseY = 0.9 + (i % 4) * 0.55
      const baseZ = Math.sin(angle) * radius - 1.5

      lGroup.position.set(baseX, baseY, baseZ)
      scene.add(lGroup)
      lanterns.push({ group: lGroup, baseX, baseY, baseZ, phase: i * 1.13 })
    }

    // 120 Bioluminescent Firefly / Rain Starlight Particles
    const particlePositions = new Float32Array(PARTICLE_COUNT * 3)
    const particleColors = new Float32Array(PARTICLE_COUNT * 3)
    const particleSeeds = new Float32Array(PARTICLE_COUNT)

    const cRose = new THREE.Color(0xe7a9bd)
    const cTeal = new THREE.Color(0x8ec9bd)
    const cGold = new THREE.Color(0xe6c88d)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 18
      particlePositions[i * 3 + 1] = -1.4 + Math.random() * 5.8
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 14 - 1
      particleSeeds[i] = Math.random() * Math.PI * 2

      const pick = i % 3 === 0 ? cRose : i % 3 === 1 ? cTeal : cGold
      particleColors[i * 3] = pick.r
      particleColors[i * 3 + 1] = pick.g
      particleColors[i * 3 + 2] = pick.b
    }

    const particleGeo = trackGeo(new THREE.BufferGeometry())
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3))

    const particleMat = trackMat(
      new THREE.PointsMaterial({
        size: 0.085,
        vertexColors: true,
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )
    const particles = new THREE.Points(particleGeo, particleMat)
    scene.add(particles)

    // 5. Animation Loop (60fps procedural water, morphing core, blooms, camera choreography)
    let frameId = 0
    const clock = new THREE.Clock()
    const tempColor = new THREE.Color()

    const animate = () => {
      frameId = window.requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()
      const state = liveRef.current

      // Smoothly lerp Aura color across core, halo, ripple, and point light
      tempColor.set(state.auraColor)
      coreMat.color.lerp(tempColor, 0.06)
      coreMat.emissive.lerp(tempColor, 0.06)
      haloMat.color.lerp(tempColor, 0.06)
      rippleRingMat.color.lerp(tempColor, 0.06)
      auraLight.color.lerp(tempColor, 0.06)

      // Map orb.x [8..92] and orb.y [12..88] to 3D space
      const normX = (state.orb.x - 50) / 42 // [-1 .. 1]
      const normY = (50 - state.orb.y) / 38 // [-1 .. 1]

      const targetCoreX = state.tab === 'aura' ? normX * 2.15 : 0
      const targetCoreY =
        state.tab === 'aura'
          ? 0.25 + normY * 0.95 + Math.sin(elapsed * 1.6) * 0.08
          : 0.75 + Math.sin(elapsed * 1.2) * 0.14
      const targetCoreZ = state.tab === 'aura' ? 0.4 : -1.2
      const targetCoreScale = state.tab === 'aura' ? 1.0 : 0.62

      coreGroup.position.x += (targetCoreX - coreGroup.position.x) * 0.08
      coreGroup.position.y += (targetCoreY - coreGroup.position.y) * 0.08
      coreGroup.position.z += (targetCoreZ - coreGroup.position.z) * 0.08
      const nextScale = coreGroup.scale.x + (targetCoreScale - coreGroup.scale.x) * 0.07
      coreGroup.scale.setScalar(nextScale)

      auraLight.position.set(
        coreGroup.position.x,
        coreGroup.position.y + 0.5,
        coreGroup.position.z + 1.1
      )
      rippleRing.position.x = coreGroup.position.x
      rippleRing.position.z = coreGroup.position.z
      const rippleScale = 1 + Math.sin(elapsed * 2.1) * 0.18
      rippleRing.scale.setScalar(rippleScale)
      rippleRingMat.opacity = state.tab === 'aura' ? 0.28 : 0.14

      // Morphing 3D Aura Core vertex displacement driven by orb.x (energy) and orb.y (tension)
      const energySpeed = 1.1 + (state.orb.x / 100) * 2.2
      const displacementAmp = 0.06 + ((100 - state.orb.y) / 100) * 0.11
      const corePosAttr = coreGeo.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < corePosAttr.count; i++) {
        const ix = i * 3
        const bx = coreBasePositions[ix]
        const by = coreBasePositions[ix + 1]
        const bz = coreBasePositions[ix + 2]

        const wave =
          Math.sin(bx * 2.6 + elapsed * energySpeed) *
          Math.cos(by * 2.6 + elapsed * (energySpeed * 0.85)) *
          Math.sin(bz * 2.6 + elapsed * 0.9)
        const scale = 1 + wave * displacementAmp
        corePosAttr.setXYZ(i, bx * scale, by * scale, bz * scale)
      }
      corePosAttr.needsUpdate = true
      coreGeo.computeVertexNormals()

      coreMesh.rotation.y = elapsed * 0.22
      coreMesh.rotation.x = Math.sin(elapsed * 0.35) * 0.18
      orbitRing.rotation.z = elapsed * 0.35
      orbitRing.rotation.y = Math.cos(elapsed * 0.4) * 0.25

      // Undulating Reflective Sanctuary Water Plane
      const waterPosAttr = waterGeo.attributes.position as THREE.BufferAttribute
      const rainBoost = state.rainPlaying ? 1.85 : 1.0
      for (let i = 0; i < waterPosAttr.count; i++) {
        const ix = i * 3
        const wx = waterBasePositions[ix]
        const wz = waterBasePositions[ix + 2]
        const distFromCore = Math.hypot(wx - coreGroup.position.x, wz - coreGroup.position.z)
        const swell =
          Math.sin(wx * 0.55 + elapsed * 1.15) * 0.055 +
          Math.cos(wz * 0.65 + elapsed * 0.95) * 0.045 +
          Math.sin(distFromCore * 2.4 - elapsed * 2.6 * rainBoost) * 0.025 * rainBoost
        waterPosAttr.setY(i, swell)
      }
      waterPosAttr.needsUpdate = true
      waterGeo.computeVertexNormals()

      // Update 3D Bioluminescent Lotus Blooms
      const activeBlooms = Math.min(MAX_LOTUSES, Math.max(1, state.blooms))
      for (let i = 0; i < MAX_LOTUSES; i++) {
        const lotus = lotuses[i]
        const isVisible = i < activeBlooms
        const targetLotusScale = isVisible ? 1 : 0.001
        lotus.currentScale += (targetLotusScale - lotus.currentScale) * 0.06
        lotus.group.visible = lotus.currentScale > 0.01
        if (lotus.group.visible) {
          lotus.group.scale.setScalar(lotus.currentScale)
          lotus.group.position.y =
            -1.55 + Math.sin(elapsed * 1.4 + lotus.phase) * 0.045
          lotus.group.rotation.y = elapsed * 0.12 + lotus.phase

          const checkInAura = state.checkIns[i]?.auraLabel
          if (checkInAura) {
            tempColor.setHex(colorForAuraLabel(checkInAura, i))
            lotus.petalMat.color.lerp(tempColor, 0.05)
            lotus.petalMat.emissive.lerp(tempColor, 0.05)
          }
        }
      }

      // Update Floating Spirit Lanterns
      for (let i = 0; i < lanterns.length; i++) {
        const l = lanterns[i]
        l.group.position.y = l.baseY + Math.sin(elapsed * 0.9 + l.phase) * 0.22
        l.group.position.x = l.baseX + Math.cos(elapsed * 0.45 + l.phase) * 0.18
        l.group.rotation.y = elapsed * 0.4 + l.phase
      }

      // Update Bioluminescent Particles (Rising fireflies or gentle luminous rain)
      const pAttr = particleGeo.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        let py = pAttr.getY(i)
        let px = pAttr.getX(i)
        if (state.rainPlaying) {
          py -= 0.065
          if (py < -1.55) py = 4.4
        } else {
          py += 0.008
          px += Math.sin(elapsed * 0.6 + particleSeeds[i]) * 0.003
          if (py > 4.4) py = -1.5
        }
        pAttr.setX(i, px)
        pAttr.setY(i, py)
      }
      pAttr.needsUpdate = true

      // Smooth Camera Choreography between 'aura' and 'garden' + pointer parallax
      const px = state.pointerParallax.x
      const py = state.pointerParallax.y
      if (state.tab === 'aura') {
        targetCamPos.set(px * 0.55, 0.55 + py * 0.35, state.immersive ? 5.1 : 5.65)
        targetLookAt.set(
          coreGroup.position.x * 0.35,
          coreGroup.position.y * 0.45 - 0.1,
          0
        )
      } else {
        const orbitAngle = Math.sin(elapsed * 0.16) * 0.42 + px * 0.45
        const camRadius = state.immersive ? 7.6 : 8.4
        targetCamPos.set(
          Math.sin(orbitAngle) * camRadius,
          1.65 + py * 0.45,
          Math.cos(orbitAngle) * camRadius
        )
        targetLookAt.set(0, -0.55, -0.6)
      }

      camera.position.lerp(targetCamPos, 0.045)
      currentLookAt.lerp(targetLookAt, 0.06)
      camera.lookAt(currentLookAt)

      renderer.render(scene, camera)
    }

    frameId = window.requestAnimationFrame(animate)

    // 6. Responsive ResizeObserver for Seamless Normal <-> Immersive Transitions
    const handleResize = () => {
      if (!container) return
      const w = container.clientWidth || 640
      const h = container.clientHeight || 420
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)
    window.addEventListener('resize', handleResize)

    return () => {
      window.cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleResize)
      geometries.forEach(g => g.dispose())
      materials.forEach(m => m.dispose())
      renderer.dispose()
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  const updateOrbFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const relX = (e.clientX - r.left) / r.width
    const relY = (e.clientY - r.top) / r.height

    liveRef.current.pointerParallax = {
      x: (relX - 0.5) * 2,
      y: (0.5 - relY) * 2,
    }

    if (tab === 'aura') {
      setOrb({
        x: Math.max(8, Math.min(92, relX * 100)),
        y: Math.max(12, Math.min(88, relY * 100)),
      })
    }
  }

  return (
    <div
      onPointerDown={ e => {
        if (tab === 'aura') updateOrbFromPointer(e)
      }}
      onPointerMove={e => {
        if (e.buttons === 1 && tab === 'aura') {
          updateOrbFromPointer(e)
        } else {
          const r = e.currentTarget.getBoundingClientRect()
          liveRef.current.pointerParallax = {
            x: ((e.clientX - r.left) / r.width - 0.5) * 2,
            y: (0.5 - (e.clientY - r.top) / r.height) * 2,
          }
        }
      }}
      onPointerLeave={() => {
        liveRef.current.pointerParallax = { x: 0, y: 0 }
      }}
      className={`relative w-full select-none overflow-hidden rounded-[20px] border border-white/[0.1] bg-[radial-gradient(circle_at_50%_25%,rgba(142,201,189,0.14),rgba(9,7,18,0.92)_75%)] touch-none ${
        immersive ? 'h-[62vh] min-h-[460px]' : 'h-[320px] sm:h-[350px]'
      } ${tab === 'aura' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
    >
      {/* Subtle spatial axis compass whispers in Aura mode */}
      {tab === 'aura' && (
        <>
          <div className="axis-label axis-left pointer-events-none">low energy</div>
          <div className="axis-label axis-right pointer-events-none">high energy</div>
          <div className="axis-label axis-top pointer-events-none">pleasant</div>
          <div className="axis-label axis-bottom pointer-events-none">tender</div>
        </>
      )}

      {/* WebGL Canvas Mount Container */}
      <div ref={containerRef} className="h-full w-full" />

      {/* Top-left floating spatial telemetry pill */}
      <div className="pointer-events-none absolute left-3.5 top-3.5 flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/35 px-3 py-1 text-[10px] tracking-wider text-white/65 backdrop-blur-md">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{
            background: aura.color,
            boxShadow: `0 0 10px ${aura.color}`,
          }}
        />
        <span>
          {tab === 'aura'
            ? '3D AURA CORE · DRAG TO SCULPT'
            : `BIOLUMINESCENT POND · ${Math.max(blooms, checkIns.length)} BLOOMS`}
        </span>
      </div>
    </div>
  )
}
