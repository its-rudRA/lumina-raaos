# LUMINA Native Android & Capacitor Readiness Architecture

**Product:** LUMINA — Bio-Adaptive Emotional Sanctuary  
**Engine:** RaaOS 2.0 (Crafted by Rudra)  
**Target Platform:** Native Android (Capacitor 6+ / Android 14+ / API Level 26–35)  
**Distribution:** Google Play Store (AAB) & Sideloaded APK  
**Excluded Platforms:** Apple/iOS (explicitly out of scope)  

---

## 1. Architectural Foundation: Hybrid Native + Local-First Core

LUMINA on Android operates as a **hardware-accelerated, offline-first native application** powered by Capacitor. The architecture bridges modern WebGL/Canvas graphics with native Android platform primitives:

```
┌────────────────────────────────────────────────────────┐
│                   Native Android Host                  │
│       • Capacitor 6+ Native Shell (com.raaos.lumina)   │
│       • Android Hardware Back-Button Hook              │
│       • StatusBar (#060712 Dark) & Keyboard (Resize)   │
└───────────────────────────┬────────────────────────────┘
                            │ WebKit / Android System WebView
                            ▼
┌────────────────────────────────────────────────────────┐
│                 LUMINA Client Application              │
│       • Next.js 16 Static Export (CAPACITOR_ANDROID)   │
│       • React 19 App Shell + 5-Tab Mobile Dock         │
│       • Local-First IndexedDB (lumina_sanctuary_db)    │
│       • GPU Clamped Three.js (DPR ≤ 1.5)               │
│       • 174Hz + 261Hz Web Audio Engine                 │
└───────────────────────────┬────────────────────────────┘
                            │ Optional Cloud Sync (HTTPS)
                            ▼
┌────────────────────────────────────────────────────────┐
│               PostgreSQL Sync Gateway                  │
│       (NEXT_PUBLIC_API_BASE_URL/api/sync)              │
│       • 13 Normalized Tables with Cascade Wipe         │
│       • Deterministic Last-Write-Wins (LWW) Merge      │
└────────────────────────────────────────────────────────┘
```

---

## 2. Configuration & Manifests

### 2.1 Capacitor Configuration (`capacitor.config.ts`)
The root configuration defines the application metadata and native plugin behaviors:

```typescript
{
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
  }
}
```

### 2.2 Next.js Dual-Mode Build (`next.config.mjs`)
- **Web Development / Production Web:** Runs with standard server runtime supporting dynamic API routes (`/api/companion`, `/api/sync`).
- **Capacitor Android Packaging:** When `CAPACITOR_ANDROID=true` is set, enables `output: 'export'` and unoptimized images to produce a clean, self-contained `out/` folder for the Android asset bundle.

### 2.3 Web & Android PWA Manifest (`public/manifest.json`)
- Displays as `standalone` with `portrait-primary` orientation.
- Enforces brand dark background (`#060712`) and theme color (`#060712`).
- Root viewport configured with `viewport-fit=cover`, `initial-scale=1`, `maximum-scale=1`, and `user-scalable=no` for native gesture control.

---

## 3. Native Android UX: Hardware Back-Button Hierarchy

Android users rely heavily on the system hardware back button or predictive back gesture. LUMINA implements a **deterministic 4-tier navigation stack** (`components/app-shell.tsx`):

```
User Presses Hardware Back / Swipes Back
                 │
                 ▼
     [Is an Overlay Modal Open?]
       • Immediate Support Modal
       • 60s Breath Reset Modal
       • 10-Room Navigation Drawer
                 │
        YES ────► Close active overlay (do not exit page)
                 │
         NO
                 ▼
     [Is User on a Secondary Sanctuary Room?]
       • /garden, /check-in, /emojis, /companion
       • /calm-studio, /release-room, /insights
       • /journey, /settings
                 │
        YES ────► Smoothly navigate back to /home
                 │
         NO
                 ▼
     [User is at /home root]
                 │
                 ▼
       Minimize App / System Exit
```

