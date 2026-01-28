# MCP Android Server Manager - Build Configuration Guide

## Overview

This document provides comprehensive guidance for production-ready Android builds of the MCP Server Manager application. The configuration includes proper versioning, SDK settings, code obfuscation, and multi-environment build profiles.

**Last Updated:** 2024
**Status:** Production Ready
**Compliance:** Google Play Store Requirements

---

## Table of Contents

1. [Android SDK Configuration](#android-sdk-configuration)
2. [Version Management](#version-management)
3. [Code Obfuscation with ProGuard](#code-obfuscation-with-proguard)
4. [Build Profiles](#build-profiles)
5. [Build Commands](#build-commands)
6. [Signing and Release](#signing-and-release)
7. [Crash Reporting Integration](#crash-reporting-integration)
8. [Troubleshooting](#troubleshooting)

---

## Android SDK Configuration

### Current Configuration

The app.json has been configured with the following Android settings:

```json
"android": {
  "versionCode": 1,
  "minSdkVersion": 23,
  "targetSdkVersion": 34,
  "compileSdkVersion": 34,
  "debuggable": false,
  "usesCleartextTraffic": false,
  "allowBackup": true,
  "proguardRules": "android/app/proguard-rules.pro",
  "buildTypes": {
    "debug": {
      "debuggable": true,
      "minifyEnabled": false
    },
    "release": {
      "debuggable": false,
      "minifyEnabled": true,
      "shrinkResources": true
    }
  }
}
```

### SDK Version Justification

| Setting | Value | Rationale |
|---------|-------|-----------|
| **minSdkVersion** | 23 (Android 6.0) | Covers 99%+ of active devices; supports modern APIs |
| **targetSdkVersion** | 34 (Android 14) | Latest Google Play Store requirement as of 2024 |
| **compileSdkVersion** | 34 | Must match targetSdkVersion for proper compilation |

### Security Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| **debuggable** | false (release) | Prevents unauthorized debugging in production |
| **usesCleartextTraffic** | false | Enforces HTTPS-only communication |
| **allowBackup** | true | Allows user data backup with encryption |

---

## Version Management

### Version Code and Name

The app uses semantic versioning combined with version codes:

**Location:** `app.json` and `package.json`

```json
{
  "version": "1.0.0",    // Semantic version (user-facing)
  "versionCode": 1       // Increment with each release
}
```

### Version Code Strategy

- **Format:** Integer incremented with each build
- **Never decremented:** Play Store enforces monotonic increase
- **Independent per platform:** Android versionCode separate from iOS
- **Build number:** Typically matches release number

### Incrementing Version Code

**For EAS Build:**

```bash
# Automatic increment (recommended)
eas build --platform android --profile production

# Manual increment (if needed)
# Edit app.json and increment "versionCode" value
# Then commit and push before building
```

### Version Naming Convention

- **Major.Minor.Patch:** `1.0.0`
- **Major:** Breaking changes
- **Minor:** New features
- **Patch:** Bug fixes

**Example progression:**
- `1.0.0` (Initial release, versionCode: 1)
- `1.0.1` (Bug fix, versionCode: 2)
- `1.1.0` (New feature, versionCode: 3)
- `2.0.0` (Breaking change, versionCode: 4)

---

## Code Obfuscation with ProGuard

### Overview

Code obfuscation protects your application intellectual property and reduces APK size. The configuration is in `android/app/proguard-rules.pro`.

### What ProGuard Does

1. **Minification:** Removes unused code and resources
2. **Obfuscation:** Renames classes, methods, fields to meaningless names
3. **Optimization:** Inlines methods and removes redundant code
4. **Shrinking:** Eliminates unused resources

### Critical Exceptions

The ProGuard configuration **preserves** critical components:

#### 1. React Native Bridge

```proguard
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.hermes.** { *; }
```

**Why:** React Native's native bridge requires unobfuscated method signatures for JNI calls.

#### 2. nodejs-mobile-react-Native

```proguard
-keep class io.github.mvayngrib.nodejs.** { *; }
-keep interface io.github.mvayngrib.nodejs.** { *; }
-keep class * implements java.lang.reflect.InvocationHandler { *; }
```

**Why:** Node.js runtime uses reflection to invoke native methods dynamically.

#### 3. Expo Modules

```proguard
-keep class expo.** { *; }
-keep class org.unimodules.** { *; }
-keep interface expo.** { *; }
```

**Why:** Expo modules use reflection to auto-discover and instantiate module interfaces.

#### 4. Android Framework Classes

```proguard
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Service
-keep public class * extends android.content.BroadcastReceiver
```

**Why:** Android framework uses reflection to instantiate these components by class name.

#### 5. Reflection-Based Code

```proguard
-keepclassmembers class * {
    public *** get*();
    public *** is*();
    public void set*(...);
}
```

**Why:** Keeps getter/setter patterns used by serialization and binding frameworks.

### Source Map Generation

ProGuard generates mapping files for crash reporting:

```
proguard-mapping.txt         // Maps obfuscated names to original
proguard-configuration.txt   // Build configuration used
proguard-usage.txt           // Unused code report
```

**Integration with Sentry:**
- Upload mapping.txt to Sentry
- Sentry will automatically deobfuscate crash stack traces
- Developers see original class/method names

### Custom Application Rules

Application-specific classes are protected:

```proguard
# MCP Server Manager entry point
-keep class com.mcpserver.manager.** { *; }

# Keep API models (used for JSON deserialization)
-keep class * {
    public <init>();
    public *** get*();
    public void set*(...);
}
```

---

## Build Profiles

### 1. Development Profile

**Purpose:** Local development with hot reloading
**Obfuscation:** Disabled
**Debug Info:** Full
**Build Type:** APK

```bash
npm run start
# or
expo run:android
```

**Features:**
- Debuggable
- Development client enabled
- Internal distribution
- Full stack traces
- Hot reload support

### 2. Preview Profile

**Purpose:** Testing on external devices (internal distribution)
**Obfuscation:** Enabled
**Debug Info:** Source maps included
**Build Type:** APK

```bash
npm run build:android
# or
eas build --platform android --profile preview
```

**Features:**
- Full code obfuscation
- Optimized for testing
- Source maps for debugging
- APK format (easier sharing)
- Internal TestFlight/Google Play

### 3. APK Profile

**Purpose:** Direct APK distribution
**Obfuscation:** Enabled
**Debug Info:** Source maps included
**Build Type:** APK

```bash
npm run build:apk
# or
eas build --platform android --profile apk
```

**Features:**
- Full code obfuscation
- Ready for manual installation
- Smaller file size than app-bundle
- Source maps included

### 4. Production Profile

**Purpose:** Google Play Store release
**Obfuscation:** Enabled
**Debug Info:** Source maps included
**Build Type:** AAB (Android App Bundle)

```bash
eas build --platform android --profile production
# or
eas build --platform android --profile production && \
eas submit --platform android --profile production
```

**Features:**
- Maximum code obfuscation
- Android App Bundle format
- Optimized for Play Store
- Asset delivery optimization
- Source maps for Sentry crash reporting

### Environment-Specific Configuration

Different build profiles use different environment variables:

```json
{
  "preview": {
    "env": {
      "APP_ENV": "preview"
    }
  },
  "production": {
    "env": {
      "APP_ENV": "production"
    }
  }
}
```

**Usage in code:**

```typescript
const APP_ENV = process.env.APP_ENV || 'development';

const config = {
  apiUrl: APP_ENV === 'production'
    ? 'https://api.mcpserver.com'
    : 'https://preview.mcpserver.com',
  enableLogging: APP_ENV === 'production' ? false : true,
  crashReporting: APP_ENV === 'production' ? true : false
};
```

---

## Build Commands

### Local Development

```bash
# Start development server
npm run start

# Run on Android device
npm run android

# Run on iOS device
npm run ios
```

### EAS Build Commands

```bash
# Build APK for testing (preview profile)
npm run build:android

# Build APK directly
npm run build:apk

# Build production AAB for Play Store
eas build --platform android --profile production

# Build with specific Expo CLI version
eas build --platform android --profile production --skip-credentials-check

# Check build status
eas build:list

# Check build logs
eas build:view <BUILD_ID>

# Download build artifact
eas build:view <BUILD_ID> --downloads
```

### Version Increment Workflow

```bash
# 1. Update version in package.json and app.json
# Edit app.json:
#   - Update "version": "X.Y.Z"
#   - Increment "android.versionCode"

# 2. Commit version change
git add app.json package.json
git commit -m "chore: bump version to X.Y.Z (versionCode: N)"

# 3. Tag release
git tag -a vX.Y.Z -m "Release version X.Y.Z"
git push origin main --tags

# 4. Build production release
eas build --platform android --profile production
```

---

## Signing and Release

### Setup Signing

EAS Build can automatically handle signing, but you can also use manual credentials:

```bash
# Configure credentials interactively
eas credentials

# Build with stored credentials
eas build --platform android --profile production
```

### Manual APK Installation

```bash
# Install preview APK
adb install preview.apk

# Uninstall before reinstalling
adb uninstall com.mcpserver.manager
adb install release.apk

# Check installation
adb shell pm list packages | grep mcpserver
```

### Play Store Release

```bash
# Requires service account key from Google Play Console
# Place google-play-key.json in project root

# Build and submit
eas build --platform android --profile production && \
eas submit --platform android --profile production

# Or submit existing build
eas submit --platform android --id <BUILD_ID>
```

**Service Account Setup:**
1. Go to Google Play Console
2. Settings → Developer account → API access
3. Create service account with Editor role
4. Download JSON key file
5. Place as `google-play-key.json` (add to .gitignore!)

---

## Crash Reporting Integration

### Sentry Configuration

The app uses Sentry for crash reporting:

```typescript
import * as Sentry from 'sentry-expo';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  enableInExpoDevelopment: false,
  environment: process.env.APP_ENV || 'development',
  tracesSampleRate: 1.0,
  denyUrls: [
    // Filter out browser extensions
    /extensions\//i,
    /^chrome:\/\//i,
  ],
});
```

### Source Map Upload

After building, upload ProGuard mappings to Sentry:

```bash
# Install Sentry CLI
npm install --save-dev @sentry/cli

# Upload mappings
sentry-cli releases files RELEASE_VERSION upload-sourcemaps \
  --android-manifest android/app/src/main/AndroidManifest.xml \
  --android-native-symbol-zip build/outputs/native-debug-symbols/release/native-debug-symbols.zip \
  proguard-mapping.txt
```

### Crash Deobfuscation

With ProGuard mappings uploaded:

1. App crashes and sends stack trace to Sentry
2. Sentry matches obfuscated class/method names to mapping file
3. Developer sees deobfuscated stack trace with original names
4. Full context for debugging

**Example:**
```
Obfuscated:  a.b.c.method(Unknown Source:1)
Deobfuscated: com.mcpserver.manager.MCP.handleError(Main.ts:42)
```

---

## ProGuard Rules Details

### Rule Categories

1. **Optimization Rules**
   - `-optimizationpasses 5` - Run optimizer 5 times
   - `-allowshrinking` - Allow code shrinking
   - `-keepattributes` - Preserve important attributes

2. **Framework Rules**
   - Keep Android components (Activity, Service, etc.)
   - Preserve callback methods
   - Keep resources

3. **Library Rules**
   - React Native bridge
   - nodejs-mobile runtime
   - Expo modules
   - Third-party libraries

4. **Application Rules**
   - Keep app entry points
   - Preserve API models
   - Keep reflection-used code

### Adding Custom Rules

If third-party library breaks after obfuscation:

```proguard
# Suppress warnings
-dontwarn com.problematic.library.**

# Keep problematic classes
-keep class com.problematic.library.** { *; }

# Keep specific methods
-keepclassmembers class com.problematic.library.* {
    public <methods>;
}
```

### Testing Obfuscation

```bash
# Build with obfuscation in preview mode
npm run build:android

# Install APK
adb install preview.apk

# Test app functionality
# Check logs for NoClassDefFoundError or MethodNotFoundException
adb logcat | grep -E "ClassNotFound|MethodNotFound"

# Review mapping file
cat android/app/build/outputs/mapping/release/mapping.txt | head -20
```

---

## Optimization Settings

### Resource Shrinking

```json
"buildTypes": {
  "release": {
    "shrinkResources": true,
    "minifyEnabled": true
  }
}
```

**Effect:**
- Removes unused PNG/XML resources
- Reduces APK size by 5-20%
- Safe - removes only truly unused resources

### Code Optimization

ProGuard configuration includes optimization:

```proguard
-optimizations !code/simplification/arithmetic,!code/simplification/cast,!field/*,!class/merging/*,code/allocation/variable
```

**Optimizations:**
- Method inlining
- Dead code elimination
- Constant propagation
- String concatenation optimization

### Build Type Optimization

| Setting | Debug | Release |
|---------|-------|---------|
| Code minification | false | true |
| Resource shrinking | false | true |
| Debuggable | true | false |
| Symbol stripping | false | true |
| ProGuard | disabled | enabled |

---

## Build Size Metrics

### Expected Sizes

| Build Type | Typical Size | Notes |
|-----------|--------------|-------|
| Debug APK | 80-120 MB | Unoptimized, full debug info |
| Release APK | 30-50 MB | Optimized, obfuscated |
| Play Bundle (AAB) | 25-40 MB | Asset delivery, further optimized |

### Size Optimization

```bash
# Analyze APK size breakdown
eas build --platform android --profile production

# Extract and inspect
unzip release.aab -d aab_contents
du -sh aab_contents/*/

# Check for duplicate libraries
cd aab_contents && find . -name "*.so" | sort
```

---

## Environment Variables

### Configuration

EAS Build passes environment variables from `eas.json`:

```json
{
  "build": {
    "production": {
      "env": {
        "APP_ENV": "production"
      }
    }
  }
}
```

### Usage in Code

```typescript
// Access in app
const environment = process.env.APP_ENV; // "production"

// Configure based on environment
const apiUrl = {
  development: 'http://localhost:3000',
  preview: 'https://preview.api.example.com',
  production: 'https://api.example.com'
}[process.env.APP_ENV || 'development'];
```

### Secrets Management

**DO NOT commit secrets to .gitignore files!**

Instead:
1. Use EAS Secrets for sensitive values
2. Reference in eas.json as `$VARIABLE_NAME`
3. Set via `eas secret:create`

```bash
# Create secret
eas secret:create --scope PROJECT --name SENTRY_DSN \
  --value https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# Use in eas.json
"env": {
  "SENTRY_DSN": "$SENTRY_DSN"
}
```

---

## Troubleshooting

### Common Build Issues

#### 1. ProGuard Errors

**Error:** `java.lang.NoClassDefFoundError`

**Cause:** ProGuard removed required class

**Solution:**
```proguard
# Add to proguard-rules.pro
-keep class com.missing.ClassName { *; }

# Rebuild
eas build --platform android --profile production --no-cache
```

#### 2. Reflection Failures

**Error:** `java.lang.NoSuchMethodException` at runtime

**Cause:** Method was obfuscated but code uses reflection

**Solution:**
```proguard
-keepclassmembers class com.YourClass {
    public *** methodName(...);
}
```

#### 3. Method Count Limit

**Error:** `Method ID not in 0...65535: xxxxxx`

**Cause:** Exceeded 65K method limit (unlikely with modern gradle)

**Solution:**
```gradle
// In build.gradle
android {
    defaultConfig {
        multiDexEnabled true
    }
}
```

#### 4. Version Code Conflicts

**Error:** `Version code must be greater than previous version`

**Cause:** Version code not incremented

**Solution:**
```json
{
  "android": {
    "versionCode": 2  // Must be > 1
  }
}
```

#### 5. SDK Version Too Low

**Error:** `Minimum required SDK is 23`

**Cause:** Device running Android 5.x or lower

**Solution:** Either:
- Update minSdkVersion only if targeting newer devices
- Support legacy devices by keeping minSdkVersion at 21

#### 6. Missing Signing Key

**Error:** `The keystore file does not exist`

**Solution:**
```bash
# Let EAS manage signing
eas credentials

# Or use existing keystore
eas build --platform android --profile production --no-wait
```

### Debug Checklist

Before production release:

- [ ] Version code incremented
- [ ] targetSdkVersion matches latest Play Store requirement
- [ ] ProGuard mappings generated
- [ ] Test app on target devices
- [ ] Verify critical features work:
  - [ ] Node.js module loads
  - [ ] Reflection-based code works
  - [ ] API calls succeed
  - [ ] File access works
  - [ ] Sentry crash reporting works
- [ ] Check ProGuard warnings
- [ ] Upload mappings to Sentry
- [ ] Test crash reporting with test crash

### Extracting and Inspecting Builds

```bash
# Download build from EAS
eas build:view <BUILD_ID> --downloads

# Inspect APK
unzip -l release.apk | head -20

# Extract files
unzip release.apk -d apk_contents

# Check for obfuscation
strings apk_contents/classes.dex | grep "a\." | head  # Should see obfuscated names

# Verify ProGuard mapping
cat proguard-mapping.txt | head -20

# Check resources
ls -la apk_contents/res/
```

---

## Performance Metrics

### Build Time

Expected build times on EAS:

| Profile | Typical Time | Notes |
|---------|--------------|-------|
| Development | 8-12 min | Cached builds faster |
| Preview | 10-15 min | Full optimization |
| Production | 12-18 min | Final optimization pass |

### APK Installation Time

After building:

```bash
# Install and measure
time adb install -r release.apk

# Typical: 5-15 seconds depending on device
```

### First Launch Performance

After installation:

- First launch may be slow (1-2 sec) while system optimizes
- Subsequent launches normal (< 1 sec)
- ProGuard optimization improves runtime performance

---

## Compliance and Best Practices

### Google Play Store Requirements

✓ targetSdkVersion: 34 (current requirement)
✓ 64-bit support (required)
✓ Permissions declared in manifest
✓ Privacy policy linked
✓ Content rating questionnaire
✓ minSdkVersion: 21 or higher (recommended)

### Security Best Practices

✓ usesCleartextTraffic: false (HTTPS only)
✓ Code obfuscated (ProGuard enabled)
✓ Debuggable: false in production
✓ Source maps for crash reporting
✓ Dependencies regularly updated
✓ Security scanning in CI/CD

### Privacy Compliance

✓ Declare all requested permissions
✓ Request runtime permissions properly
✓ No sensitive data in logs
✓ Privacy policy available
✓ GDPR/CCPA compliance if applicable

---

## Next Steps

1. **Build and Test Locally**
   ```bash
   npm run build:android
   adb install preview.apk
   # Test thoroughly
   ```

2. **Internal Testing**
   ```bash
   eas build --platform android --profile preview
   # Share APK with internal testers
   ```

3. **Beta Release**
   ```bash
   eas build --platform android --profile production
   eas submit --platform android --profile production
   # Release to Play Store internal testing track
   ```

4. **Production Release**
   ```bash
   # After testing on beta track
   # Promote in Play Console to production
   # Monitor crash reports via Sentry
   ```

---

## References

- [Android Documentation - Versioning](https://developer.android.com/studio/publish/versioning)
- [Google Play Store - Policies](https://play.google.com/about/developer-content-policy/)
- [ProGuard Documentation](https://www.guardsquare.com/proguard/manual)
- [EAS Build Documentation](https://docs.expo.dev/build/overview/)
- [React Native - Code Obfuscation](https://reactnative.dev/docs/release-builds#obfuscation)
- [Sentry Documentation](https://docs.sentry.io/)

---

## Support and Questions

For issues or questions:
1. Check ProGuard logs in build output
2. Review Sentry crash reports
3. Consult EAS Build documentation
4. Test on physical device before release
5. Increment version code for each attempt

