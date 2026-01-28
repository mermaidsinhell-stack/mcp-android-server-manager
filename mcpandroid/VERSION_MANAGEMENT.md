# Version Management - MCP Android Server Manager

## Overview

This document explains the versioning strategy for MCP Android Server Manager, including semantic versioning for users and version codes for Android build systems.

---

## Semantic Versioning (User-Facing)

The app uses **Semantic Versioning 2.0.0** format: `MAJOR.MINOR.PATCH`

### Format: X.Y.Z

- **X (Major):** Breaking changes, significant features, major UI overhaul
- **Y (Minor):** New features, backward compatible functionality
- **Z (Patch):** Bug fixes, minor improvements, no new features

### Current Version

Location: `/mcpandroid/package.json` and `/mcpandroid/app.json`

```json
{
  "version": "1.0.0"
}
```

### Examples

| Version | Type | Changes |
|---------|------|---------|
| 1.0.0 | Initial | First public release |
| 1.0.1 | Patch | Bug fix in Node.js module loading |
| 1.1.0 | Minor | Add new MCP protocol version support |
| 1.1.1 | Patch | Performance improvement |
| 2.0.0 | Major | Complete UI redesign, API breaking change |
| 2.0.1 | Patch | Fix crash in new UI |
| 2.1.0 | Minor | Add settings page |

---

## Android Version Code (Build System)

The app uses **integer version codes** that **monotonically increase** with each build/release.

### Format: Integer (1, 2, 3, ...)

- **Range:** 1 to 2,147,483,647
- **Requirement:** Must always increase, never decrease
- **Independent:** Android and iOS use separate version codes
- **Automatic:** EAS Build can auto-increment, or manual increment

### Current Version Code

Location: `/mcpandroid/app.json`

```json
{
  "android": {
    "versionCode": 1
  }
}
```

### Version Code Mapping

This is the recommended mapping between semantic version and version code:

```
Semantic Version    →    Android Version Code
1.0.0              →    1
1.0.1              →    2
1.1.0              →    3
1.1.1              →    4
2.0.0              →    5
2.0.1              →    6
2.1.0              →    7
```

**Rule:** Each build increment increases version code by 1

---

## Where to Update Versions

### 1. package.json (npm version)

**File:** `/mcpandroid/package.json`

```json
{
  "version": "1.0.0"
}
```

**When to update:** With every release
**Format:** X.Y.Z (semantic version)

### 2. app.json (Expo configuration)

**File:** `/mcpandroid/app.json`

Contains both semantic version and platform-specific version codes:

```json
{
  "expo": {
    "version": "1.0.0",
    "android": {
      "versionCode": 1
    },
    "ios": {
      "buildNumber": "1"
    }
  }
}
```

**Update:**
- `version`: Semantic version (must match package.json)
- `android.versionCode`: Integer, always increment
- `ios.buildNumber`: String version of versionCode

### 3. eas.json (Build profiles)

**File:** `/mcpandroid/eas.json`

Build profiles reference app.json for versions:

```json
{
  "cli": {
    "appVersionSource": "local"
  }
}
```

**appVersionSource: "local"** means EAS reads version from app.json

---

## Version Increment Workflow

### Step 1: Determine Version Type

Decide what changed:

| Type | Example | Increment |
|------|---------|-----------|
| **Bug fix only** | Fix Node.js loading crash | Patch (Z) |
| **New feature** | Add new server command | Minor (Y) |
| **Breaking change** | Change API protocol | Major (X) |

### Step 2: Update Files

```bash
# Edit package.json
# Change "version": "1.0.0" to "1.0.1"
```

```bash
# Edit app.json
# Change "version": "1.0.0" to "1.0.1"
# Change "android.versionCode": 1 to 2
# Change "ios.buildNumber": "1" to "2"
```

### Step 3: Commit Changes

```bash
git add app.json package.json
git commit -m "chore: bump version to 1.0.1 (versionCode: 2)"
```

### Step 4: Create Git Tag

```bash
git tag -a v1.0.1 -m "Release version 1.0.1"
git push origin main
git push origin v1.0.1
```

