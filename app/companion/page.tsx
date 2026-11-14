'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Bot,
  Check,
  Compass,
  Edit3,
  Eye,
  EyeOff,
  Lock,
  Mic,
  MicOff,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  Waves,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { useSanctuary, type MemoryCategory } from '@/context/sanctuary-context'
import { glass, SOMATIC_TAGS, shortDate, timeAgo } from '@/lib/format'
import { getFrameIntervalMs, getMaxDpr, isMobileRuntime } from '@/lib/perf'

const PERSONAS: Array<{
  name: string
  desc: string
  badge: string
  color: string
  secondaryColor: string
}> = [
  {
    name: 'The Listener',
    desc: 'Deep emotional validation & warm presence—zero unsolicited advice.',
    badge: 'Validation',
    color: '#e8a4b8',
    secondaryColor: '#b8a4e8',
  },
  {
    name: 'The Grounder',
    desc: 'Sensory grounding cues, gentle breathing & body awareness.',
    badge: 'Somatic',
    color: '#7ec8b8',
    secondaryColor: '#7eb8c8',
  },
  {
    name: 'The Guide',
    desc: 'Breaks overwhelming moments into tiny, realistic next steps.',
    badge: 'Clarity',
    color: '#f3d9a4',
    secondaryColor: '#7ec8b8',
  },
  {
    name: 'Boundary Coach',
    desc: 'Helps phrase compassionate boundaries & protect rest without guilt.',
    badge: 'Boundaries',
    color: '#b8a4e8',
    secondaryColor: '#e8a4b8',
  },
]

const STARTERS = [
  'Everything feels urgent right now',
  'I need help protecting my rest',
  'Help me slow down my thoughts',
  'I feel quietly overwhelmed',
]

const MESSAGE_REACTIONS = [
  '💗 This helped me',
  '🌿 I feel calmer',
  '🫂 I feel understood',
  '✨ I feel hopeful',
  '🌙 I need more rest',
]

const MEMORY_CATEGORIES: Array<{ value: MemoryCategory; label: string }> = [
  { value: 'anchor', label: 'Anchor' },
  { value: 'preference', label: 'Preference' },
  { value: 'trigger', label: 'Trigger' },
  { value: 'coping', label: 'Coping' },
  { value: 'context', label: 'Context' },
  { value: 'reflection', label: 'Reflection' },
  { value: 'boundary', label: 'Boundary' },
]

// ---------------------------------------------------------------------------
// Live Reactive "AI is Talking / Thinking / Listening" Animated Background
// ---------------------------------------------------------------------------

type AiAuraState = 'idle' | 'typing' | 'thinking' | 'speaking'

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const num = Number.parseInt(clean, 16)
  if (Number.isNaN(num)) return [126, 200, 184]
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

