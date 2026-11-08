# LUMINA — Native Android Release Checklist & Play Store Runbook
**Application:** LUMINA — Bio-Adaptive Emotional Sanctuary  
**Engine:** RaaOS Engine  
**Native Framework:** Capacitor 6+ Native Android Bridge  
**Target Release:** `v1.0.0-rc.1` / `v1.0.0` Production  
**Author:** Rudra (Rudraraj Singh)  

---

## 1. Application Identity & Configuration

Before generating native Android artifacts, ensure application identifiers and appearance parameters match the production specification:

| Configuration Property | Target Production Value | Config File Location |
| :--- | :--- | :--- |
| **Package Name (`appId`)** | `com.raaos.lumina` | `capacitor.config.ts` |
| **Application Label (`appName`)** | `LUMINA` | `capacitor.config.ts` & `strings.xml` |
| **Semantic Version (`versionName`)** | `"1.0.0-rc.1"` | `android/app/build.gradle` & `package.json` |
| **Internal Build Code (`versionCode`)** | `1` (increment +1 per Play Store build) | `android/app/build.gradle` |
| **Status Bar Style** | `Style.Dark` (hex `#060712`) | `capacitor.config.ts` (`StatusBar`) |
| **Splash Screen Background** | `#060712` (with fade animation) | `capacitor.config.ts` (`SplashScreen`) |
| **Hardware Back-Button** | Unconditional native event listener | `components/app-shell.tsx` |

### 1.1 Vector Adaptive Icons
Ensure the vector SVG icons are deployed:
- **Foreground / Standard:** `public/icon.svg` (512×512, `#060712` deep night sky, celestial aura radial glow, astrolabe rings, multi-layered rose/violet lotus, golden star core).
- **Maskable / Android Safe Zone:** `public/icon-maskable.svg` (512×512, scaled to fit Android's 80% circle/squircle safe zone with zero edge clipping).
- **Web App Manifest:** `public/manifest.json` configured with explicit `purpose: "any"` and `purpose: "maskable"`.

---

## 2. Native Project Generation & Static Bundle Sync

Execute the safe static packaging and sync pipeline:

```bash
# Step 1: Add the native Android platform (first-time setup only)
npx cap add android

# Step 2: Build the static web export bundle with production API base URL
# (This stashes app/api, runs Next.js static export to /out, and restores app/api)
NEXT_PUBLIC_API_BASE_URL="https://your-production-domain.com" npm run build:android-web

# Step 3: Synchronize exported assets, plugins, and web code into android/
npx cap sync android
```

---

## 3. Release Keystore Generation & Signing Setup

Google Play requires all Android App Bundles (AAB) to be signed with an RSA-2048 or higher upload key.

### 3.1 Generate Upload Keystore
Generate a dedicated release keystore using the standard Java `keytool` utility:

```bash
keytool -genkey -v \
  -keystore lumina-upload-key.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias lumina-release
```
*When prompted, store the keystore password and key password in a password manager.*

### 3.2 Secure Keystore Credentials (`keystore.properties`)
Create `android/keystore.properties` (**never commit this file to Git**):

```properties
storeFile=../lumina-upload-key.jks
storePassword=YOUR_SECURE_STORE_PASSWORD
keyAlias=lumina-release
keyPassword=YOUR_SECURE_KEY_PASSWORD
```

> [!CAUTION]
> Verify that `.gitignore` contains `*.jks`, `*.keystore`, and `keystore.properties`. These files must never be tracked in source control.

### 3.3 Configure `android/app/build.gradle` Signing & ProGuard/R8
In `android/app/build.gradle`:

```groovy
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    namespace "com.raaos.lumina"
    compileSdkVersion rootProject.ext.compileSdkVersion

    defaultConfig {
        applicationId "com.raaos.lumina"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0.0-rc.1"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

## 4. Android Permissions Audit (`AndroidManifest.xml`)

LUMINA is built on a non-invasive, privacy-first emotional sanctuary philosophy. Review `android/app/src/main/AndroidManifest.xml` to ensure **only** strictly essential permissions are declared:

### Approved Permissions:
```xml
<!-- Required for sync engine communication with production server -->
<uses-permission android:name="android.permission.INTERNET" />

<!-- Required for detecting network reconnection to trigger outbox flush -->
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- Required exclusively for gentle somatic breath-pacing haptic feedback -->
<uses-permission android:name="android.permission.VIBRATE" />
```

### Prohibited Invasive Permissions (Verified Absent):
- ❌ `android.permission.CAMERA`
- ❌ `android.permission.RECORD_AUDIO`
- ❌ `android.permission.ACCESS_FINE_LOCATION`
- ❌ `android.permission.ACCESS_COARSE_LOCATION`
- ❌ `android.permission.READ_CONTACTS`
- ❌ `com.google.android.gms.permission.AD_ID` (Zero advertising ID collection)

---

## 5. APK & Play Store AAB Generation

Once the project is synchronized and signed, build the binary artifacts using the Gradle wrapper inside the `android/` directory:

### 5.1 Build Standalone Release APK (For Internal Sideload Testing)
```bash
cd android
./gradlew assembleRelease
```
*Output location:* `android/app/build/outputs/apk/release/app-release.apk`

### 5.2 Build Signed Android App Bundle (For Google Play Console)
```bash
cd android
./gradlew bundleRelease
```
*Output location:* `android/app/build/outputs/bundle/release/app-release.aab`

---

## 6. Physical Device Testing Checklist

Perform this 10-point physical verification on at least one mid-range Android phone (e.g. Snapdragon 6xx / MediaTek Dimensity) and one flagship 120Hz device:

- [ ] **Frame Pacing & Performance:**
  - `Full Sanctuary` mode sustains stable 60fps on Three.js Celestial Lotus without thermal throttling after 10 minutes.
  - `Gentle` and `Low Stimulus` modes throttle or suspend 3D rendering to preserve battery (< 30fps / static canvas).
- [ ] **Audio Lifecycle Management:**
  - Ambient soundscapes in `/calm-studio` smoothly pause when the device screen is locked or during incoming telephone calls, and resume cleanly without audio glitches.
- [ ] **Virtual Keyboard Panning:**
  - Opening the Gboard virtual keyboard in `/companion` (chat) or `/check-in` does not obscure the active input field or break the bottom navigation bar.
- [ ] **Hardware Back-Button:**
  - Pressing the Android hardware back button from `/companion`, `/garden`, `/check-in`, `/journey`, or `/settings` navigates back to `/home`.
  - Pressing back on `/home` minimizes the application cleanly without crashes.
- [ ] **Offline-to-Online Outbox Flush:**
  1. Toggle **Airplane Mode ON**.
  2. Complete an emotional check-in and add a Star Jar note in `/home`.
  3. Verify data persists instantly in IndexedDB and is queued in `lumina_sync_outbox`.
  4. Toggle **Airplane Mode OFF**.
  5. Verify `SyncEngine` auto-detects reconnection and successfully pushes delta to `/api/sync` without duplicate rows.
- [ ] **Safe-Area Inset Handling:**
  - Status bar clock and camera punch-hole notch do not overlap Sanctuary room headers.
  - Android gesture navigation pill bar does not overlap the bottom navigation tabs.
