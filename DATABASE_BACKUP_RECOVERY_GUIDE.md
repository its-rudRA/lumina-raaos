# LUMINA — Database Backup & Recovery Guide
**System:** PostgreSQL 14+ Relational Storage & Prisma ORM  
**Architecture:** Hybrid Cloud + Local-First IndexedDB Outbox Engine  
**Author:** Rudra (RaaOS Engine)  
**Security & Privacy Tier:** Zero-PII / Ephemeral Thought Isolation  

---

## 1. Overview of Persistent Tables

LUMINA's relational schema comprises 13 normalized tables with strict `ON DELETE CASCADE` user isolation:

1. `users` — Primary account identities
2. `user_sessions` — Ephemeral authentication session tokens
3. `user_profiles` — Visual theme, sensory mode, companion preferences
4. `user_consents` — GDPR, DPDP, AI processing, and sync opt-ins
5. `sanctuary_states` — Central sanctuary state (blooms, orb positions, energy)
6. `check_in_records` — Mood, aura label, and emotional intensity logs
7. `somatic_pulse_scans` — Somatic tension cues and restorative recovery inputs
8. `star_jar_notes` — Micro-gratitude notes and joyful moments
9. `sealed_letters` — Future-self sealed letters with unlock timestamps
10. `journey_progress` — 7-day emotional questline completion states
11. `semantic_memories` — User-curated, double-gated memory vault anchors
12. `calm_dna_profiles` — Personalized bio-rhythm and audio preferences
13. `sync_revisions` — Atomic sequence clock for Last-Write-Wins deduplication

> [!IMPORTANT]
> **Ephemeral Isolation Guarantee:**  
> The "Burn & Release" room thoughts have **ZERO** representation in this database schema. Release thoughts exist only in ephemeral client state, dissolve via WebGL particle shaders, and are physically discarded without ever reaching PostgreSQL or IndexedDB.

---

## 2. Automated Daily Snapshots & Point-in-Time Recovery (PITR)

For production database resilience, configure automated snapshots and Continuous Archiving / Point-in-Time Recovery (PITR) via your managed database provider:

### 2.1 Managed Provider Configuration
- **Supabase:**  
  Navigate to **Project Settings** -> **Database** -> **Backups**. Ensure daily automated snapshots are active (7-day retention on Pro; 30-day on Enterprise) and PITR (WAL archiving) is enabled.
- **Neon:**  
  Continuous timeline branching provides instant recovery to any specific second within your history retention window.
- **AWS RDS Aurora:**  
  Set automated backup retention period to `35 days`. Verify `binlog` / WAL continuous backup is enabled.

### 2.2 Point-in-Time Recovery (PITR) Execution
If an accidental administrative deletion occurs:
1. Identify the exact UTC timestamp prior to the incident (e.g. `2026-11-08T18:30:00Z`).
2. Trigger PITR clone to a new temporary database instance (`lumina-recovery-db`).
3. Validate user table integrity and foreign keys on the recovery instance.
4. Point production `DATABASE_URL` and `DIRECT_URL` to the restored instance or export affected rows.

---

## 3. Manual Backup & Restore Runbook

Use standard PostgreSQL tools (`pg_dump` and `pg_restore`) for manual pre-deployment backups or air-gapped archival.

### 3.1 Creating a Consistent Backup (`pg_dump`)
Run `pg_dump` targeting the direct PostgreSQL connection (`DIRECT_URL`):

```bash
# Export custom-format, compressed snapshot with timestamp
pg_dump \
  --format=custom \
  --no-owner \
  --no-acl \
  -d "$DIRECT_URL" \
  -f "lumina_backup_$(date +%F_%H%M%S).dump"
```

*Flags explained:*
- `--format=custom` (`-Fc`): High-compression binary format supporting selective table restore and parallel extraction.
- `--no-owner`: Prevents ownership restoration conflicts across different database user accounts.
- `--no-acl`: Prevents restoration of privileges/roles that may differ across environments.

### 3.2 Restoring from Backup (`pg_restore`)
To restore an archived dump into an existing database:

```bash
# Clean existing objects and restore all 13 tables
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  -d "$DIRECT_URL" \
  "lumina_backup_YYYY-MM-DD_HHMMSS.dump"
```

### 3.3 Post-Restore Verification Queries
Execute verification queries to ensure row integrity across key sanctuary entities:

```sql
SELECT 
  (SELECT COUNT(*) FROM "users") AS total_users,
  (SELECT COUNT(*) FROM "sanctuary_states") AS total_sanctuaries,
  (SELECT COUNT(*) FROM "check_in_records") AS total_checkins,
  (SELECT COUNT(*) FROM "sealed_letters") AS total_letters,
  (SELECT COUNT(*) FROM "semantic_memories") AS total_memories;
```

---

## 4. Failed Migration Recovery Runbook

