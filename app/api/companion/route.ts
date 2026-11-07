import { NextResponse, type NextRequest } from 'next/server'

const MODEL_NAME = 'gemini-2.5-flash'
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 20

interface RateBucket {
  count: number
  resetAt: number
}

const rateBuckets = new Map<string, RateBucket>()

function getClientKey(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'anon'
  }
  return req.headers.get('x-real-ip') || 'local-session'
}

function checkRateLimit(key: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now()
  const existing = rateBuckets.get(key)
  if (!existing || now > existing.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, retryAfterSec: 0 }
  }
  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }
  existing.count += 1
  return { allowed: true, retryAfterSec: 0 }
}

function sanitizeText(value: unknown, maxLen = 800): string {
  if (typeof value !== 'string') return ''
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, maxLen)
}

const PERSONA_INSTRUCTIONS: Record<string, string> = {
  'The Listener': `You are "The Listener", a warm, non-judgmental emotional sanctuary companion inside LUMINA.
Your role:
- Offer deep emotional validation and gentle, comforting presence.
- Give ZERO unsolicited advice or fix-it checklists unless the user explicitly asks for steps.
- Reflect back what the user is carrying with warmth, humility, and emotional safety.`,

  'The Grounder': `You are "The Grounder", a somatic and sensory grounding companion inside LUMINA.
Your role:
- Gently guide the user back into their body using sensory grounding cues (unclenching the jaw, dropping the shoulders, noticing 3 quiet things in the room, or taking a slow 4s inhale / 6s exhale breath).
- Keep your tone calm, steady, slow, and reassuring.`,

  'The Guide': `You are "The Guide", a compassionate clarity companion inside LUMINA.
Your role:
- Help break overwhelming situations, academic/work pressure, or tangled thoughts into tiny, realistic, low-pressure micro-steps.
- Offer gentle reframing that removes guilt and honors the user's current energy level.`,

  'Boundary Coach': `You are "Boundary Coach", a kind, practical interpersonal boundary companion inside LUMINA.
Your role:
- Help the user protect their peace and rest without guilt.
- Offer 1 or 2 concrete, warm, ready-to-send phrasing scripts they can say or text to set a healthy limit.`,
}

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  return NextResponse.json({
    configured: Boolean(apiKey),
    model: MODEL_NAME,
  })
}

