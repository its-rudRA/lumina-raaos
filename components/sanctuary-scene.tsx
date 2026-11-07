'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { EMOTION_OPTIONS, type CheckInRecord } from '@/lib/db'

export type GardenCameraPreset = 'overview' | 'moongate' | 'pond' | 'canopy'
export type GardenAtmospherePreset = 'twilight' | 'rose' | 'celestial' | 'dawn'

export interface SanctuarySceneProps {
  tab: 'aura' | 'garden'
  orb: { x: number; y: number }
  setOrb: (v: { x: number; y: number }) => void
  aura: { label: string; color: string; note: string }
  blooms: number
  checkIns: CheckInRecord[]
  rainPlaying: boolean
  immersive: boolean
  breathActive?: boolean
  selectedBloom?: CheckInRecord | null
  onSelectBloom?: (bloom: CheckInRecord | null) => void
  releaseBurstCount?: number
  illuminatePulse?: number
  cameraPreset?: GardenCameraPreset
  atmospherePreset?: GardenAtmospherePreset
  wishLanternCount?: number
  onLanternClick?: (index: number) => void
  sensoryMode?: 'full' | 'gentle' | 'low'
}

const MAX_LOTUSES = 24
const PARTICLE_COUNT = 120
const ISLAND_MOTE_COUNT = 60
const INNER_WISP_STARS = 40
const EMBER_COUNT = 60
const LANTERN_COUNT = 8

function colorForAuraLabel(label?: string, index = 0): number {
  if (label === 'Wired & Overthinking') return 0xe7a9bd
  if (label === 'Quietly Heavy') return 0x9584bf
  if (label === 'Softly Grounded') return 0x8ec9bd
  const palette = [0xe7a9bd, 0x8ec9bd, 0xb8a4d9]
  return palette[index % palette.length]
}

function colorForCheckIn(record?: CheckInRecord, index = 0): number {
  if (record?.emotionId || record?.emotionLabel) {
    const matched = EMOTION_OPTIONS.find(
      o =>
        o.id === record.emotionId ||
        (record.emotionLabel && o.label.toLowerCase() === record.emotionLabel.toLowerCase())
    )
    if (matched) {
      const parsed = Number.parseInt(matched.color.replace('#', ''), 16)
      if (!Number.isNaN(parsed)) return parsed
    }
  }
  return colorForAuraLabel(record?.auraLabel, index)
}

export function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.max(1, Math.floor((Date.now() - timestamp) / 1000))
  if (diffSec < 60) return 'Planted just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `Planted ${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `Planted ${diffHr} hour${diffHr === 1 ? '' : 's'} ago`
  const diffDays = Math.floor(diffHr / 24)
  return `Planted ${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}

function getFallbackCheckIn(index: number): CheckInRecord {
  const presets: Array<{
    auraLabel: string
    tags: string[]
    orb: { x: number; y: number }
    emotionId: string
    emoji: string
    emotionLabel: string
    intensity: number
    note: string
  }> = [
    {
      auraLabel: 'Softly Grounded',
      tags: ['Quietly tired', 'Need comfort'],
      orb: { x: 48, y: 52 },
      emotionId: 'grounded',
      emoji: '🌿',
      emotionLabel: 'Grounded',
      intensity: 3,
      note: 'Taking a slow breath beside the sanctuary water.',
    },
    {
      auraLabel: 'Quietly Heavy',
      tags: ['Tight chest', 'Quietly tired'],
      orb: { x: 32, y: 68 },
      emotionId: 'exhausted',
      emoji: '🌙',
      emotionLabel: 'Exhausted',
      intensity: 4,
      note: 'Carrying a tired mind, letting this lotus hold the weight for a moment.',
    },
    {
      auraLabel: 'Wired & Overthinking',
      tags: ['Overthinking', 'Academic pressure'],
      orb: { x: 72, y: 34 },
      emotionId: 'anxious',
      emoji: '🦋',
      emotionLabel: 'Anxious',
      intensity: 3,
      note: 'Many thoughts moving at once—pausing here to soften the pace.',
    },
  ]
  const pick = presets[index % presets.length]
  return {
    id: -(index + 1),
    timestamp: Date.now() - (index + 1) * 3600 * 1000 * 6,
    orb: pick.orb,
    auraLabel: pick.auraLabel,
    tags: pick.tags,
    emotionId: pick.emotionId,
    emoji: pick.emoji,
    emotionLabel: pick.emotionLabel,
    intensity: pick.intensity,
    note: pick.note,
  }
}

/**
 * Controlled soft radial glow texture starting at 0.45 center alpha (never 1.0 pure white)
 * so overlapping sprites never blow out into harsh white circles.
 */
function createGlowTexture(colorHex = '#ffffff'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const c = new THREE.Color(colorHex)
    const r = Math.round(c.r * 255)
    const g = Math.round(c.g * 255)
    const b = Math.round(c.b * 255)

    const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 64)
    grad.addColorStop(0, `rgba(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)}, 0.45)`)
    grad.addColorStop(0.25, `rgba(${r}, ${g}, ${b}, 0.28)`)
    grad.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, 0.10)`)
    grad.addColorStop(0.82, `rgba(${r}, ${g}, ${b}, 0.025)`)
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)

    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 128, 128)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

/**
 * Cupped, organic lotus petal BufferGeometry.
 */
function createCuppedPetalGeometry(
  length = 0.38,
  width = 0.16,
  cupDepth = 0.07
): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, 14, 12, 0, Math.PI, 0, Math.PI * 0.55)
  const pos = geo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i)
    const vy = pos.getY(i)
    const vz = pos.getZ(i)

    const u = Math.max(0, Math.min(1, (vy + 0.25) / 1.25))
    const widthProfile = Math.sin(u * Math.PI) * (1 - 0.2 * u)
    const sx = vx * width * widthProfile
    const sy = u * length
    const cup = Math.pow(Math.sin(u * Math.PI), 1.2) * cupDepth + Math.pow(u, 2.2) * 0.075
    const sz = vz * cupDepth * 0.5 + cup

    pos.setXYZ(i, sx, sy, sz)
  }
  geo.computeVertexNormals()
  return geo
}

