import { Sparkles } from 'lucide-react'
import { AuthShell } from '@/components/auth-shell'

/**
 * High-end Bioluminescent Crystal Pulse & Orbiting Starlight Ring Loader
 * shown briefly while local IndexedDB data hydrates or a route transition completes.
 */
export function LuminaLoader({ label = 'Opening your sanctuary' }: { label?: string }) {
  return (
    <AuthShell>
      <div
        className="flex flex-col items-center justify-center gap-7 px-6 py-10 text-center"
        role="status"
        aria-live="polite"
      >
        {/* 3D Bioluminescent Crystal Core & Orbiting Stardust Rings */}
        <div
          className="relative grid h-36 w-36 place-items-center"
          style={{ perspective: '900px' }}
          aria-hidden
        >
          {/* Outer Ambient Halo */}
          <div className="pointer-events-none absolute inset-0 animate-pulse rounded-full bg-gradient-to-tr from-[#7ec8b8]/25 via-[#b8a4e8]/20 to-[#f3d9a4]/25 blur-2xl" />

          {/* Outer Stardust Orbit Ring X */}
          <div
            className="pointer-events-none absolute h-32 w-32 rounded-full border border-[#7ec8b8]/45 shadow-[0_0_28px_rgba(126,200,184,0.3)]"
            style={{
              transformStyle: 'preserve-3d',
              animation: 'luminaAstrolabeX 6s linear infinite',
            }}
          />

          {/* Middle Rose-Quartz Orbit Ring Y */}
          <div
            className="pointer-events-none absolute h-24 w-24 rounded-full border border-[#e8a4b8]/45 shadow-[0_0_24px_rgba(232,164,184,0.28)]"
            style={{
              transformStyle: 'preserve-3d',
              animation: 'luminaAstrolabeY 4.5s linear infinite',
            }}
          />

          {/* Inner Champagne-Gold Dashed Ring Z */}
          <div
            className="pointer-events-none absolute h-20 w-20 rounded-full border border-dashed border-[#f3d9a4]/55"
            style={{
              transformStyle: 'preserve-3d',
              animation: 'luminaAstrolabeZ 7.5s linear infinite',
            }}
          />

          {/* Bioluminescent Crystal Core Pearl */}
          <div className="relative grid h-14 w-14 place-items-center rounded-full border border-white/30 bg-gradient-to-br from-[#7ec8b8]/40 via-[#b8a4e8]/35 to-[#f3d9a4]/45 shadow-[0_0_36px_rgba(126,200,184,0.55)] backdrop-blur-md">
            <Sparkles size={20} className="animate-pulse text-[#f7dfb2]" />
          </div>
        </div>

        {/* Pulsing Sanctuary Telemetry Typography */}
        <div className="space-y-2">
          <p className="font-serif text-lg tracking-[0.26em] text-white uppercase">
            LUMINA · <span className="text-[#f3d9a4]">{label}</span>
          </p>
          <p className="text-[10px] tracking-[0.22em] text-[#8ec9bd]/80 uppercase">
            RaaOS Engine · Synchronizing On-Device Sanctuary
          </p>
        </div>
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
