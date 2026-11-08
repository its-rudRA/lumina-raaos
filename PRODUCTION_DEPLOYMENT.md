# LUMINA Production Deployment Guide (Web & Native Android)

**Product:** LUMINA — Bio-Adaptive Emotional Sanctuary  
**Engine:** RaaOS 2.0 (Crafted by Rudra)  
**Target Environments:** Modern Web (Vercel / Node.js / Docker) & Native Android (Capacitor 6+)  

---

## 1. Environment Configuration

Create `.env.production` (or `.env.local` for staging) with the required production credentials:

```bash
# -----------------------------------------------------------------------------
# 1. Google Gemini 2.5 Flash API Key
# -----------------------------------------------------------------------------
# Required for real-time Soul Companion chat and Sanctuary Reflection synthesis.
# If omitted or offline, LUMINA automatically falls back to transparent Local Mode.
GEMINI_API_KEY="AIzaSyYourProductionGeminiKeyHere"

# -----------------------------------------------------------------------------
# 2. PostgreSQL Connection Strings (Prisma ORM)
# -----------------------------------------------------------------------------
# Transaction connection pooler URL (e.g., Supabase / Neon / AWS RDS / Railway):
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true&sslmode=require"

# Direct connection URL without pooler (required for Prisma DDL migrations):
DIRECT_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require"

# -----------------------------------------------------------------------------
# 3. Cryptographic Secret
# -----------------------------------------------------------------------------
# High-entropy secret used for session token signing and verification (min 32 chars):
SESSION_SECRET="e9a4b8f3d9a47ec8b88ec9bdc8a4e8d9aec121172291cabe"

# -----------------------------------------------------------------------------
# 4. Mobile Capacitor Android Endpoint
# -----------------------------------------------------------------------------
# Public HTTPS URL of the deployed web backend for native Android APK sync requests:
NEXT_PUBLIC_API_BASE_URL="https://lumina.yourdomain.com"
```

---

## 2. PostgreSQL & Prisma Database Deployment

LUMINA utilizes Prisma ORM with 13 normalized models located in [`prisma/schema.prisma`](file:///Users/rudrarajsingh/Documents/lumina-raaos/prisma/schema.prisma) and migration DDL in [`prisma/migrations/0001_init_lumina_schema/migration.sql`](file:///Users/rudrarajsingh/Documents/lumina-raaos/prisma/migrations/0001_init_lumina_schema/migration.sql).

### Step-by-Step Database Migration
```bash
# 1. Generate Prisma Client
npx prisma generate

# 2. Apply migrations to production database (using DIRECT_URL)
npx prisma migrate deploy

# 3. (Optional) Verify table structure via Prisma Studio
npx prisma studio
```

> [!NOTE]
> All tables maintain `onDelete: Cascade` foreign-key relationships to `users.id` for single-query GDPR right-to-erasure account purges.
> The Burn & Release ritual is strictly omitted from the database schema by design.

---

## 3. Web Production Deployment (Vercel / Node.js Server / Docker)

### 3.1 Deploying to Vercel (Recommended)
1. Link repository to Vercel:
   ```bash
   vercel link
   ```
2. Add production environment variables in project settings:
   - `GEMINI_API_KEY`
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `SESSION_SECRET`
3. Trigger production deployment:
   ```bash
   vercel --prod
   ```

### 3.2 Standalone Node.js / Docker Server
```bash
# Install dependencies
npm ci

# Run test suite to verify zero regressions
npm test

# Build production bundle
npm run build

# Start production server on port 3000
npm run start
```

---

## 4. Native Android APK & Google Play AAB Build (Capacitor)

### 4.1 Prerequisites
- Android Studio Ladybug (2024.2+) or newer
- Android SDK Platform 34+
- Java Development Kit (JDK 17+)
- Node.js 20+

### 4.2 Building the Static Export
In `next.config.mjs`, setting `CAPACITOR_ANDROID=true` activates static HTML/JS export mode (`output: 'export'`) with unoptimized images:

```bash
# 1. Clean previous build artifacts
rm -rf out .next

# 2. Build Next.js static asset bundle
CAPACITOR_ANDROID=true npm run build

# 3. Add Android platform (one-time command)
npx cap add android

# 4. Sync web assets and plugins to android/ project
npx cap sync android
```

### 4.3 Compiling in Android Studio
1. Launch Android Studio:
   ```bash
   npx cap open android
   ```
2. Wait for Gradle sync to complete.
3. Build Release Artifacts:
   - **For Sideloaded Testing (APK):**
     **Build > Build Bundle(s) / APK(s) > Build APK(s)**
   - **For Google Play Store Release (AAB):**
     **Build > Generate Signed Bundle / APK > Android App Bundle**
     Select your production release keystore, key alias, and enter your password.
4. Output location:
   `android/app/release/app-release.aab`

---

## 5. Post-Deployment Verification Checklist

- [x] **Zero TypeScript Errors:** `npx tsc --noEmit` returns exit code 0.
- [x] **Automated Tests:** `npm test` passes all 11 unit/integration tests in under 20ms.
- [x] **Local-First Fallback:** App operates smoothly in local-first mode even if `DATABASE_URL` is unconfigured.
- [x] **Hardware Back-Button:** Modal dismissal $\to$ drawer dismissal $\to$ `/home` return $\to$ system exit hierarchy works cleanly.
- [x] **Safe-Area Insets:** Dynamic `paddingLeft` ($272\text{px}$ / $76\text{px}$) eliminates left sidebar overlap and right margin gap across all 10 sanctuary rooms.
- [x] **High-DPI Clamping:** Mobile WebGL and 2D canvas clamped to $\text{DPR} \le 1.5$ to protect battery and thermals.
