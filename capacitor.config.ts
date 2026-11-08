/**
 * LUMINA (RaaOS Engine) — Capacitor Android Configuration
 * Target: Native Android (Capacitor 6+)
 */

export interface CapacitorConfig {
  appId: string
  appName: string
  webDir: string
  backgroundColor?: string
  plugins?: {
    StatusBar?: {
      style?: 'DARK' | 'LIGHT' | 'DEFAULT'
      backgroundColor?: string
      overlaysWebView?: boolean
    }
    Keyboard?: {
      resize?: 'body' | 'ionic' | 'native' | 'none'
      style?: 'DARK' | 'LIGHT' | 'DEFAULT'
      resizeOnFullScreen?: boolean
    }
    [key: string]: unknown
  }
  android?: {
    backgroundColor?: string
    allowMixedContent?: boolean
    captureInput?: boolean
    webContentsDebuggingEnabled?: boolean
    buildOptions?: {
      keystorePath?: string
      keystoreAlias?: string
    }
  }
}

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
