# Quick Build Reference - MCP Android Server Manager

## At a Glance

**Current Version:** 1.0.0 (versionCode: 1)
**Min SDK:** 23 (Android 6.0+)
**Target SDK:** 34 (Android 14)
**Obfuscation:** Enabled (ProGuard)
**Status:** ✓ Production Ready

---

## Build Commands

```bash
# Development (local, hot reload)
npm run start

# Run on Android device
npm run android

# Preview (EAS, internal testing, with obfuscation)
npm run build:android

# Direct APK (testing/distribution)
npm run build:apk

# Production (Google Play Store)
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android --profile production
```

---

## Version Increment Process

```bash
# 1. Update versions in two files:
#    app.json: "version": "X.Y.Z", "versionCode": N
#    package.json: "version": "X.Y.Z"

# 2. Verify changes
git diff app.json package.json

# 3. Commit
git commit -m "chore: bump to X.Y.Z (versionCode: N)"

# 4. Tag
git tag -a vX.Y.Z -m "Release X.Y.Z"

# 5. Push
git push origin main
git push origin vX.Y.Z

# 6. Build
eas build --platform android --profile production
```

---

## Version Code Rules

⚠️ **CRITICAL:** Version code must ALWAYS increment

```
1.0.0 → versionCode: 1
1.0.1 → versionCode: 2  (increment by 1)
1.1.0 → versionCode: 3  (increment by 1)
2.0.0 → versionCode: 4  (increment by 1)
```

Never:
- Decrease versionCode
- Keep same versionCode for different releases
- Skip version codes

---

## Key Files

| File | Purpose | Status |
|------|---------|--------|
| app.json | Version, SDK, ProGuard config | ✓ Updated |
| eas.json | Build profiles, environments | ✓ Updated |
| android/app/proguard-rules.pro | Code obfuscation rules | ✓ Created (388 lines) |
| .gitignore | Build artifacts exclusion | ✓ Updated |

---

## Build Profiles

### Development
- `npm run start` or `expo run:android`
- No obfuscation, full debugging
- Hot reload enabled
- Internal distribution

### Preview
- `npm run build:android`
- With obfuscation
- For internal testing
- APK format

### Production
- `eas build --platform android --profile production`
- Full obfuscation
- AAB (App Bundle) format
- Google Play Store

---

## SDK Versions Explained

| Setting | Value | Why |
|---------|-------|-----|
| minSdkVersion | 23 | Android 6.0+, 99%+ device coverage |
| targetSdkVersion | 34 | Latest, Google Play requirement |
| compileSdkVersion | 34 | Must match target |

---

## ProGuard Protection

### Protected (NOT Obfuscated)
- ✓ React Native bridge
- ✓ nodejs-mobile runtime
- ✓ Expo modules
- ✓ Android framework
- ✓ Hermes engine

### Obfuscated (YOUR CODE)
- Your app classes
- Your business logic
- Unused code (removed)
- Unused resources (removed)

### Source Maps
- Generated: proguard-mapping.txt
- Upload to Sentry for crash deobfuscation
- Developers see original names in crashes

---

## Environment Variables

```typescript
// In code
const env = process.env.APP_ENV;

// Values by profile
Development: undefined (defaults to 'development')
Preview:    'preview'
Production: 'production'

// Use for configuration
const apiUrl = {
  development: 'http://localhost:3000',
  preview: 'https://preview.api.example.com',
  production: 'https://api.example.com'
}[env || 'development'];
```

---

## Common Issues

### ❌ Version Code Not Incremented
```
Error: Version code must be greater than previous version
Solution: In app.json, increment android.versionCode
```

### ❌ ProGuard Removes Required Class
```
Error: java.lang.NoClassDefFoundError
Solution: Add to proguard-rules.pro:
-keep class com.example.ClassName { *; }
```

### ❌ Reflection-Based Code Breaks
```
Error: java.lang.NoSuchMethodException
Solution: Add to proguard-rules.pro:
-keepclassmembers class com.example.Class {
    public *** methodName(...);
}
```

---

## Pre-Release Checklist (Fast)

- [ ] Version code incremented
- [ ] app.json updated with version
- [ ] package.json updated with version
- [ ] Development build tested
- [ ] Preview build tested
- [ ] App works after obfuscation
- [ ] ProGuard mapping file generated
- [ ] Crash reporting configured
- [ ] Ready to submit

---

## Build Size Expectations

| Type | Size | Notes |
|------|------|-------|
| Debug APK | 80-120 MB | Development, unoptimized |
| Release APK | 30-50 MB | Optimized, obfuscated |
| Play Bundle (AAB) | 25-40 MB | Further optimized |

Reduction: 40-70% smaller than debug build

---

## Signing Setup

```bash
# Configure credentials (one-time)
eas credentials

# Then builds are automatically signed
eas build --platform android --profile production
```

No need to manage keystore files manually - EAS handles it.

---

## Play Store Submission

### Service Account (Optional but Recommended)

```bash
# Place google-play-key.json in project root
# (Add to .gitignore - don't commit!)

# Then auto-submit:
eas submit --platform android --profile production
```

### Manual Submission

1. Download AAB from EAS Build
2. Upload to Google Play Console
3. Add release notes
4. Submit for review

---

