# MCP Android Server Manager - Deployment Checklist

Complete this checklist before submitting to Google Play Store.

---

## Pre-Deployment Phase (Week 1-2)

### Configuration Setup
- [ ] Update `app.json` with SDK versions and permissions
- [ ] Update `eas.json` with all build profiles
- [ ] Create `.env.development`, `.env.staging`, `.env.production`
- [ ] Create `src/config/environment.ts` module
- [ ] Update Sentry configuration with actual DSN
- [ ] Add privacy policy URL to app.json

### Android Credentials
- [ ] Generate Android keystore (`mcp-server-manager.keystore`)
- [ ] Save keystore password securely (NOT in git)
- [ ] Create Google Play Service Account
- [ ] Download `credentials.json` from Play Console
- [ ] Save credentials securely (NOT in git)

### GitHub Setup
- [ ] Create GitHub Secrets:
  - [ ] `EXPO_TOKEN` - Expo CLI authentication
  - [ ] `SENTRY_DSN` - Sentry crash reporting
  - [ ] `SENTRY_AUTH_TOKEN` - Sentry authentication
  - [ ] `PLAY_STORE_CREDENTIALS` - Play Store API key (base64)
  - [ ] `KEYSTORE_B64` - Android keystore (base64)
  - [ ] `KEYSTORE_PASSWORD` - Keystore password
  - [ ] `KEY_ALIAS_PASSWORD` - Key password
- [ ] Verify secrets are set:
  ```bash
  gh secret list
  ```

### Build Configuration
- [ ] Create `android/app/proguard-rules.pro` with R8 rules
- [ ] Update `scripts/bump-version.js` (if using)
- [ ] Test build scripts locally:
  ```bash
  npm run build:android    # Preview APK
  npm run build:staging    # Staging AAB
  ```

---

## Build & Testing Phase (Week 2-3)

### Local Testing
- [ ] Install Node.js dependencies:
  ```bash
  npm install
  ```
- [ ] Run linter and type checker:
  ```bash
  npm run lint
  npx tsc --noEmit
  ```
- [ ] Test development build:
  ```bash
  npx expo start --android
  ```

### Preview Build (APK)
- [ ] Build preview APK:
  ```bash
  npm run build:android
  ```
- [ ] Download APK artifact from EAS
- [ ] Install on test device:
  ```bash
  adb install -r preview.apk
  ```
- [ ] Test on device (multiple API levels if possible):
  - [ ] App launches successfully
  - [ ] Screens render correctly
  - [ ] Navigation works
  - [ ] Add MCP server functionality
  - [ ] Start/stop server operations
  - [ ] Handle error scenarios
  - [ ] Node.js bridge initializes

### Device Testing (Physical Devices)
- [ ] Test on Android 13 (API 33) device
- [ ] Test on Android 14 (API 34) device
- [ ] Test on device with low storage
- [ ] Test on device with low RAM
- [ ] Test with poor network connection
- [ ] Test Node.js runtime stability
- [ ] Monitor battery consumption
- [ ] Check memory usage (should stay < 500MB)

### Crash Reporting
- [ ] Verify Sentry is receiving crashes
- [ ] Test error boundary by triggering intentional error
- [ ] Check breadcrumbs are being recorded
- [ ] Verify tags are set correctly

---

## Store Assets Phase (Week 3)

### Create Graphics Assets
- [ ] Create app icon (512x512 PNG, RGB)
  - [ ] Icon is recognizable at 192x192
  - [ ] Icon is recognizable at 48x48
  - [ ] No rounded corners (Android handles this)
  - [ ] Save in `assets/icon.png`

- [ ] Create feature graphic (1024x500 PNG)
  - [ ] Text is readable at full size
  - [ ] Follows app branding
  - [ ] Save for Play Store upload

- [ ] Create screenshots (1080x1920 PNG each)
  - [ ] Main screen (server list)
  - [ ] Add server screen
  - [ ] Server details screen
  - [ ] Server running state
  - [ ] Error state
  - [ ] Settings/permissions
  - [ ] At least 5-8 total
  - [ ] Text is readable
  - [ ] No sensitive information visible

- [ ] Create splash screen (1080x2340 PNG)
  - [ ] App logo centered
  - [ ] Brand colors
  - [ ] No text (Expo handles this)

