# LUMINA Database Architecture & Cloud Sync Engine

**Engine Version:** RaaOS 2.0  
**Target Platforms:** Modern Web (Desktop/Tablet/Mobile Web) & Native Android (via Capacitor)  
**Database Paradigm:** Local-First Hybrid (Client-Side IndexedDB $\leftrightarrow$ Cloud PostgreSQL via Prisma ORM)  
**ORM / Migration Engine:** Prisma ORM 5+ / Native PostgreSQL DDL  

---

## 1. Architectural Philosophy: Local-First Sovereignty

LUMINA is designed from the core as an **offline-first, privacy-respecting emotional sanctuary**. The architecture balances two foundational tenets:

1. **Immediate Local Usability:** The user's emotional records, somatic pulse states, Star Jar memories, and journal entries are written synchronously to browser/app IndexedDB. The user never waits on network latency to record an emotion or ground their breathing.
2. **Deterministic Multi-Device Cloud Sync:** For users signed into an authenticated account, a background synchronization worker syncs local state to a normalized PostgreSQL cluster with conflict-free deterministic merging.

```
┌────────────────────────────────────────────────────────┐
│               Client Tier (Web / Android)             │
│                                                        │
│   React 19 Sanctuary Context                           │
│        │                                               │
│        ▼                                               │
│   IndexedDB (lumina_sanctuary_db)  ◄── Zero-latency   │
│        │                                               │
│        ▼                                               │
│   Sync Engine (lib/sync-engine.ts)                     │
│   • lumina_sync_outbox (offline queue)                 │
│   • Exponential backoff (1s, 3s, 9s)                   │
└───────────────────────┬────────────────────────────────┘
                        │ HTTPS JSON Payload (≤ 256KB)
                        ▼
┌────────────────────────────────────────────────────────┐
│               API Gateway & Edge Route                 │
│               (/app/api/sync/route.ts)                 │
│   • Payload validation & 256KB cap                     │
│   • Graceful local-only fallback if DB unconfigured    │
│   • Session authentication & rate limiting             │
└───────────────────────┬────────────────────────────────┘
                        │ Prisma Client Pool
                        ▼
┌────────────────────────────────────────────────────────┐
│               Cloud Tier (PostgreSQL)                  │
│                                                        │
│   13 Normalized Relations with `onDelete: Cascade`     │
│   • users               • user_sessions                │
│   • user_profiles       • user_consents                │
│   • emotional_check_ins • sleep_recovery_logs          │
│   • garden_progress     • star_jar_memories            │
│   • sealed_letters      • user_approved_memories       │
│   • companion_messages  • journey_and_insight_state    │
│   • data_privacy_audit_logs                            │
└────────────────────────────────────────────────────────┘
```

---

## 2. Relational Schema & Table Dictionary

The database schema is defined in [`prisma/schema.prisma`](file:///Users/rudrarajsingh/Documents/lumina-raaos/prisma/schema.prisma) and executed via [`prisma/migrations/0001_init_lumina_schema/migration.sql`](file:///Users/rudrarajsingh/Documents/lumina-raaos/prisma/migrations/0001_init_lumina_schema/migration.sql).

### Table Inventory

| Table Name | Model Name | Primary Purpose | Conflict / Sync Strategy |
| :--- | :--- | :--- | :--- |
| `users` | `User` | User identity & authentication root | Immutable ID, unique email |
| `user_sessions` | `UserSession` | Multi-device web & Android sessions | Expiration prune & hash lookup |
| `user_profiles` | `UserProfile` | Aesthetic preferences & display name | Last-Write-Wins (LWW) by `updatedAt` |
| `user_consents` | `UserConsent` | Granular AI memory & cloud consent flags | Explicit user toggle, auditable |
| `emotional_check_ins` | `EmotionalCheckIn` | Somatic pulse coordinates & emotion logs | Append-only with client-id deduplication |
| `sleep_recovery_logs` | `SleepRecoveryLog` | Rest duration, quality & somatic notes | Daily log key, LWW by `recordedAt` |
| `garden_progress` | `GardenProgress` | Total blooms & milestone unlock flags | Monotonic counter max merge |
| `star_jar_memories` | `StarJarMemory` | Micro-gratitude notes & reflections | Collection union by `clientNoteId` |
| `sealed_letters` | `SealedLetter` | Time-locked letters to future self | Timestamp lock condition verification |
| `user_approved_memories`| `UserApprovedMemory`| Granular Memory Vault (semantic notes) | Opt-in flag with category indexing |
| `companion_messages` | `CompanionMessageRecord`| Chat transcripts with Soul Companion | Client message ID deduplication |
| `journey_and_insight_state`| `JourneyAndInsightState`| 28-day journey & AI reflection cache | LWW state with array-union for completed days |
| `data_privacy_audit_logs`| `DataPrivacyAuditLog` | Audit trail for export & wipe actions | Append-only compliance log |

---

## 3. Referential Integrity & Cascade Isolation

Every personal table in LUMINA maintains a direct foreign-key relationship to `users.id` with `onDelete: Cascade`.

### Guaranteed Complete Account Erasure
When a user initiates **"Erase All Sanctuary Data"** or deletes their account:
```sql
DELETE FROM users WHERE id = $1;
```
PostgreSQL automatically and atomically cascades the deletion across all 12 satellite tables in a single transaction. Zero orphaned emotional records, chat transcripts, or biometric markers remain on cloud infrastructure.

---

## 4. Zero-Retention Policy: Burn & Release Ritual

### Strict Architectural Exclusion
The **Burn & Release Room** (`/release-room`) is LUMINA's dedicated space for unburdening intrusive, painful, or heavy thoughts.

> [!IMPORTANT]
> Burn & Release inputs are **intentionally omitted** from `prisma/schema.prisma` and client IndexedDB persistence.
> 
> 1. Thoughts entered in the release room exist **only in volatile React component state**.
> 2. When the user burns a thought, Three.js shaders dissolve the text into particle ash.
> 3. Upon animation completion, state is reset to empty string.
> 4. No network requests, database inserts, or log entries are ever generated for released thoughts.

---

## 5. Conflict Resolution: Deterministic Last-Write-Wins (LWW)

When reconciling local IndexedDB state with cloud PostgreSQL state (`lib/sync-engine.ts`):

1. **Scalar Attributes (`displayName`, `sensoryMode`, `themeMode`):**
   Compares `clientUpdatedAt` vs `serverUpdatedAt`. The record with the later timestamp wins.
2. **Collection Entities (`checkIns`, `starJarNotes`, `memories`):**
   Merged via unique deterministic keys (`clientCheckInId`, `clientNoteId`, `clientMemoryId`). If a record exists locally but not remotely, it is synced upstream. If it exists remotely but not locally, it is inserted into IndexedDB.
3. **Monotonic Progress (`gardenBlooms`):**
   $$\text{blooms}_{\text{merged}} = \max(\text{blooms}_{\text{local}}, \text{blooms}_{\text{remote}})$$
4. **Day Sets (`journeyCompletedDays`):**
   $$\text{days}_{\text{merged}} = \text{days}_{\text{local}} \cup \text{days}_{\text{remote}}$$

---

## 6. Offline Queue & Network Resilience

When the client device goes offline (e.g. mobile Android in airplane mode):
1. Mutations are appended to `localStorage.getItem('lumina_sync_outbox')`.
2. When `window.addEventListener('online')` fires or the app regains focus:
   - Outbox items are dequeued in chronological order.
   - Retries follow exponential backoff: $1\text{s} \to 3\text{s} \to 9\text{s}$.
   - Once successfully synced, the outbox is cleared.