function AiLivingAuraBackground({
  state,
  persona,
  typingPulse,
}: {
  state: AiAuraState
  persona: string
  typingPulse: number
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stateRef = useRef({ state, persona, typingPulse })

  useEffect(() => {
    stateRef.current = { state, persona, typingPulse }
  }, [state, persona, typingPulse])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId = 0
    const dpr = getMaxDpr(2)

    const resize = () => {
      const parent = canvas.parentElement
      const w = parent?.clientWidth || 720
      const h = parent?.clientHeight || 520
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const observer = new ResizeObserver(resize)
    if (canvas.parentElement) observer.observe(canvas.parentElement)

    interface HarmonicParticle {
      x: number
      y: number
      vy: number
      size: number
      phase: number
    }

    const particles: HarmonicParticle[] = Array.from({ length: 42 }, (_, i) => ({
      x: (i / 42) * 800,
      y: Math.random() * 520,
      vy: 0.35 + Math.random() * 0.85,
      size: 1.2 + Math.random() * 2.2,
      phase: Math.random() * Math.PI * 2,
    }))

    interface InwardRipple {
      radius: number
      alpha: number
    }
    const ripples: InwardRipple[] = []
    let lastPulseSeen = stateRef.current.typingPulse

    const mobile = isMobileRuntime()
    const frameInterval = getFrameIntervalMs(16.5)
    let isInViewport = true
    let isTabHidden = typeof document !== 'undefined' ? document.hidden : false
    const start = performance.now()
    let lastDraw = 0
    const render = (now: number) => {
      // PERF: pause loop while off-screen or backgrounded and cap to 30fps on mobile WebView.
      if (isTabHidden || !isInViewport) {
        animId = 0
        return
      }
      if (now - lastDraw < frameInterval) {
        animId = window.requestAnimationFrame(render)
        return
      }
      lastDraw = now
      const t = (now - start) / 1000
      const w = canvas.width / dpr
      const h = canvas.height / dpr
      const cx = w * 0.5
      const cy = h * 0.44

      const { state: mode, persona: activeName, typingPulse: pCount } = stateRef.current
      const pDef = PERSONAS.find(p => p.name === activeName) ?? PERSONAS[0]
      const [r1, g1, b1] = hexToRgb(pDef.color)
      const [r2, g2, b2] = hexToRgb(pDef.secondaryColor)

      if (pCount !== lastPulseSeen) {
        lastPulseSeen = pCount
        ripples.push({ radius: Math.min(w, h) * 0.42, alpha: 0.42 })
        if (ripples.length > 7) ripples.shift()
      }

      ctx.clearRect(0, 0, w, h)

      // 1. Central Breathing 3D-Styled AI Core Halo
      const coreBoost =
        mode === 'speaking'
          ? 1.28 + Math.sin(t * 9.5) * 0.16
          : mode === 'thinking'
            ? 1.15 + Math.sin(t * 5.2) * 0.12
            : mode === 'typing'
              ? 1.08 + Math.sin(t * 3.6) * 0.06
              : 1.0 + Math.sin(t * 1.6) * 0.05

      const baseRadius = Math.min(w, h) * 0.24 * coreBoost
      const nebula = ctx.createRadialGradient(cx, cy, 8, cx, cy, baseRadius * 1.65)
      nebula.addColorStop(
        0,
        `rgba(${r1}, ${g1}, ${b1}, ${mode === 'speaking' ? 0.34 : mode === 'thinking' ? 0.28 : 0.16})`
      )
      nebula.addColorStop(
        0.48,
        `rgba(${r2}, ${g2}, ${b2}, ${mode === 'speaking' ? 0.18 : 0.09})`
      )
      nebula.addColorStop(1, 'rgba(9, 10, 20, 0)')
      ctx.fillStyle = nebula
      ctx.fillRect(0, 0, w, h)

      // 2. Concentric Inward Ripples when User is Typing
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i]
        rp.radius -= 2.6
        rp.alpha *= 0.965
        if (rp.radius <= 16 || rp.alpha <= 0.02) {
          ripples.splice(i, 1)
          continue
        }
        ctx.save()
        ctx.strokeStyle = `rgba(${r1}, ${g1}, ${b1}, ${rp.alpha})`
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(cx, cy, rp.radius, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }

      // 3. Vocal Equalizer Halos & Multi-Band Acoustic Sine Waves (Speaking / Thinking / Idle)
      const waveBands = mode === 'speaking' ? 4 : mode === 'thinking' ? 3 : 2
      for (let band = 0; band < waveBands; band++) {
        const amp =
          mode === 'speaking'
            ? (18 + band * 9) * (0.65 + 0.35 * Math.sin(t * 6.5 + band))
            : mode === 'thinking'
              ? 10 + band * 5
              : mode === 'typing'
                ? 7 + band * 4
                : 4 + band * 3
        const freq = mode === 'speaking' ? 0.018 + band * 0.005 : 0.012 + band * 0.004
        const speed = mode === 'speaking' ? 5.4 + band * 1.3 : mode === 'thinking' ? 3.2 : 1.1
        const alpha =
          mode === 'speaking'
            ? 0.28 - band * 0.05
            : mode === 'thinking'
              ? 0.2 - band * 0.04
              : 0.1 - band * 0.03

        ctx.save()
        ctx.beginPath()
        ctx.strokeStyle =
          band % 2 === 0
            ? `rgba(${r1}, ${g1}, ${b1}, ${alpha})`
            : `rgba(${r2}, ${g2}, ${b2}, ${alpha})`
        ctx.lineWidth = mode === 'speaking' ? 2.2 : 1.4
        const yCenter = cy + (band - 1) * 26
        for (let x = 0; x <= w; x += 8) {
          const edgeAttenuation = Math.sin((x / w) * Math.PI)
          const y =
            yCenter +
            Math.sin(x * freq + t * speed + band) * amp * edgeAttenuation +
            Math.cos(x * freq * 1.6 - t * (speed * 0.7)) * (amp * 0.45) * edgeAttenuation
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
        ctx.restore()
      }

      // 4. Orbiting Neural Fireflies when Thinking + 32-Bar Circular Vocal Equalizer Ring when Speaking/Thinking
      if (mode === 'thinking') {
        const fireflyCount = 10
        for (let f = 0; f < fireflyCount; f++) {
          const orbitAngle = t * (2.1 + (f % 3) * 0.45) + (f / fireflyCount) * Math.PI * 2
          const orbitRadius = 46 + (f % 4) * 18 + Math.sin(t * 3.4 + f) * 8
          const fx = cx + Math.cos(orbitAngle) * orbitRadius
          const fy = cy + Math.sin(orbitAngle) * (orbitRadius * 0.72)
          ctx.save()
          ctx.fillStyle = f % 2 === 0 ? `rgba(${r1}, ${g1}, ${b1}, 0.88)` : 'rgba(243, 217, 164, 0.9)'
          if (!mobile) {
            ctx.shadowColor = f % 2 === 0 ? pDef.color : '#f3d9a4'
            ctx.shadowBlur = 14
          }
          ctx.beginPath()
          ctx.arc(fx, fy, 2.6 + (f % 2) * 1.1, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }
      }

      if (mode === 'speaking' || mode === 'thinking') {
        const bars = 32
        const ringRad = 54
        ctx.save()
        ctx.translate(cx, cy)
        for (let i = 0; i < bars; i++) {
          const angle = (i / bars) * Math.PI * 2 + t * 0.4
          const vocalMod =
            mode === 'speaking'
              ? Math.abs(Math.sin(t * 8.5 + i * 0.55) * Math.cos(t * 5.2 - i * 0.3)) * 28
              : Math.abs(Math.sin(t * 3.8 + i * 0.4)) * 11
          const inner = ringRad
          const outer = ringRad + 5 + vocalMod
          ctx.strokeStyle =
            i % 2 === 0
              ? `rgba(${r1}, ${g1}, ${b1}, 0.42)`
              : `rgba(${r2}, ${g2}, ${b2}, 0.36)`
          ctx.lineWidth = 2.2
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner)
          ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer)
          ctx.stroke()
        }
        ctx.restore()
      }

      // 5. Rising Harmonic Particles
      const speedMult = mode === 'speaking' ? 2.4 : mode === 'thinking' ? 1.7 : 0.75
      for (const pt of particles) {
        pt.y -= pt.vy * speedMult
        if (pt.y < -10) {
          pt.y = h + 10
          pt.x = Math.random() * w
        }
        const px = pt.x + Math.sin(t * 1.2 + pt.phase) * 12
        ctx.save()
        ctx.fillStyle = `rgba(${r1}, ${g1}, ${b1}, ${mode === 'speaking' ? 0.45 : 0.22})`
        ctx.beginPath()
        ctx.arc(px, pt.y, pt.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      animId = window.requestAnimationFrame(render)
    }

    const syncPlayback = () => {
      if (isTabHidden || !isInViewport) {
        if (animId) {
          window.cancelAnimationFrame(animId)
          animId = 0
        }
      } else if (!animId) {
        lastDraw = 0
        animId = window.requestAnimationFrame(render)
      }
    }

    const onVisibilityChange = () => {
      isTabHidden = document.hidden
      syncPlayback()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    const viewportObserver =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            ([entry]) => {
              isInViewport = entry ? entry.isIntersecting : true
              syncPlayback()
            },
            { threshold: 0.02 }
          )
        : null
    viewportObserver?.observe(canvas)

    if (!isTabHidden && isInViewport) {
      animId = window.requestAnimationFrame(render)
    }
    return () => {
      if (animId) window.cancelAnimationFrame(animId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      viewportObserver?.disconnect()
      observer.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  )
}

// ---------------------------------------------------------------------------
// Deterministic Guided Sanctuary Bot Flows (Branching Interactive Conversations)
// ---------------------------------------------------------------------------

interface GuidedStepOption {
  label: string
  userReply: string
  nextNodeId: string
}

interface GuidedNode {
  id: string
  botMessage: string
  memorySuggestion?: { text: string; category: MemoryCategory }
  options: GuidedStepOption[]
}

interface GuidedFlow {
  id: string
  title: string
  subtitle: string
  emoji: string
  startNodeId: string
  nodes: Record<string, GuidedNode>
}

const GUIDED_FLOWS: GuidedFlow[] = [
  {
    id: 'overthinking',
    title: 'Overthinking Unknotter',
    subtitle: 'Untangle looping thoughts step-by-step',
    emoji: '🫧',
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        botMessage:
          'Let’s gently slow down the loop together. When you notice your mind spinning right now, what kind of thought is taking up the most room?',
        options: [
          {
            label: 'Worrying about a future outcome',
            userReply: 'I keep worrying about something in the future.',
            nextNodeId: 'future',
          },
          {
            label: 'Replaying a past conversation',
            userReply: 'I am replaying a past conversation or mistake.',
            nextNodeId: 'past',
          },
          {
            label: 'Too many tasks all at once',
            userReply: 'Everything feels tangled and urgent at once.',
            nextNodeId: 'tasks',
          },
        ],
      },
      future: {
        id: 'future',
        botMessage:
          'Future-tripping happens when your mind tries to protect you by rehearsing every scenario. Which part of this future event is actually within your control in the next 30 minutes?',
        options: [
          {
            label: 'Nothing tonight—I just need to wait',
            userReply: 'Honestly, nothing I can control tonight.',
            nextNodeId: 'future_wait',
          },
          {
            label: 'One small preparation step',
            userReply: 'There is one small step I can prepare.',
            nextNodeId: 'future_step',
          },
        ],
      },
      future_wait: {
        id: 'future_wait',
        botMessage:
          'Naming that is huge relief: if no action can be taken tonight, worrying tonight is unpaid overtime. Give yourself permission to park this thought on the shelf until tomorrow morning.',
        memorySuggestion: {
          text: 'When future outcomes cannot be acted on tonight, I have permission to set the thought down until morning.',
          category: 'coping',
        },
        options: [
          {
            label: 'Start another guided flow',
            userReply: 'Thank you. Let’s return to the start.',
            nextNodeId: 'start',
          },
        ],
      },
      future_step: {
        id: 'future_step',
        botMessage:
          'Beautiful. Spend just 10 focused minutes on that single small piece—or write it on a sticky note for tomorrow—and declare the rest of the evening off-duty.',
        memorySuggestion: {
          text: 'One 10-minute preparation step is enough to quiet future-looping thoughts.',
          category: 'anchor',
        },
        options: [
          {
            label: 'Restart Overthinking Unknotter',
            userReply: 'Let’s restart this flow.',
            nextNodeId: 'start',
          },
        ],
      },
      past: {
        id: 'past',
        botMessage:
          'Replaying a moment usually means you care deeply about how you show up. If a dear friend told you they had that exact interaction, how would you speak to them?',
        options: [
          {
            label: 'I would tell them it was human & forgivable',
            userReply: 'I would tell a friend that it was human and okay.',
            nextNodeId: 'past_compassion',
          },
          {
            label: 'I would suggest a short check-in message',
            userReply: 'Maybe a brief, warm follow-up note if needed.',
            nextNodeId: 'past_repair',
          },
        ],
      },
      past_compassion: {
        id: 'past_compassion',
        botMessage:
          'Offer yourself that same warmth right now. People remember far less of our awkward moments than our anxious minds convince us they do.',
        memorySuggestion: {
          text: 'Speak to myself after social moments with the same forgiveness I offer a close friend.',
          category: 'reflection',
        },
        options: [
          {
            label: 'Restart Overthinking Unknotter',
            userReply: 'Thank you—let’s reset.',
            nextNodeId: 'start',
          },
        ],
      },
      past_repair: {
        id: 'past_repair',
        botMessage:
          'A simple one-line note (“Hey, loved catching up earlier—hope your week goes smoothly!”) is plenty. Once sent or decided, let the replay dissolve.',
        memorySuggestion: {
          text: 'A simple, warm one-line check-in is enough when social overthinking flares up.',
          category: 'coping',
        },
        options: [
          {
            label: 'Restart Overthinking Unknotter',
            userReply: 'Let’s reset.',
            nextNodeId: 'start',
          },
        ],
      },
      tasks: {
        id: 'tasks',
        botMessage:
          'When ten things shout at once, your nervous system freezes. If you only had energy for ONE 15-minute block today and everything else waited, what would bring the most relief?',
        options: [
          {
            label: 'The quickest 5-minute win',
            userReply: 'Knocking out the smallest 5-minute item first.',
            nextNodeId: 'tasks_done',
          },
          {
            label: 'Resting first because my battery is empty',
            userReply: 'Resting first—my battery is genuinely empty.',
            nextNodeId: 'tasks_rest',
          },
        ],
      },
      tasks_done: {
        id: 'tasks_done',
        botMessage:
          'Do just that 5-minute win, then stop and celebrate it. Momentum grows from kindness, never from pressure.',
        memorySuggestion: {
          text: 'When overwhelmed by tasks, start with one 5-minute win and let the rest wait.',
          category: 'coping',
        },
        options: [
          {
            label: 'Restart Overthinking Unknotter',
            userReply: 'Back to start.',
            nextNodeId: 'start',
          },
        ],
      },
      tasks_rest: {
        id: 'tasks_rest',
        botMessage:
          'Honoring an empty battery is wise, not lazy. Take 20 minutes of guilt-free rest with the rain soundscape before touching any list.',
        memorySuggestion: {
          text: 'Resting when my emotional battery is empty is productive self-preservation.',
          category: 'anchor',
        },
        options: [
          {
            label: 'Restart Overthinking Unknotter',
            userReply: 'Back to start.',
            nextNodeId: 'start',
          },
        ],
      },
    },
  },
  {
    id: 'pressure',
    title: 'Exam / Work Pressure Triage',
    subtitle: 'Separate your human worth from deadlines',
    emoji: '🌿',
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        botMessage:
          'Academic and work pressure can make it feel like your entire worth rides on the next deadline. Where do you feel that pressure most right now?',
        options: [
          {
            label: 'Fear of falling behind or disappointing others',
            userReply: 'I am afraid of falling behind or letting people down.',
            nextNodeId: 'disappoint',
          },
          {
            label: 'Perfectionism keeping me stuck from starting',
            userReply: 'Perfectionism is making it hard to even start.',
            nextNodeId: 'perfectionism',
          },
        ],
      },
      disappoint: {
        id: 'disappoint',
        botMessage:
          'You are a whole human being, not a productivity machine. Even if a deadline shifts or a grade is imperfect, your safety and dignity remain intact. Would a “good-enough” draft take 60% of the weight off today?',
        options: [
          {
            label: 'Yes—aiming for B+ / good-enough helps',
            userReply: 'Yes, aiming for a calm good-enough version helps.',
            nextNodeId: 'good_enough',
          },
        ],
      },
      perfectionism: {
        id: 'perfectionism',
        botMessage:
          'Perfectionism is often fear dressed up as high standards. Give yourself permission to write a “messy version zero” that nobody else ever has to see.',
        options: [
          {
            label: 'I will try 10 minutes of messy version zero',
            userReply: 'I can do 10 minutes of a messy draft.',
            nextNodeId: 'good_enough',
          },
        ],
      },
      good_enough: {
        id: 'good_enough',
        botMessage:
          'A calm “good enough” completed with your peace intact is always better than perfection bought with burnout.',
        memorySuggestion: {
          text: 'A calm "good enough" draft protects my peace better than perfectionism.',
          category: 'anchor',
        },
        options: [
          {
            label: 'Restart Pressure Triage',
            userReply: 'Start over.',
            nextNodeId: 'start',
          },
        ],
      },
    },
  },
  {
    id: 'bedtime',
    title: 'Bedtime Mind Unload',
    subtitle: 'Set down mental tabs before sleep',
    emoji: '🌙',
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        botMessage:
          'Nighttime often amplifies every unfinished thought because the world gets quiet. What is keeping your nervous system alert tonight?',
        options: [
          {
            label: 'Mental to-do list for tomorrow',
            userReply: 'My brain keeps listing everything I have to do tomorrow.',
            nextNodeId: 'tomorrow_list',
          },
          {
            label: 'Body feels wired even though I am tired',
            userReply: 'My body feels wired even though I am exhausted.',
            nextNodeId: 'wired_body',
          },
        ],
      },
      tomorrow_list: {
        id: 'tomorrow_list',
        botMessage:
          'Tomorrow-you is capable and will handle tomorrow’s tasks when the sun is up. Tonight-you has only one job: rest. Let’s close the browser tabs in your mind one by one.',
        memorySuggestion: {
          text: 'At night, tomorrow-me will handle tomorrow; tonight-me only needs to rest.',
          category: 'preference',
        },
        options: [
          {
            label: 'Restart Bedtime Unload',
            userReply: 'Reset flow.',
            nextNodeId: 'start',
          },
        ],
      },
      wired_body: {
        id: 'wired_body',
        botMessage:
          'When you are overtired, cortisol can keep your chest buzzing. Unclench your jaw, let your tongue rest softly, and take three slow 4-second inhales and 6-second exhales.',
        memorySuggestion: {
          text: 'Slow 4s/6s breathing and unclenching my jaw helps when I feel wired at night.',
          category: 'coping',
        },
        options: [
          {
            label: 'Restart Bedtime Unload',
            userReply: 'Reset flow.',
            nextNodeId: 'start',
          },
        ],
      },
    },
  },
  {
    id: 'boundary',
    title: 'Boundary Script Builder',
    subtitle: 'Craft a warm, guilt-free boundary message',
    emoji: '💗',
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        botMessage:
          'Saying no or asking for space does not make you unkind. Who do you need to set a gentle boundary with today?',
        options: [
          {
            label: 'A friend or family member when my battery is low',
            userReply: 'A friend or family member—my social battery is low.',
            nextNodeId: 'social_script',
          },
          {
            label: 'A classmate, colleague, or group project',
            userReply: 'A classmate or colleague asking for last-minute work.',
            nextNodeId: 'work_script',
          },
        ],
      },
      social_script: {
        id: 'social_script',
        botMessage:
          'Here is a warm script you can use: “I love hearing from you, and my battery is really quiet tonight. I’m going to rest offline and will reply properly tomorrow when I’m recharged 💗”',
        memorySuggestion: {
          text: 'Boundary script: "My battery is quiet tonight—I’m resting offline and will reply tomorrow."',
          category: 'boundary',
        },
        options: [
          {
            label: 'Build another boundary script',
            userReply: 'Back to start.',
            nextNodeId: 'start',
          },
        ],
      },
      work_script: {
        id: 'work_script',
        botMessage:
          'Here is a clear, respectful script: “Thanks for sending this over! I’m offline for the evening to recharge, and I will take a look at this tomorrow morning at [time].”',
        memorySuggestion: {
          text: 'Work boundary: "I’m offline for the evening and will review this tomorrow morning."',
          category: 'boundary',
        },
        options: [
          {
            label: 'Build another boundary script',
            userReply: 'Back to start.',
            nextNodeId: 'start',
          },
        ],
      },
    },
  },
]

interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

function CompanionContent() {
  const {
    aiStatus,
    aiThinking,
    aiMemoryEnabled,
    setAiMemoryEnabled,
    companion,
    setCompanion,
    companionHistory,
    sendCompanionThought,
    reactToCompanionMessage,
    memories,
    addMemory,
    editMemory,
    toggleMemoryShare,
    removeMemory,
  } = useSanctuary()

  const [experienceTab, setExperienceTab] = useState<'companion' | 'guided'>('companion')
  const [input, setInput] = useState('')
  const [typingPulse, setTypingPulse] = useState(0)
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [listening, setListening] = useState(false)
  const [voiceNote, setVoiceNote] = useState('')

  // Reactive AI Speaking & Voice Response state
  const [aiSpeakingVisual, setAiSpeakingVisual] = useState(false)
  const [voiceReadAloud, setVoiceReadAloud] = useState(false)
  const speakingTimerRef = useRef<number | null>(null)

  // Memory Vault form & inline editing state
  const [memText, setMemText] = useState('')
  const [memCat, setMemCat] = useState<MemoryCategory>('anchor')
  const [editingMemId, setEditingMemId] = useState<string | null>(null)
  const [editMemText, setEditMemText] = useState('')
  const [editMemCat, setEditMemCat] = useState<MemoryCategory>('anchor')

  // Guided Sanctuary Bot state
  const [activeFlowId, setActiveFlowId] = useState<string>(GUIDED_FLOWS[0].id)
  const [guidedTranscript, setGuidedTranscript] = useState<
    Array<{
      id: string
      role: 'bot' | 'user'
      text: string
      memorySuggestion?: { text: string; category: MemoryCategory }
    }>
  >([
    {
      id: 'init-0',
      role: 'bot',
      text: GUIDED_FLOWS[0].nodes.start.botMessage,
    },
  ])
  const [currentNodeId, setCurrentNodeId] = useState<string>('start')
  const [savedGuidedToast, setSavedGuidedToast] = useState<string | null>(null)

  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const streamContainerRef = useRef<HTMLDivElement | null>(null)

  const speakAiReplyAloud = useCallback(
    (text: string, force = false) => {
      if (speakingTimerRef.current) {
        window.clearTimeout(speakingTimerRef.current)
      }
      setAiSpeakingVisual(true)

      if ((voiceReadAloud || force) && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel()
          const utter = new SpeechSynthesisUtterance(text)
          utter.rate = 0.92
          utter.pitch = 0.98
          utter.volume = 0.78
          utter.onend = () => {
            setAiSpeakingVisual(false)
          }
          utter.onerror = () => {
            setAiSpeakingVisual(false)
          }
          window.speechSynthesis.speak(utter)
          return
        } catch {
          // fall through to timed visual speaking wave
        }
      }

      speakingTimerRef.current = window.setTimeout(() => {
        setAiSpeakingVisual(false)
      }, 4500)
    },
    [voiceReadAloud]
  )

  // Scroll message stream smoothly inside its own container so the page never jumps
  useEffect(() => {
    const el = streamContainerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [companionHistory.length, sending, aiThinking])

  useEffect(
    () => () => {
      try {
        recRef.current?.stop()
      } catch {
        // ignore
      }
      if (speakingTimerRef.current) {
        window.clearTimeout(speakingTimerRef.current)
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel()
        } catch {
          // ignore
        }
      }
    },
    []
  )

  const currentFlow = GUIDED_FLOWS.find(f => f.id === activeFlowId) ?? GUIDED_FLOWS[0]
  const currentNode = currentFlow.nodes[currentNodeId] ?? currentFlow.nodes.start
  const activePersonaObj = PERSONAS.find(p => p.name === companion) ?? PERSONAS[0]

  // Compute live background state: 'speaking' | 'thinking' | 'typing' | 'idle'
  const auraVisualState: AiAuraState =
    aiSpeakingVisual
      ? 'speaking'
      : sending || aiThinking
        ? 'thinking'
        : input.trim().length > 0 || listening
          ? 'typing'
          : 'idle'

  function selectGuidedFlow(flowId: string) {
    const picked = GUIDED_FLOWS.find(f => f.id === flowId) ?? GUIDED_FLOWS[0]
    setActiveFlowId(picked.id)
    setCurrentNodeId(picked.startNodeId)
    setGuidedTranscript([
      {
        id: `init-${Date.now()}`,
        role: 'bot',
        text: picked.nodes[picked.startNodeId].botMessage,
      },
    ])
    speakAiReplyAloud(picked.nodes[picked.startNodeId].botMessage)
  }

  function handleGuidedOptionClick(opt: GuidedStepOption) {
    const nextNode = currentFlow.nodes[opt.nextNodeId] ?? currentFlow.nodes.start
    setCurrentNodeId(nextNode.id)
    setGuidedTranscript(prev => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: opt.userReply },
      {
        id: `b-${Date.now() + 1}`,
        role: 'bot',
        text: nextNode.botMessage,
        memorySuggestion: nextNode.memorySuggestion,
      },
    ])
    speakAiReplyAloud(nextNode.botMessage)
  }

  async function send(text: string) {
    const value = text.trim()
    if (!value || sending) return
    setSending(true)
    setInput('')
    setVoiceNote('')
    const reply = await sendCompanionThought(value, companion, { tags: activeTags })
    setSending(false)
    if (reply) {
      speakAiReplyAloud(reply)
    }
  }

  function toggleVoice() {
    if (listening && recRef.current) {
      recRef.current.stop()
      setListening(false)
      return
    }
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike
      webkitSpeechRecognition?: new () => SpeechRecognitionLike
    }
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!Ctor) {
      setVoiceNote("Voice venting isn't supported in this browser, but you can type freely.")
      return
    }
    try {
      const rec = new Ctor()
      rec.continuous = false
      rec.interimResults = true
      rec.lang = 'en-US'
      const base = input.trim() ? `${input.trim()} ` : ''
      rec.onresult = e => {
        let t = ''
        for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript
        setInput(`${base}${t}`.trimStart())
        setTypingPulse(p => p + 1)
      }
      rec.onerror = () => setListening(false)
      rec.onend = () => setListening(false)
      recRef.current = rec
      rec.start()
      setListening(true)
      setVoiceNote('')
    } catch {
      setListening(false)
      setVoiceNote('Microphone access was unavailable. You can still type whenever you are ready.')
    }
  }

  const sharedCount = memories.filter(m => m.sharedWithAi !== false).length

  return (
    <div className="mx-auto grid w-full max-w-[1380px] gap-4 xl:grid-cols-[1fr_340px]">
      {/* LEFT MAIN STAGE: FULL-VIEWPORT AI CHATBOX ABOVE THE FOLD */}
      <div className="flex min-w-0 flex-col">
        <section
          className={`${glass} relative flex h-[calc(100vh-130px)] min-h-[540px] max-h-[840px] flex-col justify-between overflow-hidden border border-white/[0.12] p-3.5 sm:p-5`}
        >
          {/* Live Reactive "AI is Talking / Thinking / Listening" Animated Background Canvas */}
          <AiLivingAuraBackground
            state={auraVisualState}
            persona={companion}
            typingPulse={typingPulse}
          />

          {/* Compact Top Stage Header: Experience Toggle, Persona Selector Bar, Voice Response & Status */}
          <div className="relative z-10 space-y-2.5 border-b border-white/[0.08] pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Experience Switcher */}
              <div className="tab-pill bg-[#0c0a16]/90 !p-1">
                <button
                  type="button"
                  onClick={() => setExperienceTab('companion')}
                  className={`!px-3 !py-1 !text-[11px] ${
                    experienceTab === 'companion' ? 'active' : ''
                  }`}
                >
                  <Sparkles size={12} className="mr-1.5 inline" />
                  Soul Companion
                </button>
                <button
                  type="button"
                  onClick={() => setExperienceTab('guided')}
                  className={`!px-3 !py-1 !text-[11px] ${
                    experienceTab === 'guided' ? 'active' : ''
                  }`}
                >
                  <Bot size={12} className="mr-1.5 inline" />
                  Guided Flows
                </button>
              </div>

              {/* Right Utility Pills: Live AI Vocal State + Voice Response On/Off + Gemini Status */}
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Live AI Resonance State Badge */}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium transition ${
                    auraVisualState === 'speaking'
                      ? 'border-[#e8a4b8]/60 bg-[#e8a4b8]/20 text-[#fce4ec] shadow-[0_0_16px_rgba(232,164,184,0.3)]'
                      : auraVisualState === 'thinking'
                        ? 'border-[#8ec9bd]/60 bg-[#8ec9bd]/20 text-[#d7f7ef]'
                        : auraVisualState === 'typing'
                          ? 'border-[#b8a4e8]/50 bg-[#b8a4e8]/15 text-[#e8defc]'
                          : 'border-white/10 bg-white/[0.04] text-white/60'
                  }`}
                >
                  <Waves
                    size={11}
                    className={auraVisualState === 'speaking' ? 'animate-pulse text-[#e8a4b8]' : ''}
                  />
                  {auraVisualState === 'speaking'
                    ? 'AI Speaking · Vocal Wave Active'
                    : auraVisualState === 'thinking'
                      ? 'AI Reflecting…'
                      : auraVisualState === 'typing'
                        ? 'Listening to you…'
                        : 'Present & Listening'}
                </span>

                {/* Voice Response On/Off Toggle */}
                <button
                  type="button"
                  aria-pressed={voiceReadAloud}
                  onClick={() => {
                    const next = !voiceReadAloud
                    setVoiceReadAloud(next)
                    if (!next && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                      window.speechSynthesis.cancel()
                      setAiSpeakingVisual(false)
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium transition ${
                    voiceReadAloud
                      ? 'border-[#f3d9a4]/55 bg-[#f3d9a4]/18 text-[#f7dfb2]'
                      : 'border-white/10 bg-white/[0.04] text-white/60 hover:text-white'
                  }`}
                >
                  {voiceReadAloud ? <Volume2 size={11} /> : <VolumeX size={11} />}
                  <span>Voice Response {voiceReadAloud ? 'On' : 'Off'}</span>
                </button>

                {/* AI Connection Status */}
                {aiStatus === 'gemini' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#8ec9bd]/40 bg-[#8ec9bd]/15 px-2.5 py-1 text-[10px] font-medium text-[#b7ebe0]">
                    <Wifi size={11} /> Gemini 2.5
                  </span>
                ) : aiStatus === 'offline' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[10px] text-white/65">
                    <WifiOff size={11} /> Offline Mode
                  </span>
                ) : (
                  <span
                    title="Add GEMINI_API_KEY in .env.local on the server to enable live Gemini 2.5 Flash cloud responses"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#f3d9a4]/35 bg-[#f3d9a4]/10 px-2.5 py-1 text-[10px] text-[#f7dfb2]"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#f3d9a4]" />
                    Local Sanctuary AI
                  </span>
                )}
              </div>
            </div>

            {/* Sleek Single-Row Persona Selector Bar (Replaces bulky 2x2 boxes so chat stays above the fold) */}
            {experienceTab === 'companion' ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {PERSONAS.map(p => {
                    const active = companion === p.name
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setCompanion(p.name)}
                        aria-pressed={active}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
                          active
                            ? 'border-white/35 bg-white/[0.14] font-medium text-white shadow-sm'
                            : 'border-white/[0.08] bg-[#0b0914]/60 text-white/60 hover:border-white/20 hover:text-white'
                        }`}
                        style={
                          active
                            ? {
                                borderColor: `${p.color}88`,
                                boxShadow: `0 0 16px ${p.color}33`,
                              }
                            : undefined
                        }
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        <span>{p.name}</span>
                        <span className="hidden rounded-full bg-white/10 px-1.5 py-0.2 text-[9px] text-white/70 sm:inline">
                          {p.badge}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <span className="hidden text-[11px] text-white/50 lg:inline">
                  {activePersonaObj.desc}
                </span>
              </div>
            ) : (
              /* Compact Guided Flow Selector Pills */
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {GUIDED_FLOWS.map(flow => {
                    const active = flow.id === currentFlow.id
                    return (
                      <button
                        key={flow.id}
                        type="button"
                        onClick={() => selectGuidedFlow(flow.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
                          active
                            ? 'border-[#8ec9bd]/60 bg-[#8ec9bd]/20 font-medium text-white'
                            : 'border-white/[0.08] bg-[#0b0914]/60 text-white/60 hover:text-white'
                        }`}
                      >
                        <span>{flow.emoji}</span>
                        <span>{flow.title}</span>
                      </button>
                    )
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => selectGuidedFlow(currentFlow.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-white/65 hover:text-white"
                >
                  <RotateCcw size={11} /> Reset Flow
                </button>
              </div>
            )}
          </div>

          {/* CENTER SCROLLABLE MESSAGE STREAM */}
          {experienceTab === 'companion' ? (
            <div
              ref={streamContainerRef}
              className="relative z-10 my-2 flex-1 space-y-3 overflow-y-auto pr-1.5"
              aria-live="polite"
            >
              {companionHistory.length === 0 ? (
                <div className="grid h-full place-items-center text-center">
                  <div className="max-w-md rounded-3xl border border-white/[0.08] bg-[#090814]/55 p-6 backdrop-blur-md">
                    <div
                      className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full border"
                      style={{
                        borderColor: `${activePersonaObj.color}66`,
                        backgroundColor: `${activePersonaObj.color}18`,
                        boxShadow: `0 0 28px ${activePersonaObj.color}44`,
                      }}
                    >
                      <Sparkles size={20} style={{ color: activePersonaObj.color }} />
                    </div>
                    <p className="font-serif text-2xl text-white">
                      {companion} is listening with you.
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-white/55">
                      {activePersonaObj.desc} Start typing below or tap a quick starter—watch the
                      living aura background respond to your words and voice.
                    </p>
                    <p className="mt-2 text-[10px] text-[#8ec9bd]">
                      Memory Vault Context:{' '}
                      {aiMemoryEnabled ? `${sharedCount} approved notes active` : 'Paused'}
                    </p>
                  </div>
                </div>
              ) : (
                companionHistory.map(m => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${
                      m.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed backdrop-blur-md ${
                        m.role === 'user'
                          ? 'rounded-br-md border border-[#e8a4b8]/35 bg-[#daa9c2]/22 text-[#f9e8ef]'
                          : 'rounded-bl-md border border-white/[0.12] bg-[#0c0a18]/80 text-white/90 shadow-lg'
                      }`}
                    >
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="eyebrow text-[9px] text-white/60">
                            {m.role === 'companion' ? m.mode : 'You'}
                          </span>
                          {m.role === 'companion' && m.provider && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                                m.provider === 'gemini'
                                  ? 'bg-[#8ec9bd]/20 text-[#a4e5d6]'
                                  : 'bg-white/[0.08] text-white/60'
                              }`}
                            >
                              {m.provider === 'gemini' ? 'Gemini 2.5' : 'Local Sanctuary'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {m.role === 'companion' && (
                            <button
                              type="button"
                              onClick={() => speakAiReplyAloud(m.text, true)}
                              title="Speak this response aloud with reactive waveform"
                              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] text-white/60 hover:border-[#f3d9a4]/45 hover:text-[#f7dfb2]"
                            >
                              <Volume2 size={10} /> Speak
                            </button>
                          )}
                          <span className="text-[10px] text-white/35">{timeAgo(m.timestamp)}</span>
                        </div>
                      </div>
                      <p className="whitespace-pre-line">{m.text}</p>
                    </div>

                    {/* Emoji Quick Reactions on Companion Messages */}
                    {m.role === 'companion' && (
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {MESSAGE_REACTIONS.map(reaction => {
                          const active = m.reaction === reaction
                          return (
                            <button
                              key={reaction}
                              type="button"
                              onClick={() => void reactToCompanionMessage(m.id, reaction)}
                              className={`rounded-full border px-2 py-0.5 text-[10px] transition ${
                                active
                                  ? 'border-[#e8a4b8]/60 bg-[#e8a4b8]/25 text-[#fce4ec]'
                                  : 'border-white/[0.07] bg-[#0b0914]/70 text-white/50 hover:border-white/20 hover:text-white/85'
                              }`}
                            >
                              {reaction}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}

              {(sending || aiThinking) && (
                <div className="flex w-fit items-center gap-2.5 rounded-2xl border border-[#8ec9bd]/35 bg-[#0c0a18]/85 px-4 py-2.5 text-xs text-[#b7ebe0] backdrop-blur-md">
                  <span className="h-2 w-2 animate-ping rounded-full bg-[#8ec9bd]" />
                  <span>LUMINA ({companion}) is resonating with your thought…</span>
                </div>
              )}
            </div>
          ) : (
            /* GUIDED BOT INTERACTIVE STREAM */
            <div
              ref={streamContainerRef}
              className="relative z-10 my-2 flex-1 space-y-3 overflow-y-auto pr-1.5"
            >
              {guidedTranscript.map(entry => (
                <div
                  key={entry.id}
                  className={`flex flex-col ${
                    entry.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed backdrop-blur-md ${
                      entry.role === 'user'
                        ? 'rounded-br-md bg-[#daa9c2]/22 text-[#f4d9e2]'
                        : 'rounded-bl-md border border-[#8ec9bd]/30 bg-[#0c0a18]/85 text-white/90'
                    }`}
                  >
                    <span className="eyebrow mb-1 block text-[9px] text-[#8ec9bd]">
                      {entry.role === 'bot'
                        ? `${currentFlow.emoji} ${currentFlow.title}`
                        : 'Your Choice'}
                    </span>
                    <p>{entry.text}</p>

                    {entry.memorySuggestion && (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 py-2">
                        <span className="text-xs text-white/75">
                          Anchor takeaway: “{entry.memorySuggestion.text}”
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (!entry.memorySuggestion) return
                            void addMemory(
                              entry.memorySuggestion.text,
                              entry.memorySuggestion.category
                            )
                            setSavedGuidedToast('Saved takeaway to your Memory Vault.')
                            setTimeout(() => setSavedGuidedToast(null), 3200)
                          }}
                          className="secondary-button px-2.5 py-1 text-[11px]"
                        >
                          <Plus size={12} /> Save to Memory Vault
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {savedGuidedToast && (
                <p className="text-xs text-[#8ec9bd]" role="status">
                  ✓ {savedGuidedToast}
                </p>
              )}
            </div>
          )}

          {/* BOTTOM INPUT DOCK (100% Visible Above the Fold) */}
          <div className="relative z-10 border-t border-white/[0.08] pt-2.5">
            {experienceTab === 'companion' ? (
              <>
                {/* Quick Starter Chips + Compact Somatic Tag Selector */}
                <div className="mb-2 flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex flex-wrap gap-1">
                    {STARTERS.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => void send(s)}
                        disabled={sending || aiThinking}
                        className="rounded-full border border-white/[0.09] bg-[#0b0914]/70 px-2.5 py-1 text-[10.5px] text-white/65 transition hover:border-white/25 hover:text-white"
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  <details className="relative">
                    <summary className="cursor-pointer list-none rounded-full border border-white/[0.09] bg-[#0b0914]/70 px-2.5 py-1 text-[10.5px] text-[#8ec9bd] hover:border-white/25">
                      + Body Cues {activeTags.length ? `(${activeTags.length})` : ''}
                    </summary>
                    <div className="absolute right-0 bottom-8 z-30 flex w-72 flex-wrap gap-1 rounded-2xl border border-white/15 bg-[#0c0a18]/95 p-3 shadow-2xl backdrop-blur-xl">
                      {SOMATIC_TAGS.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() =>
                            setActiveTags(
                              activeTags.includes(t)
                                ? activeTags.filter(x => x !== t)
                                : [...activeTags, t]
                            )
                          }
                          className={`rounded-full border px-2 py-0.5 text-[10px] transition ${
                            activeTags.includes(t)
                              ? 'border-[#e1acc1]/60 bg-[#daa9c2]/25 text-[#f4d9e2]'
                              : 'border-white/[0.09] text-white/55 hover:text-white'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </details>
                </div>

                {/* Message Input & Voice Venting */}
                <form
                  className="flex items-center gap-2"
                  onSubmit={e => {
                    e.preventDefault()
                    void send(input)
                  }}
                >
                  <input
                    className="companion-input !bg-[#080711]/80 !py-2.5 !text-xs backdrop-blur-md"
                    value={input}
                    onChange={e => {
                      setInput(e.target.value)
                      setTypingPulse(p => p + 1)
                    }}
                    placeholder={
                      listening
                        ? 'Listening to your voice…'
                        : `Share a thought with ${companion}… (watch the aura ripple as you type)`
                    }
                    aria-label="Message to your companion"
                  />
                  <button
                    type="button"
                    onClick={toggleVoice}
                    aria-pressed={listening}
                    aria-label={listening ? 'Stop voice venting' : 'Start voice venting'}
                    className="mic-button !h-9"
                  >
                    {listening ? <MicOff size={15} /> : <Mic size={15} />}
                  </button>
                  <button
                    type="submit"
                    disabled={!input.trim() || sending || aiThinking}
                    className="primary-button px-4 py-2.5 text-xs"
                  >
                    <Send size={13} /> Send
                  </button>
                </form>
                {voiceNote && <p className="mt-1.5 text-[11px] text-white/50">{voiceNote}</p>}
              </>
            ) : (
              /* Guided Bot Branching Response Options */
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-medium tracking-wider text-white/50 uppercase">
                  Choose next step:
                </span>
                {currentNode.options.map(opt => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => handleGuidedOptionClick(opt)}
                    className="rounded-xl border border-[#8ec9bd]/40 bg-[#8ec9bd]/15 px-3 py-1.5 text-xs font-medium text-[#d4f2ea] transition hover:border-[#8ec9bd]/75 hover:bg-[#8ec9bd]/25"
                  >
                    <Compass size={12} className="mr-1.5 inline text-[#8ec9bd]" />
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* RIGHT SIDEBAR: USER-CONTROLLED MEMORY VAULT */}
      <aside className={`${glass} flex h-[calc(100vh-130px)] min-h-[540px] max-h-[840px] flex-col justify-between p-4 sm:p-5`}>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow text-[#a4d1c8]">Memory Vault · User-Controlled</p>
            <span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-2.5 py-0.5 text-[10px] text-white/60">
              {memories.length} {memories.length === 1 ? 'note' : 'notes'}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-white/45">
            You decide what LUMINA remembers. Toggle AI sharing per memory or keep notes strictly
            private.
          </p>

          {/* Master AI Memory Sharing Toggle */}
          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/[0.09] bg-white/[0.03] px-3 py-2">
            <div>
              <p className="text-xs font-medium text-white/85">Share approved memories with AI</p>
              <p className="text-[10px] text-white/45">
                {aiMemoryEnabled
                  ? `${sharedCount} of ${memories.length} shared with companion`
                  : 'AI memory sharing is paused'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={aiMemoryEnabled}
              onClick={() => void setAiMemoryEnabled(!aiMemoryEnabled)}
              className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
                aiMemoryEnabled
                  ? 'border-[#8ec9bd]/60 bg-[#8ec9bd]/35'
                  : 'border-white/15 bg-white/10'
              }`}
            >
              <span
                className={`block h-4 w-4 rounded-full bg-white transition-transform ${
                  aiMemoryEnabled ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Memory List */}
          <ul className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
            {memories.length === 0 && (
              <li className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] p-4 text-center text-xs text-white/40">
                Your Memory Vault is empty. Add an anchor, preference, trigger, or boundary below.
              </li>
            )}
            {memories.map(m => {
              const isEditing = editingMemId === m.id
              const isShared = m.sharedWithAi !== false && aiMemoryEnabled
              return (
                <li
                  key={m.id}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5 transition hover:border-white/[0.15]"
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editMemText}
                        onChange={e => setEditMemText(e.target.value)}
                        maxLength={220}
                        rows={2}
                        className="w-full rounded-xl border border-white/15 bg-[#0c0a16] px-2.5 py-1.5 text-xs text-white focus:border-[#8ec9bd] focus:outline-none"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <select
                          value={editMemCat}
                          onChange={e => setEditMemCat(e.target.value as MemoryCategory)}
                          className="unlock-select !py-1 !text-[11px]"
                        >
                          {MEMORY_CATEGORIES.map(c => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              void editMemory(m.id, editMemText, editMemCat)
                              setEditingMemId(null)
                            }}
                            className="secondary-button !px-2.5 !py-1 !text-[11px] text-[#8ec9bd]"
                          >
                            <Check size={12} /> Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingMemId(null)}
                            className="secondary-button !px-2 !py-1 !text-[11px]"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="eyebrow rounded-full border border-white/[0.09] bg-white/[0.04] px-2 py-0.5 text-[9px] text-[#a4d1c8]">
                          {m.category} · {shortDate(m.createdAt)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void toggleMemoryShare(m.id)}
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] transition ${
                              isShared
                                ? 'border-[#8ec9bd]/35 bg-[#8ec9bd]/12 text-[#b7ebe0]'
                                : 'border-white/10 bg-white/[0.04] text-white/45'
                            }`}
                          >
                            {m.sharedWithAi === false ? (
                              <>
                                <EyeOff size={10} /> Private
                              </>
                            ) : (
                              <>
                                <Eye size={10} /> Shared
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMemId(m.id)
                              setEditMemText(m.text)
                              setEditMemCat(m.category)
                            }}
                            aria-label="Edit memory"
                            className="text-white/40 hover:text-white/85"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeMemory(m.id)}
                            aria-label="Delete memory"
                            className="text-white/40 hover:text-[#edb4c5]"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-white/75">{m.text}</p>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        {/* Add Memory Form */}
        <form
          className="mt-3 grid gap-2 border-t border-white/[0.08] pt-3"
          onSubmit={e => {
            e.preventDefault()
            if (!memText.trim()) return
            void addMemory(memText, memCat)
            setMemText('')
          }}
        >
          <input
            className="modal-input !py-2 !text-xs"
            value={memText}
            onChange={e => setMemText(e.target.value)}
            placeholder="Add a personal anchor, trigger, or preference…"
            maxLength={220}
          />
          <div className="flex gap-2">
            <select
              value={memCat}
              onChange={e => setMemCat(e.target.value as MemoryCategory)}
              className="unlock-select flex-1 !py-1.5"
              aria-label="Memory category"
            >
              {MEMORY_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!memText.trim()}
              className="secondary-button px-3 py-1.5 text-xs"
            >
              <Plus size={13} /> Add
            </button>
          </div>
          <p className="flex items-center gap-1.5 text-[10px] text-white/40">
            <Lock size={10} /> Stored in local IndexedDB · Never sold or shared externally.
          </p>
        </form>
      </aside>
    </div>
  )
}

export default function Page() {
  return (
    <AppShell title="Soul Companion" subtitle="Live reactive AI listener, guided bot & memory vault">
      <CompanionContent />
    </AppShell>
  )
}
