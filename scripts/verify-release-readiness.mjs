#!/usr/bin/env node
/**
 * LUMINA — Release Readiness Verifier
 * Fast, non-destructive pre-flight audit for Web and Android Capacitor releases.
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

const REQUIRED_ROUTES = [
  'app/page.tsx',
  'app/welcome/page.tsx',
  'app/sign-in/page.tsx',
  'app/sign-up/page.tsx',
  'app/onboarding/introduction/page.tsx',
  'app/onboarding/profile/page.tsx',
  'app/onboarding/tutorial/page.tsx',
  'app/home/page.tsx',
  'app/garden/page.tsx',
  'app/check-in/page.tsx',
  'app/emojis/page.tsx',
  'app/companion/page.tsx',
  'app/calm-studio/page.tsx',
  'app/release-room/page.tsx',
  'app/insights/page.tsx',
  'app/journey/page.tsx',
  'app/settings/page.tsx',
]

const REQUIRED_API_SYNC = [
  'app/api/companion/route.ts',
  'app/api/sync/route.ts',
  'app/api/health/route.ts',
  'lib/api-client.ts',
  'lib/sync-engine.ts',
  'lib/prisma.ts',
]

const REQUIRED_DB = [
  'prisma/schema.prisma',
  'prisma/migrations/0001_init_lumina_schema/migration.sql',
]

const REQUIRED_ANDROID_PWA = [
  'capacitor.config.ts',
  'public/manifest.json',
  'public/icon.svg',
  'public/icon-maskable.svg',
]

const REQUIRED_OPERATIONAL_GUIDES = [
  'RELEASE_READINESS_REPORT.md',
  'PRODUCTION_DEPLOYMENT_GUIDE.md',
  'DATABASE_BACKUP_RECOVERY_GUIDE.md',
  'ANDROID_RELEASE_CHECKLIST.md',
  'PRIVACY_AND_SECURITY_FINAL_REPORT.md',
]

let totalChecks = 0
let failedChecks = 0

function logSection(title) {
  console.log(`\n\x1b[1m\x1b[36m▶ ${title}\x1b[0m`)
}

function checkFile(relPath, label) {
  totalChecks++
  const fullPath = path.join(ROOT, relPath)
  const exists = fs.existsSync(fullPath)
  if (exists) {
    console.log(`  \x1b[32m✔\x1b[0m ${label || relPath}`)
    return true
  } else {
    failedChecks++
    console.log(`  \x1b[31m✘ MISSING:\x1b[0m ${label || relPath} (${relPath})`)
    return false
  }
}

console.log('\x1b[1m\x1b[35m=====================================================\x1b[0m')
console.log('\x1b[1m\x1b[35m  LUMINA Release Readiness Pre-Flight Verifier       \x1b[0m')
console.log('\x1b[1m\x1b[35m=====================================================\x1b[0m')

// 1. Route Check (17 pages)
logSection(`Sanctuary App Routes (${REQUIRED_ROUTES.length} pages)`)
for (const route of REQUIRED_ROUTES) {
  checkFile(route)
}

// 2. API & Sync Infrastructure
logSection(`API & Sync Infrastructure (${REQUIRED_API_SYNC.length} modules)`)
for (const api of REQUIRED_API_SYNC) {
  checkFile(api)
}

// 3. Database Check
logSection(`PostgreSQL Prisma Schema & Migrations (${REQUIRED_DB.length} artifacts)`)
for (const db of REQUIRED_DB) {
  checkFile(db)
}

// 4. Android & PWA Assets
logSection(`Native Android Capacitor & PWA Assets (${REQUIRED_ANDROID_PWA.length} assets)`)
for (const asset of REQUIRED_ANDROID_PWA) {
  checkFile(asset)
}

// 5. Operational & Release Engineering Guides
logSection(`Operational & Release Engineering Guides (${REQUIRED_OPERATIONAL_GUIDES.length} guides)`)
for (const guide of REQUIRED_OPERATIONAL_GUIDES) {
  checkFile(guide)
}

// 6. Git Secret Safety Check
logSection('Security & Git Secret Isolation')
totalChecks++
const gitignorePath = path.join(ROOT, '.gitignore')
if (fs.existsSync(gitignorePath)) {
  const content = fs.readFileSync(gitignorePath, 'utf8')
  const hasEnvPattern =
    content.includes('.env*.local') ||
    content.includes('.env.local') ||
    content.includes('.env')
  if (hasEnvPattern) {
    console.log('  \x1b[32m✔\x1b[0m .gitignore properly ignores local environment secrets (.env*)')
  } else {
    failedChecks++
    console.log('  \x1b[31m✘ WARNING:\x1b[0m .gitignore does not ignore .env* secrets!')
  }
} else {
  failedChecks++
  console.log('  \x1b[31m✘ MISSING:\x1b[0m .gitignore file not found!')
}

console.log('\n\x1b[1m-----------------------------------------------------\x1b[0m')
if (failedChecks === 0) {
  console.log(
    `\x1b[32m✔ ALL ${totalChecks} PRE-FLIGHT RELEASE READINESS CHECKS PASSED!\x1b[0m`
  )
  console.log('\x1b[32m  LUMINA is structurally primed for Web and Android packaging.\x1b[0m\n')
  process.exit(0)
} else {
  console.log(
    `\x1b[31m✘ ${failedChecks} of ${totalChecks} PRE-FLIGHT AUDIT CHECKS FAILED!\x1b[0m\n`
  )
  process.exit(1)
}