### Step 5: Build and Release

```bash
# Build production release
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android --id <BUILD_ID>
```

### Step 6: Update Changelog

Create release notes in GitHub:

```
## Version 1.0.1

### Bug Fixes
- Fixed Node.js module not loading on some devices
- Improved error messaging for connection failures

### Performance
- Reduced startup time by 500ms

### Compatibility
- Tested on Android 6.0 to Android 14
```

---

## Practical Examples

### Example 1: Patch Release (Bug Fix)

**Scenario:** Critical bug in network handling

```bash
# Current: 1.0.0 (versionCode: 1)
# New: 1.0.1 (versionCode: 2)

# app.json changes:
"version": "1.0.1"
"versionCode": 2

# package.json changes:
"version": "1.0.1"

# Commit
git commit -m "chore: bump to 1.0.1 (versionCode: 2)

Fix network timeout on low bandwidth connections"
```

### Example 2: Minor Release (New Feature)

**Scenario:** Add new settings page

```bash
# Current: 1.0.0 (versionCode: 1)
# New: 1.1.0 (versionCode: 2)

# app.json changes:
"version": "1.1.0"
"versionCode": 2

# package.json changes:
"version": "1.1.0"

# Commit
git commit -m "feat: add settings page (v1.1.0, versionCode: 2)

- Add app settings UI
- Add preference storage
- Add theme toggle"
```

### Example 3: Major Release (Breaking Change)

**Scenario:** Complete rewrite for new protocol

```bash
# Current: 1.5.3 (versionCode: 7)
# New: 2.0.0 (versionCode: 8)

# app.json changes:
"version": "2.0.0"
"versionCode": 8

# package.json changes:
"version": "2.0.0"

# Commit
git commit -m "chore!: major version bump to 2.0.0 (versionCode: 8)

BREAKING CHANGE: Requires new MCP server v2.0+
- Complete UI redesign
- New protocol implementation
- Improved performance"
```

---

## Version Code Strategy

### Why Version Codes Matter

Google Play Store **requires**:
1. Version code must always increase
2. Cannot decrease or stay same
3. Required for updating existing installation
4. Used internally by system for update detection

### Common Mistakes

❌ **Mistake 1:** Not incrementing version code
```json
// WRONG: Can't submit to Play Store
{
  "version": "1.0.1",
  "versionCode": 1  // Should be 2
}
```

❌ **Mistake 2:** Decreasing version code
```bash
# WRONG: Play Store will reject
Version 1.0.0 → versionCode: 5
Version 1.0.1 → versionCode: 3  // Must be > 5
```

❌ **Mistake 3:** Same version code for different builds
```bash
# WRONG: Can't upload both
Build 1: v1.0.0 (versionCode: 1)
Build 2: v1.0.1 (versionCode: 1)  // Must differ
```

### Best Practices

✓ **Always increment** version code
✓ **Never reuse** version codes
✓ **One version code per release** to Play Store
✓ **Keep mapping** of version to versionCode in release notes

### Version Code Reservation

Keep track of used version codes:

| Release | Semantic | versionCode | Status |
|---------|----------|-------------|--------|
| Initial | 1.0.0 | 1 | Released |
| Hotfix | 1.0.1 | 2 | Released |
| Feature | 1.1.0 | 3 | Released |
| Hotfix | 1.1.1 | 4 | Released |
| Major | 2.0.0 | 5 | Released |
| Next | 2.0.1 | 6 | Ready |

---

## Automated Version Management

### EAS Auto-Increment

EAS Build can auto-increment version code:

**Enable in eas.json:**
```json
{
  "cli": {
    "appVersionSource": "appJson",
    "autoIncrement": true
  }
}
```

**How it works:**
1. Each build auto-increments versionCode
2. Semantic version stays as you set it
3. Useful for multiple builds per version

**Caution:** Review before submitting to Play Store

### Manual Increment (Recommended)

Manually updating gives you control:

```bash
# 1. Edit app.json and package.json
# 2. Verify changes
git diff app.json package.json

# 3. Commit with clear message
git commit -m "chore: bump version to X.Y.Z (versionCode: N)"

# 4. Tag
git tag -a vX.Y.Z -m "Release version X.Y.Z"

# 5. Build
eas build --platform android --profile production
```

