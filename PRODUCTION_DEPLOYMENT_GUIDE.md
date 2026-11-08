# LUMINA — Production Deployment Guide
**Architecture:** Next.js 16.4.3 App Router (React 19, TypeScript, Three.js, Tailwind CSS v4)  
**Database:** PostgreSQL 14+ via Prisma ORM  
**Mobile Target:** Native Android via Capacitor 6+  
**Target Version:** `v1.0.0-rc.1` / `v1.0.0` GA  

---

## 1. Hosting Architecture Options

LUMINA can be deployed across several production infrastructures. Choose the hosting model that best aligns with your team's operational preferences:

### Option A: Vercel (Recommended for Fastest Zero-Config Setup)
- **Runtime:** Edge Network & Node.js Serverless Functions.
- **Benefits:** Automatic App Router streaming support, global CDN asset caching, instant rollbacks, and native Next.js 16 build optimization.
- **Setup:**
  1. Link the Git repository in the Vercel Dashboard.
  2. Framework Preset: **Next.js**.
  3. Set Root Directory: `./` (or leave default).
  4. Build Command: `next build` (standard).
  5. Install Command: `pnpm install` or `npm install`.

### Option B: Railway / Render (Recommended for Unified App + Database)
- **Runtime:** Containerized Node.js 22 LTS service.
- **Benefits:** Co-located PostgreSQL database, internal low-latency network communication, predictable resource caps.
- **Setup:**
  1. Create a new Project with a **Node.js Web Service** and a **PostgreSQL Database**.
  2. Build Command: `npm install && npx prisma generate && npm run build`
  3. Start Command: `npm start`
  4. Ensure port mapping binds to `0.0.0.0:$PORT`.

### Option C: Docker Standalone (Enterprise / Self-Hosted VPS)
Use a multi-stage `Dockerfile` based on `node:22-alpine`:
```dockerfile
# Stage 1: Dependencies
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci

# Stage 2: Builder
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npx prisma generate
RUN npm run build

# Stage 3: Runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
USER nextjs
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 2. Managed PostgreSQL Setup & Connection Architecture

LUMINA uses a dual-connection string pattern to optimize performance and prevent connection starvation in serverless and containerized environments.

### 2.1 Connection Pooling Architecture

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│ Next.js App / Serverless Lambdas│       │ CI / CD Migration Pipeline      │
│ (Prisma Client Runtime Queries) │       │ (`npx prisma migrate deploy`)   │
└───────────────┬─────────────────┘       └────────────────┬────────────────┘
                │ Port 6543 / Pooler                       │ Port 5432 Direct
                ▼                                          ▼
   ┌───────────────────────────┐             ┌───────────────────────────┐
   │ PgBouncer / Supabase Pool │             │ PostgreSQL Engine Direct  │
   │   (Transaction Pooling)   │             │   (Full DDL & Migration)  │
   └─────────────┬─────────────┘             └─────────────┬─────────────┘
                 │                                         │
                 └───────────────────┬─────────────────────┘
                                     ▼
                      ┌────────────────────────────┐
                      │    PostgreSQL 14+ Tables   │
                      │   (13 Normalized Models)   │
                      └────────────────────────────┘
```

### 2.2 Providers
- **Supabase:**
  - `DATABASE_URL`: `postgres://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true`
  - `DIRECT_URL`: `postgres://postgres.[ref]:[password]@db.[ref].supabase.com:5432/postgres`
- **Neon:**
  - `DATABASE_URL`: `postgres://[user]:[password]@[endpoint]-pooler.[region].neon.tech/neondb?sslmode=require`
  - `DIRECT_URL`: `postgres://[user]:[password]@[endpoint].[region].neon.tech/neondb?sslmode=require`
- **Railway Postgres:**
  - `DATABASE_URL`: `postgresql://postgres:[password]@roundhouse.proxy.rlwy.net:[port]/railway`

---

## 3. Production Environment Variables Checklist

Configure the following variables in your hosting provider's **Environment Settings** dashboard:

| Variable Name | Required | Secret? | Description & Example |
| :--- | :---: | :---: | :--- |
| `DATABASE_URL` | **Yes** | Yes | Transaction-pooled PostgreSQL URL for runtime Prisma client queries. |
| `DIRECT_URL` | **Yes** | Yes | Direct connection URL to PostgreSQL (port 5432) for running DDL migrations. |
| `GEMINI_API_KEY` | **Yes** | Yes | Google AI Studio API key (`AIza...`) powering `gemini-2.5-flash` companion reflections. |
| `SESSION_SECRET` | **Yes** | Yes | 256-bit cryptographically secure token hash secret. Generate using `openssl rand -base64 32`. |
| `NEXT_PUBLIC_API_BASE_URL` | **Yes** | No | Canonical public HTTPS URL of your deployment (e.g. `https://sanctuary.lumina.app`). Used by Android Capacitor builds to resolve API endpoints. |
| `NODE_ENV` | **Yes** | No | Set to `production`. |
| `NEXT_TELEMETRY_DISABLED` | No | No | Set to `1` to disable telemetry collection. |

> [!CAUTION]
> Never commit `.env`, `.env.local`, or any credentials into source control. Verify that `.gitignore` contains `.env*`.

---

## 4. Database Migration Execution Runbook

Before serving live client traffic, apply the Prisma PostgreSQL migrations against your production database:

### Step 1: Generate Prisma Client Artifacts
```bash
npx prisma generate
```

### Step 2: Deploy Production Migration
Run the non-interactive production migration tool:
```bash
npx prisma migrate deploy
```
*Expected output:*
```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public" at "db.xxx.supabase.com:5432"

1 migration found in prisma/migrations

Applying migration `0001_init_lumina_schema`

The following migration has been applied:

migrations/
  └─ 0001_init_lumina_schema/
      └─ migration.sql

All migrations have been successfully applied.
```

### Step 3: Verify Migration Status
Verify that database schemas match the codebase:
```bash
npx prisma migrate status
```
*Expected output:* `Database schema is up to date!`

---

## 5. Health & Readiness Verification

Once deployment completes, execute the zero-PII health check probe:

```bash
curl -s -i https://your-lumina-domain.com/api/health
```

### Expected Response (`200 OK`):
```json
HTTP/2 200 
content-type: application/json; charset=utf-8
cache-control: no-store, no-cache, must-revalidate
x-content-type-options: nosniff
x-frame-options: DENY
referrer-policy: strict-origin-when-cross-origin
access-control-allow-origin: *

{
  "status": "ok",
  "product": "LUMINA",
  "engine": "RaaOS Engine",
  "version": "1.0.0-rc.1",
  "timestamp": "2026-11-08T14:05:00.000Z",
  "subsystems": {
    "aiCompanion": "gemini-configured",
    "database": "postgres-configured",
    "privacyGuarantee": "zero-pii-logging"
  }
}
```

If `aiCompanion` reports `"local-fallback"` or `database` reports `"local-indexeddb-only"`, verify your environment variable configuration in the hosting dashboard.
