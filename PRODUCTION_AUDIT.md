# LUMINA (RaaOS) — Production Architecture & Readiness Audit
**Date:** November 2026  
**Platform Scope:** Web Browser (Desktop, Tablet, Mobile) & Native Android (via Capacitor Android + Local-First IndexedDB + PostgreSQL Cloud Sync). *Apple/iOS is explicitly out of scope for this release cycle.*  
**Target Operating Engine:** RaaOS Bio-Adaptive Sanctuary Core  

---

## 1. Executive Summary & Architecture Inventory

LUMINA is an AI-powered bio-adaptive emotional wellness sanctuary built on a local-first, zero-knowledge, privacy-preserving paradigm. The system architecture bridges Next.js 16.4.3 App Router on React 19 with GPU-accelerated WebGL (Three.js 0.187.0) and high-fidelity Web Audio synthesis.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       LUMINA / RaaOS System Topography                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
    ┌─────────────────────────────┴─────────────────────────────┐
    ▼                                                           ▼
[ Web Browser Client ]                             [ Native Android App ]
(Desktop, Tablet, Mobile Web)                      (Capacitor Android Shell)
    │                                                           │
    └─────────────────────────────┬─────────────────────────────┘
                                  │
                                  ▼
                    [ UI Layer: React 19 + Tailwind v4 ]
                    ├── Makoto Shinkai Animated Skyworld (Canvas 2D)
                    ├── 3D Celestial Sanctuary Core (Three.js)
                    ├── 3D Living Inner Garden (Three.js + GLSL Shaders)
                    └── Translucent Plum-Violet Glassmorphism
                                  │
                                  ▼
                [ State & Data Layer: Local-First Core ]
                ├── SanctuaryContext (React Context with useMemo)
                ├── IndexedDB Storage (`lumina_sanctuary_db` v2)
                │   ├── SanctuaryState (Profiles, Aura, Settings)
                │   ├── CheckIns (Full telemetry & somatic logs)
                │   └── SealedLetters (Encrypted future reflections)
                └── Web Audio API Engine (174Hz+261Hz harmonic rain)
                                  │
                                  ▼
                    [ API & Cloud Integration ]
                    ├── `/api/companion` (Gemini 2.5 Flash / Edge API)
                    ├── On-Device Safety & Crisis Interceptor
                    └── (Planned) PostgreSQL + Prisma Sync Bridge
