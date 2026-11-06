'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react'
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
      <div className="auth-card">
        <Link href="/welcome" className="inline-flex items-center gap-1.5 text-xs text-white/45 hover:text-white">
          <ArrowLeft size={13} /> Back
        </Link>
        <p className="eyebrow mt-6">Sign in</p>
        <h1 className="mt-2 font-serif text-3xl text-white">Welcome back</h1>
        <p className="mt-2 text-xs text-white/50">Your sanctuary is waiting on this device.</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          <label className="field-label !mt-0">
            Email address
            <input
              className="modal-input"
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
                className="modal-input w-full pr-11"
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

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button type="submit" disabled={busy !== ''} className="primary-button justify-center py-3 text-sm">
            {busy === 'submit' && <Loader2 size={14} className="animate-spin" />}
            {busy === 'submit' ? 'Entering…' : 'Enter Sanctuary'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleGuest}
          disabled={busy !== ''}
          className="secondary-button mt-4 w-full border border-white/[0.1] py-3 text-sm"
        >
          {busy === 'guest' && <Loader2 size={14} className="animate-spin" />}
          Continue as Guest
        </button>

        <p className="mt-6 text-center text-xs text-white/50">
          New to LUMINA?{' '}
          <Link href="/sign-up" className="text-[#e8b8c7] hover:underline">Create Account</Link>
        </p>
      </div>
    </AuthShell>
  )
}
