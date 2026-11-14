import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowLeft,
  Cpu,
  Database,
  Flame,
  HardDrive,
  Lock,
  ShieldCheck,
  Smartphone,
  Trash2,
} from 'lucide-react'
import { AndroidDownloadButton } from '@/components/android-download-button'
import { SanctuaryBackdrop } from '@/components/auth-shell'
import { glass } from '@/lib/format'

export const metadata: Metadata = {
  title: 'Privacy Policy — LUMINA | RaaOS Engine',
  description:
    'LUMINA Privacy Policy: Local-first IndexedDB storage, optional Neon PostgreSQL cloud sync, zero-PII Gemini AI companion architecture, and one-click user erasure.',
}

export default function PrivacyPolicyPage() {
  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-[#060712] px-4 py-10 text-[#eeeaf3] sm:px-6 sm:py-14">
      <SanctuaryBackdrop />

      <div className="relative z-10 mx-auto max-w-[860px] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-[#120e24]/75 px-3.5 py-1.5 text-xs text-white/80 backdrop-blur-md transition hover:border-white/25 hover:text-white"
          >
            <ArrowLeft size={13} />
            <span>Back to Sanctuary</span>
          </Link>

          <AndroidDownloadButton />
        </div>

        <header className={`${glass} p-6 sm:p-8`}>
          <span className="eyebrow inline-flex items-center gap-1.5 rounded-full border border-[#7ec8b8]/35 bg-[#7ec8b8]/10 px-3 py-1 text-[10px] text-[#c8f3e9]">
            <ShieldCheck size={12} />
            PRIVACY POLICY · GOOGLE PLAY &amp; WEB EDITION
          </span>
          <h1 className="mt-4 font-serif text-3xl tracking-wide text-white sm:text-5xl">
            LUMINA Privacy Policy
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#d8d0ec]">
            LUMINA (<code className="text-[#f3d9a4]">com.raaos.lumina</code> · powered by RaaOS
            Engine) is built around emotional sovereignty. Your check-ins, somatic logs, and private
            letters belong strictly to you—never sold, rented, or used to profile you for ads.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-white/55">
            <span>Version: 1.0.0-rc.1</span>
            <span>·</span>
            <span>Effective Date: November 2026</span>
            <span>·</span>
            <span>Maintainer: Rudraraj Singh (RaaOS Engine)</span>
          </div>
        </header>

        <section className={`${glass} space-y-3 p-6`}>
          <div className="flex items-center gap-2.5">
            <HardDrive size={17} className="text-[#7ec8b8]" />
            <h2 className="font-serif text-xl text-white">
              1. Local-First On-Device Storage (IndexedDB)
            </h2>
          </div>
          <p className="text-xs leading-relaxed text-white/75 sm:text-sm">
            By default, LUMINA runs as an offline-capable, local-first sanctuary. Emotional
            check-ins, aura positions, Inner Garden blooms, Star Jar notes, bio-rhythm sleep entries,
            Memory Vault notes, and sealed letters are written directly to your device&apos;s local{' '}
            <code className="text-[#f3d9a4]">IndexedDB</code> database (
            <code className="text-[#f3d9a4]">lumina_sanctuary_db</code>).
          </p>
          <p className="text-xs leading-relaxed text-white/60 sm:text-sm">
            Guest sessions remain strictly on your browser or Android WebView storage with zero
            cloud account requirement.
          </p>
        </section>

        <section className={`${glass} space-y-3 p-6`}>
          <div className="flex items-center gap-2.5">
            <Database size={17} className="text-[#b8a4e8]" />
            <h2 className="font-serif text-xl text-white">
              2. Optional Neon PostgreSQL Cloud Sync
            </h2>
          </div>
          <p className="text-xs leading-relaxed text-white/75 sm:text-sm">
            If you choose to create an account or sign in for cross-device continuity between Web
            and Android, LUMINA synchronizes your sanctuary state over HTTPS to a Neon PostgreSQL
            database managed through Prisma (<code className="text-[#f3d9a4]">/api/sync</code>).
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-white/65 sm:text-sm">
            <li>
              <strong className="text-white/90">Deterministic Non-Destructive Merging:</strong> Sync
              uses Last-Write-Wins (LWW) timestamps and set-union merges so offline Android entries
              never vanish when reconnecting.
            </li>
            <li>
              <strong className="text-white/90">Offline Resilience:</strong> When offline or when a
              cloud database is not configured, sync gracefully falls back to local-only mode with an
              encrypted/local browser outbox queue.
            </li>
          </ul>
        </section>

        <section className={`${glass} space-y-3 p-6`}>
          <div className="flex items-center gap-2.5">
            <Cpu size={17} className="text-[#e8a4b8]" />
            <h2 className="font-serif text-xl text-white">
              3. Zero-PII Gemini AI Companion Architecture
            </h2>
          </div>
          <p className="text-xs leading-relaxed text-white/75 sm:text-sm">
            Soul Companion replies and Sanctuary Reflections are proxied through LUMINA&apos;s
            server endpoint (<code className="text-[#f3d9a4]">/api/companion</code>, backed by
            Google Gemini 2.5 Flash when configured). API credentials are kept strictly server-side
            and never embedded inside web bundles or Android APKs.
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-white/65 sm:text-sm">
            <li>
              <strong className="text-white/90">Minimal Non-Identifying Prompts:</strong> Email
              addresses, credentials, raw database user IDs, and personal contact records are never
              injected into AI model prompts. Requests send only your current reflection prompt,
              chosen companion persona, optional aggregate mood/sleep summary, and authorized memories.
            </li>
            <li>
              <strong className="text-white/90">Double-Gated Memory Vault:</strong> Semantic
              memories remain excluded from AI calls unless <em>both</em> the master{' '}
              <strong>AI Memory Sharing</strong> switch and an individual item&apos;s{' '}
              <strong>Shared with AI</strong> toggle are explicitly enabled (capped at 15 sanitized
              items, with prompt-injection guards applied server-side).
            </li>
            <li>
              <strong className="text-white/90">Transparent Local Fallback:</strong> If offline or
              if cloud AI is unconfigured, responses and insights are synthesized locally on-device
              without calling external AI APIs.
            </li>
          </ul>
        </section>

        <section className={`${glass} space-y-3 p-6`}>
          <div className="flex items-center gap-2.5">
            <Flame size={17} className="text-[#f3d9a4]" />
            <h2 className="font-serif text-xl text-white">
              4. Zero-Retention Burn &amp; Release Room
            </h2>
          </div>
          <p className="text-xs leading-relaxed text-white/75 sm:text-sm">
            Intrusive thoughts typed in the Burn &amp; Release Room exist strictly in temporary
            in-memory component state and dissolve visually on canvas. They are never saved to{' '}
            <code className="text-[#f3d9a4]">IndexedDB</code>,{' '}
            <code className="text-[#f3d9a4]">localStorage</code>, server logs, or PostgreSQL.
          </p>
        </section>

        <section className={`${glass} space-y-3 p-6`}>
          <div className="flex items-center gap-2.5">
            <Smartphone size={17} className="text-[#7ec8b8]" />
            <h2 className="font-serif text-xl text-white">
              5. Android App Permissions, Analytics &amp; Safety Notice
            </h2>
          </div>
          <ul className="list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-white/65 sm:text-sm">
            <li>
              <strong className="text-white/90">Minimal Permissions:</strong> The Android app
              requests only <code className="text-[#f3d9a4]">INTERNET</code>,{' '}
              <code className="text-[#f3d9a4]">ACCESS_NETWORK_STATE</code>, and gentle{' '}
              <code className="text-[#f3d9a4]">VIBRATE</code> haptics. It never accesses your
              contacts, SMS, location, camera, or device storage files.
            </li>
            <li>
              <strong className="text-white/90">Zero Ad SDKs or Data Selling:</strong> LUMINA contains
              no advertising SDKs or third-party ad trackers. The production web app loads cookie-free
              Vercel Web Analytics for aggregate traffic counts only, without recording journal text,
              emotions, or user identities.
            </li>
            <li>
              <strong className="text-white/90">Non-Clinical Wellness Boundary:</strong> LUMINA is an
              emotional self-reflection and mindfulness companion, not medical care, clinical
              diagnosis, or crisis therapy. Acute distress cues detected locally immediately surface
              free 24/7 crisis support hotlines without telemetry logging.
            </li>
          </ul>
        </section>

        <section className={`${glass} space-y-3 p-6`}>
          <div className="flex items-center gap-2.5">
            <Trash2 size={17} className="text-[#edb4c5]" />
            <h2 className="font-serif text-xl text-white">
              6. Data Export &amp; Permanent Deletion Rights
            </h2>
          </div>
          <p className="text-xs leading-relaxed text-white/75 sm:text-sm">
            Inside <strong>Profile &amp; Settings</strong> (<Link href="/settings" className="text-[#7ec8b8] underline underline-offset-4 hover:text-white">/settings</Link>),
            you can export a full JSON backup of your sanctuary or execute{' '}
            <strong>Erase All Local Sanctuary Data</strong> at any time. Erasure clears local
            IndexedDB stores (<code className="text-[#f3d9a4]">state</code>,{' '}
            <code className="text-[#f3d9a4]">checkins</code>,{' '}
            <code className="text-[#f3d9a4]">letters</code>), removes cached sync state, and sends{' '}
            <code className="text-[#f3d9a4]">DELETE /api/sync</code> to cascade-delete cloud
            PostgreSQL records linked to your account.
          </p>
          <p className="flex items-center gap-2 pt-2 text-xs text-white/55">
            <Lock size={12} className="shrink-0 text-[#7ec8b8]" />
            <span>
              Privacy questions or Play Store compliance requests: contact Rudraraj Singh via the{' '}
              <a
                href="https://github.com/its-rudRA/lumina-raaos"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 underline underline-offset-4 hover:text-white"
              >
                LUMINA RaaOS repository
              </a>
              .
            </span>
          </p>
        </section>
      </div>
    </main>
  )
}
