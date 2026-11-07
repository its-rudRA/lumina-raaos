'use client'

import { useEffect, useState } from 'react'
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
  Sparkles,
  Wind,
} from 'lucide-react'
import {
  CelestialSanctuaryCore,
  MagicalButton,
  StaggeredContainer,
  StaggeredItem,
  TiltGlassCard,
} from '@/components/animation-system'
import { AuthShell } from '@/components/auth-shell'
import { LuminaLoader } from '@/components/lumina-loader'
import { useSanctuary } from '@/context/sanctuary-context'

const PILLARS = [
  { icon: Eye, text: 'Understand your emotions through gentle visual check-ins.' },
  {
    icon: MessageCircleHeart,
    text: 'Express overwhelming thoughts in a private, judgment-free space.',
  },
  { icon: Wind, text: 'Practice gentle breathing and acoustic rain resets.' },
  { icon: Heart, text: 'Discover personal calming strategies tailored to your rhythm.' },
  {
    icon: Flower2,
    text: 'Explore a living, personalized 3D bioluminescent garden that grows with you.',
  },
  { icon: Lock, text: 'Reflect on your emotional patterns with full on-device privacy.' },
]

export default function IntroductionPage() {
  const router = useRouter()
  const { isHydrated, authUser, updateOnboarding } = useSanctuary()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (isHydrated && !authUser) router.replace('/welcome')
  }, [isHydrated, authUser, router])

  useEffect(() => {
    router.prefetch('/onboarding/profile')
  }, [router])

  async function begin() {
    setBusy(true)
    await updateOnboarding({ introSeen: true })
    router.push('/onboarding/profile')
  }

  if (!isHydrated || !authUser) {
    return <LuminaLoader />
  }

  return (
    <AuthShell>
      <StaggeredContainer className="flex max-w-3xl flex-col items-center pt-1 text-center">
        <StaggeredItem index={0}>
          <span className="eyebrow inline-flex items-center gap-1.5 rounded-full border border-[#e8a4b8]/40 bg-[#18122e]/68 px-4 py-1.5 text-[10px] font-medium tracking-[0.22em] text-[#f9e4ec] shadow-md backdrop-blur-xl">
            <Sparkles size={11} className="text-[#f3d9a4]" />
            STEP 1 OF 3 · WELCOME TO YOUR SANCTUARY
          </span>
        </StaggeredItem>

        <StaggeredItem index={1}>
          <h1
            style={{ textShadow: '0 2px 10px rgba(8, 6, 20, 0.85)' }}
            className="lumina-hero-title mt-3 font-serif text-3xl leading-tight text-white sm:text-5xl"
          >
            Your emotions deserve{' '}
            <em className="bg-gradient-to-r from-[#f7dfb2] via-[#f4c6d7] to-[#b8ebe0] bg-clip-text text-transparent">
              a gentle space.
            </em>
          </h1>
        </StaggeredItem>

        {/* Living 3D Celestial Lotus & Soul Pearl Centerpiece (Full 216px Milestone 14 Proportions) */}
        <StaggeredItem index={2} className="-my-1">
          <CelestialSanctuaryCore size="md" interactive />
        </StaggeredItem>

        {/* 6 Interactive Translucent Violet-Rose Glassmorphic Sanctuary Pillar Cards */}
        <ul className="mt-1 grid w-full gap-3 text-left sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map(({ icon: Icon, text }, idx) => (
            <li key={text}>
              <StaggeredItem index={idx + 3} stepMs={60} className="h-full">
                <TiltGlassCard className="h-full p-4 sm:p-5" maxTiltDeg={4}>
                  <span className="mb-2.5 grid h-9 w-9 place-items-center rounded-xl border border-[#e8a4b8]/35 bg-[#e6acc2]/18 text-[#f7d0de] shadow-[0_0_16px_rgba(232,164,184,0.22)]">
                    <Icon size={17} strokeWidth={1.6} />
                  </span>
                  <p
                    style={{ textShadow: '0 2px 10px rgba(8, 6, 20, 0.85)' }}
                    className="text-sm leading-relaxed text-[#f0ecfa]"
                  >
                    {text}
                  </p>
                </TiltGlassCard>
              </StaggeredItem>
            </li>
          ))}
        </ul>

        <StaggeredItem index={9}>
          <p
            style={{ textShadow: '0 2px 10px rgba(8, 6, 20, 0.85)' }}
            className="mt-5 flex max-w-lg items-start gap-2 rounded-2xl border border-white/15 bg-[#16112b]/65 px-4 py-2.5 text-left text-xs leading-relaxed text-[#d8d0ec] shadow-md backdrop-blur-xl"
          >
            <Droplets size={14} className="mt-0.5 shrink-0 text-[#8ec9bd]" />
            <span>
              LUMINA is a supportive personal reflection sanctuary—never a clinical evaluation or
              medical replacement.
            </span>
          </p>
        </StaggeredItem>

        <StaggeredItem index={10} className="mt-5">
          <MagicalButton
            variant="primary"
            onClick={begin}
            disabled={busy}
            className="px-9 py-3.5 text-sm"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : null}
            <span>Begin My Journey</span>
            <ArrowRight
              size={15}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </MagicalButton>
        </StaggeredItem>
      </StaggeredContainer>
    </AuthShell>
  )
}