If a deployment migration (`npx prisma migrate deploy`) is interrupted or encounters an unexpected schema constraint error:

### Step 1: Diagnose Migration Status
```bash
npx prisma migrate status
```
*Output will indicate which migration failed and its applied checksum.*

### Step 2: Mark Failed Migration as Rolled Back
To allow Prisma to cleanly re-attempt or bypass the failed migration:
```bash
npx prisma migrate resolve --rolled-back "0001_init_lumina_schema"
```

### Step 3: Inspect Database State
Connect via `psql "$DIRECT_URL"` and inspect table existence:
```sql
\dt
SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations";
```

### Step 4: Correct & Re-Deploy
1. Fix the underlying SQL constraint or conflict.
2. Re-run:
   ```bash
   npx prisma migrate deploy
   ```
3. Confirm schema alignment:
   ```bash
   npx prisma migrate status
   ```

---

## 5. Local-First Resilience During Database Outages

LUMINA is architected with a **Local-First, Offline-Capable** philosophy. The web and Android client applications **never** depend on synchronous database availability to maintain user experience.

### 5.1 The `lumina_sync_outbox` Architecture

```
┌────────────────────────────────────────────────────────┐
│             LUMINA Client (Web / Android)              │
│                                                        │
│  ┌────────────────────────┐  ┌──────────────────────┐  │
│  │   UI & User Actions    │  │ IndexedDB Persistent │  │
│  │ (Check-ins, Letters,   │─▶│   Sanctuary State    │  │
│  │   Memories, Blooms)    │  │ (100% Instant Write) │  │
│  └────────────────────────┘  └──────────────────────┘  │
│                                          │             │
│                                          ▼             │
│                              ┌──────────────────────┐  │
│                              │  lumina_sync_outbox  │  │
│                              │    (Pending Queue)   │  │
│                              └──────────┬───────────┘  │
└─────────────────────────────────────────┼──────────────┘
                                          │ 
                                          │ Background Sync Loop
                                          │ (Exponential Backoff: 1s, 3s, 9s)
                                          ▼
                         ┌─────────────────────────────────┐
                         │   POST /api/sync (PostgreSQL)   │
                         │                                 │
                         │   [If Offline / 500 Error]:     │
                         │   • Zero data loss              │
                         │   • Queue retained locally      │
                         │   • Transparent user notice     │
                         │   • Sync resumes on reconnection│
                         └─────────────────────────────────┘
```

1. **Instant Local Writes:** Every check-in, letter, or bloom is immediately committed to IndexedDB (`lumina_sanctuary_db`). The user UI responds in under 16ms with 60fps animations.
2. **Outbox Queueing:** If the network is unavailable or PostgreSQL returns an error (HTTP 500/503), the payload is enqueued in `lumina_sync_outbox` in IndexedDB.
3. **Automatic Reconnection & LWW Merging:** When connectivity is restored, the `SyncEngine` flushes the outbox using deterministic Last-Write-Wins merging (`mergeSanctuaryStatesLWW` and `mergeCheckInLists`). Monotonic counters (`gardenBlooms`) and set unions (`journeyCompletedDays`) prevent any overwritten progress.
4. **Zero Data Loss Guarantee:** Users can continue journaling, checking in, and breathing offline indefinitely without fear of lost entries.

---

## 6. GDPR & DPDP Right-to-be-Forgotten Verification

Under European GDPR and Indian DPDP privacy regulations, users retain the absolute right to have all their personal sanctuary data permanently and irreversibly expunged upon request.

### 6.1 Cascade Erasure Guarantee
All foreign key relations in `prisma/schema.prisma` and `prisma/migrations/0001_init_lumina_schema/migration.sql` specify `onDelete: Cascade`:

```sql
CONSTRAINT "fk_user_profiles_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
CONSTRAINT "fk_sanctuary_states_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
CONSTRAINT "fk_check_ins_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
CONSTRAINT "fk_letters_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
CONSTRAINT "fk_memories_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
```

### 6.2 Verified Erasure Command
When a user clicks **"Erase All Data"** in `/settings` (or via account deletion API):

```sql
-- Irrevocably purges the user and automatically cascades across all 12 related tables
DELETE FROM "users" WHERE "id" = :userId;
```

### 6.3 Verifying Complete Erasure
```sql
SELECT 
  (SELECT COUNT(*) FROM "users" WHERE "id" = :userId) AS users_left,
  (SELECT COUNT(*) FROM "sanctuary_states" WHERE "userId" = :userId) AS sanctuary_left,
  (SELECT COUNT(*) FROM "check_in_records" WHERE "userId" = :userId) AS checkins_left,
  (SELECT COUNT(*) FROM "sealed_letters" WHERE "userId" = :userId) AS letters_left,
  (SELECT COUNT(*) FROM "semantic_memories" WHERE "userId" = :userId) AS memories_left;
```
*Expected count across all tables:* **0**.
