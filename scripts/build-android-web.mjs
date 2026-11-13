#!/usr/bin/env node
/**
 * LUMINA — Safe Capacitor Android Static Export Builder
 *
 * Temporarily stashes dynamic server API routes (`app/api`) so Next.js static
 * export (`output: 'export'`) can bundle the complete client application for
 * Capacitor Android without triggering export restrictions on server routes.
 *
 * RESTORATION GUARANTEE:
 * Unconditionally restores `app/api` via try/finally and OS process termination hooks.
 */

import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const ROOT = process.cwd()
const API_DIR = path.join(ROOT, 'app', 'api')
const STASH_DIR = path.join(ROOT, '.api-build-stash')

let isStashed = false

function stashApiRoutes() {
  if (fs.existsSync(API_DIR)) {
    console.log('\x1b[36m[android-build]\x1b[0m Temporarily stashing app/api -> .api-build-stash for static export...')
    if (fs.existsSync(STASH_DIR)) {
      fs.rmSync(STASH_DIR, { recursive: true, force: true })
    }
    fs.renameSync(API_DIR, STASH_DIR)
    isStashed = true
  }
}

function restoreApiRoutes() {
  if (isStashed && fs.existsSync(STASH_DIR)) {
    console.log('\x1b[36m[android-build]\x1b[0m Restoring .api-build-stash -> app/api...')
    if (fs.existsSync(API_DIR)) {
      fs.rmSync(API_DIR, { recursive: true, force: true })
    }
    fs.renameSync(STASH_DIR, API_DIR)
    isStashed = false
    console.log('\x1b[32m[android-build] ✔ app/api successfully restored.\x1b[0m')
  }
}

// Register process listeners to guarantee restoration even on abrupt termination
process.on('SIGINT', () => {
  console.log('\n\x1b[33m[android-build] Caught SIGINT. Restoring API directory...\x1b[0m')
  restoreApiRoutes()
  process.exit(130)
})

process.on('SIGTERM', () => {
  console.log('\n\x1b[33m[android-build] Caught SIGTERM. Restoring API directory...\x1b[0m')
  restoreApiRoutes()
  process.exit(143)
})

process.on('uncaughtException', (err) => {
  console.error('\n\x1b[31m[android-build] Uncaught exception:\x1b[0m', err)
  restoreApiRoutes()
  process.exit(1)
})

process.on('exit', () => {
  if (isStashed) {
    restoreApiRoutes()
  }
})

async function runAndroidWebBuild() {
  console.log('\x1b[1m\x1b[35m=====================================================\x1b[0m')
  console.log('\x1b[1m\x1b[35m  LUMINA Capacitor Android Static Web Packaging      \x1b[0m')
  console.log('\x1b[1m\x1b[35m=====================================================\x1b[0m\n')

  try {
    stashApiRoutes()

    console.log('\x1b[34m[android-build]\x1b[0m Running Next.js static export (CAPACITOR_ANDROID=true npx next build --webpack)...\n')

    const buildProcess = spawn('npx', ['next', 'build', '--webpack'], {
      cwd: ROOT,
      stdio: 'inherit',
      env: {
        ...process.env,
        CAPACITOR_ANDROID: 'true',
      },
    })

    const exitCode = await new Promise((resolve) => {
      buildProcess.on('close', (code) => resolve(code ?? 1))
      buildProcess.on('error', (err) => {
        console.error('\x1b[31m[android-build] Failed to launch build process:\x1b[0m', err)
        resolve(1)
      })
    })

    if (exitCode === 0) {
      console.log('\n\x1b[32m✔ Static export complete! Assets emitted to /out.\x1b[0m')
      console.log('\x1b[32m  Run "npx cap copy android" or "npx cap sync android" to update the APK project.\x1b[0m\n')
    } else {
      console.log(`\n\x1b[31m✘ Next.js export exited with code ${exitCode}.\x1b[0m\n`)
    }

    process.exitCode = exitCode
  } finally {
    restoreApiRoutes()
  }
}

runAndroidWebBuild()
