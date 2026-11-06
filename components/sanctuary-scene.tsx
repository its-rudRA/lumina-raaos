'use client'

import { useEffect, useRef, useState } from 'react'
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
  selectedBloom?: CheckInRecord | null
  onSelectBloom?: (bloom: CheckInRecord | null) => void
  releaseBurstCount?: number
}

const MAX_LOTUSES = 24
const PARTICLE_COUNT = 130
const EMBER_COUNT = 60
const LANTERN_COUNT = 8

function colorForAuraLabel(label?: string, index = 0): number {
  if (label === 'Wired & Overthinking') return 0xe7a9bd
  if (label === 'Quietly Heavy') return 0x9584bf
  if (label === 'Softly Grounded') return 0x8ec9bd
  const palette = [0xe7a9bd, 0x8ec9bd, 0xb8a4d9]
  return palette[index % palette.length]
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
  const presets: Array<{ auraLabel: string; tags: string[]; orb: { x: number; y: number } }> = [
    {
      auraLabel: 'Softly Grounded',
      tags: ['Quietly tired', 'Need comfort'],
      orb: { x: 48, y: 52 },
    },
    {
      auraLabel: 'Quietly Heavy',
      tags: ['Tight chest', 'Quietly tired'],
      orb: { x: 32, y: 68 },
    },
    {
      auraLabel: 'Wired & Overthinking',
      tags: ['Overthinking', 'Academic pressure'],
      orb: { x: 72, y: 34 },
    },
  ]
  const pick = presets[index % presets.length]
  return {
    id: -(index + 1),
    timestamp: Date.now() - (index + 1) * 3600 * 1000 * 6,
    orb: pick.orb,
    auraLabel: pick.auraLabel,
    tags: pick.tags,
  }
}

/**
 * Procedural 128x128 soft radial glow texture (white-hot center -> tinted mid -> 0% alpha edge).
 * Eliminates harsh geometric sphere borders on lanterns, lotus hearts, and the Aura Core.
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
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)')
    grad.addColorStop(0.18, `rgba(${r}, ${g}, ${b}, 0.85)`)
    grad.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, 0.32)`)
    grad.addColorStop(0.75, `rgba(${r}, ${g}, ${b}, 0.07)`)
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)

    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 128, 128)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

/**
 * Creates a cupped, organic lotus petal BufferGeometry (curved spoon/cup silhouette instead of a sharp cone).
 */
function createCuppedPetalGeometry(
  length = 0.44,
  width = 0.19,
  cupDepth = 0.08
): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, 14, 12, 0, Math.PI, 0, Math.PI * 0.55)
  const pos = geo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i)
    const vy = pos.getY(i)
    const vz = pos.getZ(i)

    // Normalize along petal length [0..1] from base to tip
    const u = Math.max(0, Math.min(1, (vy + 0.25) / 1.25))
    // Taper width smoothly at base and tip, wider in the belly
    const widthProfile = Math.sin(u * Math.PI) * (1 - 0.2 * u)
    const sx = vx * width * widthProfile
    const sy = u * length
    // Cup inward and curve gracefully upward at the tip
    const cup = Math.pow(Math.sin(u * Math.PI), 1.2) * cupDepth + Math.pow(u, 2.2) * 0.09
    const sz = vz * cupDepth * 0.55 + cup

    pos.setXYZ(i, sx, sy, sz)
  }
  geo.computeVertexNormals()
  return geo
}

