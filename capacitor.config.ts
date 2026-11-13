/**
 * LUMINA (RaaOS Engine) — Capacitor Android Configuration
 * Target: Native Android (Capacitor 6+)
 */

import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.raaos.lumina',
  appName: 'LUMINA',
  webDir: 'out',
  backgroundColor: '#060712',
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#060712',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
  },
  android: {
    backgroundColor: '#060712',
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
}

export default config