### App Description & Text
- [ ] Write app title (50 characters max)
  ```
  "MCP Server Manager" ✓
  ```

- [ ] Write app description (4000 characters max)
  ```
  Features:
  - Run any GitHub MCP server on your phone
  - Embedded Node.js runtime
  - Beautiful brutalist UI
  - Network-accessible server
  - One-touch server management

  Requirements:
  - Android 13+
  - Internet connection
  - 50MB free storage
  ```

- [ ] Write short description (80 characters max)
  ```
  "Run MCP servers on your Android phone"
  ```

- [ ] Write release notes for version 1.0.0
  ```
  Initial Release:
  - Full MCP server support
  - GitHub repository integration
  - Network connectivity via Tailscale
  - Crash reporting with Sentry
  ```

### Privacy & Legal
- [ ] Create privacy policy page
  ```
  https://www.example.com/privacy
  ```
  Address:
  - Data collection: None (local processing)
  - Crash reporting: Sentry (anonymous)
  - Network requests: GitHub API only
  - Storage: Local device only
  - Permissions usage: Explained

- [ ] Create terms of service (optional)
  ```
  https://www.example.com/terms
  ```

- [ ] Content rating questionnaire
  - Violence: None
  - Sexual content: None
  - Substance use: None
  - Profanity: None
  - Gambling: None

- [ ] Target audience
  - [ ] Minimum age: 12+
  - [ ] Audience: Developers, power users

### Store Metadata
- [ ] App category: Tools
- [ ] Content rating: 3+ (PEGI) or 4+ (ESRB)
- [ ] Requires Android: 13.0 and up
- [ ] Supports tablets: No (or verify UI scaling)

---

## Google Play Setup Phase (Week 3)

### Developer Account
- [ ] Register Google Play developer account ($25)
- [ ] Verify payment method
- [ ] Agree to developer agreement
- [ ] Set up app signing certificate in Play Console

### App Signing
- [ ] Upload signing certificate to Play Console
- [ ] Enable App Signing by Google Play
- [ ] Download SHA-1 and SHA-256 fingerprints

### Play Console Configuration
- [ ] Create app entry
- [ ] Set app name
- [ ] Set default language: English
- [ ] Set app category: Tools
- [ ] Set content rating
- [ ] Fill in all required fields
- [ ] Add support email
- [ ] Add privacy policy URL
- [ ] Configure app accessibility
- [ ] Set up internal test track

---

## Version Management Phase (Week 3-4)

### Version Numbering
- [ ] Current version: 1.0.0
- [ ] Current versionCode: 1
- [ ] Version string in package.json matches app.json
- [ ] versionCode properly incremented (never go backwards)

### Version Bumping (Before Production)
- [ ] For patch release:
  ```bash
  npm run version:patch  # 1.0.0 -> 1.0.1, versionCode: 1 -> 2
  ```

- [ ] For minor release:
  ```bash
  npm run version:minor  # 1.0.0 -> 1.1.0, versionCode: 1 -> 100
  ```

- [ ] For major release:
  ```bash
  npm run version:major  # 1.0.0 -> 2.0.0, versionCode: 1 -> 1000
  ```

### Git Version Management
- [ ] Create git tag:
  ```bash
  git tag -a v1.0.0 -m "Release 1.0.0"
  ```

- [ ] Push tag:
  ```bash
  git push origin v1.0.0
  ```

---

## Testing Phase (Week 4)

### Quality Assurance Testing
- [ ] Core functionality:
  - [ ] Add MCP server works
  - [ ] Remove server works
  - [ ] Start server completes successfully
  - [ ] Stop server completes successfully
  - [ ] Server status updates correctly
  - [ ] Server logs display correctly

- [ ] Error handling:
  - [ ] Network error handling
  - [ ] Invalid server repository error
  - [ ] Insufficient storage error
  - [ ] Node.js runtime crash recovery
  - [ ] Graceful permission denial handling

- [ ] Performance:
  - [ ] App startup < 3 seconds
  - [ ] Server clone < 10 minutes
  - [ ] Server start < 5 seconds
  - [ ] UI remains responsive during operations
  - [ ] No memory leaks (memory stable over time)

