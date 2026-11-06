'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSanctuary } from '@/context/sanctuary-context'
import { resolveEntryRoute } from '@/lib/routing'

export default function EntryGatekeeper() {
  const router = useRouter()
  const { isHydrated, isLoading, authUser, onboarding } = useSanctuary()

  useEffect(() => {
    if (!isHydrated || isLoading) return
    router.replace(resolveEntryRoute(authUser, onboarding))
  }, [isHydrated, isLoading, authUser, onboarding, router])

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#080b11]">
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />
      <div className="relative z-10 flex flex-col items-center gap-6" role="status" aria-live="polite">
        <div className="lumina-orb" aria-hidden />
        <p className="eyebrow">LUMINA · Opening your sanctuary</p>
      </div>
    </main>
  )
}
