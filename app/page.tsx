'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { AndroidDownloadButton } from '@/components/android-download-button'
import { LuminaLoader } from '@/components/lumina-loader'
import { useSanctuary } from '@/context/sanctuary-context'
import { resolveEntryRoute } from '@/lib/routing'

export default function EntryGatekeeper() {
  const router = useRouter()
  const pathname = usePathname()
  const { isHydrated, isLoading, authUser, onboarding } = useSanctuary()

  useEffect(() => {
    if (!isHydrated || isLoading) return
    const target = resolveEntryRoute(authUser, onboarding)
    if (target && target !== pathname) {
      router.replace(target)
    }
  }, [isHydrated, isLoading, authUser, onboarding, pathname, router])

  return (
    <div className="relative min-h-screen bg-[#060712]">
      <LuminaLoader />
      <footer className="fixed inset-x-0 bottom-5 z-20 flex flex-wrap items-center justify-center gap-4 px-4">
        <AndroidDownloadButton />
        <Link
          href="/privacy"
          className="text-xs text-white/50 underline-offset-4 transition hover:text-white/85 hover:underline"
        >
          Privacy Policy
        </Link>
      </footer>
    </div>
  )
}
