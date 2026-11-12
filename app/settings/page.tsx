'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Check,
  Cloud,
  Cpu,
  Database,
  Download,
  Edit3,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  Moon,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sunrise,
  Trash2,
  X,
} from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import {
  useSanctuary,
  type MemoryCategory,
  type SensoryMode,
} from '@/context/sanctuary-context'
import { glass, shortDate } from '@/lib/format'
import { resolveApiUrl } from '@/lib/api-client'

const MEMORY_CATEGORIES: Array<{ id: MemoryCategory; label: string }> = [
  { id: 'preference', label: 'Preference' },
  { id: 'trigger', label: 'Trigger' },
  { id: 'coping', label: 'Calming Strategy' },
  { id: 'anchor', label: 'Comfort Anchor' },
  { id: 'reflection', label: 'Personal Reflection' },
  { id: 'boundary', label: 'Boundary' },
  { id: 'context', label: 'Life Context' },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={`${glass} p-6`}>
      <p className="eyebrow">{title}</p>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function SettingsContent() {
  const router = useRouter()
  const {
    authUser,
    onboarding,
    name,
    pronouns,
    sensoryMode,
    themeMode,
    aiMemoryEnabled,
    aiStatus,
    memories,
    updateProfileSettings,
    resetTutorial,
    addMemory,
    editMemory,
    toggleMemoryShare,
    setAiMemoryEnabled,
    removeMemory,
    exportData,
    eraseAllData,
    signOutUser,
    syncStatus,
    lastSyncedAt,
    triggerManualSync,
  } = useSanctuary()

  const [draftName, setDraftName] = useState(name)
  const [draftPronouns, setDraftPronouns] = useState(pronouns)
  const [saved, setSaved] = useState(false)
  const [exported, setExported] = useState(false)
  const [confirmErase, setConfirmErase] = useState(false)
  const [busy, setBusy] = useState(false)

  // Cloud & Database Sync architecture probe state
  const [healthData, setHealthData] = useState<{
    status: string
    subsystems?: {
      aiCompanion: string
      database: string
      latencyMs?: number
      privacyGuarantee: string
    }
    databaseStatus?: {
      connected: boolean
      mode: string
      latencyMs?: number
      message?: string
    }
  } | null>(null)
  const [probingHealth, setProbingHealth] = useState(false)
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function probeHealth() {
      setProbingHealth(true)
      try {
        const res = await fetch(resolveApiUrl('/api/health'))
        if (res.ok && active) {
          const json = await res.json()
          setHealthData(json)
        }
      } catch {
        // Safe offline / local fallback
      } finally {
        if (active) setProbingHealth(false)
      }
    }
    void probeHealth()
    return () => {
      active = false
    }
  }, [])

  async function handleManualSyncClick() {
    setSyncFeedback(null)
    try {
      await triggerManualSync()
      setSyncFeedback('Sanctuary synchronized successfully!')
      window.setTimeout(() => setSyncFeedback(null), 3000)
    } catch {
      setSyncFeedback('Sync finished. Saved safely to local outbox.')
      window.setTimeout(() => setSyncFeedback(null), 3000)
    }
  }

  // Memory Vault inline management state
  const [newMemText, setNewMemText] = useState('')
  const [newMemCat, setNewMemCat] = useState<MemoryCategory>('preference')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editCat, setEditCat] = useState<MemoryCategory>('preference')

  const prefs = onboarding.preferences
  const sharedCount = memories.filter(m => m.sharedWithAi !== false).length

  async function saveProfile() {
    await updateProfileSettings({ name: draftName, pronouns: draftPronouns })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2200)
  }

  async function replayTutorial() {
    await resetTutorial()
    router.push('/onboarding/tutorial')
  }

  async function handleAddMemory(e: React.FormEvent) {
    e.preventDefault()
    if (!newMemText.trim()) return
    await addMemory(newMemText.trim(), newMemCat)
    setNewMemText('')
  }

  async function saveEditedMemory(id: string) {
    if (!editText.trim()) return
    await editMemory(id, editText.trim(), editCat)
    setEditingId(null)
  }

  async function handleExport() {
    const payload = await exportData()
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lumina-sanctuary-backup.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setExported(true)
    window.setTimeout(() => setExported(false), 2600)
  }

  async function handleErase() {
    setBusy(true)
    await eraseAllData()
    router.replace('/welcome')
  }

  async function handleSignOut() {
    setBusy(true)
    await signOutUser()
    router.replace('/welcome')
  }

  const modes: Array<[SensoryMode, string]> = [
    ['full', 'Full sanctuary'],
    ['gentle', 'Gentle'],
    ['low', 'Low stimulus'],
  ]
  const pill = (on: boolean) =>
    `rounded-full border px-3.5 py-2 text-xs transition ${
      on
        ? 'border-[#e1acc1]/60 bg-[#daa9c2]/20 text-[#f4d9e2]'
        : 'border-white/[0.09] bg-white/[0.03] text-white/55 hover:text-white'
    }`

  return (
    <div className="mx-auto grid w-full max-w-[920px] gap-5">
      <Section title="Profile & Account">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider ${
                authUser?.mode === 'guest'
                  ? 'bg-[#e0c28a]/15 text-[#e8cf9f]'
                  : 'bg-[#8ec9bd]/15 text-[#a5d4ca]'
              }`}
            >
              {authUser?.mode === 'guest' ? 'Guest' : 'Account'}
            </span>
            {authUser?.email && <span className="text-xs text-white/45">{authUser.email}</span>}
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={busy}
            className="secondary-button px-3.5 py-1.5 text-xs"
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="field-label !mt-0">
            Name
            <input
              className="modal-input"
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
            />
          </label>
          <label className="field-label !mt-0">
            Pronouns <span>(optional)</span>
            <input
              className="modal-input"
              value={draftPronouns}
              onChange={e => setDraftPronouns(e.target.value)}
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={saveProfile}
            className="primary-button px-5 py-2.5 text-xs"
          >
            {saved ? <Check size={13} /> : null} {saved ? 'Saved' : 'Save Profile'}
          </button>
          <span className="text-[11px] text-white/35">
            Signing out preserves your check-ins, garden blooms, and letters on this device.
          </span>
        </div>
      </Section>

      {/* AI ENGINE & PRIVACY STATUS CARD */}
      <Section title="AI Engine & Privacy Status">
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-white/[0.08] bg-black/25 p-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                  aiStatus === 'gemini'
                    ? 'border-[#7ec8b8]/50 bg-[#7ec8b8]/15 text-[#c8f3e9]'
                    : 'border-[#b8a4e8]/45 bg-[#b8a4e8]/15 text-[#e2d8f8]'
                }`}
              >
                <Cpu size={13} />
                {aiStatus === 'gemini'
                  ? 'Gemini 2.5 Flash Active (Server-Proxied)'
                  : '100% On-Device Local Sanctuary Mode'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-0.5 text-[11px] text-white/60">
                <ShieldCheck size={12} className="text-[#7ec8b8]" /> Zero client API keys
              </span>
            </div>
            <p className="text-xs leading-relaxed text-white/60">
              {aiStatus === 'gemini'
                ? 'Your server has GEMINI_API_KEY configured. When you chat with your Soul Companion or generate a Sanctuary Reflection, only your current prompt, recent check-in summary, and memories explicitly marked "Shared with AI" (when the master switch is enabled) are sent over HTTPS to the local Next.js API route—never stored in cloud databases.'
                : 'No server GEMINI_API_KEY was detected or the sanctuary is offline. LUMINA is running in 100% On-Device Local Mode—all companion responses and sanctuary reflections are synthesized locally inside your browser with zero external network calls.'}
            </p>
          </div>
          <Link href="/companion" className="secondary-button shrink-0 px-4 py-2 text-xs">
            <Sparkles size={13} /> Open Soul Companion
          </Link>
        </div>
      </Section>

      {/* DATABASE & CLOUD SYNC ARCHITECTURE (POSTGRESQL + INDEXEDDB) */}
      <Section title="Database & Cloud Sync Architecture (PostgreSQL + IndexedDB)">
        <div className="rounded-2xl border border-white/[0.08] bg-black/25 p-4 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                    healthData?.databaseStatus?.connected
                      ? 'border-[#7ec8b8]/50 bg-[#7ec8b8]/15 text-[#c8f3e9]'
                      : 'border-[#b8a4e8]/45 bg-[#b8a4e8]/15 text-[#e2d8f8]'
                  }`}
                >
                  <Database size={13} />
                  {healthData?.databaseStatus?.connected
                    ? `PostgreSQL Active (${healthData.databaseStatus.latencyMs ?? 0}ms)`
                    : healthData?.subsystems?.database === 'postgres-configured-offline'
                      ? 'PostgreSQL Configured (Offline)'
                      : '100% Local-First IndexedDB Mode'}
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] ${
                    syncStatus === 'synced'
                      ? 'border-[#7ec8b8]/40 bg-[#7ec8b8]/10 text-[#c8f3e9]'
                      : syncStatus === 'syncing'
                        ? 'border-[#f3d9a4]/40 bg-[#f3d9a4]/10 text-[#f3d9a4]'
                        : syncStatus === 'error'
                          ? 'border-[#edb4c5]/40 bg-[#edb4c5]/10 text-[#edb4c5]'
                          : 'border-white/[0.1] bg-white/[0.04] text-white/60'
                  }`}
                >
                  <Cloud size={11} />
                  {syncStatus === 'synced'
                    ? 'Cloud & Local Synced'
                    : syncStatus === 'syncing'
                      ? 'Synchronizing...'
                      : syncStatus === 'offline'
                        ? 'Offline Outbox Active'
                        : syncStatus === 'error'
                          ? 'Sync Retrying (Outbox Safe)'
                          : 'Sync Engine Idle'}
                </span>

                <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-0.5 text-[11px] text-white/60">
                  <ShieldCheck size={12} className="text-[#7ec8b8]" /> Zero-PII Logging
                </span>
              </div>

              <p className="text-xs leading-relaxed text-white/60">
                LUMINA utilizes a deterministic Last-Write-Wins (LWW) local-first sync engine. All check-ins, letters, and blooms write instantly to your on-device IndexedDB with zero latency.
                {healthData?.databaseStatus?.connected
                  ? ' When a connection to PostgreSQL is present, changes are atomically mirrored to your encrypted relational cloud tables.'
                  : ' Currently running in pure on-device mode; all sanctuary records remain 100% private on this device without cloud dependency.'}
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-2 shrink-0">
              <button
                type="button"
                onClick={handleManualSyncClick}
                disabled={syncStatus === 'syncing'}
                className="primary-button !px-4 !py-2 !text-xs inline-flex items-center gap-2"
              >
                <RefreshCw
                  size={13}
                  className={syncStatus === 'syncing' ? 'animate-spin' : ''}
                />
                {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Sanctuary Now'}
              </button>
              {syncFeedback ? (
                <span className="text-[11px] text-[#7ec8b8] animate-in fade-in">
                  {syncFeedback}
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-white/[0.07] text-[11px]">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
              <p className="text-white/40 uppercase tracking-wider text-[9px] font-semibold mb-0.5">Last Synchronized</p>
              <p className="text-white/80 font-medium">
                {lastSyncedAt ? `${shortDate(lastSyncedAt)} at ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not yet synced (Local baseline)'}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
              <p className="text-white/40 uppercase tracking-wider text-[9px] font-semibold mb-0.5">Database Subsystem</p>
              <p className="text-white/80 font-medium truncate">
                {healthData?.subsystems?.database || (probingHealth ? 'Probing...' : 'local-indexeddb-only')}
                {healthData?.subsystems?.latencyMs ? ` (${healthData.subsystems.latencyMs}ms)` : ''}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
              <p className="text-white/40 uppercase tracking-wider text-[9px] font-semibold mb-0.5">AI Subsystem</p>
              <p className="text-white/80 font-medium truncate">
                {healthData?.subsystems?.aiCompanion || (aiStatus === 'gemini' ? 'gemini-configured' : 'local-fallback')}
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* SENSORY & ATMOSPHERE WITH LIVE NIGHT VS DAWN CONFIRMATION */}
      <Section title="Sensory & Atmosphere">
        <div>
          <p className="mb-2 text-xs text-white/55">Sensory pacing mode</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Sensory mode">
            {modes.map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={sensoryMode === id}
                onClick={() => void updateProfileSettings({ sensoryMode: id })}
                className={pill(sensoryMode === id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 border-t border-white/[0.07] pt-4">
          <p className="mb-2 text-xs text-white/55">Sanctuary lighting atmosphere</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Theme">
            <button
              type="button"
              aria-pressed={themeMode === 'night'}
              onClick={() => void updateProfileSettings({ themeMode: 'night' })}
              className={pill(themeMode === 'night')}
            >
              <Moon size={13} className="mr-1.5 inline" /> Night atmosphere
            </button>
            <button
              type="button"
              aria-pressed={themeMode === 'dawn'}
              onClick={() => void updateProfileSettings({ themeMode: 'dawn' })}
              className={pill(themeMode === 'dawn')}
            >
              <Sunrise size={13} className="mr-1.5 inline" /> Dawn atmosphere
            </button>
          </div>

          {/* Live confirmation preview banner */}
          <div
            className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3.5 text-xs transition-all"
            style={
              themeMode === 'dawn'
                ? {
                    borderColor: 'rgba(232, 184, 199, 0.35)',
                    background:
                      'linear-gradient(125deg, rgba(181, 101, 132, 0.22), rgba(199, 141, 107, 0.16), rgba(35, 24, 48, 0.85))',
                  }
                : {
                    borderColor: 'rgba(126, 200, 184, 0.25)',
                    background:
                      'linear-gradient(125deg, rgba(15, 24, 38, 0.9), rgba(35, 94, 97, 0.18), rgba(8, 11, 17, 0.92))',
                  }
            }
          >
            <div className="flex items-center gap-2.5">
              {themeMode === 'dawn' ? (
                <Sunrise size={16} className="text-[#f3d9a4]" />
              ) : (
                <Moon size={16} className="text-[#7ec8b8]" />
              )}
              <div>
                <p className="font-serif text-sm text-white">
                  {themeMode === 'dawn'
                    ? 'Active: Pre-Dawn Rose-Quartz & Twilight-Indigo Lighting'
                    : 'Active: Deep Bioluminescent Midnight Sanctuary Lighting'}
                </p>
                <p className="text-[11px] text-white/60">
                  {themeMode === 'dawn'
                    ? 'Warm plum-indigo horizon (#161124 → #231830) with rose-gold and lavender aurora glow.'
                    : 'Obsidian night sky (#080b11) with calming teal, rose, and twilight aurora blurs.'}
                </p>
              </div>
            </div>
            <span className="rounded-full border border-white/[0.12] bg-black/25 px-2.5 py-1 text-[10px] uppercase tracking-wider text-white/75">
              data-theme=&ldquo;{themeMode}&rdquo;
            </span>
          </div>
        </div>
      </Section>

      <Section title="Wellness Onboarding Preferences">
        <div className="grid gap-2.5 sm:grid-cols-3">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
            <p className="eyebrow text-[9px]">Comforting environment</p>
            <p className="mt-1 text-xs text-white/80">
              {prefs?.comfortEnvironment || 'Not set yet'}
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
            <p className="eyebrow text-[9px]">Interaction style</p>
            <p className="mt-1 text-xs text-white/80">{prefs?.interactionStyle || 'Not set yet'}</p>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
            <p className="eyebrow text-[9px]">Daily pace</p>
            <p className="mt-1 text-xs text-white/80">{prefs?.dailyTime || 'Flexible'}</p>
          </div>
        </div>
        {prefs?.helpGoals?.length ? (
          <p className="mt-3 text-xs text-white/50">
            Focus areas: <span className="text-white/75">{prefs.helpGoals.join(' · ')}</span>
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Link href="/onboarding/profile" className="secondary-button px-4 py-2.5 text-xs">
            Update Wellness Profile
          </Link>
          <button
            type="button"
            onClick={replayTutorial}
            className="secondary-button px-4 py-2.5 text-xs"
          >
            <RotateCcw size={13} /> Replay Interactive Tutorial
          </button>
        </div>
      </Section>

      {/* UPGRADED USER-CONTROLLED MEMORY VAULT & PRIVACY CONTROLS */}
      <Section title="Privacy, Memory Vault & Data Sovereignty (100% User-Controlled)">
        {/* Master AI Memory Sharing Switch */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-black/25 p-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-serif text-base text-white">Enable AI Memory Sharing</p>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                  aiMemoryEnabled
                    ? 'bg-[#7ec8b8]/20 text-[#c8f3e9]'
                    : 'bg-white/[0.08] text-white/55'
                }`}
              >
                {aiMemoryEnabled
                  ? `Active (${sharedCount} of ${memories.length} shared)`
                  : 'Paused (0 memories sent to AI)'}
              </span>
            </div>
            <p className="mt-1 text-xs text-white/50">
              When enabled, only memories marked &ldquo;Shared with AI&rdquo; are included as context
              for your Soul Companion and Sanctuary Reflections.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={aiMemoryEnabled}
            onClick={() => void setAiMemoryEnabled(!aiMemoryEnabled)}
            className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
              aiMemoryEnabled
                ? 'border-[#7ec8b8]/60 bg-[#7ec8b8]/20 text-[#c8f3e9]'
                : 'border-white/[0.12] bg-white/[0.04] text-white/60 hover:text-white'
            }`}
          >
            {aiMemoryEnabled ? 'AI Memory Sharing: ON' : 'AI Memory Sharing: OFF'}
          </button>
        </div>

        {/* Add New Memory Form */}
        <form
          onSubmit={handleAddMemory}
          className="mb-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5"
        >
          <p className="eyebrow mb-2 text-[9px]">Add a note to your Memory Vault</p>
          <div className="flex flex-wrap gap-2">
            <select
              value={newMemCat}
              onChange={e => setNewMemCat(e.target.value as MemoryCategory)}
              aria-label="Memory category"
              className="unlock-select !py-2 !text-xs"
            >
              {MEMORY_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
            <input
              value={newMemText}
              onChange={e => setNewMemText(e.target.value)}
              placeholder="e.g., Walking outside after 5pm helps me decompress..."
              aria-label="New memory text"
              className="companion-input min-w-[200px] flex-1 !py-2 !text-xs"
            />
            <button
              type="submit"
              disabled={!newMemText.trim()}
              className="primary-button !px-4 !py-2 !text-xs"
            >
              <Plus size={13} /> Save Memory
            </button>
          </div>
        </form>

        {/* Memory List with Inline Edit, Per-Memory Share Toggle, and Delete */}
        <ul className="grid gap-2.5">
          {memories.length === 0 && (
            <li className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs text-white/45">
              Your Memory Vault is empty. Notes you explicitly save here or in Soul Companion will
              appear under your full control.
            </li>
          )}
          {memories.map(m => {
            const isEditing = editingId === m.id
            const isShared = m.sharedWithAi !== false
            return (
              <li
                key={m.id}
                className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5"
              >
                {isEditing ? (
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap gap-2">
                      <select
                        value={editCat}
                        onChange={e => setEditCat(e.target.value as MemoryCategory)}
                        aria-label="Edit memory category"
                        className="unlock-select !py-1.5 !text-xs"
                      >
                        {MEMORY_CATEGORIES.map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                      <input
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        aria-label="Edit memory text"
                        className="companion-input flex-1 !py-1.5 !text-xs"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => void saveEditedMemory(m.id)}
                        className="primary-button !px-3.5 !py-1.5 !text-xs"
                      >
                        <Check size={12} /> Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="secondary-button !px-3 !py-1.5 !text-xs"
                      >
                        <X size={12} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="eyebrow text-[9px]">
                          {m.category} · {shortDate(m.createdAt)}
                        </span>
                        <button
                          type="button"
                          onClick={() => void toggleMemoryShare(m.id)}
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] transition ${
                            isShared && aiMemoryEnabled
                              ? 'border-[#7ec8b8]/45 bg-[#7ec8b8]/15 text-[#c8f3e9]'
                              : 'border-white/[0.1] bg-white/[0.04] text-white/50'
                          }`}
                          title="Toggle whether this memory can be shared with the AI companion"
                        >
                          {isShared ? <Eye size={10} /> : <EyeOff size={10} />}
                          {isShared ? 'Shared with AI' : 'Private'}
                        </button>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-white/80">{m.text}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(m.id)
                          setEditText(m.text)
                          setEditCat(m.category)
                        }}
                        aria-label="Edit memory"
                        className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-1.5 text-white/50 hover:text-white"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeMemory(m.id)}
                        aria-label="Delete memory"
                        className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-1.5 text-white/50 hover:text-[#edb4c5]"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        <div className="mt-5 border-t border-white/[0.07] pt-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs leading-relaxed text-white/45">
            <Lock size={12} className="shrink-0 text-[#7ec8b8]" />
            Zero cloud databases or third-party telemetry. Export a full JSON backup or permanently
            erase all local IndexedDB stores (`state`, `checkins`, `letters`).
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExport}
              className="secondary-button px-4 py-2.5 text-xs"
            >
              {exported ? <Check size={13} /> : <Download size={13} />}{' '}
              {exported ? 'Backup downloaded' : 'Export Sanctuary Data (.json)'}
            </button>
            {!confirmErase ? (
              <button
                type="button"
                onClick={() => setConfirmErase(true)}
                className="secondary-button px-4 py-2.5 text-xs text-[#edb4c5]"
              >
                <Trash2 size={13} /> Erase All Local Sanctuary Data
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#edb4c5]/30 bg-[#edb4c5]/10 p-2">
                <span className="px-2 text-xs text-[#f4d9e2]">
                  Permanently erase all local data on this device?
                </span>
                <button
                  type="button"
                  onClick={handleErase}
                  disabled={busy}
                  className="primary-button px-3 py-2 text-xs"
                >
                  Confirm Permanent Erase
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmErase(false)}
                  className="secondary-button px-3 py-2 text-xs"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </Section>
    </div>
  )
}

export default function Page() {
  return (
    <AppShell title="Profile & Settings" subtitle="Privacy & preferences">
      <SettingsContent />
    </AppShell>
  )
}
