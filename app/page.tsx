'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LuminaLoader } from '@/components/lumina-loader'
import { useSanctuary } from '@/context/sanctuary-context'
import { resolveEntryRoute } from '@/lib/routing'

export default function EntryGatekeeper() {
  const router = useRouter()
  const { isHydrated, isLoading, authUser, onboarding } = useSanctuary()

  useEffect(() => {
    if (!isHydrated || isLoading) return
    router.replace(resolveEntryRoute(authUser, onboarding))
  }, [isHydrated, isLoading, authUser, onboarding, router])

  return <LuminaLoader />
}