const AURORA_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  uniform float uTime;

  void main() {
    vUv = uv;
    vec3 pos = position;
    float curtainWave = sin(pos.x * 0.38 + uTime * 0.45) * 0.45
                      + cos(pos.x * 0.75 - uTime * 0.3) * 0.25;
    pos.z += curtainWave * uv.y;
    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

const AURORA_FRAGMENT_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  uniform float uTime;
  uniform vec3 uAuraColor;

  void main() {
    vec3 deepIndigo = vec3(0.075, 0.059, 0.149);
    vec3 sanctuaryTeal = vec3(0.494, 0.784, 0.722);

    float ribbon1 = sin(vUv.x * 16.0 + uTime * 0.55 + sin(vUv.y * 5.0 + uTime * 0.3)) * 0.5 + 0.5;
    float ribbon2 = cos(vUv.x * 23.0 - uTime * 0.38 + cos(vUv.y * 6.0)) * 0.5 + 0.5;
    float shimmer = pow(ribbon1 * ribbon2, 1.35);

    vec3 col = mix(deepIndigo, sanctuaryTeal, smoothstep(0.15, 0.8, ribbon1));
    col = mix(col, uAuraColor, smoothstep(0.3, 0.95, ribbon2) * 0.65);
    col += uAuraColor * shimmer * 0.35;

    // Soft vertical & horizontal fade so sky curtain has zero hard edges
    float vFade = smoothstep(0.0, 0.28, vUv.y) * smoothstep(1.0, 0.35, vUv.y);
    float hFade = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
    float alpha = (0.14 + shimmer * 0.34) * vFade * hFade;

    gl_FragColor = vec4(col, alpha);
  }
`

export function SanctuaryScene({
  tab,
  orb,
  setOrb,
  aura,
  blooms,
  checkIns,
  rainPlaying,
  immersive,
  selectedBloom,
  onSelectBloom,
  releaseBurstCount = 0,
}: SanctuarySceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [hoveredBloomIndex, setHoveredBloomIndex] = useState<number | null>(null)
  const [selectedBloomIndex, setSelectedBloomIndex] = useState<number | null>(null)

  const liveRef = useRef({
    tab,
    orb,
    auraColor: aura.color,
    blooms: Math.max(blooms, checkIns.length),
    checkIns,
    rainPlaying,
    immersive,
    pointerParallax: { x: 0, y: 0 },
    hoveredIndex: null as number | null,
    selectedIndex: null as number | null,
    emberTrigger: false,
    onSelectBloom,
  })

  useEffect(() => {
    liveRef.current.tab = tab
    liveRef.current.orb = orb
    liveRef.current.auraColor = aura.color
    liveRef.current.blooms = Math.max(blooms, checkIns.length)
    liveRef.current.checkIns = checkIns
    liveRef.current.rainPlaying = rainPlaying
    liveRef.current.immersive = immersive
    liveRef.current.onSelectBloom = onSelectBloom
    if (tab === 'aura') {
      liveRef.current.selectedIndex = null
      setSelectedBloomIndex(null)
    }
  }, [tab, orb, aura.color, blooms, checkIns, rainPlaying, immersive, onSelectBloom])

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

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth || 640
    const height = container.clientHeight || 440

    // 1. Scene, Deep Twilight Fog, Camera & Renderer
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x080711, 0.042)

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 120)
    camera.position.set(0, 0.85, 6.1)
    const currentLookAt = new THREE.Vector3(0, 0.05, 0)
    const targetLookAt = new THREE.Vector3(0, 0.05, 0)
    const targetCamPos = new THREE.Vector3(0, 0.85, 6.1)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(width, height)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.18
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

    // Shared procedural radial glow textures
    const whiteGlowTex = trackTex(createGlowTexture('#ffffff'))
    const goldGlowTex = trackTex(createGlowTexture('#f6d899'))
    const roseGlowTex = trackTex(createGlowTexture('#e7a9bd'))
    const tealGlowTex = trackTex(createGlowTexture('#8ec9bd'))

    // Lights
    const ambientLight = new THREE.AmbientLight(0x2b2542, 1.45)
    scene.add(ambientLight)

    const hemiLight = new THREE.HemisphereLight(0x8ec9bd, 0x0e0a18, 0.95)
    scene.add(hemiLight)

    const auraLight = new THREE.PointLight(
      new THREE.Color(liveRef.current.auraColor),
      5.5,
      20,
      1.35
    )
    auraLight.position.set(0, 0.9, 1.5)
    scene.add(auraLight)

    const treeLight = new THREE.PointLight(0xe7a9bd, 3.2, 14, 1.5)
    treeLight.position.set(0, 1.4, -5.2)
    scene.add(treeLight)

    // 2. Custom GLSL Aurora Borealis Sky Curtain & Starfield Dome
    const auroraGeo = trackGeo(new THREE.PlaneGeometry(34, 9.5, 72, 24))
    // Gently curve the aurora curtain around the distant horizon
    const auroraPos = auroraGeo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < auroraPos.count; i++) {
      const ax = auroraPos.getX(i)
      auroraPos.setZ(i, -Math.pow(ax * 0.08, 2) * 3.2)
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
    auroraCurtain.position.set(0, 2.75, -10.8)
    scene.add(auroraCurtain)

    // Distant Starfield Dome (160 soft stars in upper sky)
    const starCount = 160
    const starPositions = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 38
      starPositions[i * 3 + 1] = 0.6 + Math.random() * 10
      starPositions[i * 3 + 2] = -7 - Math.random() * 14
    }
    const starGeo = trackGeo(new THREE.BufferGeometry())
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    const starMat = trackMat(
      new THREE.PointsMaterial({
        size: 0.14,
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

    // 3. Horizon-Smoothed Reflective Sanctuary Water Disc (No hard polygon ridge)
    const waterGeo = trackGeo(new THREE.PlaneGeometry(48, 48, 72, 72))
    waterGeo.rotateX(-Math.PI / 2)
    const waterPosAttrInitial = waterGeo.attributes.position as THREE.BufferAttribute
    const waterColors = new Float32Array(waterPosAttrInitial.count * 3)
    const cCenter = new THREE.Color(0x13222b)
    const cHorizon = new THREE.Color(0x07060f)

    for (let i = 0; i < waterPosAttrInitial.count; i++) {
      const wx = waterPosAttrInitial.getX(i)
      const wz = waterPosAttrInitial.getZ(i)
      const dist = Math.hypot(wx, wz)
      // Curve distant vertices gently downward so no sharp horizon ridge ever appears
      const horizonDrop = Math.max(0, (dist - 10) * 0.12)
      waterPosAttrInitial.setY(i, -horizonDrop)

      const blend = Math.min(1, Math.pow(dist / 20, 1.35))
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
        emissive: 0x070c12,
        emissiveIntensity: 0.4,
        roughness: 0.2,
        metalness: 0.72,
        transparent: true,
        opacity: 0.94,
      })
    )
    const waterMesh = new THREE.Mesh(waterGeo, waterMat)
    waterMesh.position.y = -1.6
    scene.add(waterMesh)

    // 4. The Ancient Bioluminescent Sanctuary Tree on Distant Islet (z = -5.5)
    const isletGroup = new THREE.Group()
    isletGroup.position.set(0, -1.62, -5.5)
    scene.add(isletGroup)

    // Softly sculpted sanctuary islet mound
    const isletGeo = trackGeo(new THREE.SphereGeometry(2.35, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.48))
    isletGeo.scale(1.3, 0.28, 0.95)
    const isletMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x161b2c,
        emissive: 0x0c111d,
        roughness: 0.85,
        metalness: 0.1,
      })
    )
    const isletMesh = new THREE.Mesh(isletGeo, isletMat)
    isletGroup.add(isletMesh)

    // Shoreline bioluminescent ring around islet
    const shoreRingGeo = trackGeo(new THREE.RingGeometry(2.85, 3.05, 64))
    shoreRingGeo.rotateX(-Math.PI / 2)
    shoreRingGeo.scale(1.05, 0.75, 1)
    const shoreRingMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x8ec9bd,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
    )
    const shoreRing = new THREE.Mesh(shoreRingGeo, shoreRingMat)
    shoreRing.position.y = 0.08
    isletGroup.add(shoreRing)

    // Sculpted trunk & arching weeping branches using CatmullRomCurve3
    const trunkMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x261d32,
        emissive: 0x140d21,
        roughness: 0.65,
        metalness: 0.15,
      })
    )
    const mainTrunkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.4, 0),
      new THREE.Vector3(-0.12, 1.15, 0.08),
      new THREE.Vector3(0.08, 1.95, -0.05),
      new THREE.Vector3(0, 2.55, 0),
    ])
    const mainTrunkGeo = trackGeo(new THREE.TubeGeometry(mainTrunkCurve, 24, 0.18, 10, false))
    // Taper trunk radius upward
    const trunkPos = mainTrunkGeo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < trunkPos.count; i++) {
      const ty = trunkPos.getY(i)
      const taper = Math.max(0.35, 1 - (ty - 0.4) * 0.26)
      trunkPos.setX(i, trunkPos.getX(i) * taper)
      trunkPos.setZ(i, trunkPos.getZ(i) * taper)
    }
    mainTrunkGeo.computeVertexNormals()
    const trunkMesh = new THREE.Mesh(mainTrunkGeo, trunkMat)
    isletGroup.add(trunkMesh)

    const branchConfigs = [
      [
        new THREE.Vector3(0.04, 1.9, 0),
        new THREE.Vector3(0.75, 2.45, 0.35),
        new THREE.Vector3(1.55, 2.25, 0.55),
        new THREE.Vector3(1.85, 1.75, 0.65),
      ],
      [
        new THREE.Vector3(-0.04, 1.85, 0),
        new THREE.Vector3(-0.85, 2.4, 0.25),
        new THREE.Vector3(-1.6, 2.2, 0.45),
        new THREE.Vector3(-1.95, 1.7, 0.5),
      ],
      [
        new THREE.Vector3(0, 2.1, -0.04),
        new THREE.Vector3(0.6, 2.75, -0.5),
        new THREE.Vector3(1.25, 2.55, -0.85),
        new THREE.Vector3(1.45, 2.0, -1.0),
      ],
      [
        new THREE.Vector3(0, 2.05, -0.04),
        new THREE.Vector3(-0.65, 2.7, -0.45),
        new THREE.Vector3(-1.3, 2.5, -0.8),
        new THREE.Vector3(-1.5, 1.95, -0.95),
      ],
      [
        new THREE.Vector3(0, 2.35, 0),
        new THREE.Vector3(0.15, 2.95, 0.25),
        new THREE.Vector3(0.45, 2.85, 0.75),
      ],
    ]

    const canopyGroup = new THREE.Group()
    isletGroup.add(canopyGroup)

    interface TendrilSprite {
      sprite: THREE.Sprite
      baseX: number
      baseY: number
      baseZ: number
      phase: number
    }
    const treeTendrils: TendrilSprite[] = []

    branchConfigs.forEach((pts, bIdx) => {
      const curve = new THREE.CatmullRomCurve3(pts)
      const bGeo = trackGeo(new THREE.TubeGeometry(curve, 16, 0.055, 7, false))
      const bMesh = new THREE.Mesh(bGeo, trunkMat)
      canopyGroup.add(bMesh)

      // Blossom glow clusters & weeping light tendrils along each branch
      for (let k = 1; k <= 5; k++) {
        const pt = curve.getPoint(k / 5)
        const blossomMat = trackMat(
          new THREE.SpriteMaterial({
            map: (bIdx + k) % 2 === 0 ? roseGlowTex : tealGlowTex,
            color: (bIdx + k) % 2 === 0 ? 0xf3bfd1 : 0xa5e3d6,
            transparent: true,
            opacity: 0.72,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        )
        const blossom = new THREE.Sprite(blossomMat)
        const scale = 0.75 + (k % 3) * 0.28
        blossom.scale.set(scale, scale, 1)
        blossom.position.set(
          pt.x + (Math.random() - 0.5) * 0.25,
          pt.y + 0.12,
          pt.z + (Math.random() - 0.5) * 0.25
        )
        canopyGroup.add(blossom)

        // Hanging weeping light tendrils
        for (let d = 0; d < 3; d++) {
          const tMat = trackMat(
            new THREE.SpriteMaterial({
              map: goldGlowTex,
              color: d === 2 ? 0xf7e3b5 : 0xe7a9bd,
              transparent: true,
              opacity: 0.62 - d * 0.12,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
            })
          )
          const tSprite = new THREE.Sprite(tMat)
          tSprite.scale.set(0.24, 0.34, 1)
          const bx = pt.x + (bIdx % 2 === 0 ? 0.05 : -0.05)
          const by = pt.y - 0.18 - d * 0.26
          const bz = pt.z
          tSprite.position.set(bx, by, bz)
          canopyGroup.add(tSprite)
          treeTendrils.push({
            sprite: tSprite,
            baseX: bx,
            baseY: by,
            baseZ: bz,
            phase: bIdx * 1.1 + k * 0.7 + d * 0.4,
          })
        }
      }
    })

    // Central crown halo on the Sanctuary Tree
    const treeCrownMat = trackMat(
      new THREE.SpriteMaterial({
        map: roseGlowTex,
        color: 0xe7a9bd,
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )
    const treeCrown = new THREE.Sprite(treeCrownMat)
    treeCrown.scale.set(3.8, 2.8, 1)
    treeCrown.position.set(0, 2.45, 0)
    canopyGroup.add(treeCrown)

    // 5. The 3D Morphing Aura Core + Soft Optical Radial Bloom Sprite
    const coreGroup = new THREE.Group()
    scene.add(coreGroup)

    const coreGeo = trackGeo(new THREE.IcosahedronGeometry(1.12, 32))
    const coreBasePositions = new Float32Array(
      (coreGeo.attributes.position as THREE.BufferAttribute).array
    )
    const coreMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(liveRef.current.auraColor),
        emissive: new THREE.Color(liveRef.current.auraColor),
        emissiveIntensity: 0.68,
        roughness: 0.16,
        metalness: 0.1,
        transmission: 0.48,
        thickness: 1.3,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
      })
    )
    const coreMesh = new THREE.Mesh(coreGeo, coreMat)
    coreGroup.add(coreMesh)

    // Soft radial glow sprite wrapping the Aura Core (replaces harsh BackSide sphere)
    const coreGlowMat = trackMat(
      new THREE.SpriteMaterial({
        map: whiteGlowTex,
        color: new THREE.Color(liveRef.current.auraColor),
        transparent: true,
        opacity: 0.62,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )
    const coreGlowSprite = new THREE.Sprite(coreGlowMat)
    coreGlowSprite.scale.set(4.1, 4.1, 1)
    coreGroup.add(coreGlowSprite)

    const orbitRingGeo = trackGeo(new THREE.TorusGeometry(1.42, 0.014, 16, 84))
    const orbitRingMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.24,
        blending: THREE.AdditiveBlending,
      })
    )
    const orbitRing = new THREE.Mesh(orbitRingGeo, orbitRingMat)
    orbitRing.rotation.x = Math.PI / 2.6
    coreGroup.add(orbitRing)

    const rippleRingGeo = trackGeo(new THREE.RingGeometry(0.65, 0.73, 56))
    rippleRingGeo.rotateX(-Math.PI / 2)
    const rippleRingMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(liveRef.current.auraColor),
        transparent: true,
        opacity: 0.3,
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

    const padGeo = trackGeo(new THREE.CylinderGeometry(0.5, 0.45, 0.025, 28))
    const outerCuppedPetalGeo = trackGeo(createCuppedPetalGeometry(0.46, 0.2, 0.09))
    const midCuppedPetalGeo = trackGeo(createCuppedPetalGeometry(0.38, 0.17, 0.08))
    const innerCuppedPetalGeo = trackGeo(createCuppedPetalGeometry(0.29, 0.13, 0.07))
    const heartGeo = trackGeo(new THREE.SphereGeometry(0.11, 16, 16))
    const lotusRippleGeo = trackGeo(new THREE.RingGeometry(0.56, 0.62, 40))
    lotusRippleGeo.rotateX(-Math.PI / 2)
    const hitSphereGeo = trackGeo(new THREE.SphereGeometry(0.62, 12, 12))
    const hitSphereMat = trackMat(
      new THREE.MeshBasicMaterial({
        visible: false,
      })
    )

    const padMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x1a3836,
        emissive: 0x091a19,
        roughness: 0.62,
        metalness: 0.12,
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
    }

    const lotuses: LotusEntry[] = []
    const hitMeshes: THREE.Mesh[] = []

    for (let i = 0; i < MAX_LOTUSES; i++) {
      const angle = i * 2.39996 + 0.45
      const radius = 1.65 + Math.sqrt(i) * 1.28
      const baseX = Math.cos(angle) * radius
      const baseZ = Math.sin(angle) * (radius * 0.72) - 0.45

      const lotusGroup = new THREE.Group()
      lotusGroup.position.set(baseX, -1.56, baseZ)
      lotusGroup.userData = { bloomIndex: i }

      const pad = new THREE.Mesh(padGeo, padMat)
      lotusGroup.add(pad)

      // Delicate glowing water ripple ring beneath each flower
      const rippleMat = trackMat(
        new THREE.MeshBasicMaterial({
          color: colorForAuraLabel(liveRef.current.checkIns[i]?.auraLabel, i),
          transparent: true,
          opacity: 0.24,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        })
      )
      const lRipple = new THREE.Mesh(lotusRippleGeo, rippleMat)
      lRipple.position.y = 0.01
      lotusGroup.add(lRipple)

      const tintHex = colorForAuraLabel(liveRef.current.checkIns[i]?.auraLabel, i)
      const petalMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: tintHex,
          emissive: tintHex,
          emissiveIntensity: 0.58,
          roughness: 0.25,
          metalness: 0.08,
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
          color: 0xfff1c9,
        })
      )
      const heart = new THREE.Mesh(heartGeo, heartMat)
      heart.position.y = 0.1
      lotusGroup.add(heart)

      // Soft optical glow sprite inside the lotus heart
      const glowMat = trackMat(
        new THREE.SpriteMaterial({
          map: goldGlowTex,
          color: tintHex,
          transparent: true,
          opacity: 0.72,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      )
      const heartGlow = new THREE.Sprite(glowMat)
      heartGlow.scale.set(0.95, 0.95, 1)
      heartGlow.position.y = 0.18
      lotusGroup.add(heartGlow)

      // Raycast hit target sphere
      const hitMesh = new THREE.Mesh(hitSphereGeo, hitSphereMat)
      hitMesh.position.y = 0.15
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
      })
    }

    // 7. Spirit Lanterns with Soft Radial Glow Sprites (No harsh concentric circles!)
    interface LanternEntry {
      group: THREE.Group
      outerSprite: THREE.Sprite
      baseX: number
      baseY: number
      baseZ: number
      phase: number
    }
    const lanterns: LanternEntry[] = []
    for (let i = 0; i < LANTERN_COUNT; i++) {
      const lGroup = new THREE.Group()

      // Soft wide warm radial aura sprite
      const outerGlowMat = trackMat(
        new THREE.SpriteMaterial({
          map: goldGlowTex,
          color: 0xe6c88d,
          transparent: true,
          opacity: 0.65,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      )
      const outerSprite = new THREE.Sprite(outerGlowMat)
      outerSprite.scale.set(1.35, 1.35, 1)
      lGroup.add(outerSprite)

      // Bright soft inner flame sprite
      const innerGlowMat = trackMat(
        new THREE.SpriteMaterial({
          map: whiteGlowTex,
          color: 0xfff5db,
          transparent: true,
          opacity: 0.92,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      )
      const innerSprite = new THREE.Sprite(innerGlowMat)
      innerSprite.scale.set(0.45, 0.52, 1)
      lGroup.add(innerSprite)

      const angle = (i / LANTERN_COUNT) * Math.PI * 2 + 0.35
      const radius = 3.5 + (i % 3) * 1.35
      const baseX = Math.cos(angle) * radius
      const baseY = 0.85 + (i % 4) * 0.52
      const baseZ = Math.sin(angle) * radius - 1.5

      lGroup.position.set(baseX, baseY, baseZ)
      scene.add(lGroup)
      lanterns.push({
        group: lGroup,
        outerSprite,
        baseX,
        baseY,
        baseZ,
        phase: i * 1.13,
      })
    }

    // 8. Bioluminescent Firefly / Rain Starlight Particles
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
        size: 0.22,
        map: whiteGlowTex,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )
    const particles = new THREE.Points(particleGeo, particleMat)
    scene.add(particles)

    // 9. Burn & Release 3D Rising Ember Burst System (60 golden-rose embers)
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
        size: 0.34,
        map: goldGlowTex,
        color: 0xffd599,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )
    const emberPoints = new THREE.Points(emberGeo, emberMat)
    scene.add(emberPoints)

    const triggerEmberBurst = () => {
      emberLife = 1.0
      const ePos = emberGeo.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < EMBER_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2
        const rad = Math.random() * 1.8
        ePos.setXYZ(i, Math.cos(angle) * rad, -1.35 + Math.random() * 0.4, Math.sin(angle) * rad)
        emberVelocities[i * 3] = (Math.random() - 0.5) * 0.025
        emberVelocities[i * 3 + 1] = 0.032 + Math.random() * 0.045
        emberVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.025
      }
      ePos.needsUpdate = true
    }

    // Raycaster for hovering and clicking 3D Lotus Memories
    const raycaster = new THREE.Raycaster()
    const pointerNDC = new THREE.Vector2()

    const getIntersectedLotusIndex = (clientX: number, clientY: number): number | null => {
      if (liveRef.current.tab !== 'garden') return null
      const rect = renderer.domElement.getBoundingClientRect()
      pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1
      pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointerNDC, camera)

      const activeCount = Math.min(MAX_LOTUSES, Math.max(1, liveRef.current.blooms))
      const activeHitMeshes = hitMeshes.slice(0, activeCount)
      const hits = raycaster.intersectObjects(activeHitMeshes, false)
      if (hits.length > 0) {
        const idx = hits[0].object.userData?.bloomIndex
        if (typeof idx === 'number') return idx
      }
      return null
    }

    const onDomPointerMove = (ev: PointerEvent) => {
      const idx = getIntersectedLotusIndex(ev.clientX, ev.clientY)
      if (idx !== liveRef.current.hoveredIndex) {
        liveRef.current.hoveredIndex = idx
        setHoveredBloomIndex(idx)
      }
    }

    const onDomClick = (ev: MouseEvent) => {
      if (liveRef.current.tab !== 'garden') return
      const idx = getIntersectedLotusIndex(ev.clientX, ev.clientY)
      liveRef.current.selectedIndex = idx
      setSelectedBloomIndex(idx)
      if (idx !== null) {
        const record = liveRef.current.checkIns[idx] || getFallbackCheckIn(idx)
        liveRef.current.onSelectBloom?.(record)
      } else {
        liveRef.current.onSelectBloom?.(null)
      }
    }

    renderer.domElement.addEventListener('pointermove', onDomPointerMove)
    renderer.domElement.addEventListener('click', onDomClick)

    // 10. 60fps Animation Loop
    let frameId = 0
    const clock = new THREE.Clock()
    const tempColor = new THREE.Color()

    const animate = () => {
      frameId = window.requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()
      const state = liveRef.current

      // Update Aurora GLSL Shader uniforms
      auroraUniforms.uTime.value = elapsed
      tempColor.set(state.auraColor)
      auroraUniforms.uAuraColor.value.lerp(tempColor, 0.05)

      // Smoothly lerp Aura color across core, glow sprite, ripple, and point light
      coreMat.color.lerp(tempColor, 0.06)
      coreMat.emissive.lerp(tempColor, 0.06)
      coreGlowMat.color.lerp(tempColor, 0.06)
      rippleRingMat.color.lerp(tempColor, 0.06)
      auraLight.color.lerp(tempColor, 0.06)

      // Map orb.x [8..92] and orb.y [12..88] to 3D space
      const normX = (state.orb.x - 50) / 42
      const normY = (50 - state.orb.y) / 38

      const targetCoreX = state.tab === 'aura' ? normX * 2.15 : 0
      const targetCoreY =
        state.tab === 'aura'
          ? 0.25 + normY * 0.95 + Math.sin(elapsed * 1.6) * 0.08
          : 0.95 + Math.sin(elapsed * 1.2) * 0.14
      const targetCoreZ = state.tab === 'aura' ? 0.45 : -2.2
      const targetCoreScale = state.tab === 'aura' ? 1.0 : 0.48

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
      rippleRingMat.opacity = state.tab === 'aura' ? 0.3 : 0.12

      // Morphing 3D Aura Core vertex displacement
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

      // Sway Ancient Bioluminescent Sanctuary Tree tendrils in the breeze
      canopyGroup.rotation.z = Math.sin(elapsed * 0.55) * 0.025
      for (let i = 0; i < treeTendrils.length; i++) {
        const t = treeTendrils[i]
        t.sprite.position.x = t.baseX + Math.sin(elapsed * 1.3 + t.phase) * 0.08
        t.sprite.position.y = t.baseY + Math.cos(elapsed * 0.9 + t.phase) * 0.04
      }
      shoreRing.scale.setScalar(1 + Math.sin(elapsed * 1.4) * 0.04)

      // Undulating Reflective Sanctuary Water Plane (preserving horizon drop)
      const waterPosAttr = waterGeo.attributes.position as THREE.BufferAttribute
      const rainBoost = state.rainPlaying ? 1.85 : 1.0
      for (let i = 0; i < waterPosAttr.count; i++) {
        const ix = i * 3
        const wx = waterBasePositions[ix]
        const baseDropY = waterBasePositions[ix + 1]
        const wz = waterBasePositions[ix + 2]
        const distFromCore = Math.hypot(wx - coreGroup.position.x, wz - coreGroup.position.z)
        const swell =
          Math.sin(wx * 0.55 + elapsed * 1.15) * 0.05 +
          Math.cos(wz * 0.65 + elapsed * 0.95) * 0.04 +
          Math.sin(distFromCore * 2.4 - elapsed * 2.6 * rainBoost) * 0.022 * rainBoost
        waterPosAttr.setY(i, baseDropY + swell)
      }
      waterPosAttr.needsUpdate = true
      waterGeo.computeVertexNormals()

      // Update Organic 3D Lotus Flowers (Petal breathing + hover/select highlight + water ripples)
      const activeBlooms = Math.min(MAX_LOTUSES, Math.max(1, state.blooms))
      for (let i = 0; i < MAX_LOTUSES; i++) {
        const lotus = lotuses[i]
        const isVisible = i < activeBlooms
        const isHovered = state.hoveredIndex === i
        const isSelected = state.selectedIndex === i
        const targetLotusScale = !isVisible
          ? 0.001
          : isSelected
            ? 1.36
            : isHovered
              ? 1.2
              : 1.0

        lotus.currentScale += (targetLotusScale - lotus.currentScale) * 0.08
        lotus.group.visible = lotus.currentScale > 0.01
        if (lotus.group.visible) {
          lotus.group.scale.setScalar(lotus.currentScale)
          lotus.group.position.y =
            -1.55 + Math.sin(elapsed * 1.4 + lotus.phase) * 0.042
          lotus.group.rotation.y = elapsed * 0.1 + lotus.phase

          // Gentle petal opening/closing breath
          const breathOpen = Math.sin(elapsed * 1.2 + lotus.phase) * 0.08 + (isSelected ? 0.12 : 0)
          for (let p = 0; p < lotus.outerPivots.length; p++) {
            lotus.outerPivots[p].children[0].rotation.x = 0.92 + breathOpen
          }
          for (let p = 0; p < lotus.midPivots.length; p++) {
            lotus.midPivots[p].children[0].rotation.x = 0.62 + breathOpen * 0.75
          }
          for (let p = 0; p < lotus.innerPivots.length; p++) {
            lotus.innerPivots[p].children[0].rotation.x = 0.34 + breathOpen * 0.5
          }

          // Concentric water ripple pulse under each lotus
          const lRippleScale = 1 + ((elapsed * 0.55 + lotus.phase) % 1) * 0.65
          lotus.rippleMesh.scale.setScalar(lRippleScale)
          lotus.rippleMat.opacity =
            (1 - ((elapsed * 0.55 + lotus.phase) % 1)) * (isSelected ? 0.55 : 0.28)

          const checkInAura = state.checkIns[i]?.auraLabel
          const hex = colorForAuraLabel(checkInAura, i)
          tempColor.setHex(hex)
          lotus.petalMat.color.lerp(tempColor, 0.06)
          lotus.petalMat.emissive.lerp(tempColor, 0.06)
          lotus.petalMat.emissiveIntensity = isSelected || isHovered ? 0.92 : 0.58
          lotus.glowMat.color.lerp(tempColor, 0.06)
        }
      }

      // Update Soft Radial Spirit Lanterns
      for (let i = 0; i < lanterns.length; i++) {
        const l = lanterns[i]
        l.group.position.y = l.baseY + Math.sin(elapsed * 0.9 + l.phase) * 0.22
        l.group.position.x = l.baseX + Math.cos(elapsed * 0.45 + l.phase) * 0.18
        const pulse = 1.25 + Math.sin(elapsed * 2.0 + l.phase) * 0.18
        l.outerSprite.scale.set(pulse, pulse, 1)
      }

      // Update Bioluminescent Particles
      const pAttr = particleGeo.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        let py = pAttr.getY(i)
        let px = pAttr.getX(i)
        if (state.rainPlaying) {
          py -= 0.065
          if (py < -1.55) py = 4.6
        } else {
          py += 0.0085
          px += Math.sin(elapsed * 0.6 + particleSeeds[i]) * 0.003
          if (py > 4.6) py = -1.5
        }
        pAttr.setX(i, px)
        pAttr.setY(i, py)
      }
      pAttr.needsUpdate = true

      // Update Burn & Release 3D Rising Ember Burst
      if (state.emberTrigger) {
        state.emberTrigger = false
        triggerEmberBurst()
      }
      if (emberLife > 0.005) {
        emberLife = Math.max(0, emberLife - 0.0055)
        emberMat.opacity = Math.min(0.95, emberLife * 1.35)
        const ePos = emberGeo.attributes.position as THREE.BufferAttribute
        for (let i = 0; i < EMBER_COUNT; i++) {
          const ex = ePos.getX(i) + emberVelocities[i * 3] + Math.sin(elapsed * 2.5 + i) * 0.008
          const ey = ePos.getY(i) + emberVelocities[i * 3 + 1]
          const ez = ePos.getZ(i) + emberVelocities[i * 3 + 2]
          ePos.setXYZ(i, ex, ey, ez)
        }
        ePos.needsUpdate = true
      } else {
        emberMat.opacity = 0
      }

      // Smooth Camera Choreography (focuses on selected lotus bloom when inspected!)
      const px = state.pointerParallax.x
      const py = state.pointerParallax.y
      if (state.tab === 'aura') {
        targetCamPos.set(px * 0.55, 0.55 + py * 0.35, state.immersive ? 5.05 : 5.6)
        targetLookAt.set(
          coreGroup.position.x * 0.35,
          coreGroup.position.y * 0.45 - 0.08,
          0
        )
      } else if (
        state.selectedIndex !== null &&
        lotuses[state.selectedIndex] &&
        lotuses[state.selectedIndex].group.visible
      ) {
        const sel = lotuses[state.selectedIndex]
        targetCamPos.set(
          sel.baseX * 0.65 + px * 0.25,
          0.45 + py * 0.2,
          sel.baseZ + 3.45
        )
        targetLookAt.set(sel.baseX, -1.1, sel.baseZ - 0.4)
      } else {
        const orbitAngle = Math.sin(elapsed * 0.15) * 0.38 + px * 0.42
        const camRadius = state.immersive ? 7.4 : 8.1
        targetCamPos.set(
          Math.sin(orbitAngle) * camRadius,
          1.45 + py * 0.4,
          Math.cos(orbitAngle) * camRadius
        )
        targetLookAt.set(0, -0.45, -1.5)
      }

      camera.position.lerp(targetCamPos, 0.045)
      currentLookAt.lerp(targetLookAt, 0.06)
      camera.lookAt(currentLookAt)

      renderer.render(scene, camera)
    }

    frameId = window.requestAnimationFrame(animate)

    const handleResize = () => {
      if (!container) return
      const w = container.clientWidth || 640
      const h = container.clientHeight || 440
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

  const activeBloomRecord =
    selectedBloomIndex !== null
      ? checkIns[selectedBloomIndex] || getFallbackCheckIn(selectedBloomIndex)
      : selectedBloom || null

  return (
    <div
      onPointerDown={e => {
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
      className={`relative w-full select-none overflow-hidden rounded-[20px] border border-white/[0.1] bg-[radial-gradient(circle_at_50%_20%,rgba(126,200,184,0.15),rgba(8,7,17,0.96)_78%)] touch-none ${
        immersive ? 'h-[68vh] min-h-[540px]' : 'h-[420px] sm:h-[460px]'
      } ${
        tab === 'aura'
          ? 'cursor-grab active:cursor-grabbing'
          : hoveredBloomIndex !== null
            ? 'cursor-pointer'
            : 'cursor-default'
      }`}
    >
      {tab === 'aura' && (
        <>
          <div className="axis-label axis-left pointer-events-none">low energy</div>
          <div className="axis-label axis-right pointer-events-none">high energy</div>
          <div className="axis-label axis-top pointer-events-none">pleasant</div>
          <div className="axis-label axis-bottom pointer-events-none">tender</div>
        </>
      )}

      <div ref={containerRef} className="h-full w-full" />

      {/* Top-left floating spatial telemetry pill */}
      <div className="pointer-events-none absolute left-3.5 top-3.5 flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/40 px-3 py-1 text-[10px] tracking-wider text-white/70 backdrop-blur-md">
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
            : `BIOLUMINESCENT POND · CLICK ANY LOTUS (${Math.max(blooms, checkIns.length)} BLOOMS)`}
        </span>
      </div>

      {/* Floating 3D Memory Pill when a Lotus Bloom is clicked in Garden mode */}
      {tab === 'garden' && activeBloomRecord && (
        <div
          onClick={e => e.stopPropagation()}
          className=" absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.14] bg-[#120f1d]/85 px-4 py-3 text-xs backdrop-blur-xl sm:left-auto sm:right-4 sm:max-w-sm"
        >
          <div>
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{
                  background: `#${colorForAuraLabel(activeBloomRecord.auraLabel).toString(16)}`,
                }}
              />
              <span className="font-serif text-base text-white">
                {activeBloomRecord.auraLabel}
              </span>
              <span className="text-[10px] text-white/45">
                · {formatRelativeTime(activeBloomRecord.timestamp)}
              </span>
            </div>
            {activeBloomRecord.tags.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {activeBloomRecord.tags.map(t => (
                  <span
                    key={t}
                    className="rounded-full border border-white/[0.1] bg-white/[0.06] px-2 py-0.5 text-[10px] text-[#f4d9e2]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              liveRef.current.selectedIndex = null
              setSelectedBloomIndex(null)
              onSelectBloom?.(null)
            }}
            className="secondary-button py-1 px-2.5 text-[10px]"
          >
            Reset view
          </button>
        </div>
      )}
    </div>
  )
}
