/**
 * LUMINA (RaaOS Engine) — App Version & Sideloaded APK Update Comparator
 */

export const DEFAULT_APP_VERSION = '1.0.0-rc.1'

export interface AppVersionInfo {
  latestVersion: string
  downloadUrl: string
  updateMessage: string
}

interface ParsedSemver {
  major: number
  minor: number
  patch: number
  pre: string[]
}

/**
 * Returns the running client build version injected at build time, falling back
 * to DEFAULT_APP_VERSION when unset.
 */
export function getCurrentAppVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION?.trim() || DEFAULT_APP_VERSION
}

/**
 * Parses a SemVer string such as "1.0.0-rc.1", "v1.0.2", or "1.2.0".
 */
export function parseSemver(raw: string): ParsedSemver | null {
  if (typeof raw !== 'string') return null
  const clean = raw.trim().replace(/^v/i, '').split('+')[0]
  const match = clean.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/)
  if (!match) return null

  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
    pre: match[4] ? match[4].split('.').filter(Boolean) : [],
  }
}

/**
 * Compares two SemVer strings according to SemVer 2.0.0 precedence.
 * Returns 1 if a > b, -1 if a < b, and 0 if equal (or invalid).
 */
export function compareVersions(a: string, b: string): number {
  const pa = parseSemver(a)
  const pb = parseSemver(b)
  if (!pa || !pb) return 0

  if (pa.major !== pb.major) return pa.major > pb.major ? 1 : -1
  if (pa.minor !== pb.minor) return pa.minor > pb.minor ? 1 : -1
  if (pa.patch !== pb.patch) return pa.patch > pb.patch ? 1 : -1

  // Stable version (no prerelease) always outranks a prerelease of the same core version.
  if (pa.pre.length === 0 && pb.pre.length === 0) return 0
  if (pa.pre.length === 0) return 1
  if (pb.pre.length === 0) return -1

  const len = Math.max(pa.pre.length, pb.pre.length)
  for (let i = 0; i < len; i++) {
    const segA = pa.pre[i]
    const segB = pb.pre[i]
    if (segA === undefined) return -1
    if (segB === undefined) return 1
    if (segA === segB) continue

    const isNumA = /^\d+$/.test(segA)
    const isNumB = /^\d+$/.test(segB)
    if (isNumA && isNumB) {
      const nA = Number.parseInt(segA, 10)
      const nB = Number.parseInt(segB, 10)
      if (nA !== nB) return nA > nB ? 1 : -1
    } else if (isNumA !== isNumB) {
      // SemVer: numeric identifiers have lower precedence than non-numeric identifiers
      return isNumA ? -1 : 1
    } else {
      return segA > segB ? 1 : -1
    }
  }

  return 0
}

/**
 * Returns true strictly when `latestVersion` is higher than `currentVersion`.
 */
export function isNewerVersion(
  latestVersion: string,
  currentVersion: string = getCurrentAppVersion()
): boolean {
  return compareVersions(latestVersion, currentVersion) > 0
}

/**
 * Determines whether the non-intrusive Android APK update banner should render.
 */
export function shouldShowAndroidUpdatePrompt(params: {
  isNative: boolean
  latestVersion?: string | null
  currentVersion?: string
  dismissedVersion?: string | null
}): boolean {
  if (!params.isNative) return false
  if (!params.latestVersion) return false
  if (params.dismissedVersion && params.dismissedVersion === params.latestVersion) {
    return false
  }
  return isNewerVersion(params.latestVersion, params.currentVersion ?? getCurrentAppVersion())
}
