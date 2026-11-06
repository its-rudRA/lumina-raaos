import type { ReactNode } from 'react'

// Deterministic particle layout (no Math.random) so SSR and client markup always match.
const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  bottom: `${(i * 53) % 40}%`,
  size: 2 + (i % 3),
  duration: `${14 + (i % 7) * 3}s`,
  delay: `${-((i * 1.7) % 16)}s`,
}))

export function SanctuaryBackdrop() {
  return (
    <>
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />
      <div className="aurora aurora-three" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="lumina-dot"
            style={{
              left: p.left,
              bottom: p.bottom,
              width: p.size,
              height: p.size,
              animationDuration: p.duration,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>
    </>
  )
}

export function AuthShell({ children }: { children: ReactNode }) {
  // `my-auto` centers short content but collapses to 0 on tall content, so the top
  // never clips (unlike items-center / place-items-center on a fixed-height box).
  return (
    <main className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#080b11] px-4 py-10 text-[#eeeaf3] sm:py-14">
      <SanctuaryBackdrop />
      <div className="relative z-10 my-auto flex w-full flex-col items-center">{children}</div>
    </main>
  )
}
