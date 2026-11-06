import { AuthShell } from '@/components/auth-shell'

/** Immediate, serene fallback shown while local data hydrates or a redirect is in flight. */
export function LuminaLoader({ label = 'Opening your sanctuary' }: { label?: string }) {
  return (
    <AuthShell>
      <div className="flex flex-col items-center gap-6" role="status" aria-live="polite">
        <div className="lumina-orb" aria-hidden />
        <p className="eyebrow">LUMINA · {label}</p>
      </div>
    </AuthShell>
  )
}

/** Layout-accurate skeleton for the wellness profile wizard (renders instantly, no layout shift). */
export function ProfileSkeleton() {
  return (
    <AuthShell>
      <div className="w-full max-w-2xl" role="status" aria-busy="true" aria-label="Loading your profile">
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="h-2.5 w-48 animate-pulse rounded-full bg-white/10" />
            <span className="h-2.5 w-20 animate-pulse rounded-full bg-white/10" />
          </div>
          <div className="meter">
            <span style={{ width: '14%' }} />
          </div>
        </div>
        <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.045] p-6 backdrop-blur-xl sm:p-8">
          <div className="h-9 w-3/4 animate-pulse rounded-xl bg-white/10" />
          <div className="mt-3 h-3 w-40 animate-pulse rounded-full bg-white/[0.07]" />
          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-[54px] animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.04]" />
            ))}
          </div>
          <div className="mt-6 h-3 w-full animate-pulse rounded-full bg-white/[0.06]" />
          <div className="mt-7 flex justify-end">
            <div className="h-11 w-32 animate-pulse rounded-full bg-white/10" />
          </div>
        </div>
        <span className="sr-only">Loading…</span>
      </div>
    </AuthShell>
  )
}
