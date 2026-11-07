export const glass = 'rounded-[24px] border border-white/[0.08] bg-white/[0.045] backdrop-blur-xl'

export function timeAgo(timestamp: number): string {
  const diffSec = Math.max(1, Math.floor((Date.now() - timestamp) / 1000))
  if (diffSec < 60) return 'just now'
  const min = Math.floor(diffSec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const days = Math.floor(hr / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export function shortDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(timestamp))
}

export function fullStamp(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

export function auraColor(label: string): string {
  if (label === 'Wired & Overthinking') return '#e7a9bd'
  if (label === 'Quietly Heavy') return '#9584bf'
  if (label === 'Softly Grounded') return '#8ec9bd'
  return '#b8a4d9'
}

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = Math.floor(totalSeconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export const SOMATIC_TAGS = [
  'Tight chest',
  'Overthinking',
  'Academic pressure',
  'Quietly tired',
  'Need comfort',
  'Restless',
  'Softly steady',
  'Grateful',
]