## Deployment Workflow

```
1. Code Changes
   ↓
2. Increment Version (app.json + package.json)
   ↓
3. Commit & Tag
   ↓
4. Build Preview
   npm run build:android
   Test: adb install preview.apk
   ↓
5. Build Production
   eas build --platform android --profile production
   ↓
6. Submit
   eas submit --platform android --profile production
   ↓
7. Monitor
   Check Play Store review status
   Watch Sentry crash reports
   ↓
8. Release
   Approve for production in Play Console
```

---

## Documentation References

| Document | Purpose | Read When |
|----------|---------|-----------|
| BUILD_CONFIGURATION.md | Comprehensive guide | Planning release |
| PRODUCTION_BUILD_CHECKLIST.md | Pre-release checklist | Before submitting |
| VERSION_MANAGEMENT.md | Version strategy | Managing versions |
| BUILD_ENV_PLUGIN_GUIDE.md | Environment config | Setting up envs |
| PRODUCTION_DEPLOYMENT_SUMMARY.md | Overview of all changes | Getting started |

---

## Key Gradle Commands

```bash
# Debug build
./gradlew :app:assembleDebug

# Release build
./gradlew :app:assembleRelease

# Bundle for Play Store
./gradlew :app:bundleRelease

# Clean build
./gradlew clean build
```

**Used by:** EAS Build automatically (no need to run manually)

---

## Sentry Crash Reporting

### Setup
```typescript
import * as Sentry from 'sentry-expo';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  environment: process.env.APP_ENV,
});
```

### Upload Mappings (After Build)
```bash
sentry-cli releases files <VERSION> upload-sourcemaps \
  proguard-mapping.txt
```

### Result
- Crashes deobfuscated automatically
- Stack traces show original class/method names
- Full debugging context

---

## Device Testing

Before release, test on:
- [ ] Minimum SDK version: Android 6.0 (API 23)
- [ ] Target SDK version: Android 14 (API 34)
- [ ] Various device sizes
- [ ] Physical device (not just emulator)
- [ ] Low network/memory conditions

---

## Google Play Store Requirements

✓ targetSdkVersion: 34 (current requirement)
✓ 64-bit support (automatic)
✓ Permissions declared (in app.json)
✓ Privacy policy (required)
✓ Content rating (required)
✓ minSdkVersion: 23 (minimum 21)

---

## Build Size Optimization Tips

1. **ProGuard enabled** - Removes unused code (included)
2. **Shrink resources** - Removes unused assets (enabled)
3. **Code splitting** - Not needed for most apps
4. **Use WebP for images** - Smaller than PNG/JPG
5. **Compress native libraries** - Done by AAB format

---

## Common Commands Cheat Sheet

```bash
# Show current version
cat package.json | grep version

# Show version code
cat app.json | grep versionCode

# Check app on device
adb shell dumpsys package com.mcpserver.manager | grep version

# View recent builds
eas build:list

# Download artifact
eas build:view <BUILD_ID> --downloads

# Check build logs
eas build:view <BUILD_ID>

# List available profiles
cat eas.json | grep -E '"[a-z]+":'

# Test install
adb install -r release.apk

# Uninstall
adb uninstall com.mcpserver.manager
```

---

## Environment-Specific Configuration

### Development
```bash
npm run start
# No environment variable (defaults to development)
# Connect to local server
# Full logging, debug features enabled
```

### Preview
```bash
npm run build:android
# APP_ENV=preview (from eas.json)
# Connects to preview server
# Code obfuscated, for testing
```

### Production
```bash
eas build --platform android --profile production
# APP_ENV=production (from eas.json)
# Connects to production server
# Full obfuscation, source maps
```

---

## Troubleshooting Quick Answers

**"Where do I update version?"**
→ Both app.json and package.json (version field + versionCode)

**"What happens with ProGuard?"**
→ Code obfuscated (smaller APK), but your classes protected

**"Do I need to sign the APK?"**
→ No, EAS handles it automatically after you run `eas credentials`

**"How do I test after obfuscation?"**
→ Install the APK and test all features work

**"How do I update to production?"**
→ `eas build --platform android --profile production`

**"What if something breaks in production?"**
→ Check Sentry crash reports, create hotfix, increment version code

---

## Success Indicators

✓ App launches on test device
✓ All features work after obfuscation
✓ ProGuard mapping file generated
✓ No NoClassDefFoundError exceptions
✓ Sentry receives crashes (deobfuscated)
✓ Version code increments correctly
✓ APK size reduced by 40%+ from debug

---

## Emergency Rollback

If critical issues found after release:

```bash
# 1. Pause rollout in Play Console
# 2. Assess issue severity
# 3. Fix code (if needed)
# 4. Increment version code
# 5. Build new release
eas build --platform android --profile production
# 6. Re-submit
eas submit --platform android --profile production
```

---

## Next Actions

1. ✓ Review this file
2. → Read BUILD_CONFIGURATION.md for details
3. → Test local development build
4. → Test preview build with obfuscation
5. → Create production release
6. → Monitor Sentry crash reports

---

**Last Updated:** January 2024
**Status:** Production Ready
**Version:** 1.0.0 (versionCode: 1)

For detailed information, see the comprehensive guides in mcpandroid/ directory.

