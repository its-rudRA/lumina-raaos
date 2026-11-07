'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import {
  CelestialSanctuaryCore,
  MagicalButton,
  StaggeredContainer,
  StaggeredItem,
} from '@/components/animation-system'
import { SanctuaryBackdrop } from '@/components/auth-shell'
import { triggerPortalTransition } from '@/components/sanctuary-cinematics'
import { useSanctuary } from '@/context/sanctuary-context'
import { loadSanctuaryState } from '@/lib/db'
import { resolveEntryRoute } from '@/lib/routing'

export default function WelcomePage() {
  const router = useRouter()
  const { continueAsGuest, onboarding } = useSanctuary()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleGuest() {
    setBusy(true)
    setError('')
    try {
      triggerPortalTransition('Gentle Traveler')
      const user = await continueAsGuest()
      const stored = await loadSanctuaryState().catch(() => null)
      const nextRoute = resolveEntryRoute(user, stored?.onboarding ?? onboarding)
      router.push(nextRoute)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start a guest session.')
      setBusy(false)
    }
  }

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden overflow-y-auto bg-[#060712] px-5 py-8 text-[#eeeaf3]">
      <SanctuaryBackdrop />

      <StaggeredContainer className="relative z-10 my-auto flex max-w-xl flex-col items-center text-center">
        {/* Step 1: Interactive 3D Celestial Lotus, Soul Pearl & Sacred Astrolabe Centerpiece */}
        <StaggeredItem index={0} baseDelayMs={40}>
          <div className="relative">
            <CelestialSanctuaryCore size="lg" interactive />
            <span
              style={{ textShadow: '0 2px 10px rgba(8, 6, 20, 0.85)' }}
              className="pointer-events-none -mt-3 block text-[9.5px] font-medium tracking-[0.22em] text-[#f7dfb2]/90 uppercase"
            >
              ✦ Move cursor to orbit celestial lotus ✦
            </span>
          </div>
        </StaggeredItem>

        {/* Step 2: Sanctuary Eyebrow Pill */}
        <StaggeredItem index={1} baseDelayMs={95}>
          <span className="eyebrow mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#e8a4b8]/40 bg-[#18122e]/68 px-4 py-1.5 text-[10px] font-medium tracking-[0.22em] text-[#f9e4ec] shadow-[0_0_24px_rgba(232,164,184,0.22)] backdrop-blur-xl">
            <Sparkles size={11} className="text-[#f3d9a4]" />
            LUMINA · YOUR EMOTIONAL SANCTUARY
          </span>
        </StaggeredItem>

        {/* Step 3: Luminous Anime-Fantasy Hero Title */}
        <StaggeredItem index={2} baseDelayMs={150}>
          <h1
            style={{ textShadow: '0 2px 10px rgba(8, 6, 20, 0.85)' }}
            className="lumina-hero-title mt-4 font-serif text-4xl leading-tight tracking-wide text-white sm:text-6xl"
          >
            Welcome to{' '}
            <em className="bg-gradient-to-r from-[#f7dfb2] via-[#f4c6d7] to-[#b8ebe0] bg-clip-text text-transparent">
              LUMINA
            </em>
          </h1>
        </StaggeredItem>

        {/* Step 4: Engine Badge & Poetic Tagline */}
        <StaggeredItem index={3} baseDelayMs={205} className="flex flex-col items-center">
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#f3d9a4]/35 bg-[#18122e]/65 px-3 py-0.5 text-[9.5px] font-medium tracking-[0.18em] text-[#f7dfb2] uppercase backdrop-blur-md">
            RaaOS Engine · Crafted by Rudra
          </span>
          <p
            style={{ textShadow: '0 2px 10px rgba(8, 6, 20, 0.85)' }}
            className="mt-3.5 max-w-md text-sm leading-relaxed text-[#f0ecfa] sm:text-base"
          >
            Your personal space to pause, understand, and reconnect with yourself.
          </p>
        </StaggeredItem>

        {/* Step 5: Magical Interactive CTA Stack */}
        <StaggeredItem index={4} baseDelayMs={260} className="mt-7 flex w-full max-w-xs flex-col gap-3">
          <MagicalButton variant="primary" href="/sign-up" className="w-full">
            <span>Create Account</span>
            <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
          </MagicalButton>

          <MagicalButton variant="glass" href="/sign-in" className="w-full">
            <span>Sign In</span>
          </MagicalButton>

          <MagicalButton
            variant="ghost"
            onClick={handleGuest}
            disabled={busy}
            className="mt-0.5 w-full"
          >
            {busy ? (
              <Loader2 size={14} className="animate-spin text-[#f3d9a4]" />
            ) : null}
            <span
              style={{ textShadow: '0 2px 10px rgba(8, 6, 20, 0.85)' }}
              className="font-medium text-[#f0ecfa]"
            >
              Continue as Guest
            </span>
            <ArrowRight
              size={14}
              className="text-[#8ec9bd] transition-transform duration-300 group-hover:translate-x-1.5"
            />
          </MagicalButton>
        </StaggeredItem>

        {error && (
          <p className="auth-error mt-4" role="alert">
            {error}
          </p>
        )}

        {/* Step 6: On-Device Privacy Assurance Card */}
        <StaggeredItem index={5} baseDelayMs={320}>
          <p
            style={{ textShadow: '0 2px 10px rgba(8, 6, 20, 0.85)' }}
            className="mt-7 flex max-w-md items-start gap-2.5 rounded-2xl border border-white/15 bg-[#16112b]/65 px-4 py-3 text-left text-[11px] leading-relaxed text-[#d8d0ec] shadow-lg backdrop-blur-xl"
          >
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#8ec9bd]" />
            <span>
              <strong className="font-semibold text-white">100% On-Device Sanctuary:</strong> Your
              reflections, memories, and local demo credentials live privately in your browser&apos;s
              IndexedDB—never sold or transmitted to third parties.
            </span>
          </p>
        </StaggeredItem>
      </StaggeredContainer>
    </main>
  )
}
