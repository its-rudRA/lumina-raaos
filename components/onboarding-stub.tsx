'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { AuthShell } from '@/components/auth-shell'
import { useSanctuary } from '@/context/sanctuary-context'
import type { OnboardingStatus } from '@/lib/db'

/** Temporary placeholder for an onboarding step (replaced by full experiences later). */
export function OnboardingStub({
  step,
  title,
  patch,
  next,
  cta,
}: {
  step: number
  title: string
  patch: Partial<OnboardingStatus>
  next: string
  cta: string
}) {
  const router = useRouter()
  const { updateOnboarding } = useSanctuary()
  const [busy, setBusy] = useState(false)

  async function advance() {
    setBusy(true)
    await updateOnboarding(patch)
    router.push(next)
  }

  return (
    <AuthShell>
      <div className="auth-card text-center">
        <div className="lumina-orb mx-auto mb-6" aria-hidden />
        <p className="eyebrow">Step {step} of 3 · Placeholder</p>
        <h1 className="mt-2 font-serif text-3xl text-white">{title}</h1>
        <p className="mt-3 text-xs text-white/50">The full experience for this step is coming soon.</p>
        <button onClick={advance} disabled={busy} className="primary-button mt-7 w-full justify-center py-3 text-sm">
          {cta} <ArrowRight size={14} />
        </button>
      </div>
    </AuthShell>
  )
}