- [ ] Security:
  - [ ] Sensitive data not logged
  - [ ] No hardcoded credentials
  - [ ] Code obfuscation applied (R8)
  - [ ] No debug symbols in release build

- [ ] Compatibility:
  - [ ] Tested on Android 13 (API 33)
  - [ ] Tested on Android 14 (API 34)
  - [ ] Works on 4-6 inch phones
  - [ ] Works on tablets (verify scaling)
  - [ ] Both portrait and landscape

### Automated Testing
- [ ] GitHub Actions workflow runs:
  - [ ] Linter passes
  - [ ] Type checker passes
  - [ ] Build completes successfully
  - [ ] No warnings in build

### Beta Testing (Internal)
- [ ] Deploy to internal testing track
- [ ] Invite 10-20 testers
- [ ] Collect feedback for 48-72 hours
- [ ] Address critical bugs only
- [ ] Document known limitations

---

## Pre-Production Build (Week 4)

### Staging Build
- [ ] Build staging AAB:
  ```bash
  npm run build:staging
  ```

- [ ] Upload to Play Console internal testing track
- [ ] Verify app installs and runs
- [ ] Check versionCode (should increment)
- [ ] Verify all permissions requested correctly

### Production Build Preparation
- [ ] Finalize all copy and assets
- [ ] Final code review
- [ ] Verify all secrets are configured
- [ ] Double-check privacy policy URL
- [ ] Verify no test/dummy content remains

---

## Production Deployment (Week 5)

### Build Production Release
- [ ] Bump version to 1.0.0 (if not already):
  ```bash
  npm run version:minor
  ```

- [ ] Commit version bump:
  ```bash
  git commit -am "Release v1.0.0"
  ```

- [ ] Tag release:
  ```bash
  git tag -a v1.0.0 -m "Release 1.0.0"
  ```

- [ ] Build production AAB:
  ```bash
  npm run build:production
  ```

- [ ] Wait for EAS build to complete
- [ ] Verify AAB was created successfully

### Staged Rollout Strategy

#### Stage 1: Internal Testing (24 hours)
- [ ] Submit to internal testing track
- [ ] Verify app installs correctly
- [ ] Verify all screens render properly
- [ ] Verify crash reporting works (trigger test crash)
- [ ] Monitor for any crashes
- [ ] Check error rate in Sentry

#### Stage 2: Alpha Release (2-3 days, 10% users)
- [ ] Expand to 10% rollout
- [ ] Monitor crash rate (should be < 0.1%)
- [ ] Monitor ANR rate (should be < 0.05%)
- [ ] Check app review and ratings
- [ ] Address any critical issues

#### Stage 3: Beta Release (2-3 days, 25% users)
- [ ] Expand to 25% rollout
- [ ] Monitor metrics continue to be healthy
- [ ] Collect user feedback
- [ ] Address non-critical issues

#### Stage 4: Wider Beta (2-3 days, 50% users)
- [ ] Expand to 50% rollout
- [ ] Final monitoring and validation
- [ ] Prepare for full rollout

#### Stage 5: Full Release (100% users)
- [ ] Expand to 100% rollout
- [ ] Monitor for 48 hours
- [ ] Create GitHub release with notes
- [ ] Announce in relevant channels

### Monitoring During Rollout
- [ ] Check Sentry dashboard every 2 hours
- [ ] Monitor crash rate < 0.1%
- [ ] Monitor ANR rate < 0.05%
- [ ] Monitor error rate < 1%
- [ ] Check Play Store ratings and reviews
- [ ] Be ready to rollback if critical issues

---

## Post-Launch (Ongoing)

### Monitoring (Daily for First Week)
- [ ] Sentry crash reports reviewed
- [ ] Error trends monitored
- [ ] Performance metrics checked
- [ ] App reviews monitored
- [ ] User feedback collected

### Monitoring (Weekly After First Week)
- [ ] Sentry dashboard reviewed
- [ ] Crash trends analysis
- [ ] Performance metrics tracked
- [ ] App store ratings monitored
- [ ] Feature request tracking

### Maintenance Tasks
- [ ] Update dependencies monthly
- [ ] Review and apply security patches
- [ ] Monitor for deprecated APIs
- [ ] Check for new Android requirements
- [ ] Plan next feature releases