```

### Full Route Inventory (18 Routes)
1. `/` — Intelligent Sanctuary Router & Auto-Hydration Gateway
2. `/welcome` — Cinematic Anime-Inspired Welcome, 3D Celestial Lotus, Guest & Account Entry
3. `/sign-in` — Local Authentication Gateway with IndexedDB Demo Profile Support
4. `/sign-up` — Account Creation & Privacy Assurance Onboarding
5. `/onboarding/introduction` — Step 1: 3D Celestial Core Centerpiece & 6 Sanctuary Pillars
6. `/onboarding/profile` — Step 2: 7-Question Wellness Profile & Bio-Rhythm Preferences
7. `/onboarding/tutorial` — Step 3: Interactive 7-Step Sanctuary Tour & Sandboxes
8. `/home` — Main Dashboard, Today's Weather, Quick Actions, Somatic Pulse Scan
9. `/garden` — 3D Living Inner Garden Pond, Emotion-Validating Blooms, Camera Controls
10. `/check-in` — 2D Emotional Compass, Aura Derivation, Somatic Body Tags
11. `/emojis` — Emoji Mood Studio, Alchemy Canvas, and Mood Resonator
12. `/companion` — Full-Viewport AI Soul Companion with Living Audio-Reactive Aura
13. `/calm-studio` — Acoustic Rain Synthesizer, 4-Week Somatic Resets, Soundscapes
14. `/release-room` — Burning Ritual (Particle Release) and Sealed Star Jar Letters
15. `/insights` — Personal Calm DNA, Long-Term Somatic Pattern Telemetry
16. `/journey` — 30-Day Gentle Wellness Path with Emotional Cinema Reel
17. `/settings` — Profile Customization, Sensory Toggles, Data Export/Erase
18. `/api/companion` — Rate-Limited Serverless Route for Gemini 2.5 Flash & Local Fallback

### Core Modules (10 Functional Modules)
* **Module 1 (Dashboard Core):** Real-time greeting, daily quote, atmospheric weather card, and quick breath anchors.
* **Module 2 (3D Inner Garden):** Procedural bioluminescent pond, 24 individual emotion-tinted cupped lotus blooms, glowing Zen Moon Gate, custom GLSL aurora sky, and raycasted blossom inspection.
* **Module 3 (Emotional Compass & Somatic Pulse):** Russell Circumplex-inspired quadrant pad with continuous coordinate-to-aura mapping and 10s somatic meridian scan.
* **Module 4 (Emoji Studio):** Alchemy blend board converting multiple emotional cues into unified expressive states.
* **Module 5 (Soul Companion AI):** 4 distinct companion personas (Listener, Grounder, Guide, Boundary Coach), on-device memory management, and streaming conversation.
* **Module 6 (Acoustic Rain & Sound Studio):** Pure procedural Web Audio brown noise generation through 800Hz lowpass filter with 174Hz/261Hz harmonic sine grounding.
* **Module 7 (Release Room & Star Jar):** Non-destructive thermal burning particle animation and client-side sealed future notes.
* **Module 8 (Calm DNA Analytics):** Algorithmic trend analysis over user check-in history without synthetic baseline fabrication.
* **Module 9 (30-Day Gentle Path):** 4-week thematic progression (Arrival, Grounding, Expression, Integration) with interactive cinema reel.
* **Module 10 (System Settings & Privacy Engine):** Theme (Night/Dawn), sensory intensity (Full/Gentle/Low), full JSON archive export, and instant database purge.

---

## 2. Critical Performance Bottlenecks & Audit Findings

### Bottleneck A: React Context Full-Tree Invalidation on Rain Counter (Resolved in M17B)
* **Diagnosis:** `SanctuaryContext.Provider` supplied a dynamically generated object literal on every render. Because the 3:00 acoustic rain feature updates `rainSeconds` on a 1-second interval, every mounted component consuming `useSanctuary()` was forced to re-evaluate and re-render every 1,000ms.
* **Resolution:** Memoized the context value with `useMemo(..., [dependencies])`. Components not bound to `rainSeconds` are isolated from countdown re-renders.

### Bottleneck B: High-DPI Android GPU Overload & 120Hz Displays (Resolved in M17B)
* **Diagnosis:** High-end Android handsets (e.g., Pixel 8/9, Galaxy S23/S24) feature native `devicePixelRatio` values between `2.75x` and `3.5x` with 120Hz refresh displays. Running unthrottled `requestAnimationFrame` loops against full-viewport canvases (`window.innerWidth * dpr`) resulted in rendering up to `3840 x 2160` buffers 120 times per second, triggering GPU thermal throttling and battery drain.
* **Resolution:**
  1. Clamped `devicePixelRatio` on mobile/Android viewports to max `1.35x` for 2D canvas (`<AnimeSkyWorld />`) and `1.5x` for WebGL (`<CelestialSanctuaryCore />`, `<SanctuaryScene />`).
  2. Implemented delta frame-pacing to enforce explicit FPS budgets: 60 FPS (16.5ms) in `full` mode, 30–36 FPS in `gentle` mode, and 0% idle GPU usage (static single-frame rendering) in `low` mode or when reduced motion is preferred.
  3. Mounted `IntersectionObserver` on `<CelestialSanctuaryCore />` to automatically cancel WebGL loops whenever the centerpiece scrolls off-screen.

### Bottleneck C: Redundant Geometry Allocations in 3D Garden (Resolved in M17B)
* **Diagnosis:** In `components/sanctuary-scene.tsx`, while petal geometries were shared across blooms, the inner golden heart material was re-instantiated 24 times inside the spawn loop.
* **Resolution:** Hoisted `sharedHeartMat` outside the loop, ensuring 100% material reuse across all 24 lotus blossoms.

---

## 3. Database, Cloud Sync & Security Architecture

### Local-First Offline Architecture
LUMINA strictly adheres to local-first principles. The primary source of truth is the user's on-device IndexedDB database (`lumina_sanctuary_db`). The application function remains 100% operational in airplane mode or in low-connectivity environments.

### Normalized PostgreSQL Schema for Cloud Sync (`prisma/schema.prisma`)
When cloud backup is enabled, the system synchronizes via an event-driven delta sync engine against PostgreSQL:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id            String         @id @default(uuid())
  email         String?        @unique
  passwordHash  String?
  name          String
  pronouns      String?
  mode          String         @default("account") // "account" | "guest"
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  profile       Profile?
  checkIns      CheckIn[]
  memories      Memory[]
  letters       SealedLetter[]
  starJarNotes  StarJarNote[]
  journeyLogs   JourneyLog[]
}

model Profile {
  id                 String   @id @default(uuid())
  userId             String   @unique
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  sensoryMode        String   @default("full")
  themeMode          String   @default("night")
  preferredCompanion String   @default("The Listener")
  aiMemoryEnabled    Boolean  @default(true)
  sleepHours         Float    @default(7.0)
  sleepQuality       String   @default("rested")
  rhythmNote         String?
  introSeen          Boolean  @default(false)
  profileCompleted   Boolean  @default(false)
  tutorialCompleted  Boolean  @default(false)
  preferences        Json?
  updatedAt          DateTime @updatedAt
}

model CheckIn {
  id           String   @id @default(uuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  timestamp    BigInt
  orbX         Float
  orbY         Float
  auraLabel    String
  tags         String[]
  emotionId    String?
  emoji        String?
  emotionLabel String?
  intensity    Int?
  note         String?
  reaction     String?
  createdAt    DateTime @default(now())

  @@index([userId, timestamp])
}

model Memory {
  id           String   @id @default(uuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  text         String
  category     String   @default("calming")
  sharedWithAi Boolean  @default(true)
  timestamp    BigInt
  createdAt    DateTime @default(now())

  @@index([userId, timestamp])
}

model SealedLetter {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  content   String
  lockedUntil BigInt
  sealedAt  BigInt
  isOpened  Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([userId, lockedUntil])
}

model StarJarNote {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  text      String
  timestamp BigInt
  createdAt DateTime @default(now())
}

model JourneyLog {
  id         String   @id @default(uuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  day        Int
  note       String?
  reaction   String?
  exploredAt DateTime @default(now())

  @@unique([userId, day])
}
```