### Event Listeners Implemented:
1. `popstate` synthetic history state handling.
2. Capacitor native hook: `Capacitor.Plugins.App.addListener('backButton', ...)`.
3. Standard Cordova/Android WebView `document.addEventListener('backbutton', ...)`.

---

## 4. Mobile Navigation & Safe-Area Ergonomics

### 4.1 5-Tab Frosted-Glass Bottom Dock
On mobile and Android viewports (`< 1024px`), desktop sidebars are hidden in favor of a sleek 5-tab bottom dock:
1. **Home** (`/home`): Sanctuary gateway and emotional pulse overview.
2. **Garden** (`/garden`): 3D Celestial Lotus and living flora world.
3. **Check-In** (`/check-in`): Somatic compass and aura quadrant picker.
4. **Companion** (`/companion`): Soul Companion AI chat stage.
5. **Menu** (Drawer trigger): Opens the full slide-over drawer with all 10 sanctuary rooms.

### 4.2 Safe-Area Inset Handling
- **Top Notches / Camera Cutouts:** `env(safe-area-inset-top)` prevents header clipping.
- **Gesture Pill / Soft Navigation Bar:** `pb-[max(env(safe-area-inset-bottom),10px)]` ensures buttons remain clear of the Android navigation bar.
- **Content Clearance:** Main content containers use `pb-24 lg:pb-12` so content is never occluded behind the floating dock.

### 4.3 Touch Ergonomics & Virtual Keyboard Avoidance
- **No Tap Flash:** `-webkit-tap-highlight-color: transparent` removes the gray Android tap highlight.
- **Fast Touch Response:** `touch-action: manipulation` disables the 300ms double-tap delay on interactive elements.
- **Zero Rubber-Banding:** `overscroll-behavior-y: none` prevents awkward page pull-down bouncing in Android WebViews.
- **Keyboard Resizing:** Capacitor Keyboard plugin is configured to `resize: 'body'`, smoothly shifting inputs above the virtual keyboard when typing in the Companion or Memory Vault.

---

## 5. Mobile GPU & Thermal Optimization

To ensure 60fps performance on budget and mid-range Android chipsets (e.g. MediaTek Helio, Snapdragon 600/700 series):

1. **High-DPI Clamping:**
   $$\text{DPR}_{\text{canvas}} = \min(\text{window.devicePixelRatio}, 1.35)$$
   $$\text{DPR}_{\text{threejs}} = \min(\text{window.devicePixelRatio}, 1.5)$$
   Prevents $3\times$ and $4\times$ Android displays from rendering 12–16 million pixels per frame, drastically reducing fill-rate thermal load.
2. **Shared GPU Resources:**
   Materials and geometries in `<SanctuaryScene />` are instantiated once outside render loops and shared across all 24 lotus instances.
3. **Offscreen Occlusion Culling:**
   `IntersectionObserver` halts Three.js animation loops when 3D components scroll out of view.
4. **Lifecycle Audio Suspension:**
   A window `visibilitychange` listener immediately calls `AudioContext.suspend()` when the app is backgrounded, preserving battery life.

---

## 6. Android Build & Deployment Commands

### Prerequisites
- Node.js 20+
- Android Studio Ladybug (or newer) with Android SDK Platform 34+
- Java Development Kit (JDK 17+)

### Step-by-Step Build Workflow
```bash
# 1. Install dependencies
npm install

# 2. Build static export for Android bundle
CAPACITOR_ANDROID=true npm run build

# 3. Add Android platform (one-time setup)
npx cap add android

# 4. Sync web assets and plugins to Android project
npx cap sync android

# 5. Open Android Studio to build APK or AAB
npx cap open android
```

In Android Studio:
- Select **Build > Generate Signed Bundle / APK**
- Choose **Android App Bundle (.aab)** for Google Play Store upload, or **APK** for direct sideloading.
