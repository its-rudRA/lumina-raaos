import type { ReactNode } from 'react'
import { AnimeSkyWorld } from '@/components/animation-system'
import { LuminaLogoIntro, PortalAwakeningOverlay } from '@/components/sanctuary-cinematics'

export function SanctuaryBackdrop() {
  return (
    <>
      <LuminaLogoIntro />
      <PortalAwakeningOverlay />
      <AnimeSkyWorld intensity="full" />
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />
      <div className="aurora aurora-three" />
    </>
  )
}

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen w-full flex-col overflow-x-hidden overflow-y-auto bg-[#060712] px-4 pt-8 pb-12 text-[#eeeaf3] sm:pt-10 sm:pb-14">
      <SanctuaryBackdrop />
      <div className="relative z-10 my-auto flex w-full flex-col items-center">{children}</div>
    </main>
  )
}
