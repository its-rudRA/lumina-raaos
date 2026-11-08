-- ============================================================================
-- Migration: 0001_init_lumina_schema
-- Created for LUMINA (RaaOS Engine) PostgreSQL Multi-Device Sync
-- Target: PostgreSQL 14+
-- 
-- PRIVACY NOTE:
-- Burn & Release thoughts are strictly excluded from this DDL by architectural design.
-- ============================================================================

-- 1. Users
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT UNIQUE,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. User Sessions
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL UNIQUE,
    "platform" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_user_sessions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_user_sessions_userId" ON "user_sessions"("userId");
CREATE INDEX "idx_user_sessions_tokenHash" ON "user_sessions"("tokenHash");

-- 3. User Profiles
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE,
    "displayName" TEXT NOT NULL DEFAULT 'Friend',
    "themeMode" TEXT NOT NULL DEFAULT 'night',
    "sensoryMode" TEXT NOT NULL DEFAULT 'full',
    "activeCompanion" TEXT NOT NULL DEFAULT 'The Listener',
    "onboardingJson" JSONB,
    "calmDnaJson" JSONB,
    "audioPrefsJson" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_user_profiles_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 4. User Consents
CREATE TABLE "user_consents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE,
    "aiMemoryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cloudSyncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "privacyVersion" TEXT NOT NULL DEFAULT '2026.1',
    "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_user_consents_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 5. Emotional Check-Ins
CREATE TABLE "emotional_check_ins" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL UNIQUE,
    "emotionId" TEXT,
    "emoji" TEXT,
    "emotionLabel" TEXT,
    "intensity" INTEGER,
    "pleasantness" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "energy" DOUBLE PRECISION NOT NULL DEFAULT 52.0,
    "auraTitle" TEXT NOT NULL DEFAULT 'Softly Grounded',
    "somaticCues" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "note" TEXT,
    "reaction" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "fk_emotional_check_ins_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_emotional_check_ins_user_rec" ON "emotional_check_ins"("userId", "recordedAt");
CREATE INDEX "idx_emotional_check_ins_user_upd" ON "emotional_check_ins"("userId", "clientUpdatedAt");

-- 6. Sleep Recovery Logs
CREATE TABLE "sleep_recovery_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sleepHours" DOUBLE PRECISION NOT NULL DEFAULT 7.0,
    "sleepQuality" TEXT NOT NULL DEFAULT 'rested',
    "rhythmNote" TEXT,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_sleep_recovery_logs_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_sleep_recovery_logs_user_logged" ON "sleep_recovery_logs"("userId", "loggedAt");

-- 7. Garden Progress
CREATE TABLE "garden_progress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE,
    "atmospherePreset" TEXT NOT NULL DEFAULT 'twilight',
    "wishLanternCount" INTEGER NOT NULL DEFAULT 0,
    "objectsJson" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_garden_progress_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 8. Star Jar Memories
CREATE TABLE "star_jar_memories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL UNIQUE,
    "text" TEXT NOT NULL,
    "emoji" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "fk_star_jar_memories_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_star_jar_memories_user_created" ON "star_jar_memories"("userId", "createdAt");

-- 9. Sealed Letters
CREATE TABLE "sealed_letters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL UNIQUE,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "openDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "fk_sealed_letters_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_sealed_letters_user_open" ON "sealed_letters"("userId", "openDate");

-- 10. User Approved Memories (Vault)
CREATE TABLE "user_approved_memories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL UNIQUE,
    "text" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'anchor',
    "sharedWithAi" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "fk_user_approved_memories_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_user_approved_memories_user_created" ON "user_approved_memories"("userId", "createdAt");

-- 11. Companion Message Records
CREATE TABLE "companion_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL UNIQUE,
    "persona" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'gemini',
    "text" TEXT NOT NULL,
    "reaction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_companion_messages_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_companion_messages_user_created" ON "companion_messages"("userId", "createdAt");

-- 12. Journey and Insight State
CREATE TABLE "journey_and_insight_states" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE,
    "exploredDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "dayReflectionsJson" JSONB,
    "weeklyNotesJson" JSONB,
    "reminderPref" TEXT NOT NULL DEFAULT 'Off',
    "latestAiReflectionJson" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_journey_states_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 13. Data Privacy Audit Logs
CREATE TABLE "data_privacy_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_privacy_audit_logs_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_privacy_audit_logs_user_exec" ON "data_privacy_audit_logs"("userId", "executedAt");