---

## iOS Version Code (build number)

While this guide focuses on Android, iOS uses a similar system:

**File:** `/mcpandroid/app.json`

```json
{
  "ios": {
    "buildNumber": "1"
  }
}
```

**Recommendation:** Match Android versionCode

```json
{
  "android": {
    "versionCode": 5
  },
  "ios": {
    "buildNumber": "5"  // Same number
  }
}
```

---

## Version History Template

Create a `VERSIONS.md` file to track all releases:

```markdown
# Version History

## 2.0.0 (versionCode: 5)
**Released:** 2024-06-15
- Major UI redesign
- New MCP v2.0 protocol support
- Breaking: Requires MCP server v2.0+

## 1.1.1 (versionCode: 4)
**Released:** 2024-05-20
- Fix: Settings not saving on some devices
- Improvement: Better error messages

## 1.1.0 (versionCode: 3)
**Released:** 2024-05-10
- Feature: Add settings page
- Feature: Theme customization
- Fix: Connection timeout issues

## 1.0.1 (versionCode: 2)
**Released:** 2024-04-25
- Fix: Node.js module loading error
- Fix: Memory leak on app backgrounding

## 1.0.0 (versionCode: 1)
**Released:** 2024-04-15
- Initial public release
```

---

## Pre-Release Checklist

Before incrementing version:

- [ ] All features completed
- [ ] All bugs fixed
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Changelog updated
- [ ] Version number decided (Major/Minor/Patch)
- [ ] Release notes written
- [ ] Build tested locally

Before committing version change:

- [ ] Correct semantic version set
- [ ] Version code incremented
- [ ] Both app.json and package.json updated
- [ ] Commit message is clear
- [ ] Tag will be created

Before submitting to Play Store:

- [ ] Version code is higher than previous
- [ ] All features work in release build
- [ ] ProGuard obfuscation working
- [ ] Crash reporting functional
- [ ] Source maps captured
- [ ] Release notes prepared

---

## Reverting a Version

If you need to revert a version change:

```bash
# Undo local changes
git checkout app.json package.json

# Or undo last commit
git revert HEAD

# Remove tag if already created
git tag -d vX.Y.Z
git push origin --delete vX.Y.Z
```

**Important:** Never submit with reverted version to Play Store.

---

## Monitoring Versions in Production

### Check Current Version

```bash
# Get version from Play Store
adb shell dumpsys package com.mcpserver.manager | grep versionName

# Output: versionName=1.0.0

# Get version code
adb shell dumpsys package com.mcpserver.manager | grep versionCode

# Output: versionCode=1
```

### Version Analytics

In Google Play Console:
1. Go to Statistics
2. Installs by version
3. Monitor active versions
4. Track migration to new versions

### Crash Reporting by Version

In Sentry:
1. Filter crashes by release
2. Compare version crash rates
3. Identify version-specific issues

---

## References

- [Semantic Versioning](https://semver.org/)
- [Android Version Codes](https://developer.android.com/studio/publish/versioning)
- [EAS Version Management](https://docs.expo.dev/build/version/)
- [Google Play - Version Codes](https://support.google.com/googleplay/answer/10205399)

---

## Quick Reference

### Files to Update
- `/mcpandroid/package.json` - npm version
- `/mcpandroid/app.json` - expo version and versionCode

### Commands
```bash
# Check current version
cat package.json | grep version
cat app.json | grep -E "version|versionCode"

# Build with new version
eas build --platform android --profile production

# Check app version on device
adb shell dumpsys package com.mcpserver.manager | grep version
```

### Version Code Increment
Every release to Play Store needs new versionCode:
- 1.0.0 → versionCode: 1
- 1.0.1 → versionCode: 2 (increment by 1)
- 1.1.0 → versionCode: 3 (increment by 1)

Never:
- Decrease versionCode
- Reuse versionCode
- Skip version codes

---

**Last Updated:** 2024
**Owner:** Development Team
**Review Frequency:** With each release

