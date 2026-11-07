'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react'
import {
  CelestialSanctuaryCore,
  MagicalButton,
  StaggeredItem,
  TiltGlassCard,
} from '@/components/animation-system'
import { AuthShell } from '@/components/auth-shell'
import { useSanctuary } from '@/context/sanctuary-context'
import { loadSanctuaryState } from '@/lib/db'
import { resolveEntryRoute } from '@/lib/routing'

export default function SignInPage() {
  const router = useRouter()
  const { signInUser, continueAsGuest } = useSanctuary()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState<'' | 'submit' | 'guest'>('')
  const [error, setError] = useState('')

  async function routeForward(user: Parameters<typeof resolveEntryRoute>[0]) {
    const stored = await loadSanctuaryState()
    router.push(resolveEntryRoute(user, stored?.onboarding))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }
    if (!password) {
      setError('Please enter your password.')
      return
    }
    setError('')
    setBusy('submit')
    try {
      const user = await signInUser(email, password)
      await routeForward(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign you in.')
      setBusy('')
    }
  }

  async function handleGuest() {
    setError('')
    setBusy('guest')
    try {
      const user = await continueAsGuest()
      await routeForward(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start a guest session.')
      setBusy('')
    }
  }

  return (
    <AuthShell>
      <StaggeredItem index={0} className="w-full max-w-[440px]">
        <TiltGlassCard className="p-7 sm:p-8" maxTiltDeg={3}>
          <div className="flex items-center justify-between">
            <Link
              href="/welcome"
              className="inline-flex items-center gap-1.5 text-xs text-white/50 transition hover:text-white"
            >
              <ArrowLeft size={13} /> Back
            </Link>
            <span className="eyebrow text-[9px] text-[#f3d9a4]/80">LUMINA · RaaOS Engine</span>
          </div>

          <div className="-mt-2 flex flex-col items-center text-center">
            <CelestialSanctuaryCore size="sm" interactive />
            <p className="eyebrow mt-1 text-[#e8b8c7]">Sign in</p>
            <h1 className="lumina-hero-title mt-1 font-serif text-3xl text-white">Welcome back</h1>
            <p className="mt-1.5 text-xs text-white/55">Your sanctuary is waiting on this device.</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
            <label className="field-label !mt-0">
              Email address
              <input
                className="modal-input transition focus:shadow-[0_0_20px_rgba(232,164,184,0.2)]"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>
            <label className="field-label !mt-0">
              Password
              <span className="relative block">
                <input
                  className="modal-input w-full pr-11 transition focus:shadow-[0_0_20px_rgba(232,164,184,0.2)]"
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Your password"
                />
                <button
                  type="button"
                  onClick={() => setShow(v => !v)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-white"
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
            </label>

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            <MagicalButton
              type="submit"
              variant="primary"
              disabled={busy !== ''}
              className="mt-1 w-full"
            >
              {busy === 'submit' && <Loader2 size={14} className="animate-spin" />}
              <span>{busy === 'submit' ? 'Entering…' : 'Enter Sanctuary'}</span>
              <ArrowRight size={14} />
            </MagicalButton>
          </form>

          <MagicalButton
            type="button"
            variant="glass"
            onClick={handleGuest}
            disabled={busy !== ''}
            className="mt-3 w-full"
          >
            {busy === 'guest' && <Loader2 size={14} className="animate-spin" />}
            <span>Continue as Guest</span>
          </MagicalButton>

          <p className="mt-6 text-center text-xs text-white/55">
            New to LUMINA?{' '}
            <Link href="/sign-up" className="text-[#f3d9a4] hover:underline">
              Create Account
            </Link>
          </p>
        </TiltGlassCard>
      </StaggeredItem>
    </AuthShell>
  )
}