### Rollback Procedure (If Needed)
- [ ] Stop rollout immediately
- [ ] Create hotfix branch:
  ```bash
  git checkout -b hotfix/critical-issue
  ```

- [ ] Fix issue and test thoroughly
- [ ] Bump patch version
- [ ] Build new production release
- [ ] Submit to internal testing first
- [ ] Deploy to small percentage (10%)
- [ ] Monitor and expand if stable

---

## Documentation & Knowledge Transfer

### Create Documentation
- [ ] Build and deployment guide
- [ ] Troubleshooting guide
- [ ] Monitoring procedures
- [ ] Rollback procedures
- [ ] Version management procedures
- [ ] How to handle critical issues

### Knowledge Transfer
- [ ] Document key contacts
- [ ] Share Sentry dashboard access
- [ ] Share Play Console access
- [ ] Document emergency procedures
- [ ] Create runbooks for common issues

---

## Sign-Off Checklist

Before clicking "Submit" in Play Console:

- [ ] All checklist items completed
- [ ] All GitHub Actions pass
- [ ] All secrets configured
- [ ] All assets uploaded
- [ ] Privacy policy published
- [ ] Content rating submitted
- [ ] Internal testing completed successfully
- [ ] No critical bugs remaining
- [ ] Version number correct
- [ ] App signing certificate configured
- [ ] Build optimizations applied (R8)
- [ ] Crash reporting configured
- [ ] Monitoring setup complete
- [ ] Team notified and ready

---

## Launch Day Tasks

**T-24 hours:**
- [ ] Final review of all assets
- [ ] Final testing on device
- [ ] Brief team on rollout procedure
- [ ] Prepare launch announcement

**T-0 (Launch):**
- [ ] Submit production release
- [ ] Set initial rollout to 10%
- [ ] Monitor Sentry and Play Console
- [ ] Be available for immediate issues

**T+24 hours:**
- [ ] Expand rollout to 25%
- [ ] Continue monitoring
- [ ] Review any issues reported

**T+48 hours:**
- [ ] If stable, expand to 50%
- [ ] Continue monitoring

**T+72 hours:**
- [ ] If all metrics healthy, expand to 100%
- [ ] Announce on GitHub and social media

---

## Contacts & Resources

### Key Resources
- **Play Console:** https://play.google.com/console
- **Expo Dashboard:** https://expo.dev/dashboard
- **EAS Build:** https://eas.io/
- **Sentry Dashboard:** https://sentry.io/dashboard/
- **GitHub Repository:** [Your repo URL]

### Key Contacts
- **Build/Deploy Lead:** [Name]
- **Product Manager:** [Name]
- **QA Lead:** [Name]
- **Security:** [Name]

### Support Channels
- **Internal Slack:** #mcp-releases
- **GitHub Issues:** [repo]/issues
- **Email:** [support email]

---

## Appendix: Troubleshooting

### Build Fails
**Check:**
1. All secrets configured
2. Node.js version matches
3. NDK installed
4. Network connectivity

**Fix:**
```bash
eas build --platform android --profile production --local
# Or use cloud with verbose logging
eas build --platform android --profile production --verbose
```

### App Won't Install
**Check:**
1. Device has 50MB+ free space
2. Android version >= 13
3. Not installing older version over newer

**Fix:**
```bash
adb uninstall com.mcpserver.manager
adb install release.apk
```

### Crash on Startup
**Check:**
1. Node.js bridge initialization
2. Sentry configuration
3. Android logs

**Fix:**
```bash
adb logcat | grep "MCP\|nodejs\|error"
# Check Sentry dashboard for stack trace
```

### Sentry Not Receiving Crashes
**Check:**
1. SENTRY_DSN configured
2. SENTRY_ENABLED=true in .env
3. Network connectivity
4. Crash actually occurring

**Fix:**
```typescript
// Test Sentry manually
import * as Sentry from 'sentry-expo';
Sentry.captureException(new Error('Test error'));
```

---

## Completion Summary

Once all items are checked:
1. **Deployment is ready** - Proceed to production
2. **Team is notified** - Everyone knows timeline
3. **Monitoring is active** - Ready to respond to issues
4. **Documentation complete** - Future maintenance planned
5. **Rollback ready** - Can revert if needed

**Estimated Total Time:** 3-4 weeks from start to full production release