export async function POST(req: NextRequest) {
  const clientKey = getClientKey(req)
  const rate = checkRateLimit(clientKey)
  if (!rate.allowed) {
    return NextResponse.json(
      {
        configured: Boolean(process.env.GEMINI_API_KEY?.trim()),
        provider: 'local',
        reply: null,
        error: `Rate limit reached. Please pause for ${rate.retryAfterSec}s and breathe.`,
      },
      { status: 429 }
    )
  }

  let body: Record<string, unknown> = {}
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 })
  }

  const mode = body.mode === 'insights' || body.mode === 'status' ? body.mode : 'chat'
  const apiKey = process.env.GEMINI_API_KEY?.trim()

  if (mode === 'status') {
    return NextResponse.json({
      configured: Boolean(apiKey),
      model: MODEL_NAME,
    })
  }

  // Helper to build a 100% honest Local Mode synthesis from the user's real check-ins
  function buildLocalInsightsFallback(payload: Record<string, unknown>) {
    const userName = sanitizeText(payload.userName, 60) || 'Friend'
    const rawCheckIns = Array.isArray(payload.checkIns) ? payload.checkIns.slice(0, 30) : []
    const total = rawCheckIns.length

    const auraCounts: Record<string, number> = {}
    const emotionCounts: Record<string, number> = {}
    const tagCounts: Record<string, number> = {}

    for (const item of rawCheckIns) {
      if (!item || typeof item !== 'object') continue
      const rec = item as Record<string, unknown>
      const aura = sanitizeText(rec.auraLabel, 60) || 'Softly Grounded'
      auraCounts[aura] = (auraCounts[aura] || 0) + 1
      const emo = sanitizeText(rec.emotionLabel, 40)
      const emoji = sanitizeText(rec.emoji, 8)
      if (emo) {
        const key = `${emoji ? `${emoji} ` : ''}${emo}`
        emotionCounts[key] = (emotionCounts[key] || 0) + 1
      }
      if (Array.isArray(rec.tags)) {
        for (const t of rec.tags) {
          const cleanTag = sanitizeText(t, 40)
          if (cleanTag) tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1
        }
      }
    }

    const topAuras = Object.entries(auraCounts).sort((a, b) => b[1] - a[1])
    const topEmotions = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])
    const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])

    const bio =
      payload.bioRhythm && typeof payload.bioRhythm === 'object'
        ? (payload.bioRhythm as Record<string, unknown>)
        : null
    const sleepHours = Number(bio?.sleepHours) || 7
    const sleepQuality = sanitizeText(bio?.sleepQuality, 30) || 'rested'

    const prefs =
      payload.preferences && typeof payload.preferences === 'object'
        ? (payload.preferences as Record<string, unknown>)
        : null
    const comfortEnv = sanitizeText(prefs?.comfortEnvironment, 60) || 'Starry night'
    const dailyTime = sanitizeText(prefs?.dailyTime, 40) || '5 minutes'

    const starNotes = Array.isArray(payload.starJar)
      ? payload.starJar
          .slice(0, 3)
          .map((s: unknown) =>
            s && typeof s === 'object'
              ? sanitizeText((s as Record<string, unknown>).text, 120)
              : ''
          )
          .filter(Boolean)
      : []

    const primaryAura = topAuras[0]?.[0] || 'Softly Grounded'
    const primaryAuraCount = topAuras[0]?.[1] || total

    return {
      narrative: `${userName}, across your ${total} recorded check-ins, you have most frequently arrived in a “${primaryAura}” state (${primaryAuraCount} of ${total} check-ins). Your logs reflect a thoughtful awareness of how your body and mind respond to daily pressures.`,
      emotionalPatterns: [
        `Most frequent aura: “${primaryAura}” (${primaryAuraCount} of ${total} check-ins).`,
        ...(topEmotions.length > 0
          ? [
              `Most named emotion: ${topEmotions[0][0]} (${topEmotions[0][1]} time${topEmotions[0][1] === 1 ? '' : 's'}).`,
            ]
          : []),
      ],
      commonTriggers:
        topTags.length > 0
          ? topTags
              .slice(0, 3)
              .map(
                ([tag, count]) =>
                  `“${tag}” was noted in ${count} of your ${total} check-ins.`
              )
          : ['No recurring tension cues have dominated your check-ins yet.'],
      calmingStrategies: [
        `Your chosen sanctuary atmosphere (“${comfortEnv}”) pairs naturally with a gentle ${dailyTime} daily pause.`,
        '4s inhale / 6s exhale breathing and the 174Hz + 261Hz acoustic rain soundscape remain available whenever mental load rises.',
      ],
      sleepMoodObservation: `You most recently logged ${sleepHours}h of ${sleepQuality} rest. In your personal check-ins, notice how ${sleepQuality} rest correlates with your emotional battery—this is an observed personal correlation rather than a medical cause.`,
      positiveMoments:
        starNotes.length > 0
          ? starNotes.map(n => `Star Jar note: “${n}”`)
          : [
              `You have returned to your sanctuary for ${total} check-ins at your own pace without streak pressure.`,
            ],
      gentleSuggestions: [
        `Set aside ${dailyTime} in your “${comfortEnv}” environment today to let your shoulders drop.`,
        'If a looping thought appears tonight, try placing it in the Release Room or speaking with your Soul Companion.',
      ],
      weeklySummary: `Based on ${total} real local check-ins, your sanctuary rhythm centers around “${primaryAura}” with ${sleepHours}h (${sleepQuality}) of logged rest.`,
    }
  }

  // Transparent Local Mode fallback when GEMINI_API_KEY is not configured on the server
  if (!apiKey) {
    return NextResponse.json({
      configured: false,
      provider: 'local',
      reply: null,
      insights: mode === 'insights' ? buildLocalInsightsFallback(body) : null,
    })
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12_000)

  try {
    if (mode === 'insights') {
      const userName = sanitizeText(body.userName, 60) || 'Friend'
      const rawCheckIns = Array.isArray(body.checkIns) ? body.checkIns.slice(0, 30) : []
      const checkInSummary = rawCheckIns
        .map((c: unknown) => {
          if (!c || typeof c !== 'object') return ''
          const rec = c as Record<string, unknown>
          const auraLabel = sanitizeText(rec.auraLabel, 60)
          const emotionLabel = sanitizeText(rec.emotionLabel, 40)
          const emoji = sanitizeText(rec.emoji, 8)
          const intensity = typeof rec.intensity === 'number' ? rec.intensity : undefined
          const tags = Array.isArray(rec.tags)
            ? rec.tags.map((t) => sanitizeText(t, 40)).filter(Boolean).join(', ')
            : ''
          const note = sanitizeText(rec.note, 140)
          return `- ${emoji ? `${emoji} ${emotionLabel}` : auraLabel}${intensity ? ` (intensity ${intensity}/5)` : ''} | Aura: ${auraLabel} | Cues: ${tags || 'none'}${note ? ` | Note: "${note}"` : ''}`
        })
        .filter(Boolean)
        .join('\n')

      const bio =
        body.bioRhythm && typeof body.bioRhythm === 'object'
          ? (body.bioRhythm as Record<string, unknown>)
          : null
      const sleepSummary = bio
        ? `${Number(bio.sleepHours) || 7}h (${sanitizeText(bio.sleepQuality, 30) || 'rested'})`
        : 'Not specified'

      const prefs =
        body.preferences && typeof body.preferences === 'object'
          ? (body.preferences as Record<string, unknown>)
          : null
      const prefsSummary = prefs
        ? `Comfort environment: ${sanitizeText(prefs.comfortEnvironment, 60) || 'Not set'}, Daily pace: ${sanitizeText(prefs.dailyTime, 40) || 'Flexible'}`
        : 'Not specified'

      const starNotes = Array.isArray(body.starJar)
        ? body.starJar
            .slice(0, 5)
            .map((s: unknown) =>
              s && typeof s === 'object'
                ? sanitizeText((s as Record<string, unknown>).text, 120)
                : ''
            )
            .filter(Boolean)
            .join('; ')
        : ''

      const aiMemoryEnabled = body.aiMemoryEnabled !== false
      const rawMemories =
        aiMemoryEnabled && Array.isArray(body.memories) ? body.memories.slice(0, 20) : []
      const approvedMemories = rawMemories
        .map((m: unknown) => {
          if (!m || typeof m !== 'object') return ''
          const mem = m as Record<string, unknown>
          if (mem.sharedWithAi === false) return ''
          return `[${sanitizeText(mem.category, 24)}] ${sanitizeText(mem.text, 180)}`
        })
        .filter(Boolean)
        .join('\n')

      const systemPrompt = `You are LUMINA's Personal Emotional Reflection Engine.
Analyze the user's real emotional check-ins (${rawCheckIns.length} total), somatic tags, sleep state, Star Jar gratitude notes, and user-approved memories.
Strict ethical & non-clinical rules:
- NEVER make clinical or medical diagnoses.
- NEVER invent numbers, statistics, or percentages that are not directly present in the user's ${rawCheckIns.length} check-ins.
- Explicitly note that sleep and mood connections are observed personal correlations rather than proven medical causes.
- Return valid JSON matching this exact schema:
{
  "narrative": "2-3 sentence warm, compassionate synthesis of their recent emotional landscape",
  "emotionalPatterns": ["2-3 specific observations grounded strictly in their recorded check-in emotions and auras"],
  "commonTriggers": ["1-3 gentle observations about recurring pressures or somatic cues they tagged"],
  "calmingStrategies": ["2-3 supportive calming rituals tailored to their preferences (${prefsSummary})"],
  "sleepMoodObservation": "1-2 sentences gently connecting their rest state (${sleepSummary}) with their emotional energy, explicitly framing it as an observed personal correlation rather than a cause",
  "positiveMoments": ["1-3 bright spots drawn from their calmer check-ins or Star Jar notes"],
  "gentleSuggestions": ["2-3 small, realistic, non-clinical suggestions for the days ahead"],
  "weeklySummary": "1 concise sentence summarizing their current sanctuary rhythm"
}`

      const userPrompt = `User Name: ${userName}
Recent Sleep State: ${sleepSummary}
Onboarding Preferences: ${prefsSummary}
Star Jar Gratitude Notes: ${starNotes || 'None yet'}
Approved Memories:
${approvedMemories || 'None shared'}

Recorded Check-Ins (${rawCheckIns.length}):
${checkInSummary || 'No check-ins recorded yet.'}`

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: {
              temperature: 0.5,
              maxOutputTokens: 780,
              responseMimeType: 'application/json',
            },
          }),
        }
      )

      if (!response.ok) {
        return NextResponse.json({
          configured: true,
          provider: 'local',
          insights: buildLocalInsightsFallback(body),
        })
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      }
      const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
      let parsed: Record<string, unknown> | null = null
      try {
        parsed = JSON.parse(rawJson) as Record<string, unknown>
      } catch {
        parsed = null
      }

      return NextResponse.json({
        configured: true,
        provider: parsed ? 'gemini' : 'local',
        insights: parsed ?? buildLocalInsightsFallback(body),
      })
    }

    // Default: mode === 'chat'
    const message = sanitizeText(body.message, 800)
    if (!message) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 })
    }

    const persona = sanitizeText(body.persona, 40) || 'The Listener'
    const userName = sanitizeText(body.userName, 60) || 'Friend'
    const pronouns = sanitizeText(body.pronouns, 30)
    const auraLabel = sanitizeText(body.auraLabel, 60) || 'Softly Grounded'
    const emotionEmoji = sanitizeText(body.emotionEmoji, 10)
    const emotionLabel = sanitizeText(body.emotionLabel, 40)
    const emotionIntensity =
      typeof body.emotionIntensity === 'number'
        ? Math.max(1, Math.min(5, Math.round(body.emotionIntensity)))
        : null

    const tags = Array.isArray(body.tags)
      ? body.tags.map((t) => sanitizeText(t, 40)).filter(Boolean).slice(0, 8)
      : []

    const bio =
      body.bioRhythm && typeof body.bioRhythm === 'object'
        ? (body.bioRhythm as Record<string, unknown>)
        : null
    const sleepInfo = bio
      ? `${Number(bio.sleepHours) || 7}h of ${sanitizeText(bio.sleepQuality, 30) || 'rested'} sleep`
      : ''

    const aiMemoryEnabled = body.aiMemoryEnabled !== false
    const rawMemories =
      aiMemoryEnabled && Array.isArray(body.memories) ? body.memories.slice(0, 15) : []
    const approvedMemories = rawMemories
      .map((m: unknown) => {
        if (!m || typeof m !== 'object') return ''
        const mem = m as Record<string, unknown>
        if (mem.sharedWithAi === false) return ''
        const cat = sanitizeText(mem.category, 24)
        const txt = sanitizeText(mem.text, 180)
        return txt ? `- (${cat}) ${txt}` : ''
      })
      .filter(Boolean)
      .join('\n')

    const recentHistory = Array.isArray(body.history) ? body.history.slice(-6) : []
    const contents = recentHistory
      .map((item: unknown) => {
        if (!item || typeof item !== 'object') return null
        const msg = item as Record<string, unknown>
        const role = msg.role === 'companion' ? 'model' : 'user'
        const text = sanitizeText(msg.text, 500)
        if (!text) return null
        return { role, parts: [{ text }] }
      })
      .filter((x): x is { role: string; parts: Array<{ text: string }> } => Boolean(x))

    contents.push({
      role: 'user',
      parts: [{ text: message }],
    })

    const personaInstruction =
      PERSONA_INSTRUCTIONS[persona] || PERSONA_INSTRUCTIONS['The Listener']

    const systemInstructionText = `${personaInstruction}

Core LUMINA Sanctuary Guidelines:
- You are speaking with ${userName}${pronouns ? ` (${pronouns})` : ''}.
- Current emotional state: Aura is "${auraLabel}"${emotionLabel ? `, Emotion is ${emotionEmoji} ${emotionLabel}${emotionIntensity ? ` (intensity ${emotionIntensity}/5)` : ''}` : ''}.
- Present somatic/mind cues: ${tags.length > 0 ? tags.join(', ') : 'none selected'}.
- Restorative sleep context: ${sleepInfo || 'not specified'}.
${approvedMemories ? `- User-approved Memory Vault notes:\n${approvedMemories}` : '- Memory Vault sharing is currently empty or disabled.'}
- Keep your response warm, natural, human, and concise (2 to 4 sentences unless the user asks for more detail).
- Never make clinical diagnoses, never claim to be a licensed therapist, and never invent statistics.`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstructionText }],
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 320,
          },
        }),
      }
    )

    if (!response.ok) {
      return NextResponse.json({
        configured: true,
        provider: 'local',
        reply: null,
      })
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null

    return NextResponse.json({
      configured: true,
      provider: reply ? 'gemini' : 'local',
      reply,
    })
  } catch {
    return NextResponse.json({
      configured: Boolean(apiKey),
      provider: 'local',
      reply: null,
      insights: null,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}
