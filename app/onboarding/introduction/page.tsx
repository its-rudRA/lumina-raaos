'use client'

import { useEffect, useState, type PointerEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Droplets,
  Eye,
  Flower2,
  Heart,
  Loader2,
  Lock,
  MessageCircleHeart,
  Wind,
} from 'lucide-react'
import { AuthShell } from '@/components/auth-shell'
import { useSanctuary } from '@/context/sanctuary-context'

const PILLARS = [
  { icon: Eye, text: 'Understand your emotions through gentle visual check-ins.' },
  { icon: MessageCircleHeart, text: 'Express overwhelming thoughts in a private, judgment-free space.' },
  { icon: Wind, text: 'Practice gentle breathing and acoustic rain resets.' },
  { icon: Heart, text: 'Discover personal calming strategies tailored to your rhythm.' },
  { icon: Flower2, text: 'Explore a living, personalized 3D bioluminescent garden that grows with you.' },
  { icon: Lock, text: 'Reflect on your emotional patterns with full on-device privacy.' },
]

function BreathingOrb() {
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  function handleMove(e: PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)
    const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)
    setOffset({
      x: Math.max(-1, Math.min(1, dx)),
      y: Math.max(-1, Math.min(1, dy)),
    })
  }

  return (
    <div
      className="intro-orb-stage"
      onPointerMove={handleMove}
      onPointerLeave={() => setOffset({ x: 0, y: 0 })}
      aria-hidden
    >
      <span className="intro-ring r3" style={{ transform: `translate(${offset.x * -6}px, ${offset.y * -6}px)` }} />
      <span className="intro-ring r2" style={{ transform: `translate(${offset.x * -10}px, ${offset.y * -10}px)` }} />
      <span className="intro-ring r1" style={{ transform: `translate(${offset.x * -14}px, ${offset.y * -14}px)` }} />
      <div className="intro-orb-core" style={{ transform: `translate(${offset.x * 16}px, ${offset.y * 16}px)` }} />
    </div>
  )
}

export default function IntroductionPage() {
  const router = useRouter()
  const { isHydrated, authUser, updateOnboarding } = useSanctuary()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (isHydrated && !authUser) router.replace('/welcome')
  }, [isHydrated, authUser, router])

  async function begin() {
    setBusy(true)
    await updateOnboarding({ introSeen: true })
    router.push('/onboarding/profile')
  }

  if (!isHydrated || !authUser) {
    return (
      <AuthShell>
        <div className="lumina-orb" role="status" aria-label="Loading" />
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <section className="flex max-w-3xl flex-col items-center text-center">
        <span className="eyebrow rounded-full border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-[10px]">
          STEP 1 OF 3 · WELCOME TO YOUR SANCTUARY
        </span>
        <h1 className="mt-6 font-serif text-4xl leading-tight text-white sm:text-5xl">
          Your emotions deserve <em>a gentle space.</em>
        </h1>

        <div className="my-6">
          <BreathingOrb />
        </div>

        <ul className="grid w-full gap-3 text-left sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map(({ icon: Icon, text }) => (
            <li
              key={text}
              className="rounded-[24px] border border-white/[0.08] bg-white/[0.045] p-5 backdrop-blur-xl"
            >
              <span className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-[#e6acc2]/10 text-[#edb4c5]">
                <Icon size={17} strokeWidth={1.5} />
              </span>
              <p className="text-sm leading-relaxed text-white/70">{text}</p>
            </li>
          ))}
        </ul>

        <p className="mt-8 flex max-w-lg items-start gap-2 text-left text-xs leading-relaxed text-white/45">
          <Droplets size={14} className="mt-0.5 shrink-0 text-[#8ec9bd]" />
          LUMINA is a supportive personal reflection sanctuary—never a clinical evaluation or medical
          replacement.
        </p>

        <button
          onClick={begin}
          disabled={busy}
          className="primary-button mt-8 justify-center px-8 py-3.5 text-sm"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : null}
          Begin My Journey <ArrowRight size={15} />
        </button>
      </section>
    </AuthShell>
  )
}