// Custom GLSL Fresnel Spirit Wisp Shaders for the 3D Aura Core
const FRESNEL_CORE_VERTEX_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vLocalPos;

  void main() {
    vLocalPos = position;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const FRESNEL_CORE_FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vLocalPos;
  uniform vec3 uColor;
  uniform float uTime;

  void main() {
    float fresnel = pow(1.0 - abs(dot(vNormal, vViewDir)), 2.2);
    float innerPulse = 0.5 + 0.5 * sin(uTime * 1.8 + vLocalPos.y * 4.0);
    vec3 coreTint = mix(uColor, vec3(0.98, 0.95, 1.0), fresnel * 0.55);
    float alpha = clamp(0.18 + fresnel * 0.68 + innerPulse * 0.06, 0.16, 0.88);
    gl_FragColor = vec4(coreTint, alpha);
  }
`

const AURORA_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;

  void main() {
    vUv = uv;
    vec3 pos = position;
    float curtainWave = sin(pos.x * 0.35 + uTime * 0.42) * 0.42
                      + cos(pos.x * 0.72 - uTime * 0.28) * 0.22;
    pos.z += curtainWave * uv.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const AURORA_FRAGMENT_SHADER = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uAuraColor;

  void main() {
    vec3 deepIndigo = vec3(0.075, 0.059, 0.149);
    vec3 sanctuaryTeal = vec3(0.494, 0.784, 0.722);

    float ribbon1 = sin(vUv.x * 15.0 + uTime * 0.5 + sin(vUv.y * 5.0 + uTime * 0.28)) * 0.5 + 0.5;
    float ribbon2 = cos(vUv.x * 21.0 - uTime * 0.35 + cos(vUv.y * 6.0)) * 0.5 + 0.5;
    float shimmer = pow(ribbon1 * ribbon2, 1.4);

    vec3 col = mix(deepIndigo, sanctuaryTeal, smoothstep(0.15, 0.8, ribbon1));
    col = mix(col, uAuraColor, smoothstep(0.3, 0.95, ribbon2) * 0.6);
    col += uAuraColor * shimmer * 0.28;

    float vFade = smoothstep(0.0, 0.28, vUv.y) * smoothstep(1.0, 0.32, vUv.y);
    float hFade = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
    float alpha = (0.11 + shimmer * 0.26) * vFade * hFade;

    gl_FragColor = vec4(col, alpha);
  }
`

/**
 * Computes a calm 10-second respiratory wave (4s inhale expansion [0..1], 6s exhale softening [1..0]).
 */
function getBreathFactor(elapsed: number): number {
  const cycle = elapsed % 10.0
  if (cycle < 4.0) {
    const t = cycle / 4.0
    return 0.5 - 0.5 * Math.cos(t * Math.PI)
  }
  const t = (cycle - 4.0) / 6.0
  return 0.5 + 0.5 * Math.cos(t * Math.PI)
}

const ATMOSPHERE_PALETTES: Record<
  GardenAtmospherePreset,
  {
    skyHex: number
    fogHex: number
    waterEmissiveHex: number
    portalHex: number
    auroraHex: string
  }
> = {
  twilight: {
    skyHex: 0x8ec9bd,
    fogHex: 0x090814,
    waterEmissiveHex: 0x091722,
    portalHex: 0x8ec9bd,
    auroraHex: '#7ec8b8',
  },
  rose: {
    skyHex: 0xe7a9bd,
    fogHex: 0x120916,
    waterEmissiveHex: 0x1d0e1d,
    portalHex: 0xe7a9bd,
    auroraHex: '#e8a4b8',
  },
  celestial: {
    skyHex: 0xb8a4e8,
    fogHex: 0x090718,
    waterEmissiveHex: 0x110e29,
    portalHex: 0xb8a4e8,
    auroraHex: '#b8a4e8',
  },
  dawn: {
    skyHex: 0xf3d9a4,
    fogHex: 0x120d12,
    waterEmissiveHex: 0x1f1712,
    portalHex: 0xf3d9a4,
    auroraHex: '#f3d9a4',
  },
}

/**
 * Gently curved, tapered Asian sky lantern shade geometry.
 */
function createSkyLanternShadeGeometry(): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(0.095, 0.125, 0.25, 20, 8, false)
  const pos = geo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i)
    const vy = pos.getY(i)
    const vz = pos.getZ(i)
    // Normalized height [-1 .. 1]
    const ny = vy / 0.125
    // Gentle organic barrel curve that swells softly in the upper-middle section
    const belly = 1 + Math.cos(ny * Math.PI * 0.48) * 0.22 + (ny > 0 ? ny * 0.06 : 0)
    pos.setXYZ(i, vx * belly, vy, vz * belly)
  }
  geo.computeVertexNormals()
  return geo
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
  breathActive = false,
  selectedBloom,
  onSelectBloom,
  releaseBurstCount = 0,
  illuminatePulse = 0,
  cameraPreset = 'overview',
  atmospherePreset = 'twilight',
  wishLanternCount = 0,
  onLanternClick,
  sensoryMode,
}: SanctuarySceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [hoveredBloomIndex, setHoveredBloomIndex] = useState<number | null>(null)
  const [hoveredLanternIndex, setHoveredLanternIndex] = useState<number | null>(null)
  const [selectedBloomIndex, setSelectedBloomIndex] = useState<number | null>(null)
  const [isDraggingOrbit, setIsDraggingOrbit] = useState(false)

  const liveRef = useRef({
    tab,
    orb,
    auraColor: aura.color,
    blooms: Math.max(blooms, checkIns.length),
    checkIns,
    rainPlaying,
    immersive,
    breathActive,
    cameraPreset,
    atmospherePreset,
    sensoryMode,
    prefersReducedMotion: false,
    pointerParallax: { x: 0, y: 0 },
    orbitTheta: 0,
    orbitPhi: 0.22,
    orbitRadius: 6.6,
    userOrbited: false,
    dragDistance: 0,
    hoveredIndex: null as number | null,
    hoveredLantern: null as number | null,
    selectedIndex: null as number | null,
    emberTrigger: false,
    illuminateTrigger: false,
    wishTrigger: false,
    onSelectBloom,
    onLanternClick,
  })

  useEffect(() => {
    liveRef.current.tab = tab
    liveRef.current.orb = orb
    liveRef.current.auraColor = aura.color
    liveRef.current.blooms = Math.max(blooms, checkIns.length)
    liveRef.current.checkIns = checkIns
    liveRef.current.rainPlaying = rainPlaying
    liveRef.current.immersive = immersive
    liveRef.current.breathActive = breathActive
    liveRef.current.atmospherePreset = atmospherePreset
    liveRef.current.sensoryMode = sensoryMode
    liveRef.current.onSelectBloom = onSelectBloom
    liveRef.current.onLanternClick = onLanternClick
    if (tab === 'aura') {
      liveRef.current.selectedIndex = null
      setSelectedBloomIndex(null)
    }
  }, [
    tab,
    orb,
    aura.color,
    blooms,
    checkIns,
    rainPlaying,
    immersive,
    breathActive,
    atmospherePreset,
    sensoryMode,
    onSelectBloom,
    onLanternClick,
  ])

  useEffect(() => {
    liveRef.current.cameraPreset = cameraPreset
    liveRef.current.userOrbited = false
    if (cameraPreset === 'overview') {
      liveRef.current.orbitTheta = 0
      liveRef.current.orbitPhi = 0.22
      liveRef.current.orbitRadius = immersive ? 6.3 : 6.7
    } else if (cameraPreset === 'moongate') {
      liveRef.current.orbitTheta = 0
      liveRef.current.orbitPhi = 0.16
      liveRef.current.orbitRadius = 4.3
    } else if (cameraPreset === 'pond') {
      liveRef.current.orbitTheta = 0.18
      liveRef.current.orbitPhi = 0.09
      liveRef.current.orbitRadius = 4.8
    } else if (cameraPreset === 'canopy') {
      liveRef.current.orbitTheta = -0.15
      liveRef.current.orbitPhi = 0.07
      liveRef.current.orbitRadius = 6.2
    }
  }, [cameraPreset, immersive])

  useEffect(() => {
    if (selectedBloom === null) {
      liveRef.current.selectedIndex = null
      setSelectedBloomIndex(null)
    }
  }, [selectedBloom])

  const prevBurstRef = useRef(releaseBurstCount)
  useEffect(() => {
    if (releaseBurstCount > prevBurstRef.current) {
      liveRef.current.emberTrigger = true
      prevBurstRef.current = releaseBurstCount
    }
  }, [releaseBurstCount])

  const prevIlluminateRef = useRef(illuminatePulse)
  useEffect(() => {
    if (illuminatePulse > prevIlluminateRef.current) {
      liveRef.current.illuminateTrigger = true
      prevIlluminateRef.current = illuminatePulse
    }
  }, [illuminatePulse])

  const prevWishRef = useRef(wishLanternCount)
  useEffect(() => {
    if (wishLanternCount > prevWishRef.current) {
      liveRef.current.wishTrigger = true
      prevWishRef.current = wishLanternCount
    }
  }, [wishLanternCount])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth || 800
    const height = container.clientHeight || 480

    // 1. Scene, Deep Twilight Fog, Camera & Renderer
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x080711, 0.044)

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 120)
    camera.position.set(0, 0.35, 4.6)
    const currentLookAt = new THREE.Vector3(0, -0.25, -0.8)
    const targetLookAt = new THREE.Vector3(0, -0.25, -0.8)
    const targetCamPos = new THREE.Vector3(0, 0.35, 4.6)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(width, height)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.08
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

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
    const trackTex = <T extends THREE.Texture>(t: T): T => {
      textures.push(t)
      return t
    }

    const whiteGlowTex = trackTex(createGlowTexture('#ffffff'))
    const goldGlowTex = trackTex(createGlowTexture('#f2cf8d'))
    const roseGlowTex = trackTex(createGlowTexture('#e7a9bd'))
    const tealGlowTex = trackTex(createGlowTexture('#8ec9bd'))

    // Lights — brighter bioluminescent sanctuary clarity
    const ambientLight = new THREE.AmbientLight(0x312a4a, 1.65)
    scene.add(ambientLight)

    const hemiLight = new THREE.HemisphereLight(0x96d7cb, 0x0f0b1c, 1.25)
    scene.add(hemiLight)

    const auraLight = new THREE.PointLight(
      new THREE.Color(liveRef.current.auraColor),
      4.2,
      18,
      1.35
    )
    auraLight.position.set(0, 0.5, 1.2)
    scene.add(auraLight)

    const moonGateLight = new THREE.PointLight(0x9ee0d2, 3.2, 16, 1.35)
    moonGateLight.position.set(0, 0.35, -4.8)
    scene.add(moonGateLight)

    // 2. Custom GLSL Aurora Borealis Sky Curtain & Starfield Dome
    const auroraGeo = trackGeo(new THREE.PlaneGeometry(34, 9.0, 72, 24))
    const auroraPos = auroraGeo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < auroraPos.count; i++) {
      const ax = auroraPos.getX(i)
      auroraPos.setZ(i, -Math.pow(ax * 0.08, 2) * 3.0)
    }
    auroraGeo.computeVertexNormals()

    const auroraUniforms = {
      uTime: { value: 0 },
      uAuraColor: { value: new THREE.Color(liveRef.current.auraColor) },
    }
    const auroraMat = trackMat(
      new THREE.ShaderMaterial({
        vertexShader: AURORA_VERTEX_SHADER,
        fragmentShader: AURORA_FRAGMENT_SHADER,
        uniforms: auroraUniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
    )
    const auroraCurtain = new THREE.Mesh(auroraGeo, auroraMat)
    auroraCurtain.position.set(0, 2.5, -10.6)
    scene.add(auroraCurtain)

    // Starfield Dome
    const starCount = 150
    const starPositions = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 36
      starPositions[i * 3 + 1] = 0.5 + Math.random() * 9.5
      starPositions[i * 3 + 2] = -6.5 - Math.random() * 14
    }
    const starGeo = trackGeo(new THREE.BufferGeometry())
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    const starMat = trackMat(
      new THREE.PointsMaterial({
        size: 0.13,
        map: whiteGlowTex,
        color: 0xe6dff5,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )
    const starField = new THREE.Points(starGeo, starMat)
    scene.add(starField)

    // 3. Horizon-Smoothed Reflective Sanctuary Water Plane
    const waterGeo = trackGeo(new THREE.PlaneGeometry(48, 48, 72, 72))
    waterGeo.rotateX(-Math.PI / 2)
    const waterPosAttrInitial = waterGeo.attributes.position as THREE.BufferAttribute
    const waterColors = new Float32Array(waterPosAttrInitial.count * 3)
    const cCenter = new THREE.Color(0x112029)
    const cHorizon = new THREE.Color(0x07060f)

    for (let i = 0; i < waterPosAttrInitial.count; i++) {
      const wx = waterPosAttrInitial.getX(i)
      const wz = waterPosAttrInitial.getZ(i)
      const dist = Math.hypot(wx, wz)
      const horizonDrop = Math.max(0, (dist - 9.5) * 0.14)
      waterPosAttrInitial.setY(i, -horizonDrop)

      const blend = Math.min(1, Math.pow(dist / 18, 1.3))
      const vc = cCenter.clone().lerp(cHorizon, blend)
      waterColors[i * 3] = vc.r
      waterColors[i * 3 + 1] = vc.g
      waterColors[i * 3 + 2] = vc.b
    }
    waterGeo.setAttribute('color', new THREE.BufferAttribute(waterColors, 3))
    const waterBasePositions = new Float32Array(waterPosAttrInitial.array)

    const waterMat = trackMat(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        emissive: 0x060b11,
        emissiveIntensity: 0.38,
        roughness: 0.2,
        metalness: 0.72,
        transparent: true,
        opacity: 0.94,
      })
    )
    const waterMesh = new THREE.Mesh(waterGeo, waterMat)
    waterMesh.position.y = -1.6
    scene.add(waterMesh)

    // 4. Distant Sanctuary Island (z = -5.2) with Serene Luminous Moon Gate & Rising Light Motes
    const isletGroup = new THREE.Group()
    isletGroup.position.set(0, -1.62, -5.2)
    scene.add(isletGroup)

    // Mossy sanctuary islet mound
    const isletGeo = trackGeo(
      new THREE.SphereGeometry(2.3, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.48)
    )
    isletGeo.scale(1.35, 0.24, 0.9)
    const isletMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x141a29,
        emissive: 0x090d18,
        roughness: 0.85,
        metalness: 0.1,
      })
    )
    const isletMesh = new THREE.Mesh(isletGeo, isletMat)
    isletGroup.add(isletMesh)

    // Soft shoreline ring
    const shoreRingGeo = trackGeo(new THREE.RingGeometry(2.9, 3.08, 64))
    shoreRingGeo.rotateX(-Math.PI / 2)
    shoreRingGeo.scale(1.06, 0.72, 1)
    const shoreRingMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x9ee0d2,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
    )
    const shoreRing = new THREE.Mesh(shoreRingGeo, shoreRingMat)
    shoreRing.position.y = 0.06
    isletGroup.add(shoreRing)

    // Luminous Water Reflection Path leading from foreground pond to Moon Gate island
    const reflectionPathGeo = trackGeo(new THREE.PlaneGeometry(1.85, 6.2, 16, 24))
    reflectionPathGeo.rotateX(-Math.PI / 2)
    const reflectionPathPos = reflectionPathGeo.attributes.position as THREE.BufferAttribute
    const reflectionPathColors = new Float32Array(reflectionPathPos.count * 3)
    const cRefBase = new THREE.Color(0x9ee0d2)
    for (let i = 0; i < reflectionPathPos.count; i++) {
      const rx = reflectionPathPos.getX(i)
      const rz = reflectionPathPos.getZ(i)
      const edgeFade = Math.max(0, 1 - Math.pow(Math.abs(rx) / 0.92, 1.6))
      const lengthFade = Math.max(0, 1 - Math.pow(Math.abs(rz) / 3.1, 1.8))
      const intensity = edgeFade * lengthFade
      reflectionPathColors[i * 3] = cRefBase.r * intensity
      reflectionPathColors[i * 3 + 1] = cRefBase.g * intensity
      reflectionPathColors[i * 3 + 2] = cRefBase.b * intensity
    }
    reflectionPathGeo.setAttribute('color', new THREE.BufferAttribute(reflectionPathColors, 3))
    const reflectionPathMat = trackMat(
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.24,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    )
    const reflectionPath = new THREE.Mesh(reflectionPathGeo, reflectionPathMat)
    reflectionPath.position.set(0, -1.56, -2.1)
    scene.add(reflectionPath)

    // Luminous Zen Moon Gate Archway (TorusGeometry(1.38, 0.065, 24, 96))
    const moonGateGroup = new THREE.Group()
    moonGateGroup.position.set(0, 1.42, 0)
    isletGroup.add(moonGateGroup)

    const moonArchGeo = trackGeo(new THREE.TorusGeometry(1.38, 0.065, 24, 96))
    const moonArchMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xefe9fa,
        emissive: 0x9ee0d2,
        emissiveIntensity: 0.72,
        roughness: 0.2,
        metalness: 0.55,
      })
    )
    const moonArch = new THREE.Mesh(moonArchGeo, moonArchMat)
    moonGateGroup.add(moonArch)

    // Inner filigree concentric ring inside Moon Gate
    const innerArchGeo = trackGeo(new THREE.TorusGeometry(1.24, 0.016, 14, 80))
    const innerArchMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xf2bfd0,
        transparent: true,
        opacity: 0.56,
        blending: THREE.AdditiveBlending,
      })
    )
    const innerArch = new THREE.Mesh(innerArchGeo, innerArchMat)
    moonGateGroup.add(innerArch)

    // Translucent portal mist disc inside the Moon Gate
    const portalDiscGeo = trackGeo(new THREE.CircleGeometry(1.24, 56))
    const portalDiscMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x9ee0d2,
        transparent: true,
        opacity: 0.11,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    )
    const portalDisc = new THREE.Mesh(portalDiscGeo, portalDiscMat)
    moonGateGroup.add(portalDisc)

    // Soft layered bioluminescent foliage mounds flanking the Moon Gate
    const foliageGeo = trackGeo(new THREE.IcosahedronGeometry(0.62, 3))
    const foliageLeftMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x233840,
        emissive: 0x1a3338,
        emissiveIntensity: 0.35,
        roughness: 0.75,
        transparent: true,
        opacity: 0.88,
      })
    )
    const foliageRightMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x2c243d,
        emissive: 0x261b38,
        emissiveIntensity: 0.35,
        roughness: 0.75,
        transparent: true,
        opacity: 0.88,
      })
    )

    const foliagePlacements = [
      { x: -1.45, y: 0.45, z: 0.18, sx: 1.2, sy: 0.75, sz: 0.9, mat: foliageLeftMat },
      { x: -1.85, y: 0.28, z: 0.35, sx: 0.85, sy: 0.55, sz: 0.75, mat: foliageRightMat },
      { x: 1.45, y: 0.45, z: 0.18, sx: 1.2, sy: 0.75, sz: 0.9, mat: foliageRightMat },
      { x: 1.85, y: 0.28, z: 0.35, sx: 0.85, sy: 0.55, sz: 0.75, mat: foliageLeftMat },
    ]
    foliagePlacements.forEach(fp => {
      const fMesh = new THREE.Mesh(foliageGeo, fp.mat)
      fMesh.position.set(fp.x, fp.y, fp.z)
      fMesh.scale.set(fp.sx, fp.sy, fp.sz)
      isletGroup.add(fMesh)
    })

    // 60 gently drifting vertical light motes around the Moon Gate islet
    const motePositions = new Float32Array(ISLAND_MOTE_COUNT * 3)
    const moteSeeds = new Float32Array(ISLAND_MOTE_COUNT)
    for (let i = 0; i < ISLAND_MOTE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = 0.3 + Math.random() * 2.1
      motePositions[i * 3] = Math.cos(angle) * r
      motePositions[i * 3 + 1] = 0.2 + Math.random() * 2.8
      motePositions[i * 3 + 2] = Math.sin(angle) * (r * 0.5)
      moteSeeds[i] = Math.random() * Math.PI * 2
    }
    const moteGeo = trackGeo(new THREE.BufferGeometry())
    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3))
    const moteMat = trackMat(
      new THREE.PointsMaterial({
        size: 0.14,
        map: tealGlowTex,
        color: 0xb7ebe0,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )
    const islandMotes = new THREE.Points(moteGeo, moteMat)
    isletGroup.add(islandMotes)

    // 5. The 3D Aura Core: Custom GLSL Fresnel Spirit Wisp (radius 0.55) + 40 Inner Starlight Points + 2 Thin Orbital Rings
    const coreGroup = new THREE.Group()
    scene.add(coreGroup)

    const coreGeo = trackGeo(new THREE.IcosahedronGeometry(0.55, 32))
    const coreBasePositions = new Float32Array(
      (coreGeo.attributes.position as THREE.BufferAttribute).array
    )
    const coreUniforms = {
      uColor: { value: new THREE.Color(liveRef.current.auraColor) },
      uTime: { value: 0 },
    }
    const coreMat = trackMat(
      new THREE.ShaderMaterial({
        vertexShader: FRESNEL_CORE_VERTEX_SHADER,
        fragmentShader: FRESNEL_CORE_FRAGMENT_SHADER,
        uniforms: coreUniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide,
      })
    )
    const coreMesh = new THREE.Mesh(coreGeo, coreMat)
    coreGroup.add(coreMesh)

    // Inner cluster of 40 swirling starlight points inside the translucent Spirit Wisp
    const innerStarPositions = new Float32Array(INNER_WISP_STARS * 3)
    for (let i = 0; i < INNER_WISP_STARS; i++) {
      const u = Math.random()
      const v = Math.random()
      const theta = u * 2.0 * Math.PI
      const phi = Math.acos(2.0 * v - 1.0)
      const rad = Math.cbrt(Math.random()) * 0.42
      innerStarPositions[i * 3] = rad * Math.sin(phi) * Math.cos(theta)
      innerStarPositions[i * 3 + 1] = rad * Math.sin(phi) * Math.sin(theta)
      innerStarPositions[i * 3 + 2] = rad * Math.cos(phi)
    }
    const innerStarGeo = trackGeo(new THREE.BufferGeometry())
    innerStarGeo.setAttribute('position', new THREE.BufferAttribute(innerStarPositions, 3))
    const innerStarMat = trackMat(
      new THREE.PointsMaterial({
        size: 0.08,
        map: whiteGlowTex,
        color: 0xffffff,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )
    const innerWispStars = new THREE.Points(innerStarGeo, innerStarMat)
    coreGroup.add(innerWispStars)

    // Soft, controlled outer wisp aura sprite
    const coreGlowMat = trackMat(
      new THREE.SpriteMaterial({
        map: whiteGlowTex,
        color: new THREE.Color(liveRef.current.auraColor),
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )
    const coreGlowSprite = new THREE.Sprite(coreGlowMat)
    coreGlowSprite.scale.set(2.1, 2.1, 1)
    coreGroup.add(coreGlowSprite)

    // Two ultra-thin, delicate tilted orbital rings (TorusGeometry(0.78, 0.008, 16, 100))
    const orbitRingGeo = trackGeo(new THREE.TorusGeometry(0.78, 0.008, 16, 100))
    const orbitRingMat1 = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
      })
    )
    const orbitRingMat2 = trackMat(
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(liveRef.current.auraColor),
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
      })
    )
    const orbitRing1 = new THREE.Mesh(orbitRingGeo, orbitRingMat1)
    orbitRing1.rotation.x = Math.PI / 2.5
    orbitRing1.rotation.y = 0.3
    coreGroup.add(orbitRing1)

    const orbitRing2 = new THREE.Mesh(orbitRingGeo, orbitRingMat2)
    orbitRing2.rotation.x = -Math.PI / 2.8
    orbitRing2.rotation.y = -0.4
    orbitRing2.scale.setScalar(1.08)
    coreGroup.add(orbitRing2)

    const rippleRingGeo = trackGeo(new THREE.RingGeometry(0.45, 0.51, 56))
    rippleRingGeo.rotateX(-Math.PI / 2)
    const rippleRingMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(liveRef.current.auraColor),
        transparent: true,
        opacity: 0.26,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      })
    )
    const rippleRing = new THREE.Mesh(rippleRingGeo, rippleRingMat)
    rippleRing.position.set(0, -1.55, 0)
    scene.add(rippleRing)

    // 6. Organic Multi-Layered 3D Cupped Lotus Flowers + Concentric Water Ripples + Raycasting
    const gardenGroup = new THREE.Group()
    scene.add(gardenGroup)

    const padGeo = trackGeo(new THREE.CylinderGeometry(0.42, 0.38, 0.022, 28))
    const outerCuppedPetalGeo = trackGeo(createCuppedPetalGeometry(0.38, 0.17, 0.075))
    const midCuppedPetalGeo = trackGeo(createCuppedPetalGeometry(0.31, 0.14, 0.065))
    const innerCuppedPetalGeo = trackGeo(createCuppedPetalGeometry(0.24, 0.11, 0.055))
    const heartGeo = trackGeo(new THREE.SphereGeometry(0.085, 14, 14))
    const lotusRippleGeo = trackGeo(new THREE.RingGeometry(0.46, 0.51, 40))
    lotusRippleGeo.rotateX(-Math.PI / 2)
    const hitSphereGeo = trackGeo(new THREE.SphereGeometry(0.55, 12, 12))
    const hitSphereMat = trackMat(
      new THREE.MeshBasicMaterial({
        visible: false,
      })
    )

    const padMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x173230,
        emissive: 0x081716,
        roughness: 0.65,
        metalness: 0.1,
      })
    )

    interface LotusEntry {
      index: number
      group: THREE.Group
      hitMesh: THREE.Mesh
      petalMat: THREE.MeshStandardMaterial
      glowMat: THREE.SpriteMaterial
      rippleMat: THREE.MeshBasicMaterial
      rippleMesh: THREE.Mesh
      outerPivots: THREE.Group[]
      midPivots: THREE.Group[]
      innerPivots: THREE.Group[]
      baseX: number
      baseZ: number
      phase: number
      currentScale: number
      spawnProgress: number
    }

    const lotuses: LotusEntry[] = []
    const hitMeshes: THREE.Mesh[] = []
    const initialActiveBlooms = Math.min(MAX_LOTUSES, Math.max(1, liveRef.current.blooms))

    for (let i = 0; i < MAX_LOTUSES; i++) {
      const angle = i * 2.39996 + 0.45
      const radius = 1.45 + Math.sqrt(i) * 1.18
      const baseX = Math.cos(angle) * radius
      const baseZ = Math.sin(angle) * (radius * 0.68) - 0.55

      const lotusGroup = new THREE.Group()
      lotusGroup.position.set(baseX, -1.55, baseZ)
      lotusGroup.userData = { bloomIndex: i }

      const pad = new THREE.Mesh(padGeo, padMat)
      lotusGroup.add(pad)

      const initialTintHex = colorForCheckIn(liveRef.current.checkIns[i], i)
      const rippleMat = trackMat(
        new THREE.MeshBasicMaterial({
          color: initialTintHex,
          transparent: true,
          opacity: 0.22,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        })
      )
      const lRipple = new THREE.Mesh(lotusRippleGeo, rippleMat)
      lRipple.position.y = 0.01
      lotusGroup.add(lRipple)

      const tintHex = initialTintHex
      const petalMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: tintHex,
          emissive: tintHex,
          emissiveIntensity: 0.5,
          roughness: 0.28,
          metalness: 0.06,
          side: THREE.DoubleSide,
        })
      )

      const outerPivots: THREE.Group[] = []
      for (let p = 0; p < 8; p++) {
        const pAngle = (p / 8) * Math.PI * 2
        const pivot = new THREE.Group()
        pivot.rotation.y = pAngle
        const petal = new THREE.Mesh(outerCuppedPetalGeo, petalMat)
        petal.rotation.x = 0.92
        pivot.add(petal)
        lotusGroup.add(pivot)
        outerPivots.push(pivot)
      }

      const midPivots: THREE.Group[] = []
      for (let p = 0; p < 8; p++) {
        const pAngle = (p / 8) * Math.PI * 2 + Math.PI / 8
        const pivot = new THREE.Group()
        pivot.rotation.y = pAngle
        const petal = new THREE.Mesh(midCuppedPetalGeo, petalMat)
        petal.rotation.x = 0.62
        pivot.add(petal)
        lotusGroup.add(pivot)
        midPivots.push(pivot)
      }

      const innerPivots: THREE.Group[] = []
      for (let p = 0; p < 6; p++) {
        const pAngle = (p / 6) * Math.PI * 2 + 0.25
        const pivot = new THREE.Group()
        pivot.rotation.y = pAngle
        const petal = new THREE.Mesh(innerCuppedPetalGeo, petalMat)
        petal.rotation.x = 0.34
        pivot.add(petal)
        lotusGroup.add(pivot)
        innerPivots.push(pivot)
      }

      const heartMat = trackMat(
        new THREE.MeshBasicMaterial({
          color: 0xffeec2,
        })
      )
      const heart = new THREE.Mesh(heartGeo, heartMat)
      heart.position.y = 0.08
      lotusGroup.add(heart)

      const glowMat = trackMat(
        new THREE.SpriteMaterial({
          map: goldGlowTex,
          color: tintHex,
          transparent: true,
          opacity: 0.45,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      )
      const heartGlow = new THREE.Sprite(glowMat)
      heartGlow.scale.set(0.7, 0.7, 1)
      heartGlow.position.y = 0.14
      lotusGroup.add(heartGlow)

      const hitMesh = new THREE.Mesh(hitSphereGeo, hitSphereMat)
      hitMesh.position.y = 0.14
      hitMesh.userData = { bloomIndex: i }
      lotusGroup.add(hitMesh)
      hitMeshes.push(hitMesh)

      lotusGroup.scale.setScalar(0.001)
      lotusGroup.visible = false
      gardenGroup.add(lotusGroup)

      lotuses.push({
        index: i,
        group: lotusGroup,
        hitMesh,
        petalMat,
        glowMat,
        rippleMat,
        rippleMesh: lRipple,
        outerPivots,
        midPivots,
        innerPivots,
        baseX,
        baseZ,
        phase: i * 0.77,
        currentScale: 0.001,
        spawnProgress: i < initialActiveBlooms ? 1 : 0,
      })
    }

    // 7. Sculpted Multi-Part 3D Floating Sky Lanterns + Rising Wish Lantern
    const lanternShadeGeo = trackGeo(createSkyLanternShadeGeometry())
    const lanternTopRingGeo = trackGeo(new THREE.TorusGeometry(0.095, 0.01, 10, 28))
    lanternTopRingGeo.rotateX(Math.PI / 2)
    const lanternBottomRingGeo = trackGeo(new THREE.TorusGeometry(0.118, 0.012, 10, 28))
    lanternBottomRingGeo.rotateX(Math.PI / 2)
    const lanternCrownCapGeo = trackGeo(new THREE.CylinderGeometry(0.055, 0.095, 0.032, 18))
    const lanternFlameGeo = trackGeo(new THREE.SphereGeometry(0.038, 12, 12))
    const lanternTasselGeo = trackGeo(new THREE.CylinderGeometry(0.004, 0.01, 0.16, 8))
    const lanternHitGeo = trackGeo(new THREE.SphereGeometry(0.38, 10, 10))

    const lanternRimMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x3b2a34,
        emissive: 0x24161a,
        emissiveIntensity: 0.35,
        roughness: 0.55,
        metalness: 0.45,
      })
    )
    const lanternFlameMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xfff6d8,
      })
    )
    const lanternTasselMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xe6b873,
        transparent: true,
        opacity: 0.75,
      })
    )

    interface LanternEntry {
      index: number
      group: THREE.Group
      shadeMat: THREE.MeshStandardMaterial
      haloMat: THREE.SpriteMaterial
      haloSprite: THREE.Sprite
      hitMesh: THREE.Mesh
      baseX: number
      baseY: number
      baseZ: number
      phase: number
      boostLife: number
      riseOffset: number
    }

    const lanterns: LanternEntry[] = []
    const lanternHitMeshes: THREE.Mesh[] = []

    const buildLanternParts = (
      targetGroup: THREE.Group,
      shadeMat: THREE.MeshStandardMaterial,
      haloMat: THREE.SpriteMaterial
    ) => {
      const shade = new THREE.Mesh(lanternShadeGeo, shadeMat)
      targetGroup.add(shade)

      const topRing = new THREE.Mesh(lanternTopRingGeo, lanternRimMat)
      topRing.position.y = 0.125
      targetGroup.add(topRing)

      const crownCap = new THREE.Mesh(lanternCrownCapGeo, lanternRimMat)
      crownCap.position.y = 0.142
      targetGroup.add(crownCap)

      const bottomRing = new THREE.Mesh(lanternBottomRingGeo, lanternRimMat)
      bottomRing.position.y = -0.125
      targetGroup.add(bottomRing)

      const flameCore = new THREE.Mesh(lanternFlameGeo, lanternFlameMat)
      flameCore.position.y = -0.03
      targetGroup.add(flameCore)

      const tassel = new THREE.Mesh(lanternTasselGeo, lanternTasselMat)
      tassel.position.y = -0.21
      targetGroup.add(tassel)

      const haloSprite = new THREE.Sprite(haloMat)
      haloSprite.scale.set(0.82, 0.82, 1)
      targetGroup.add(haloSprite)
      return haloSprite
    }

    for (let i = 0; i < LANTERN_COUNT; i++) {
      const lGroup = new THREE.Group()

      const shadeMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xffefc4,
          emissive: 0xf4a842,
          emissiveIntensity: 1.05,
          roughness: 0.28,
          metalness: 0.08,
          transparent: true,
          opacity: 0.94,
        })
      )

      const haloMat = trackMat(
        new THREE.SpriteMaterial({
          map: goldGlowTex,
          color: 0xf7cf86,
          transparent: true,
          opacity: 0.44,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      )

      const haloSprite = buildLanternParts(lGroup, shadeMat, haloMat)

      const lHit = new THREE.Mesh(lanternHitGeo, hitSphereMat)
      lHit.userData = { lanternIndex: i }
      lGroup.add(lHit)
      lanternHitMeshes.push(lHit)

      const angle = (i / LANTERN_COUNT) * Math.PI * 2 + 0.4
      const radius = 3.1 + (i % 3) * 1.15
      const baseX = Math.cos(angle) * radius
      const baseY = 0.72 + (i % 4) * 0.44
      const baseZ = Math.sin(angle) * radius - 1.65

      lGroup.position.set(baseX, baseY, baseZ)
      scene.add(lGroup)
      lanterns.push({
        index: i,
        group: lGroup,
        shadeMat,
        haloMat,
        haloSprite,
        hitMesh: lHit,
        baseX,
        baseY,
        baseZ,
        phase: i * 1.13,
        boostLife: 0,
        riseOffset: 0,
      })
    }

    // Dedicated Rising Wish Lantern (launched from pond surface toward the Moon Gate & stars)
    const wishLanternGroup = new THREE.Group()
    const wishShadeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfff5d6,
        emissive: 0xffb84d,
        emissiveIntensity: 1.45,
        roughness: 0.22,
        transparent: true,
        opacity: 0,
      })
    )
    const wishHaloMat = trackMat(
      new THREE.SpriteMaterial({
        map: goldGlowTex,
        color: 0xffe09e,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )
    const wishHaloSprite = buildLanternParts(wishLanternGroup, wishShadeMat, wishHaloMat)
    wishLanternGroup.scale.setScalar(1.22)
    wishLanternGroup.visible = false
    scene.add(wishLanternGroup)
    let wishLanternLife = 0

    // 8. Bioluminescent Firefly / Rain Starlight Particles
    const particlePositions = new Float32Array(PARTICLE_COUNT * 3)
    const particleColors = new Float32Array(PARTICLE_COUNT * 3)
    const particleSeeds = new Float32Array(PARTICLE_COUNT)

    const cRose = new THREE.Color(0xe7a9bd)
    const cTeal = new THREE.Color(0x8ec9bd)
    const cGold = new THREE.Color(0xe6c88d)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 16
      particlePositions[i * 3 + 1] = -1.4 + Math.random() * 5.2
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 12 - 1
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
        size: 0.16,
        map: whiteGlowTex,
        vertexColors: true,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )
    const particles = new THREE.Points(particleGeo, particleMat)
    scene.add(particles)

    // 9. Burn & Release 3D Rising Ember Burst System
    const emberPositions = new Float32Array(EMBER_COUNT * 3)
    const emberVelocities = new Float32Array(EMBER_COUNT * 3)
    let emberLife = 0

    for (let i = 0; i < EMBER_COUNT; i++) {
      emberPositions[i * 3] = 0
      emberPositions[i * 3 + 1] = -10
      emberPositions[i * 3 + 2] = 0
    }
    const emberGeo = trackGeo(new THREE.BufferGeometry())
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3))
    const emberMat = trackMat(
      new THREE.PointsMaterial({
        size: 0.28,
        map: roseGlowTex,
        color: 0xffd599,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )
    const emberPoints = new THREE.Points(emberGeo, emberMat)
    scene.add(emberPoints)

    const triggerEmberBurst = (originX = 0, originY = -1.35, originZ = 0) => {
      emberLife = 1.0
      const ePos = emberGeo.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < EMBER_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2
        const rad = Math.random() * 1.4
        ePos.setXYZ(
          i,
          originX + Math.cos(angle) * rad,
          originY + Math.random() * 0.35,
          originZ + Math.sin(angle) * rad
        )
        emberVelocities[i * 3] = (Math.random() - 0.5) * 0.022
        emberVelocities[i * 3 + 1] = 0.03 + Math.random() * 0.042
        emberVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.022
      }
      ePos.needsUpdate = true
    }

    // Lotus Memory Illumination Shockwave Ring across the water surface
    const shockwaveGeo = trackGeo(new THREE.RingGeometry(0.45, 0.58, 64))
    shockwaveGeo.rotateX(-Math.PI / 2)
    const shockwaveMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xa4e5d6,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
    )
    const shockwaveRing = new THREE.Mesh(shockwaveGeo, shockwaveMat)
    shockwaveRing.position.set(0, -1.54, 0)
    scene.add(shockwaveRing)
    let illuminateLife = 0

    // Raycaster for hovering and clicking BOTH 3D Lotus Memories AND 3D Sky Lanterns
    const raycaster = new THREE.Raycaster()
    const pointerNDC = new THREE.Vector2()

    const getIntersectedGardenTarget = (
      clientX: number,
      clientY: number
    ): { bloomIndex: number | null; lanternIndex: number | null } => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1
      pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointerNDC, camera)

      const activeCount = Math.min(MAX_LOTUSES, Math.max(1, liveRef.current.blooms))
      const activeHitMeshes = hitMeshes.slice(0, activeCount)
      const hits = raycaster.intersectObjects([...activeHitMeshes, ...lanternHitMeshes], false)
      if (hits.length > 0) {
        const hitData = hits[0].object.userData
        if (typeof hitData?.bloomIndex === 'number') {
          return { bloomIndex: hitData.bloomIndex, lanternIndex: null }
        }
        if (typeof hitData?.lanternIndex === 'number') {
          return { bloomIndex: null, lanternIndex: hitData.lanternIndex }
        }
      }
      return { bloomIndex: null, lanternIndex: null }
    }

    const onDomPointerMove = (ev: PointerEvent) => {
      if (liveRef.current.tab !== 'garden') return
      const { bloomIndex, lanternIndex } = getIntersectedGardenTarget(ev.clientX, ev.clientY)
      if (bloomIndex !== liveRef.current.hoveredIndex) {
        liveRef.current.hoveredIndex = bloomIndex
        setHoveredBloomIndex(bloomIndex)
      }
      if (lanternIndex !== liveRef.current.hoveredLantern) {
        liveRef.current.hoveredLantern = lanternIndex
        setHoveredLanternIndex(lanternIndex)
      }
    }

    const onDomClick = (ev: MouseEvent) => {
      if (liveRef.current.tab !== 'garden') return
      // Ignore clicks that were actually camera orbit drags
      if (liveRef.current.dragDistance > 6) return

      const { bloomIndex, lanternIndex } = getIntersectedGardenTarget(ev.clientX, ev.clientY)
      if (lanternIndex !== null && lanterns[lanternIndex]) {
        const clickedLantern = lanterns[lanternIndex]
        clickedLantern.boostLife = 1.0
        clickedLantern.riseOffset = Math.min(0.85, clickedLantern.riseOffset + 0.32)
        triggerEmberBurst(
          clickedLantern.group.position.x,
          clickedLantern.group.position.y - 0.15,
          clickedLantern.group.position.z
        )
        liveRef.current.onLanternClick?.(lanternIndex)
        return
      }

      liveRef.current.selectedIndex = bloomIndex
      setSelectedBloomIndex(bloomIndex)
      if (bloomIndex !== null) {
        const record = liveRef.current.checkIns[bloomIndex] || getFallbackCheckIn(bloomIndex)
        liveRef.current.onSelectBloom?.(record)
      } else {
        liveRef.current.onSelectBloom?.(null)
      }
    }

    renderer.domElement.addEventListener('pointermove', onDomPointerMove)
    renderer.domElement.addEventListener('click', onDomClick)

    // 10. 60fps Animation Loop with Tab-Visibility Pause & Reduced-Motion / Low-Stimulus Support
    let frameId = 0
    let isTabHidden = typeof document !== 'undefined' ? document.hidden : false
    let simTime = 0
    const clock = new THREE.Clock()
    const tempColor = new THREE.Color()
    const palColor = new THREE.Color()

    const motionQuery =
      typeof window !== 'undefined' && 'matchMedia' in window
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null
    if (motionQuery) {
      liveRef.current.prefersReducedMotion = motionQuery.matches
    }
    const onMotionPrefChange = (ev: MediaQueryListEvent) => {
      liveRef.current.prefersReducedMotion = ev.matches
    }
    motionQuery?.addEventListener?.('change', onMotionPrefChange)

    const animate = () => {
      if (isTabHidden) {
        frameId = 0
        return
      }
      frameId = window.requestAnimationFrame(animate)

      const state = liveRef.current
      const domSensory =
        typeof document !== 'undefined' ? document.documentElement.dataset.sensory : undefined
      const effectiveSensory = state.sensoryMode || domSensory || 'full'
      const isLowMotion = state.prefersReducedMotion || effectiveSensory === 'low'
      const isGentleMotion = !isLowMotion && effectiveSensory === 'gentle'
      const motionScale = isLowMotion ? 0.14 : isGentleMotion ? 0.55 : 1.0

      // Clamp delta so resuming from a background tab or lag spike never jumps
      const rawDelta = Math.min(clock.getDelta(), 0.05)
      simTime += rawDelta * (isLowMotion ? 0.28 : isGentleMotion ? 0.65 : 1.0)
      const elapsed = simTime

      const palette = ATMOSPHERE_PALETTES[state.atmospherePreset] || ATMOSPHERE_PALETTES.twilight

      // 10-second respiratory breath synchronization when breathActive is true
      const breathWave = state.breathActive ? getBreathFactor(elapsed) : 0.5
      const breathScaleBoost = state.breathActive ? 0.88 + breathWave * 0.28 : 1.0

      // Smoothly blend atmosphere preset across sky, hemisphere light, water reflection, and Moon Gate
      palColor.setHex(palette.skyHex)
      hemiLight.color.lerp(palColor, 0.04)
      moonGateLight.color.lerp(palColor, 0.04)
      moonArchMat.emissive.lerp(palColor, 0.04)
      portalDiscMat.color.lerp(palColor, 0.04)
      shoreRingMat.color.lerp(palColor, 0.04)

      palColor.setHex(palette.waterEmissiveHex)
      waterMat.emissive.lerp(palColor, 0.04)
      if (scene.fog instanceof THREE.FogExp2) {
        palColor.setHex(palette.fogHex)
        scene.fog.color.lerp(palColor, 0.04)
      }

      // Update Aurora & Fresnel Spirit Wisp Shader uniforms
      auroraUniforms.uTime.value = elapsed
      coreUniforms.uTime.value = elapsed
      tempColor.set(state.tab === 'garden' ? palette.auroraHex : state.auraColor)
      auroraUniforms.uAuraColor.value.lerp(tempColor, 0.05)

      tempColor.set(state.auraColor)
      coreUniforms.uColor.value.lerp(tempColor, 0.06)
      coreGlowMat.color.lerp(tempColor, 0.06)
      orbitRingMat2.color.lerp(tempColor, 0.06)
      rippleRingMat.color.lerp(tempColor, 0.06)
      auraLight.color.lerp(tempColor, 0.06)

      // Map orb.x [8..92] and orb.y [12..88] to graceful pond bounds:
      // x in [-1.6, 1.6], y in [-0.55, 0.45], z = 0.0
      const normX = (state.orb.x - 50) / 42 // [-1 .. 1]
      const normY = (50 - state.orb.y) / 38 // [-1 .. 1]

      const targetCoreX = state.tab === 'aura' ? normX * 1.6 : 0
      const targetCoreY =
        state.tab === 'aura'
          ? -0.05 + normY * 0.5 + Math.sin(elapsed * 1.5) * 0.04 * motionScale
          : 1.42 + Math.sin(elapsed * 1.1) * 0.06 * motionScale
      const targetCoreZ = state.tab === 'aura' ? 0.0 : -5.15
      const targetCoreScale = (state.tab === 'aura' ? 1.0 : 0.62) * breathScaleBoost

      coreGroup.position.x += (targetCoreX - coreGroup.position.x) * 0.08
      coreGroup.position.y += (targetCoreY - coreGroup.position.y) * 0.08
      coreGroup.position.z += (targetCoreZ - coreGroup.position.z) * 0.08
      const nextScale = coreGroup.scale.x + (targetCoreScale - coreGroup.scale.x) * 0.07
      coreGroup.scale.setScalar(nextScale)

      auraLight.position.set(
        coreGroup.position.x,
        coreGroup.position.y + 0.45,
        coreGroup.position.z + 1.0
      )
      rippleRing.position.x = coreGroup.position.x
      rippleRing.position.z = coreGroup.position.z
      const rippleFreq = state.breathActive ? 0.628 : 2.0
      const rippleScale = 1 + Math.sin(elapsed * rippleFreq) * 0.16 * motionScale
      rippleRing.scale.setScalar(rippleScale)
      rippleRingMat.opacity = state.tab === 'aura' ? 0.26 : 0.1

      // Subtle organic vertex breathing on the Spirit Wisp Core
      const energySpeed = (1.0 + (state.orb.x / 100) * 1.8) * motionScale
      const displacementAmp = (0.035 + ((100 - state.orb.y) / 100) * 0.065) * motionScale
      const corePosAttr = coreGeo.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < corePosAttr.count; i++) {
        const ix = i * 3
        const bx = coreBasePositions[ix]
        const by = coreBasePositions[ix + 1]
        const bz = coreBasePositions[ix + 2]

        const wave =
          Math.sin(bx * 3.8 + elapsed * energySpeed) *
          Math.cos(by * 3.8 + elapsed * (energySpeed * 0.85)) *
          Math.sin(bz * 3.8 + elapsed * 0.9)
        const s = 1 + wave * displacementAmp
        corePosAttr.setXYZ(i, bx * s, by * s, bz * s)
      }
      corePosAttr.needsUpdate = true
      coreGeo.computeVertexNormals()

      coreMesh.rotation.y = elapsed * 0.2
      innerWispStars.rotation.y = -elapsed * 0.32
      innerWispStars.rotation.x = elapsed * 0.18
      orbitRing1.rotation.z = elapsed * 0.28
      orbitRing2.rotation.z = -elapsed * 0.22

      // Update Distant Moon Gate, Water Reflection Path & Vertical Rising Island Light Motes
      innerArch.rotation.z = elapsed * 0.14
      portalDiscMat.opacity = 0.095 + Math.sin(elapsed * 1.2) * 0.025 * motionScale
      shoreRing.scale.setScalar(1 + Math.sin(elapsed * 1.3) * 0.035 * motionScale)
      reflectionPathMat.opacity = 0.2 + Math.sin(elapsed * 1.5) * 0.05 * motionScale

      const mAttr = moteGeo.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < ISLAND_MOTE_COUNT; i++) {
        let my = mAttr.getY(i) + 0.0055 * motionScale
        const mx = mAttr.getX(i) + Math.sin(elapsed * 0.8 + moteSeeds[i]) * 0.0015 * motionScale
        if (my > 3.2) my = 0.15
        mAttr.setX(i, mx)
        mAttr.setY(i, my)
      }
      mAttr.needsUpdate = true

      // Undulating Reflective Sanctuary Water Plane
      const waterPosAttr = waterGeo.attributes.position as THREE.BufferAttribute
      const rainBoost = state.rainPlaying ? 1.8 : 1.0
      for (let i = 0; i < waterPosAttr.count; i++) {
        const ix = i * 3
        const wx = waterBasePositions[ix]
        const baseDropY = waterBasePositions[ix + 1]
        const wz = waterBasePositions[ix + 2]
        const distFromCore = Math.hypot(wx - coreGroup.position.x, wz - coreGroup.position.z)
        const swell =
          (Math.sin(wx * 0.55 + elapsed * 1.1) * 0.042 +
            Math.cos(wz * 0.65 + elapsed * 0.9) * 0.035 +
            Math.sin(distFromCore * 2.4 - elapsed * 2.4 * rainBoost) * 0.018 * rainBoost) *
          motionScale
        waterPosAttr.setY(i, baseDropY + swell)
      }
      waterPosAttr.needsUpdate = true
      waterGeo.computeVertexNormals()

      // Update Organic 3D Lotus Flowers with Petal-Unfolding Bloom Animation & 12-Emotion Palette
      const activeBlooms = Math.min(MAX_LOTUSES, Math.max(1, state.blooms))
      for (let i = 0; i < MAX_LOTUSES; i++) {
        const lotus = lotuses[i]
        const isVisible = i < activeBlooms
        const isHovered = state.hoveredIndex === i
        const isSelected = state.selectedIndex === i

        if (isVisible) {
          lotus.spawnProgress = Math.min(1, lotus.spawnProgress + 0.022)
        } else {
          lotus.spawnProgress = 0
        }

        // Smooth ease-out cubic curve for newly planted lotus blooms
        const easeBloom = 1 - Math.pow(1 - lotus.spawnProgress, 3)

        const targetLotusScale = !isVisible
          ? 0.001
          : (isSelected ? 1.18 : isHovered ? 1.04 : 0.86) * Math.max(0.15, easeBloom)

        lotus.currentScale += (targetLotusScale - lotus.currentScale) * 0.08
        lotus.group.visible = lotus.currentScale > 0.01
        if (lotus.group.visible) {
          lotus.group.scale.setScalar(lotus.currentScale)
          lotus.group.position.y =
            -1.55 + Math.sin(elapsed * 1.3 + lotus.phase) * 0.035 * motionScale
          lotus.group.rotation.y = elapsed * 0.08 * motionScale + lotus.phase

          // Petals gently unfold from a closed bud (-0.48 rad) into full bloom as easeBloom -> 1
          const unfoldOffset = (1 - easeBloom) * -0.48
          const breathOpen = state.breathActive
            ? (breathWave - 0.5) * 0.22
            : Math.sin(elapsed * 1.1 + lotus.phase) * 0.07 * motionScale + (isSelected ? 0.12 : 0)
          for (let p = 0; p < lotus.outerPivots.length; p++) {
            lotus.outerPivots[p].children[0].rotation.x = 0.92 + breathOpen + unfoldOffset
          }
          for (let p = 0; p < lotus.midPivots.length; p++) {
            lotus.midPivots[p].children[0].rotation.x =
              0.62 + breathOpen * 0.75 + unfoldOffset * 0.8
          }
          for (let p = 0; p < lotus.innerPivots.length; p++) {
            lotus.innerPivots[p].children[0].rotation.x =
              0.34 + breathOpen * 0.5 + unfoldOffset * 0.6
          }

          const lRippleScale = 1 + ((elapsed * 0.5 + lotus.phase) % 1) * 0.55
          lotus.rippleMesh.scale.setScalar(lRippleScale)
          lotus.rippleMat.opacity =
            (1 - ((elapsed * 0.5 + lotus.phase) % 1)) * (isSelected ? 0.45 : 0.22)

          const hex = colorForCheckIn(state.checkIns[i], i)
          tempColor.setHex(hex)
          lotus.petalMat.color.lerp(tempColor, 0.06)
          lotus.petalMat.emissive.lerp(tempColor, 0.06)
          const spawnGlowBoost = (1 - easeBloom) * 0.45
          lotus.petalMat.emissiveIntensity =
            (isSelected || isHovered ? 0.85 : 0.52) + spawnGlowBoost
          lotus.glowMat.color.lerp(tempColor, 0.06)
          lotus.rippleMat.color.lerp(tempColor, 0.06)
        }
      }

      // Update Sculpted 3D Floating Sky Lanterns with 3-axis organic wind sway & click illumination
      for (let i = 0; i < lanterns.length; i++) {
        const l = lanterns[i]
        const isHovered = state.hoveredLantern === i
        if (l.boostLife > 0.005) {
          l.boostLife = Math.max(0, l.boostLife - 0.008)
        }
        l.riseOffset = Math.max(0, l.riseOffset - 0.0008)

        l.group.position.y =
          l.baseY + l.riseOffset + Math.sin(elapsed * 0.85 + l.phase) * 0.19 * motionScale
        l.group.position.x =
          l.baseX + Math.cos(elapsed * 0.42 + l.phase) * 0.15 * motionScale
        l.group.position.z =
          l.baseZ + Math.sin(elapsed * 0.36 + l.phase * 1.3) * 0.12 * motionScale
        l.group.rotation.y = elapsed * 0.25 * motionScale + l.phase
        l.group.rotation.z = Math.sin(elapsed * 0.9 + l.phase) * 0.055 * motionScale
        l.group.rotation.x = Math.cos(elapsed * 0.75 + l.phase) * 0.045 * motionScale

        const glowBoost = l.boostLife * 0.65 + (isHovered ? 0.25 : 0)
        l.shadeMat.emissiveIntensity = 1.05 + glowBoost * 1.1
        l.haloMat.opacity = Math.min(0.88, 0.44 + glowBoost * 0.42)
        const pulse =
          0.78 + Math.sin(elapsed * 2.1 + l.phase) * 0.09 * motionScale + glowBoost * 0.38
        l.haloSprite.scale.set(pulse, pulse, 1)
      }

      // Update Rising Wish Lantern Ritual
      if (state.wishTrigger) {
        state.wishTrigger = false
        wishLanternLife = 1.0
        wishLanternGroup.visible = true
        wishLanternGroup.position.set(0, -1.25, 0.55)
        triggerEmberBurst(0, -1.25, 0.55)
      }
      if (wishLanternLife > 0.005) {
        wishLanternLife = Math.max(0, wishLanternLife - 0.0032)
        const progress = 1.0 - wishLanternLife
        wishLanternGroup.position.y = -1.25 + progress * 4.8
        wishLanternGroup.position.z = 0.55 - progress * 4.6
        wishLanternGroup.position.x = Math.sin(progress * Math.PI * 2.5) * 0.28 * motionScale
        wishLanternGroup.rotation.y = elapsed * 0.45
        wishLanternGroup.rotation.z = Math.sin(elapsed * 1.4) * 0.06 * motionScale
        const fade =
          progress < 0.12
            ? progress / 0.12
            : wishLanternLife < 0.2
              ? wishLanternLife / 0.2
              : 1.0
        wishShadeMat.opacity = fade * 0.96
        wishHaloMat.opacity = fade * 0.72
        const wPulse = 1.15 + Math.sin(elapsed * 3.0) * 0.12 * motionScale
        wishHaloSprite.scale.set(wPulse, wPulse, 1)
      } else {
        wishLanternGroup.visible = false
      }

      // Update Bioluminescent Particles
      const pAttr = particleGeo.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        let py = pAttr.getY(i)
        let px = pAttr.getX(i)
        if (state.rainPlaying) {
          py -= 0.06 * Math.max(0.35, motionScale)
          if (py < -1.55) py = 4.2
        } else {
          py += 0.0075 * motionScale
          px += Math.sin(elapsed * 0.55 + particleSeeds[i]) * 0.0025 * motionScale
          if (py > 4.2) py = -1.5
        }
        pAttr.setX(i, px)
        pAttr.setY(i, py)
      }
      pAttr.needsUpdate = true
      particleMat.opacity = isLowMotion ? 0.38 : 0.72

      // Update Burn & Release 3D Rising Ember Burst
      if (state.emberTrigger) {
        state.emberTrigger = false
        triggerEmberBurst()
      }
      if (emberLife > 0.005) {
        emberLife = Math.max(0, emberLife - 0.0055)
        emberMat.opacity = Math.min(0.9, emberLife * 1.25)
        const ePos = emberGeo.attributes.position as THREE.BufferAttribute
        for (let i = 0; i < EMBER_COUNT; i++) {
          const ex = ePos.getX(i) + emberVelocities[i * 3] + Math.sin(elapsed * 2.4 + i) * 0.007
          const ey = ePos.getY(i) + emberVelocities[i * 3 + 1]
          const ez = ePos.getZ(i) + emberVelocities[i * 3 + 2]
          ePos.setXYZ(i, ex, ey, ez)
        }
        ePos.needsUpdate = true
      } else {
        emberMat.opacity = 0
      }

      // Update Lotus Memory Illumination Shockwave & Moon Gate Brightening
      if (state.illuminateTrigger) {
        state.illuminateTrigger = false
        illuminateLife = 1.0
        const selIdx = state.selectedIndex
        if (selIdx !== null && lotuses[selIdx]) {
          shockwaveRing.position.set(lotuses[selIdx].baseX, -1.54, lotuses[selIdx].baseZ)
        } else {
          shockwaveRing.position.set(0, -1.54, -0.5)
        }
      }
      if (illuminateLife > 0.005) {
        illuminateLife = Math.max(0, illuminateLife - 0.012)
        const waveProgress = 1.0 - illuminateLife
        shockwaveRing.scale.setScalar(1.0 + waveProgress * 8.5)
        shockwaveMat.opacity = illuminateLife * 0.65
        moonArchMat.emissiveIntensity = 0.72 + illuminateLife * 0.95
        portalDiscMat.opacity = 0.11 + illuminateLife * 0.2
        moonGateLight.intensity = 3.2 + illuminateLife * 3.4
        if (state.selectedIndex !== null && lotuses[state.selectedIndex]) {
          lotuses[state.selectedIndex].petalMat.emissiveIntensity = 0.85 + illuminateLife * 0.65
        }
      } else {
        shockwaveMat.opacity = 0
        moonArchMat.emissiveIntensity = 0.72
        moonGateLight.intensity = 3.2
      }

      // Smooth Camera Choreography:
      // In 'aura' mode: (0, 0.35, 4.6) looking at (0, -0.25, -0.8) so orb, pond, and Moon Gate stay framed
      const px = state.pointerParallax.x * motionScale
      const py = state.pointerParallax.y * motionScale
      if (state.tab === 'aura') {
        targetCamPos.set(px * 0.35, 0.35 + py * 0.2, 4.6)
        targetLookAt.set(
          coreGroup.position.x * 0.22,
          -0.25 + coreGroup.position.y * 0.2,
          -0.8
        )
      } else if (
        state.selectedIndex !== null &&
        lotuses[state.selectedIndex] &&
        lotuses[state.selectedIndex].group.visible
      ) {
        const sel = lotuses[state.selectedIndex]
        targetCamPos.set(
          sel.baseX * 0.65 + px * 0.2,
          0.35 + py * 0.15,
          sel.baseZ + 3.15
        )
        targetLookAt.set(sel.baseX, -1.15, sel.baseZ - 0.35)
      } else {
        const autoSway = state.userOrbited ? 0 : Math.sin(elapsed * 0.14) * 0.18 * motionScale
        const theta = state.orbitTheta + autoSway + px * 0.16
        const phi = state.orbitPhi + py * 0.04
        const radius = state.orbitRadius

        let centerZ = -1.6
        let lookY = -0.42
        let lookZ = -1.8
        if (state.cameraPreset === 'moongate') {
          centerZ = -2.2
          lookY = -0.05
          lookZ = -4.8
        } else if (state.cameraPreset === 'pond') {
          centerZ = -0.8
          lookY = -1.05
          lookZ = -1.4
        } else if (state.cameraPreset === 'canopy') {
          centerZ = -1.4
          lookY = 1.15
          lookZ = -4.6
        }

        targetCamPos.set(
          Math.sin(theta) * Math.cos(phi) * radius,
          -0.35 + Math.sin(phi) * radius,
          centerZ + Math.cos(theta) * Math.cos(phi) * radius
        )
        targetLookAt.set(Math.sin(theta) * 0.35, lookY, lookZ)
      }

      camera.position.lerp(targetCamPos, 0.06)
      currentLookAt.lerp(targetLookAt, 0.07)
      camera.lookAt(currentLookAt)

      renderer.render(scene, camera)
    }

    const handleVisibilityChange = () => {
      isTabHidden = document.hidden
      if (isTabHidden) {
        if (frameId) {
          window.cancelAnimationFrame(frameId)
          frameId = 0
        }
      } else {
        // Discard accumulated hidden tab delta and resume smoothly
        clock.getDelta()
        if (!frameId) {
          frameId = window.requestAnimationFrame(animate)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    if (!isTabHidden) {
      frameId = window.requestAnimationFrame(animate)
    }

    const handleResize = () => {
      if (!container) return
      const w = container.clientWidth || 800
      const h = container.clientHeight || 480
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)
    window.addEventListener('resize', handleResize)

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      motionQuery?.removeEventListener?.('change', onMotionPrefChange)
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleResize)
      renderer.domElement.removeEventListener('pointermove', onDomPointerMove)
      renderer.domElement.removeEventListener('click', onDomClick)
      geometries.forEach(g => g.dispose())
      materials.forEach(m => m.dispose())
      textures.forEach(t => t.dispose())
      renderer.dispose()
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  const dragStartRef = useRef<{ x: number; y: number; theta: number; phi: number } | null>(null)

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
      onPointerDown={e => {
        liveRef.current.dragDistance = 0
        if (tab === 'aura') {
          updateOrbFromPointer(e)
        } else {
          dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            theta: liveRef.current.orbitTheta,
            phi: liveRef.current.orbitPhi,
          }
          setIsDraggingOrbit(true)
        }
      }}
      onPointerMove={e => {
        const r = e.currentTarget.getBoundingClientRect()
        liveRef.current.pointerParallax = {
          x: ((e.clientX - r.left) / r.width - 0.5) * 2,
          y: (0.5 - (e.clientY - r.top) / r.height) * 2,
        }

        if (e.buttons === 1 && tab === 'aura') {
          updateOrbFromPointer(e)
        } else if (e.buttons === 1 && tab === 'garden' && dragStartRef.current) {
          const dx = e.clientX - dragStartRef.current.x
          const dy = e.clientY - dragStartRef.current.y
          const dist = Math.hypot(dx, dy)
          liveRef.current.dragDistance = dist
          if (dist > 3) {
            liveRef.current.userOrbited = true
            liveRef.current.orbitTheta = Math.max(
              -1.15,
              Math.min(1.15, dragStartRef.current.theta - dx * 0.0045)
            )
            liveRef.current.orbitPhi = Math.max(
              0.06,
              Math.min(0.62, dragStartRef.current.phi + dy * 0.0032)
            )
          }
        }
      }}
      onPointerUp={() => {
        dragStartRef.current = null
        setIsDraggingOrbit(false)
      }}
      onPointerLeave={() => {
        liveRef.current.pointerParallax = { x: 0, y: 0 }
        dragStartRef.current = null
        setIsDraggingOrbit(false)
      }}
      onWheel={e => {
        if (tab !== 'garden') return
        liveRef.current.userOrbited = true
        liveRef.current.orbitRadius = Math.max(
          3.6,
          Math.min(8.2, liveRef.current.orbitRadius + e.deltaY * 0.0032)
        )
      }}
      className={`relative h-full w-full select-none overflow-hidden rounded-[22px] bg-[radial-gradient(circle_at_50%_18%,rgba(126,200,184,0.16),rgba(8,7,17,0.96)_78%)] touch-none ${
        tab === 'aura'
          ? 'cursor-grab active:cursor-grabbing'
          : hoveredBloomIndex !== null || hoveredLanternIndex !== null
            ? 'cursor-pointer'
            : isDraggingOrbit
              ? 'cursor-grabbing'
              : 'cursor-grab'
      }`}
    >
      {tab === 'aura' && (
        <>
          <div className="axis-label axis-left pointer-events-none">low energy</div>
          <div className="axis-label axis-right pointer-events-none">high energy</div>
          <div className="axis-label axis-top pointer-events-none" style={{ top: '54px' }}>
            pleasant
          </div>
          <div className="axis-label axis-bottom pointer-events-none" style={{ bottom: '84px' }}>
            tender
          </div>
        </>
      )}

      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}
