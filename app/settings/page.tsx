'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Download, LogOut, RotateCcw, Trash2 } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { useSanctuary, type SensoryMode } from '@/context/sanctuary-context'
import { glass, shortDate } from '@/lib/format'

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
    memories,
    updateProfileSettings,
    resetTutorial,
    removeMemory,
    exportData,
    eraseAllData,
    signOutUser,
  } = useSanctuary()

  const [draftName, setDraftName] = useState(name)
  const [draftPronouns, setDraftPronouns] = useState(pronouns)
  const [saved, setSaved] = useState(false)
  const [exported, setExported] = useState(false)
  const [confirmErase, setConfirmErase] = useState(false)
  const [busy, setBusy] = useState(false)
  const prefs = onboarding.preferences

  async function saveProfile() {
    await updateProfileSettings({ name: draftName, pronouns: draftPronouns })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2200)
  }

  async function replayTutorial() {
    await resetTutorial()
    router.push('/onboarding/tutorial')
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

      <Section title="Sensory & Atmosphere">
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
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Theme">
          {(['night', 'dawn'] as const).map(t => (
            <button
              key={t}
              type="button"
              aria-pressed={themeMode === t}
              onClick={() => void updateProfileSettings({ themeMode: t })}
              className={pill(themeMode === t)}
            >
              {t === 'night' ? 'Night atmosphere' : 'Dawn atmosphere'}
            </button>
          ))}
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

      <Section title="Privacy, Memory & Data Sovereignty (100% On-Device)">
        <p className="mb-3 text-xs text-white/45">
          User-Approved Memories: only notes you explicitly save are used to personalize companion
          reflections. Delete any item anytime.
        </p>
        <ul className="grid gap-2">
          {memories.length === 0 && <li className="text-xs text-white/35">No memories saved.</li>}
          {memories.map(m => (
            <li
              key={m.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3"
            >
              <div>
                <p className="eyebrow text-[9px]">
                  {m.category} · {shortDate(m.createdAt)}
                </p>
                <p className="mt-1 text-xs text-white/70">{m.text}</p>
              </div>
              <button
                type="button"
                onClick={() => void removeMemory(m.id)}
                aria-label="Delete memory"
                className="text-white/35 hover:text-[#edb4c5]"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-5 border-t border-white/[0.07] pt-4">
          <p className="mb-3 text-xs leading-relaxed text-white/45">
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
