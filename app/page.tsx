'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { LuminaLoader } from '@/components/lumina-loader'
import { useSanctuary } from '@/context/sanctuary-context'
import { resolveEntryRoute } from '@/lib/routing'

export default function EntryGatekeeper() {
  const router = useRouter()
  const pathname = usePathname()
  const { isHydrated, isLoading, authUser, onboarding } = useSanctuary()
  const didRedirectRef = useRef(false)

  useEffect(() => {
    if (!isHydrated || isLoading || didRedirectRef.current) return
    const target = resolveEntryRoute(authUser, onboarding)
    if (target && target !== pathname) {
      didRedirectRef.current = true
      router.replace(target)
    }
  }, [isHydrated, isLoading, authUser, onboarding, pathname, router])

  return <LuminaLoader />
}
