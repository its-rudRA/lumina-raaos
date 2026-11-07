'use client'

import { useEffect, useRef, useState } from 'react'
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
  Wifi,
  WifiOff,
  X,
} from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { useSanctuary, type MemoryCategory } from '@/context/sanctuary-context'
import { glass, SOMATIC_TAGS, shortDate, timeAgo } from '@/lib/format'

const PERSONAS: Array<{ name: string; desc: string; badge: string }> = [
  {
    name: 'The Listener',
    desc: 'Deep emotional validation & warm presence—zero unsolicited advice.',
    badge: 'Validation',
  },
  {
    name: 'The Grounder',
    desc: 'Sensory grounding cues, gentle breathing & body awareness.',
    badge: 'Somatic',
  },
  {
    name: 'The Guide',
    desc: 'Breaks overwhelming moments into tiny, realistic next steps.',
    badge: 'Clarity',
  },
  {
    name: 'Boundary Coach',
    desc: 'Helps phrase compassionate boundaries & protect rest without guilt.',
    badge: 'Boundaries',
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
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [listening, setListening] = useState(false)
  const [voiceNote, setVoiceNote] = useState('')

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
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [companionHistory.length, sending, aiThinking])

  useEffect(
    () => () => {
      try {
        recRef.current?.stop()
      } catch {
        // ignore
      }
    },
    []
  )

  const currentFlow = GUIDED_FLOWS.find(f => f.id === activeFlowId) ?? GUIDED_FLOWS[0]
  const currentNode = currentFlow.nodes[currentNodeId] ?? currentFlow.nodes.start

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
  }

  async function send(text: string) {
    const value = text.trim()
    if (!value || sending) return
    setSending(true)
    setInput('')
    setVoiceNote('')
    await sendCompanionThought(value, companion, { tags: activeTags })
    setSending(false)
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
    <div className="mx-auto grid w-full max-w-[1320px] gap-5 xl:grid-cols-[1fr_360px]">
      <div className="flex min-w-0 flex-col gap-5">
        {/* Top Bar: Dual Experience Switcher + Real-Time AI Status Indicator */}
        <div
          className={`${glass} flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5`}
        >
          <div className="tab-pill bg-[#0c0a16]/90">
            <button
              type="button"
              onClick={() => setExperienceTab('companion')}
              className={experienceTab === 'companion' ? 'active' : ''}
            >
              <Sparkles size={13} className="mr-1.5 inline" />
              Soul Companion (AI &amp; Contextual)
            </button>
            <button
              type="button"
              onClick={() => setExperienceTab('guided')}
              className={experienceTab === 'guided' ? 'active' : ''}
            >
              <Bot size={13} className="mr-1.5 inline" />
              Guided Sanctuary Bot (Interactive Flows)
            </button>
          </div>

          {/* Real-Time AI Connection Status Pill */}
          <div className="flex items-center gap-2">
            {aiStatus === 'gemini' ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-[#8ec9bd]/40 bg-[#8ec9bd]/15 px-3 py-1 text-[11px] font-medium text-[#b7ebe0] shadow-[0_0_16px_rgba(142,201,189,0.2)]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#8ec9bd]" />
                <Wifi size={12} /> Gemini AI Connected
              </span>
            ) : aiStatus === 'offline' ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[11px] font-medium text-white/65">
                <WifiOff size={12} /> Offline (On-Device Sanctuary Mode)
              </span>
            ) : (
              <span
                title="Add GEMINI_API_KEY in .env.local on the server to enable live Gemini 2.5 Flash cloud responses"
                className="inline-flex items-center gap-2 rounded-full border border-[#f3d9a4]/40 bg-[#f3d9a4]/12 px-3 py-1 text-[11px] font-medium text-[#f7dfb2]"
              >
                <span className="h-2 w-2 rounded-full bg-[#f3d9a4]" />
                Local Mode (Set GEMINI_API_KEY in .env.local for cloud AI)
              </span>
            )}
          </div>
        </div>

        {experienceTab === 'companion' ? (
          <>
            {/* 4 Empathetic Personas */}
            <section className="grid gap-2.5 sm:grid-cols-2">
              {PERSONAS.map(p => {
                const active = companion === p.name
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setCompanion(p.name)}
                    aria-pressed={active}
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? 'border-[#e1acc1]/55 bg-[#daa9c2]/15 shadow-[0_0_24px_rgba(225,172,193,0.12)]'
                        : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`font-serif text-lg ${
                          active ? 'text-[#f4d9e2]' : 'text-white/85'
                        }`}
                      >
                        {p.name}
                      </p>
                      <span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-2.5 py-0.5 text-[10px] tracking-wider text-white/55 uppercase">
                        {p.badge}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-white/50">{p.desc}</p>
                  </button>
                )
              })}
            </section>

            {/* Conversation Stream + Emoji Quick Reactions */}
            <section className={`${glass} flex min-h-[450px] flex-col p-4 sm:p-5`}>
              <div
                className="max-h-[460px] flex-1 space-y-3.5 overflow-y-auto pr-1"
                aria-live="polite"
              >
                {companionHistory.length === 0 ? (
                  <div className="grid h-full min-h-[220px] place-items-center text-center">
                    <div className="max-w-sm space-y-2">
                      <p className="font-serif text-xl text-white/85">
                        {companion} is here with you.
                      </p>
                      <p className="text-xs leading-relaxed text-white/45">
                        Share whatever is weighing on you, or choose a starter prompt below. Your
                        approved Memory Vault context ({aiMemoryEnabled ? `${sharedCount} shared` : 'paused'}) is
                        respected automatically.
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
                        className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          m.role === 'user'
                            ? 'rounded-br-md bg-[#daa9c2]/20 text-[#f4d9e2]'
                            : 'rounded-bl-md border border-white/[0.09] bg-white/[0.05] text-white/85'
                        }`}
                      >
                        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="eyebrow text-[9px]">
                              {m.role === 'companion' ? m.mode : 'You'}
                            </span>
                            {m.role === 'companion' && m.provider && (
                              <span
                                className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                                  m.provider === 'gemini'
                                    ? 'bg-[#8ec9bd]/15 text-[#a4e5d6]'
                                    : 'bg-white/[0.06] text-white/50'
                                }`}
                              >
                                {m.provider === 'gemini' ? 'Gemini 2.5' : 'Local Sanctuary'}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-white/35">{timeAgo(m.timestamp)}</span>
                        </div>
                        <p className="whitespace-pre-line">{m.text}</p>
                      </div>

                      {/* Emoji Quick Reactions on Companion Messages */}
                      {m.role === 'companion' && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          {MESSAGE_REACTIONS.map(reaction => {
                            const active = m.reaction === reaction
                            return (
                              <button
                                key={reaction}
                                type="button"
                                onClick={() => void reactToCompanionMessage(m.id, reaction)}
                                className={`rounded-full border px-2.5 py-0.5 text-[10px] transition ${
                                  active
                                    ? 'border-[#e8a4b8]/60 bg-[#e8a4b8]/20 text-[#fce4ec] shadow-sm'
                                    : 'border-white/[0.07] bg-white/[0.02] text-white/45 hover:border-white/20 hover:text-white/80'
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
                  <div className="flex items-center gap-2.5 rounded-2xl border border-[#8ec9bd]/25 bg-[#8ec9bd]/10 px-4 py-2.5 text-xs text-[#b7ebe0] w-fit">
                    <span className="h-2 w-2 animate-ping rounded-full bg-[#8ec9bd]" />
                    <span>LUMINA ({companion}) is gently reflecting…</span>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {/* Starter Prompts */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {STARTERS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    disabled={sending || aiThinking}
                    className="rounded-full border border-white/[0.09] bg-white/[0.03] px-3 py-1.5 text-[11px] text-white/60 transition hover:border-white/25 hover:text-white"
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Somatic Body & Mind Cues */}
              <details className="mt-3">
                <summary className="cursor-pointer text-[11px] text-white/45 hover:text-white/70">
                  What is present in your body?{' '}
                  {activeTags.length ? `(${activeTags.length} selected)` : '(optional context)'}
                </summary>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SOMATIC_TAGS.map(t => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={activeTags.includes(t)}
                      onClick={() =>
                        setActiveTags(
                          activeTags.includes(t)
                            ? activeTags.filter(x => x !== t)
                            : [...activeTags, t]
                        )
                      }
                      className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                        activeTags.includes(t)
                          ? 'border-[#e1acc1]/60 bg-[#daa9c2]/20 text-[#f4d9e2]'
                          : 'border-white/[0.09] text-white/50 hover:text-white/80'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </details>

              {/* Message Input & Voice Venting */}
              <form
                className="mt-3 flex items-center gap-2"
                onSubmit={e => {
                  e.preventDefault()
                  void send(input)
                }}
              >
                <input
                  className="companion-input"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={listening ? 'Listening…' : `Write to ${companion}…`}
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
              {voiceNote && <p className="mt-2 text-[11px] text-white/45">{voiceNote}</p>}
            </section>
          </>
        ) : (
          /* TAB B: Guided Sanctuary Bot (Structured Interactive Flows) */
          <section className={`${glass} flex flex-col gap-5 p-5 sm:p-6`}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div>
                <p className="eyebrow text-[#8ec9bd]">
                  Deterministic Guided Sanctuary Bot · Instant Interactive Flows
                </p>
                <h2 className="mt-1 font-serif text-2xl text-white">
                  Step-by-step interactive unknotting when typing feels like too much
                </h2>
              </div>
              <button
                type="button"
                onClick={() => selectGuidedFlow(currentFlow.id)}
                className="secondary-button px-3 py-1.5 text-xs"
              >
                <RotateCcw size={13} /> Reset Current Flow
              </button>
            </div>

            {/* 4 Guided Bot Flow Selector Cards */}
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {GUIDED_FLOWS.map(flow => {
                const active = flow.id === currentFlow.id
                return (
                  <button
                    key={flow.id}
                    type="button"
                    onClick={() => selectGuidedFlow(flow.id)}
                    className={`rounded-2xl border p-3.5 text-left transition ${
                      active
                        ? 'border-[#8ec9bd]/60 bg-[#8ec9bd]/15 shadow-[0_0_20px_rgba(142,201,189,0.14)]'
                        : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{flow.emoji}</span>
                      <span className="font-serif text-base text-white">{flow.title}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-white/50">{flow.subtitle}</p>
                  </button>
                )
              })}
            </div>

            {/* Guided Conversation Transcript */}
            <div className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#0b0914]/65 p-4">
              {guidedTranscript.map(entry => (
                <div
                  key={entry.id}
                  className={`flex flex-col ${
                    entry.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      entry.role === 'user'
                        ? 'rounded-br-md bg-[#daa9c2]/20 text-[#f4d9e2]'
                        : 'rounded-bl-md border border-[#8ec9bd]/25 bg-[#8ec9bd]/10 text-white/90'
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

              {/* Interactive Branching Option Buttons */}
              <div className="pt-2">
                <p className="mb-2 text-[11px] font-medium tracking-wider text-white/45 uppercase">
                  Choose your response:
                </p>
                <div className="flex flex-wrap gap-2">
                  {currentNode.options.map(opt => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => handleGuidedOptionClick(opt)}
                      className="rounded-xl border border-[#8ec9bd]/35 bg-[#8ec9bd]/12 px-3.5 py-2 text-xs font-medium text-[#d4f2ea] transition hover:border-[#8ec9bd]/70 hover:bg-[#8ec9bd]/25"
                    >
                      <Compass size={12} className="mr-1.5 inline text-[#8ec9bd]" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {savedGuidedToast && (
              <p className="text-xs text-[#8ec9bd]" role="status">
                ✓ {savedGuidedToast}
              </p>
            )}
          </section>
        )}

        <p className="text-center text-[11px] leading-relaxed text-white/35">
          LUMINA is a supportive reflection companion, not a therapist or crisis service, and it
          cannot diagnose or treat anything. If you might be in danger, use the Immediate support
          button above.
        </p>
      </div>

      {/* Upgraded User-Controlled Memory Vault Sidebar */}
      <aside className={`${glass} h-fit p-5`}>
        <div className="flex items-center justify-between gap-2">
          <p className="eyebrow text-[#a4d1c8]">Memory Vault · User-Controlled</p>
          <span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-2.5 py-0.5 text-[10px] text-white/60">
            {memories.length} {memories.length === 1 ? 'note' : 'notes'}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-white/45">
          You decide what LUMINA remembers. Toggle AI sharing per memory, edit anytime, or keep
          notes strictly private.
        </p>

        {/* Master AI Memory Sharing Toggle */}
        <div className="mt-3.5 flex items-center justify-between gap-3 rounded-2xl border border-white/[0.09] bg-white/[0.03] px-3.5 py-2.5">
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
        <ul className="mt-4 grid max-h-[380px] gap-2.5 overflow-y-auto pr-1">
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
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 transition hover:border-white/[0.15]"
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
                          title={
                            m.sharedWithAi === false
                              ? 'Private (click to allow AI context)'
                              : 'Shared with AI (click to make private)'
                          }
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

        {/* Add Memory Form */}
        <form
          className="mt-4 grid gap-2 border-t border-white/[0.08] pt-3.5"
          onSubmit={e => {
            e.preventDefault()
            if (!memText.trim()) return
            void addMemory(memText, memCat)
            setMemText('')
          }}
        >
          <input
            className="modal-input !text-xs"
            value={memText}
            onChange={e => setMemText(e.target.value)}
            placeholder="Add a personal anchor, trigger, or preference…"
            maxLength={220}
          />
          <div className="flex gap-2">
            <select
              value={memCat}
              onChange={e => setMemCat(e.target.value as MemoryCategory)}
              className="unlock-select flex-1"
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
              className="secondary-button px-3 py-2 text-xs"
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
    <AppShell title="Soul Companion" subtitle="AI listener, guided bot & memory vault">
      <CompanionContent />
    </AppShell>
  )
}
