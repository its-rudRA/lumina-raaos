'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react'
import { SanctuaryBackdrop } from '@/components/auth-shell'
import { useSanctuary } from '@/context/sanctuary-context'
import { loadSanctuaryState } from '@/lib/db'
import { resolveEntryRoute } from '@/lib/routing'

export default function WelcomePage() {
  const router = useRouter()
  const { continueAsGuest } = useSanctuary()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleGuest() {
    setBusy(true)
    setError('')
    try {
      const user = await continueAsGuest()
      const stored = await loadSanctuaryState()
      router.push(resolveEntryRoute(user, stored?.onboarding))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start a guest session.')
      setBusy(false)
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#080b11] px-5 py-12 text-[#eeeaf3]">
      <SanctuaryBackdrop />
      <section className="relative z-10 flex max-w-xl flex-col items-center text-center">
        <div className="lumina-orb large mb-9" aria-hidden />
        <span className="eyebrow rounded-full border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-[10px]">
          LUMINA · YOUR EMOTIONAL SANCTUARY
        </span>
        <h1 className="mt-6 font-serif text-5xl leading-tight text-white sm:text-6xl">
          Welcome to <em>LUMINA</em>
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-white/60">
          Your personal space to pause, understand, and reconnect with yourself.
        </p>

        <div className="mt-9 flex w-full max-w-xs flex-col gap-3">
          <Link href="/sign-up" className="primary-button justify-center py-3.5 text-sm">
            Create Account <ArrowRight size={15} />
          </Link>
          <Link href="/sign-in" className="secondary-button border border-white/[0.1] py-3.5 text-sm">
            Sign In
          </Link>
          <button
            onClick={handleGuest}
            disabled={busy}
            className="mt-1 inline-flex items-center justify-center gap-2 text-sm text-white/55 transition hover:text-white"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            Continue as Guest
          </button>
        </div>

        {error && <p className="auth-error mt-4" role="alert">{error}</p>}

        <p className="mt-12 flex max-w-md items-start gap-2 text-left text-[11px] leading-relaxed text-white/40">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#8ec9bd]" />
          <span>
            <strong className="font-medium text-white/60">100% On-Device Sanctuary:</strong> Your
            reflections and local demo credentials live privately in your browser&apos;s IndexedDB.
          </span>
        </p>
      </section>
    </main>
  )
}
