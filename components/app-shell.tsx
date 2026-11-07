'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  CloudRain,
  Compass,
  Dna,
  Flame,
  Flower2,
  House,
  MessageCircleHeart,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Pause,
  Play,
  Route as RouteIcon,
  Settings,
  ShieldAlert,
  Sparkles,
  Wind,
  X,
  type LucideIcon,
} from 'lucide-react'
import { AnimeSkyWorld } from '@/components/animation-system'
import { LuminaLoader } from '@/components/lumina-loader'
import { LuminaLogoIntro, PortalAwakeningOverlay } from '@/components/sanctuary-cinematics'
import { BreathPacerModal, SupportModal } from '@/components/support-modals'
import { useSanctuary, type SensoryMode } from '@/context/sanctuary-context'
import { resolveEntryRoute } from '@/lib/routing'

export interface NavItem {
  href: string
  label: string
  subtitle: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/home', label: 'Home', subtitle: 'Sanctuary gateway', icon: House },
  { href: '/garden', label: 'Inner Garden', subtitle: '3D living world', icon: Flower2 },
  { href: '/check-in', label: 'Emotional Check-In', subtitle: 'Compass & aura', icon: Compass },
  { href: '/emojis', label: 'Emoji Sanctuary', subtitle: 'Alchemy & mood canvas', icon: Sparkles },
  { href: '/companion', label: 'Soul Companion', subtitle: 'AI listener & coach', icon: MessageCircleHeart },
  { href: '/calm-studio', label: 'Calm Studio', subtitle: 'Rain & somatic breath', icon: Wind },
  { href: '/release-room', label: 'Release Room', subtitle: 'Burn & star jar', icon: Flame },
  { href: '/insights', label: 'Personal Insights', subtitle: 'Calm DNA & patterns', icon: Dna },
  { href: '/journey', label: 'My Journey', subtitle: '30-day gentle path', icon: RouteIcon },
  { href: '/settings', label: 'Profile & Settings', subtitle: 'Privacy & preferences', icon: Settings },
]

const ROOM_AURORA_COLORS: Record<string, string> = {
  '/home': 'linear-gradient(90deg, transparent, rgba(126,200,184,0.55), rgba(232,164,184,0.45), transparent)',
  '/garden': 'linear-gradient(90deg, transparent, rgba(126,200,184,0.7), rgba(243,217,164,0.5), transparent)',
  '/check-in': 'linear-gradient(90deg, transparent, rgba(232,164,184,0.65), rgba(184,164,232,0.5), transparent)',
  '/emojis': 'linear-gradient(90deg, transparent, rgba(243,217,164,0.7), rgba(232,164,184,0.6), rgba(126,200,184,0.6), transparent)',
  '/companion': 'linear-gradient(90deg, transparent, rgba(184,164,232,0.68), rgba(126,200,184,0.52), transparent)',
  '/calm-studio': 'linear-gradient(90deg, transparent, rgba(126,184,200,0.65), rgba(145,202,190,0.55), transparent)',
  '/release-room': 'linear-gradient(90deg, transparent, rgba(224,138,126,0.65), rgba(243,217,164,0.55), transparent)',
  '/insights': 'linear-gradient(90deg, transparent, rgba(184,164,232,0.65), rgba(232,164,184,0.5), transparent)',
  '/journey': 'linear-gradient(90deg, transparent, rgba(243,217,164,0.65), rgba(126,200,184,0.5), transparent)',
  '/settings': 'linear-gradient(90deg, transparent, rgba(143,160,181,0.55), rgba(126,200,184,0.45), transparent)',
}

const PRIMARY_MOBILE = NAV_ITEMS.slice(0, 4)
const MORE_MOBILE = NAV_ITEMS.slice(4)

