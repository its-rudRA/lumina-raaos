# LUMINA — Emotional Wellness Sanctuary
> *"You don't have to be happy to be worthy of peace."*

Developed under **RaaOS Studio**, **LUMINA** (`lumina-raaos`) is a flagship, privacy-first, local-first emotional wellness web sanctuary built with Next.js 16 (App Router, Turbopack), React 19, TypeScript, and Tailwind CSS. It is designed to help individuals navigate stress, understand emotional patterns, and build resilience without clinical judgment or cloud surveillance.

---

## Core Pillars
- **2D Emotional Compass:** High-nuance mood & somatic mapping (`AuraPad`) without toxic positivity, dynamically computing Emotional Weather metrics (*Emotional battery* & *Mental load*).
- **Soul Companion & Voice Venting:** Adaptive reflection modes (*The Listener, The Grounder, The Guide, Boundary Coach*) tailored to real-time emotional capacity, paired with native speech-to-text voice venting.
- **Living Calm DNA:** On-device pattern recognition that uncovers recurring somatic tags, dominant emotional auras, and restorative rituals from your local check-in history.
- **Procedural Web Audio Sanctuary:** Real-time synthesized ambient rain and harmonic grounding tones with zero external audio assets.
- **Starlight Release & Future-Self Letters:** Ephemeral particle dissolution for immediate worry release alongside time-locked letters stored privately for future heavy days.
- **Sensory-Adaptive Modes:** Instant switching between *Full Sanctuary*, *Gentle*, and *Low-Stimulus / Exhausted* modes.

---

## Latest RaaOS Engineering Milestones

### 1. Local-First IndexedDB Persistence (`lib/db.ts`)
- **Zero-Dependency Native Engine:** Built on browser-native IndexedDB (`lumina_sanctuary_db` v1) with dedicated object stores for `state`, `checkins`, and `letters`.
- **Full State Continuity:** Persists user profile (`name`, `pronouns`), inner garden bloom counts (`gardenBlooms`), last Aura orb coordinates (`lastOrb`), check-in histories, and time-locked future-self letters (`unlockAt` & `Next heavy day`), with automatic legacy `localStorage` migration.
- **Deterministic Hydration:** Paired with `useHydrated()` (`app/hydration-guard.tsx`) to guarantee zero SSR/client hydration mismatches on time-sensitive greetings and persisted user state.

### 2. Procedural Web Audio Rain Engine
- **Layered Acoustic Synthesis:** Synthesizes a looping pink/brown noise rain buffer (`AudioBufferSourceNode`) sculpted through a warm `800Hz` lowpass `BiquadFilterNode`, layered over `174Hz` and `261Hz` sine harmonic grounding oscillators.
- **Leak-Free Lifecycle:** Automatically tears down and closes active `AudioContext` instances on component unmount or mode transitions.

### 3. Web Speech Integration (`Voice Vent`)
- **Hands-Free Emotional Release:** Integrates the browser's native Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) directly into the Soul Companion input bar.
- **Graceful Degradation:** Provides visual pulsing feedback while actively listening, streams transcripts into the reflection prompt in real time, and degrades gently on unsupported browsers.

### 4. Global Crisis Support & On-Device Data Sovereignty
- **Proactive On-Device Crisis Guardrail:** Pure client-side detection (`containsCrisisSignal`) identifies acute crisis or self-harm expressions without transmitting text over the network, responding with immediate compassion and surfacing human crisis support.
- **Global Crisis Reach (`SupportModal`):** Provides direct `tel:` links and regional crisis resources across **India** (Tele-MANAS `14416` / `1800-891-4416`, Vandrevala Foundation), **US & Canada** (`988` Lifeline), **United Kingdom** (NHS `111`, Samaritans `116 123`), **Europe**, and **130+ countries** via [findahelpline.com](https://findahelpline.com/), plus a one-click bridge into the **60s Breath Pacer**.
- **Complete Data Sovereignty (`ProfileModal`):** Users retain 100% ownership of their sanctuary with one-click JSON backup export (`exportSanctuaryData()` → `lumina-sanctuary-backup.json`) and two-step confirmed local erasure (`clearSanctuaryData()`).

---

## Architecture & Ethics
- **Framework:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4
- **Privacy-First Storage:** 100% Client-Side IndexedDB (Zero external databases, zero cloud telemetry, zero third-party analytics)
- **Audio & Speech:** Native Web Audio API procedural synthesis & Web Speech API recognition
- **Ethical Guardrails:** Non-diagnostic reflection space by design with proactive, globally accessible crisis-support pathways

---
© 2026 **RaaOS Studio** • Crafted by Rudraraj Singh (`@its-rudRA`)