### Server-Side API Security & Sanitization (`app/api/companion/route.ts`)
1. **Sliding Window Rate Limiter:** Enforces max 20 calls/minute per IP key (`x-forwarded-for` or socket address) to defend against API quota abuse.
2. **Payload Size Capping & Stripping:** Incoming messages are capped at 800 characters and stripped of null bytes and ASCII control characters (`\u0000-\u001F`).
3. **Prompt Injection Hardening:** The system prompt instructs Gemini to remain strictly within its sanctuary role, explicitly rejecting roleplay jailbreaks, shell emulation, or unsolicited clinical diagnoses.

---

## 4. Native Android Readiness (Capacitor Bridge)

For Android distribution, LUMINA is packaged as a high-performance native container using `@capacitor/android`:

### Key Android Native Considerations
1. **Hardware Back Button Handling:**
   Using `@capacitor/app`, intercept back button presses:
   * Close active modals (`BreathPacerModal`, `SupportModal`, mobile navigation sheet) first.
   * If on a sub-route (e.g. `/garden`, `/check-in`), navigate back to `/home`.
   * If on `/home`, prompt user or minimize app.
2. **Virtual Keyboard & `visualViewport` in `/companion`:**
   On Android, the on-screen keyboard resizes the viewport. The `/companion` layout relies on `window.visualViewport.height` rather than `100vh` to ensure the chat input bar and animated aura remain docked above the keyboard without jumping.
3. **Touch Action & Gesture Locking in `/garden`:**
   Android Chrome/WebViews trigger overscroll refresh ("pull-to-refresh") on downward swipes. Setting `touch-action: none` on the Three.js viewport and wrapping with `overscroll-behavior: contain` completely prevents accidental page reloads during 3D camera pan/orbit.
4. **Android AudioContext Backgrounding Lifecycle:**
   Android battery optimization kills unmanaged audio streams or allows them to glitch in standby. LUMINA registers a global `visibilitychange` listener on `SanctuaryProvider` that suspends the audio context when `document.hidden === true` and resumes it on app restore.
5. **Splash Screen & Edge-to-Edge Display:**
   Capacitor Android configuration enables edge-to-edge transparent navigation and status bars (`#050610`), matching LUMINA's Makoto Shinkai midnight atmosphere seamlessly.

---

## 5. Pre-Release Verification Checklist
- [x] Unmemoized Context Provider re-renders eliminated.
- [x] Android `AudioContext` background suspension implemented.
- [x] Mobile/Android DPR clamped to 1.35x (Canvas) and 1.5x (WebGL).
- [x] Delta frame-pacing implemented (60 FPS full / 30–36 FPS gentle / 0 FPS low).
- [x] 3D Lotus `IntersectionObserver` auto-pause active.
- [x] Shared geometries and materials verified across all 24 3D garden blooms.
- [x] Zero TypeScript compilation errors (`npx tsc --noEmit`).
- [x] 100% preservation of anime-inspired aesthetic, starlight lotus, and Makoto Shinkai sky.