const SENSORY: Array<{ id: SensoryMode; label: string }> = [
  { id: 'full', label: 'Full sanctuary' },
  { id: 'gentle', label: 'Gentle' },
  { id: 'low', label: 'Low stimulus' },
]

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
  const s = Math.floor(totalSeconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode
  title?: string
  subtitle?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const {
    isHydrated,
    isLoading,
    authUser,
    onboarding,
    name,
    aura,
    gardenBlooms,
    sensoryMode,
    rainPlaying,
    rainSeconds,
    toggleRain,
    updateProfileSettings,
    crisisAlert,
    dismissCrisisAlert,
  } = useSanctuary()

  const [collapsed, setCollapsed] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const [breathOpen, setBreathOpen] = useState(false)
  const [replayLogoIntro, setReplayLogoIntro] = useState(false)

  const ready = isHydrated && !isLoading

  // Auth guard (never redirects while data is still hydrating).
  useEffect(() => {
    if (!ready) return
    if (!authUser) {
      const target = resolveEntryRoute(authUser, onboarding)
      if (target && target !== pathname) {
        router.replace(target)
      }
    }
  }, [ready, authUser, onboarding, pathname, router])

  // Any on-device crisis detection opens the support modal automatically.
  useEffect(() => {
    if (crisisAlert) setSupportOpen(true)
  }, [crisisAlert])

  // Close the mobile sheet on navigation.
  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

  if (!ready || !authUser) {
    return <LuminaLoader />
  }

  function closeSupport() {
    setSupportOpen(false)
    dismissCrisisAlert()
  }

  const displayName = name.trim().split(/\s+/)[0] || authUser?.name || 'Friend'
  const isGuest = authUser?.mode === 'guest'
  const moreActive = MORE_MOBILE.some(i => isActive(pathname, i.href))
  const activeSweepGradient =
    ROOM_AURORA_COLORS[pathname] || ROOM_AURORA_COLORS['/home']

  return (
    <div
      className={`relative flex min-h-screen w-full text-[#eeeaf3] ${sensoryMode === 'gentle' ? 'gentle-mode' : ''}`}
      data-sensory={sensoryMode}
    >
      <LuminaLogoIntro
        forceOpen={replayLogoIntro}
        onClose={() => setReplayLogoIntro(false)}
      />
      <PortalAwakeningOverlay fallbackName={displayName} />
      <AnimeSkyWorld intensity="subtle" />

      {sensoryMode !== 'low' && (
        <>
          <div className="aurora aurora-one" />
          <div className="aurora aurora-two" />
          <div className="aurora aurora-three" />
        </>
      )}

      {/* DESKTOP SIDEBAR */}
      <aside
        style={{ width: collapsed ? '76px' : '272px' }}
        className="fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-white/[0.09] bg-[#0a0c14]/92 backdrop-blur-2xl transition-[width] duration-300 lg:flex"
        aria-label="Sanctuary navigation"
      >
        <button
          type="button"
          onClick={() => setReplayLogoIntro(true)}
          title="Replay LUMINA Sanctuary Cinematic Intro"
          className={`group flex items-center gap-2.5 px-4 pt-3.5 pb-2 text-left transition hover:opacity-95 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <div className="brand-mark shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:shadow-[0_0_18px_rgba(243,217,164,0.45)]">
            <Sparkles size={15} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-serif text-base tracking-[0.22em] text-white">LUMINA</p>
                <span className="rounded-full border border-[#f3d9a4]/30 bg-[#f3d9a4]/10 px-1.5 py-0.2 text-[7.5px] font-medium tracking-[0.14em] text-[#f3d9a4] uppercase">
                  RaaOS Engine
                </span>
              </div>
              <p className="truncate text-[9px] uppercase tracking-[0.16em] text-white/45 group-hover:text-[#8ec9bd]">
                Emotional Sanctuary · by Rudra ✦
              </p>
            </div>
          )}
        </button>

        {!collapsed && (
          <div className="mx-3 mb-2 flex items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-2.5 py-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#d9aec1] font-serif text-xs text-[#211722]">
              {displayName.slice(0, 1).toUpperCase()}
            </span>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-1.5">
              <p className="truncate text-xs text-white/85">{displayName}</p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wider ${
                  isGuest ? 'bg-[#e0c28a]/15 text-[#e8cf9f]' : 'bg-[#8ec9bd]/15 text-[#a5d4ca]'
                }`}
              >
                {isGuest ? 'Guest' : 'Account'}
              </span>
            </div>
          </div>
        )}

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-0.5 pr-1">
          <ul className="flex flex-col space-y-0.5">
            {NAV_ITEMS.map(item => {
              const active = isActive(pathname, item.href)
              const Icon = item.icon
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch={active ? false : undefined}
                    aria-current={active ? 'page' : undefined}
                    title={collapsed ? item.label : undefined}
                    className={`group relative flex items-center gap-2.5 overflow-hidden rounded-xl border px-3 py-1.5 transition-all duration-300 ${
                      collapsed ? 'justify-center' : ''
                    } ${
                      active
                        ? 'border-[#e1acc1]/45 bg-gradient-to-r from-[#daa9c2]/20 via-[#b8a4e8]/12 to-[#8ec9bd]/12 text-white shadow-[0_0_24px_rgba(218,169,194,0.16)]'
                        : 'border-transparent text-white/55 hover:translate-x-0.5 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-gradient-to-b from-[#f3d9a4] via-[#e8a4b8] to-[#7ec8b8] shadow-[0_0_10px_#e8a4b8]"
                      />
                    )}
                    <Icon size={16} strokeWidth={1.5} className={`shrink-0 ${active ? 'text-[#edb4c5]' : ''}`} />
                    {!collapsed && (
                      <span className="min-w-0 leading-tight">
                        <span className="block truncate text-[12.5px]">{item.label}</span>
                        <span className="block truncate text-[9.5px] text-white/35">{item.subtitle}</span>
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="space-y-2 p-3">
          {!collapsed ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3">
              <div className="flex items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: aura.color, boxShadow: `0 0 12px ${aura.color}` }}
                />
                <div className="min-w-0">
                  <p className="truncate font-serif text-xs" style={{ color: aura.color }}>
                    {aura.label}
                  </p>
                  <p className="text-[10px] text-white/40">
                    {gardenBlooms} garden bloom{gardenBlooms === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleRain}
                aria-pressed={rainPlaying}
                className={`support-button mt-2 w-full justify-center !py-1.5 ${
                  rainPlaying ? 'border-[#91cabe]/50 text-[#a5d4ca]' : ''
                }`}
              >
                {rainPlaying ? <Pause size={12} /> : <Play size={12} />}
                {rainPlaying ? `Pause rain · ${formatClock(rainSeconds)}` : '3:00 Rain'}
              </button>
            </div>
          ) : (
            <button
              onClick={toggleRain}
              aria-pressed={rainPlaying}
              aria-label={rainPlaying ? 'Pause rain' : 'Play rain'}
              className="icon-button mx-auto"
            >
              {rainPlaying ? <Pause size={15} /> : <CloudRain size={15} />}
            </button>
          )}
          <button
            onClick={() => setCollapsed(v => !v)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar for immersion'}
            className={`support-button w-full !py-1.5 ${collapsed ? 'justify-center' : ''}`}
          >
            {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
            {!collapsed && 'Collapse'}
          </button>
        </div>
      </aside>

      {/* PHYSICAL DESKTOP SIDEBAR SPACER — Guarantees main column NEVER slides under sidebar */}
      <div
        aria-hidden="true"
        style={{
          width: collapsed ? '76px' : '272px',
          minWidth: collapsed ? '76px' : '272px',
        }}
        className="hidden shrink-0 transition-[width,min-width] duration-300 lg:block"
      />

      {/* MAIN COLUMN */}
      <div className="relative z-10 flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.09] bg-[#080a13]/88 px-4 pb-4 pt-6 backdrop-blur-xl sm:px-8 sm:pb-5 sm:pt-7">
          <div className="min-w-0">
            {title ? (
              <>
                <h1 className="font-serif text-xl leading-snug text-white drop-shadow-[0_2px_10px_rgba(6,7,18,0.9)] sm:text-2xl">
                  {title}
                </h1>
                {subtitle && <p className="mt-0.5 text-xs text-[#e6e1f4]/75">{subtitle}</p>}
              </>
            ) : (
              <p className="hidden font-serif text-sm italic text-[#e6e1f4]/75 sm:block">
                You don&apos;t have to be happy to be worthy of peace.
              </p>
            )}
            <button
              type="button"
              onClick={() => setReplayLogoIntro(true)}
              className="font-serif text-base tracking-[0.22em] text-white lg:hidden"
              title="Replay LUMINA Cinematic Intro"
            >
              {!title && 'LUMINA'}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="mode-toggle" role="group" aria-label="Sensory setting">
              {SENSORY.map(s => (
                <button
                  key={s.id}
                  className={sensoryMode === s.id ? 'active' : ''}
                  aria-pressed={sensoryMode === s.id}
                  onClick={() => void updateProfileSettings({ sensoryMode: s.id })}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button onClick={() => setBreathOpen(true)} className="support-button">
              <Wind size={13} />
              <span className="hidden sm:inline">60s Breath</span>
            </button>
            <button onClick={() => setSupportOpen(true)} className="support-button">
              <ShieldAlert size={14} />
              <span className="hidden sm:inline">Immediate support</span>
            </button>
          </div>
        </header>

        <main
          key={pathname}
          className="lumina-room-transition relative mx-auto w-full max-w-[1440px] flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12"
        >
          {/* Ambient Room-Specific Aurora Sweep on Route Transition */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-8 top-0 h-[2px] rounded-full"
            style={{
              background: activeSweepGradient,
              boxShadow: '0 0 22px rgba(126, 200, 184, 0.35)',
              animation: 'luminaAuroraSweep 900ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          />
          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.09] bg-[#0a0c14]/85 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur-2xl lg:hidden"
        aria-label="Primary"
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-between">
          {PRIMARY_MOBILE.map(item => {
            const active = isActive(pathname, item.href)
            const Icon = item.icon
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] ${
                    active ? 'text-[#f4d9e2]' : 'text-white/45'
                  }`}
                >
                  <Icon size={18} strokeWidth={1.5} />
                  {item.href === '/check-in' ? 'Check-In' : item.href === '/garden' ? 'Garden' : item.label.replace('Soul ', '')}
                </Link>
              </li>
            )
          })}
          <li className="flex-1">
            <button
              onClick={() => setMoreOpen(true)}
              aria-expanded={moreOpen}
              className={`flex w-full flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] ${
                moreActive ? 'text-[#f4d9e2]' : 'text-white/45'
              }`}
            >
              <Menu size={18} strokeWidth={1.5} />
              More
            </button>
          </li>
        </ul>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="More rooms">
          <button
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
            aria-label="Close more rooms"
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-[28px] border border-white/[0.1] bg-[#0d0f19]/95 p-5 pb-[max(env(safe-area-inset-bottom),20px)] backdrop-blur-2xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="eyebrow">More rooms</p>
              <button onClick={() => setMoreOpen(false)} className="icon-button" aria-label="Close">
                <X size={14} />
              </button>
            </div>
            <ul className="grid gap-2">
              {MORE_MOBILE.map(item => {
                const active = isActive(pathname, item.href)
                const Icon = item.icon
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                        active
                          ? 'border-[#e1acc1]/35 bg-[#daa9c2]/12 text-white'
                          : 'border-white/[0.07] bg-white/[0.03] text-white/70'
                      }`}
                    >
                      <Icon size={18} strokeWidth={1.5} className={active ? 'text-[#edb4c5]' : ''} />
                      <span>
                        <span className="block text-sm">{item.label}</span>
                        <span className="block text-[11px] text-white/40">{item.subtitle}</span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}

      {supportOpen && (
        <SupportModal
          onClose={closeSupport}
          onBreathPacer={() => {
            closeSupport()
            setBreathOpen(true)
          }}
        />
      )}
      {breathOpen && <BreathPacerModal onClose={() => setBreathOpen(false)} />}
    </div>
  )
}
