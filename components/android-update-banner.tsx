'use client'

import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Download, Sparkles, X } from 'lucide-react'
import { resolveApiUrl } from '@/lib/api-client'
import {
  getCurrentAppVersion,
  shouldShowAndroidUpdatePrompt,
  type AppVersionInfo,
} from '@/lib/version'

const DISMISSED_VERSION_KEY = 'lumina_dismissed_apk_version'

let sessionVersionFetched = false
let sessionVersionInfo: AppVersionInfo | null = null

/**
 * Non-intrusive top update toast shown only inside sideloaded native Android
 * Capacitor builds when /api/version advertises a newer APK release.
 */
export function AndroidUpdateBanner() {
  const [updateInfo, setUpdateInfo] = useState<AppVersionInfo | null>(null)

  useEffect(() => {
    let isNative = false
    try {
      isNative = Capacitor.isNativePlatform()
    } catch {
      isNative = false
    }
    if (!isNative) return

    const readDismissed = (): string | null => {
      try {
        return window.sessionStorage.getItem(DISMISSED_VERSION_KEY)
      } catch {
        return null
      }
    }

    const currentVersion = getCurrentAppVersion()

    if (sessionVersionFetched) {
      if (
        sessionVersionInfo &&
        shouldShowAndroidUpdatePrompt({
          isNative: true,
          latestVersion: sessionVersionInfo.latestVersion,
          currentVersion,
          dismissedVersion: readDismissed(),
        })
      ) {
        setUpdateInfo(sessionVersionInfo)
      }
      return
    }

    let cancelled = false
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 6000)

    async function checkVersion() {
      try {
        const res = await fetch(resolveApiUrl('/api/version'), {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!res.ok) return

        const data = (await res.json()) as Partial<AppVersionInfo>
        if (
          typeof data.latestVersion !== 'string' ||
          typeof data.downloadUrl !== 'string' ||
          !data.downloadUrl.trim()
        ) {
          return
        }

        const parsed: AppVersionInfo = {
          latestVersion: data.latestVersion.trim(),
          downloadUrl: data.downloadUrl.trim(),
          updateMessage:
            typeof data.updateMessage === 'string' && data.updateMessage.trim()
              ? data.updateMessage.trim()
              : 'A new version of LUMINA is available!',
        }

        sessionVersionFetched = true
        sessionVersionInfo = parsed

        if (
          !cancelled &&
          shouldShowAndroidUpdatePrompt({
            isNative: true,
            latestVersion: parsed.latestVersion,
            currentVersion,
            dismissedVersion: readDismissed(),
          })
        ) {
          setUpdateInfo(parsed)
        }
      } catch {
        // Offline or unreachable — stay silent so sanctuary startup never stalls
      } finally {
        window.clearTimeout(timeoutId)
      }
    }

    void checkVersion()

    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [])

  if (!updateInfo) return null

  function dismiss() {
    if (updateInfo) {
      try {
        window.sessionStorage.setItem(DISMISSED_VERSION_KEY, updateInfo.latestVersion)
      } catch {
        // ignore
      }
    }
    setUpdateInfo(null)
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 top-[max(env(safe-area-inset-top),12px)] z-[95] mx-auto max-w-md rounded-2xl border border-[#7ec8b8]/45 bg-[#120e24]/95 px-3.5 py-2.5 text-white shadow-[0_14px_40px_rgba(0,0,0,0.55)]"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-[#7ec8b8]/35 bg-[#7ec8b8]/15 text-[#7ec8b8]">
          <Sparkles size={15} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium leading-snug text-white">
            Update Available: Tap to download the latest version.
          </p>
          <p className="mt-0.5 truncate text-[10.5px] text-white/60">
            v{updateInfo.latestVersion} · {updateInfo.updateMessage}
          </p>
        </div>

        <a
          href={updateInfo.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="primary-button shrink-0 !px-3 !py-1.5 !text-[11px]"
        >
          <Download size={12} />
          <span>Update</span>
        </a>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss update notification"
          className="shrink-0 rounded-full p-1 text-white/45 transition hover:bg-white/10 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
    </aside>
  )
}
