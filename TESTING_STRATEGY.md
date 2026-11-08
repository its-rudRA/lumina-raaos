# LUMINA Comprehensive Testing Strategy

**System:** LUMINA (Powered by RaaOS Engine)  
**Version:** 2.0 (Milestone 17F)  
**Author:** Rudra Raj Singh  
**Target Environments:** Modern Web (Desktop/Tablet/Mobile) & Native Android (Capacitor)  

---

## 1. Testing Philosophy: Zero-Regression Emotional Reliability

LUMINA is an emotional sanctuary and somatic refuge. Unlike typical software where an error causes mild inconvenience, a crash during a panic attack or somatic grounding breath cycle degrades user trust. 

The testing architecture adheres to four foundational rules:
1. **Deterministic State Merging:** The local-first sync engine must never drop a user's reflections, gratitude notes, or blooms due to network race conditions.
2. **Zero Route Traps:** Route transitions must never trap an unauthenticated user or an onboarding user in an infinite loop.
3. **Rigorous Security Boundaries:** User inputs sent to Gemini 2.5 Flash must be sanitized against prompt injection, and private memories must be strictly protected by double-gated authorization.
4. **Hardware & Viewport Agility:** Fluid layout scaling from wide 4K desktop screens down to narrow Android phone screens with camera cutouts and gesture navigation bars.

---

## 2. Test Pyramid & Methodologies

```
              ┌──────────────────────────┐
              │      End-to-End &        │
              │   Android Native Smoke   │
              ├──────────────────────────┤
              │    Integration Tests     │
              │ (Routing, Sync, Security)│
              ├──────────────────────────┤
              │   Unit & Logic Tests     │
              │  (LWW, Math, Sanitizer)  │
              └──────────────────────────┘
```

### 2.1 Unit Testing Layer
- **Execution Engine:** Native Node.js 22 built-in test runner (`node:test`, `node:assert`) with zero external test framework overhead.
- **Coverage Targets:**
  - `lib/sync-engine.ts`: Deterministic Last-Write-Wins (LWW) state merging, monotonic counter math (`Math.max` for `gardenBlooms`), discrete set unions (`journeyCompletedDays`), array deduplication.
  - `lib/routing.ts`: State machine gatekeeper resolving correct destinations based on auth and onboarding progress.
  - `lib/db.ts`: Canonical emotion definitions, valence/energy coordinate mappings, intensity clamping.
  - `app/api/companion/route.ts` & security utilities: ASCII control character stripping, injection delimiter neutralization.

### 2.2 Integration Testing Layer
- **Sync Protocol Verification:** Simulating client $\leftrightarrow$ server sync payloads, verifying offline outbox storage in `localStorage`, and validating automatic exponential backoff retries (1s, 3s, 9s).
- **Double-Gated Memory Authorization:** Verifying that memories marked `sharedWithAi: false` or requests with `aiMemoryEnabled: false` never leak into prompt assembly payloads.
- **Payload Gatekeeping:** Testing that payloads exceeding 16KB (`/api/companion`) or 256KB (`/api/sync`) trigger immediate HTTP 413 rejections.

### 2.3 Accessibility (a11y) Verification Layer
- **WCAG 2.1 AA Compliance:** Minimum 4.5:1 color contrast ratio for all secondary subtitles and 7:1 for headers against dark backgrounds (`#080b11`, `#060712`).
- **Semantic ARIA Roles:**
  - Sidebar navigation links carry `aria-current="page"` on active routes.
  - Expand/collapse controls carry `aria-expanded` and explicit accessible labels (`aria-label`).
  - Modal dialogues enforce `role="dialog"`, `aria-modal="true"`, and keyboard `Escape` dismissal.
- **Motion Accessibility (`prefers-reduced-motion`):** Complete disabling of WebGL camera sweeps, canvas particle drift, and CSS pulsing animations for sensitive users.

### 2.4 Responsive Web & Android Viewport Matrix

| Viewport Profile | Resolution Range | Layout Architecture | Navigation Pattern |
| :--- | :--- | :--- | :--- |
| **Desktop Ultra-Wide / 4K** | $\ge 1440\text{px}$ | Max content width $1440\text{px}$, centered | Fixed $272\text{px}$ / $76\text{px}$ collapsible sidebar |
| **Desktop Standard** | $1024\text{px} - 1439\text{px}$ | Dynamic `paddingLeft` ($272\text{px}$ / $76\text{px}$), fluid header | Fixed left sidebar, full-bleed content |
| **Tablet Portrait / Landscape** | $768\text{px} - 1023\text{px}$ | $0\text{px}$ left padding, fluid grid | Slide-over drawer menu, bottom bar |
| **Mobile / Android Smartphone** | $< 768\text{px}$ | Safe-area padding (`env(safe-area-inset)`), touch-optimized | 5-Tab frosted-glass bottom dock + drawer |

---

## 3. Test Execution Command

Run the automated test suite directly via npm:
```bash
npm test
# Equivalent to: node --experimental-strip-types tests/lumina-verification.test.ts
```
