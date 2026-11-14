'use client'

import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Smartphone } from 'lucide-react'

/**
 * Subtle web-only CTA linking to the signed Android release APK.
 * Automatically stays hidden inside native Capacitor Android builds.
 */
export function AndroidDownloadButton({
  className = '',
  variant = 'subtle',
}: {
  className?: string
  variant?: 'subtle' | 'secondary'
}) {
  const [showDownload, setShowDownload] = useState(false)

  useEffect(() => {
    try {
      setShowDownload(!Capacitor.isNativePlatform())
    } catch {
      setShowDownload(true)
    }
  }, [])

  if (!showDownload) return null

  const baseClass =
    variant === 'secondary'
      ? 'secondary-button px-4 py-2.5 text-xs'
      : 'inline-flex items-center justify-center gap-2 rounded-full border border-white/[0.14] bg-[#16112b]/70 px-4 py-2 text-xs text-white/80 backdrop-blur-md transition hover:border-[#7ec8b8]/50 hover:bg-[#1e1838]/85 hover:text-white'

  return (
    <a
      href="/lumina.apk"
      download="LUMINA-v1.0.0-rc.1.apk"
      className={`${baseClass} ${className}`.trim()}
    >
      <Smartphone size={14} className="shrink-0 text-[#7ec8b8]" />
      <span>Download Android App (.apk)</span>
    </a>
  )
}
