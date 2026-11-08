# LUMINA Data Privacy & Emotional Sovereignty Architecture

**Document Version:** 2026.1  
**Product:** LUMINA (Powered by RaaOS Engine)  
**Author:** Rudra Raj Singh  
**Platforms:** Web (Desktop, Tablet, Mobile Web) & Native Android (via Capacitor)  

---

## 1. Core Principles: Emotional Sovereignty by Design

LUMINA is built on the belief that **emotional vulnerability requires absolute digital safety**. Unlike traditional wellness apps that monetize user telemetry or train public models on intimate diary entries, LUMINA operates under strict privacy guarantees:

1. **Local-First Default:** All emotional records, sleep logs, journal notes, and companion chats are stored locally in the user's browser or device via IndexedDB (`lumina_sanctuary_db`). No account creation or internet connection is required to use the sanctuary.
2. **Explicit Opt-In for Cloud Sync:** Cloud synchronization with PostgreSQL is strictly optional. Users who choose to create an account gain multi-device sync, while guest users remain entirely local.
3. **No Third-Party Analytics or Ad SDKs:** Zero tracking pixels, zero behavioral advertising scripts, and zero third-party telemetry libraries exist in the codebase.
4. **Zero-Retention Burn & Release Ritual:** Intrusive thoughts placed into the Burn & Release Room (`/release-room`) dissolve in real-time on the GPU canvas and are never persisted to disk, database, or server logs.

---

## 2. Granular Memory Vault Consent

LUMINA's Soul Companion features an opt-in **Memory Vault** (`/memory-vault`) allowing the companion to remember personal anchors, coping strategies, and soothing preferences.

### Double-Gated Authorization Architecture
The user retains absolute granular control over what the AI can see:

```
┌────────────────────────────────────────────────────────┐
│                   Global Master Switch                 │
│               `aiMemoryEnabled` (Boolean)              │
│       If false: 0 memories are sent to AI models       │
└───────────────────────────┬────────────────────────────┘
                            │ When TRUE
                            ▼
┌────────────────────────────────────────────────────────┐
│               Item-Level Consent Switches              │
│               `memory.sharedWithAi` (Boolean)          │
│       Only items with sharedWithAi === true are sent   │
└───────────────────────────┬────────────────────────────┘
                            │ Filtered & Sanitized
                            ▼
┌────────────────────────────────────────────────────────┐
│            Sanitized Payload to Gemini API             │
│            Max 15 items, prompt-injection shielded     │
└────────────────────────────────────────────────────────┘
```

- **Global Kill-Switch:** Toggling off `AI Memory Integration` in Settings immediately cuts off memory transmission in all companion and insight requests.
- **Individual Item Control:** Every single memory note has a dedicated toggle (`sharedWithAi: boolean`). Unchecked memories remain strictly private to the user's view.
- **Client-Side Filter:** The client-side context and the API route (`/api/companion`) enforce independent validation layers, dropping unapproved memories before prompt assembly.

---

## 3. Burn & Release: The Zero-Retention Guarantee

The Burn & Release ritual is engineered with an immutable zero-retention guarantee:

- **State Lifetime:** Text typed in the Release Room is stored only in ephemeral React component state (`useState('')`).
- **Dissolution:** When the user triggers "Burn & Release", the text is mapped to Three.js particle coordinates. As particles drift and fade, component state is cleared.
- **Storage Omission:** Neither IndexedDB nor the PostgreSQL schema contains any table, column, or store for released thoughts. Even with full database access, no trace of burned thoughts exists.

---

## 4. User Rights: 1-Click Export & Irreversible Erasure

In compliance with global data privacy frameworks (including GDPR Article 17 and CCPA), LUMINA provides native, zero-friction tools for complete data portability and deletion:

### 1-Click JSON Data Export
Users can download a complete, human-readable JSON archive of their sanctuary records at any time:
- Emotional check-ins & somatic pulse coordinates
- Star Jar gratitude notes
- Sealed letters
- Memory Vault entries
- Sleep & bio-rhythm logs
- Companion conversation history
- Custom profile preferences

### Irreversible 1-Click Erasure
Selecting **"Erase All Sanctuary Data"** performs an atomic, irreversible purge:
1. **Local Purge:** Clears all IndexedDB object stores (`lumina_sanctuary_db`), `localStorage`, and `sessionStorage`.
2. **Cloud Cascade Purge:** If authenticated, sends an authenticated `DELETE /api/sync` request. PostgreSQL executes `DELETE FROM users WHERE id = $userId`, which cascades through foreign-key relationships to delete 100% of related cloud records.
3. **Session Termination:** Destroys all active session tokens and returns the app to the initial clean onboarding state.

---

## 5. Non-Clinical Safety & Crisis Guardrails

LUMINA is an emotional wellness and somatic grounding sanctuary, **not a clinical diagnostic tool or medical software**.

- **Non-Clinical System Prompts:** AI system instructions explicitly prohibit clinical diagnoses, prescribing medications, or claiming licensed therapeutic authority.
- **Multi-Tier Crisis Detection:** On-device regex pattern matching detects severe distress or acute self-harm indicators. When detected, LUMINA displays an immediate crisis assistance modal offering direct, confidential hotlines (988 Suicide & Crisis Lifeline, Crisis Text Line) alongside gentle grounding cues.
- **No Crisis Profiling:** Crisis trigger events are never tagged or stored in analytics databases.

---

## 6. Android Platform Security (Capacitor)

For the native Android distribution:
- **No Unnecessary Permissions:** The app requires only network access for optional cloud sync. Camera, contacts, external storage, and location permissions are completely disabled.
- **Encrypted Local Storage:** Android WebViews store IndexedDB data in app-private sandboxed directories (`/data/data/com.lumina.sanctuary/app_webview/`), isolated from other applications.
- **Secure Network Transport:** All cloud sync communication is enforced over HTTPS with TLS 1.3.
