'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react'
import { AuthShell } from '@/components/auth-shell'
import { useSanctuary } from '@/context/sanctuary-context'

export default function SignUpPage() {
  const router = useRouter()
  const { registerUser, continueAsGuest } = useSanctuary()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState<'' | 'submit' | 'demo' | 'guest'>('')
  const [error, setError] = useState('')
  const [demoInfo, setDemoInfo] = useState(false)

  function validate(): string {
    if (!name.trim()) return 'Please share a name or nickname.'
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Please enter a valid email address.'
    if (password.length < 6) return 'Your password needs at least 6 characters.'
    return ''
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    setError('')
    setBusy('submit')
    try {
      await registerUser(name, email, password)
      router.push('/onboarding/introduction')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong creating your sanctuary.')
      setBusy('')
    }
  }

  async function handleDemo() {
    if (!demoInfo) {
      setDemoInfo(true)
      return
    }
    setError('')
    setBusy('demo')
    try {
      const suffix = Math.random().toString(36).slice(2, 8)
      const secret = `demo-${Math.random().toString(36).slice(2)}`
      await registerUser('Demo Traveler', `demo-${suffix}@lumina.local`, secret)
      router.push('/onboarding/introduction')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the local demo profile.')
      setBusy('')
    }
  }

  async function handleGuest() {
    setError('')
    setBusy('guest')
    try {
      await continueAsGuest()
      router.push('/onboarding/introduction')
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
        <p className="eyebrow mt-6">Create account</p>
        <h1 className="mt-2 font-serif text-3xl text-white">Begin your sanctuary</h1>
        <p className="mt-2 text-xs text-white/50">Stored only on this device. Nothing is sent anywhere.</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          <label className="field-label !mt-0">
            Name or nickname
            <input
              className="modal-input"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="nickname"
              placeholder="How should LUMINA greet you?"
            />
          </label>
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
                autoComplete="new-password"
                placeholder="At least 6 characters"
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
            {busy === 'submit' ? 'Creating…' : 'Create My Sanctuary'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-white/25">
          <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleDemo}
            disabled={busy !== ''}
            className="secondary-button border border-white/[0.1] py-3 text-sm"
          >
            {busy === 'demo' && <Loader2 size={14} className="animate-spin" />}
            {demoInfo ? 'Confirm: create local demo profile' : 'Continue with Google (Local Demo)'}
          </button>
          {demoInfo && (
            <p className="text-[11px] leading-relaxed text-white/45">
              This is not real Google sign-in. No OAuth, no tracking, no external request: it simply
              creates a local demo profile on this device only.
            </p>
          )}
          <button
            type="button"
            onClick={handleGuest}
            disabled={busy !== ''}
            className="py-2 text-sm text-white/55 transition hover:text-white"
          >
            {busy === 'guest' ? 'Starting…' : 'Continue as Guest'}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-white/50">
          Already have a sanctuary?{' '}
          <Link href="/sign-in" className="text-[#e8b8c7] hover:underline">Sign In</Link>
        </p>
      </div>
    </AuthShell>
  )
}
