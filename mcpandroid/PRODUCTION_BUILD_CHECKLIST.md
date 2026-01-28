# Production Build Checklist - MCP Android Server Manager

## Pre-Build Verification

### Version Management
- [ ] Version string updated in `package.json` (format: X.Y.Z)
- [ ] Version code incremented in `app.json` (android.versionCode)
- [ ] Version code is greater than previous release
- [ ] Git tag created for release (e.g., v1.0.0)
- [ ] Changelog updated with version changes
- [ ] Release notes prepared

### Code Quality
- [ ] All tests passing: `npm run test` (if tests exist)
- [ ] Linting passes: `npm run lint`
- [ ] No console errors or warnings in development
- [ ] No TODOs marked for production
- [ ] Code reviewed by team member
- [ ] Dependencies up to date: `npm audit`
- [ ] No security vulnerabilities reported

### SDK and Manifest Configuration
- [ ] Android minSdkVersion: 23 ✓ (configured in app.json)
- [ ] Android targetSdkVersion: 34 ✓ (configured in app.json)
- [ ] Android compileSdkVersion: 34 ✓ (configured in app.json)
- [ ] versionCode properly incremented ✓
- [ ] Package name correct: com.mcpserver.manager ✓
- [ ] App name correct in app.json

### Permissions Verification
- [ ] All required permissions declared in app.json ✓
  - [ ] INTERNET
  - [ ] ACCESS_NETWORK_STATE
  - [ ] FOREGROUND_SERVICE
- [ ] No unnecessary permissions requested
- [ ] Privacy policy covers all permissions
- [ ] Runtime permissions handled correctly in code

### ProGuard Configuration
- [ ] ProGuard enabled in release build ✓
- [ ] proguard-rules.pro file exists ✓
- [ ] React Native bridge kept (not obfuscated) ✓
- [ ] nodejs-mobile classes preserved ✓
- [ ] Expo module interfaces preserved ✓
- [ ] Source maps enabled for crash reporting ✓
- [ ] Tested obfuscation doesn't break app functionality

### Build Configuration
- [ ] EAS credentials configured: `eas credentials`
- [ ] eas.json properly formatted and validated
- [ ] Production profile configured in eas.json ✓
- [ ] Environment variables set correctly
- [ ] Build types configured (debug vs release) ✓
- [ ] Signing configuration ready

### Crash Reporting and Observability
- [ ] Sentry DSN configured
- [ ] Sentry initialized in app code
- [ ] Environment set to "production" for Sentry
- [ ] Test crash functionality verified
- [ ] ProGuard mappings planned for upload
- [ ] Crash reporting sample rate appropriate
- [ ] Error boundaries implemented in React code

### Assets and Resources
- [ ] App icon (192x192) present: assets/icon.png ✓
- [ ] Adaptive icon foreground (108x108): assets/adaptive-icon.png ✓
- [ ] Adaptive icon background color correct: #edd6d1 ✓
- [ ] Splash screen image (1024x1024): assets/splash.png ✓
- [ ] All image assets compressed
- [ ] No hardcoded image paths
- [ ] Drawable resources organized
- [ ] All required res/ directories present

---

## Pre-Release Testing

### Functionality Testing
- [ ] App launches without errors
- [ ] All main features work as expected
- [ ] Node.js module loads successfully
- [ ] MCP server runtime functional
- [ ] Network requests work correctly
- [ ] File operations work correctly
- [ ] Async operations complete properly
- [ ] Notifications display correctly (if applicable)
- [ ] Deep links work (scheme: mcpserver) ✓

### Device Testing
- [ ] Tested on minimum SDK version (Android 6.0, API 23)
- [ ] Tested on target SDK version (Android 14, API 34)
- [ ] Tested on multiple device sizes
- [ ] Tested on physical device (not just emulator)
- [ ] Tested with different screen densities
- [ ] Landscape and portrait modes work
- [ ] Tested with low storage space
- [ ] Tested with slow network connection

### Security Testing
- [ ] No sensitive data in logs
- [ ] No API keys hardcoded
- [ ] No passwords in source code
- [ ] HTTPS enforced (usesCleartextTraffic: false) ✓
- [ ] Secrets stored in EAS Secrets, not .env
- [ ] No debugging endpoints exposed
- [ ] Permissions handled securely
- [ ] Data encryption verified

### Performance Testing
- [ ] App startup time acceptable (< 3 seconds)
- [ ] Initial load time reasonable
- [ ] Memory usage stable
- [ ] No memory leaks detected
- [ ] Battery usage acceptable
- [ ] Network requests optimized
- [ ] ProGuard optimizations working

### Obfuscation Verification
- [ ] Build generates mapping file: proguard-mapping.txt
- [ ] Source maps included for debugging
- [ ] App functionality preserved after obfuscation
- [ ] No NoClassDefFoundError exceptions
- [ ] No MethodNotFoundException exceptions
- [ ] Reflection-based code still works
- [ ] Serialization/deserialization works
- [ ] Parcelable classes work correctly

---

## Build Process

### Generate Production Build
```bash
# Step 1: Clean cache
npm cache clean --force

# Step 2: Install dependencies
npm install

# Step 3: Build for production
eas build --platform android --profile production

# Step 4: Monitor build
eas build:list
eas build:view <BUILD_ID>
```

### Build Verification
- [ ] Build completed successfully
- [ ] No build warnings (review warnings)
- [ ] Build ID recorded: ________________
- [ ] Build artifacts downloaded
- [ ] ProGuard mapping file extracted
- [ ] Build size reasonable (< 60 MB)
- [ ] AAB file generated correctly

### Artifact Management
- [ ] Downloaded APK from build
- [ ] Downloaded AAB from build
- [ ] Downloaded ProGuard mapping files
- [ ] Extracted proguard-mapping.txt
- [ ] Verified mapping file not empty
- [ ] Backup of build artifacts created
- [ ] Build artifacts stored securely

---

## Pre-Submission Review

### App Store Compliance
- [ ] Content rating questionnaire completed
- [ ] Privacy policy URL provided
- [ ] Privacy policy covers data collection
- [ ] GDPR compliance verified (if applicable)
- [ ] CCPA compliance verified (if applicable)
- [ ] Terms of service available
- [ ] Permissions justified in description
- [ ] No policy violations present

### Store Listing
- [ ] App name is clear and accurate
- [ ] Description is complete and accurate
- [ ] Screenshots prepared and uploaded
- [ ] Feature graphics prepared and uploaded
- [ ] Promotional text concise and relevant
- [ ] Category appropriate
- [ ] Rating/maturity content selected correctly
- [ ] Keywords optimized

### Release Notes
- [ ] Release notes written for version
- [ ] Changes documented clearly
- [ ] Bug fixes listed
- [ ] New features highlighted
- [ ] Known issues disclosed
- [ ] Version number matches release

### Testing Track Submission
- [ ] Internal testing: APK built and tested ✓
- [ ] Internal testers added to testing group
- [ ] Internal testing feedback received
- [ ] Issues from internal testing resolved
- [ ] Beta track: AAB submitted if testing passed
- [ ] Beta testers invited

---

## Crash Reporting Setup

### Sentry Configuration
- [ ] Sentry account created
- [ ] Sentry project created for Android
- [ ] DSN obtained and noted: ________________
- [ ] DSN configured in app code
- [ ] Sentry CLI installed: `npm install --save-dev @sentry/cli`
- [ ] Sentry integration tested (test crash)
- [ ] Test crash visible in Sentry dashboard

### ProGuard Mapping Upload
```bash
# After successful build
sentry-cli releases files <VERSION> upload-sourcemaps \
  proguard-mapping.txt
```

- [ ] ProGuard mapping file located
- [ ] Sentry release version matches app version
- [ ] Mapping file uploaded to Sentry
- [ ] Upload status verified in Sentry dashboard
- [ ] Deobfuscation test performed

### Monitoring Setup
- [ ] Sentry alerts configured
- [ ] Team members added to Sentry
- [ ] Notification preferences set
- [ ] Integration with Slack/email working
- [ ] Dashboard configured with key metrics

---

## Submission to Google Play Store

### Prerequisites
- [ ] Google Play Developer Account active
- [ ] Developer account in good standing
- [ ] Payment method on file
- [ ] App draft created in Play Console
- [ ] Signing key configured
- [ ] Service account key ready (if auto-submitting)

### Manual Submission Process
```bash
# Step 1: Prepare submission details
# - Upload AAB file
# - Add release notes
# - Select countries/regions
# - Set pricing and distribution
# - Review app content policies
# - Submit for review
```

- [ ] AAB file uploaded to Play Console
- [ ] Release notes added
- [ ] Content rating questionnaire submitted
- [ ] Privacy policy URL provided
- [ ] Permissions justified
- [ ] Minimum API level verified
- [ ] Target API level verified

### Automated Submission (EAS)
```bash
# Step 1: Configure service account
# - Place google-play-key.json in project
# - Add to .gitignore

# Step 2: Submit build
eas submit --platform android --id <BUILD_ID>
```

- [ ] Service account key configured
- [ ] Key file added to .gitignore ✓
- [ ] Submission successful
- [ ] Submission ID recorded: ________________

### Post-Submission
- [ ] Submission receipt confirmed
- [ ] Review status monitored
- [ ] Play Console checked regularly
- [ ] Review feedback addressed if any
- [ ] App approved message received

---

## Production Monitoring

### First 24 Hours After Release
- [ ] Monitor crash reports in Sentry
- [ ] Check crash rate
- [ ] Review user feedback
- [ ] Monitor app rating
- [ ] Check Play Store reviews
- [ ] Monitor server logs for errors
- [ ] Monitor API performance

### Ongoing Monitoring
- [ ] Weekly crash report review
- [ ] Daily Sentry dashboard check
- [ ] Monthly performance metrics review
- [ ] Quarterly version update planning
- [ ] User feedback tracking
- [ ] Performance monitoring
- [ ] Security monitoring

### Emergency Response Plan
- [ ] Hotfix process documented
- [ ] Emergency contact list prepared
- [ ] Rollback procedure planned
- [ ] Communication template ready
- [ ] Incident response team identified

---

## Version Rollout Strategy

### Staged Rollout
- [ ] Initially rollout to 5% of users
- [ ] Monitor crash rate for 24 hours
- [ ] If stable, rollout to 25% of users
- [ ] Monitor for 48 hours
- [ ] If stable, rollout to 100% of users
- [ ] Keep rollout paused during monitoring

### Monitoring During Rollout
- [ ] Check crash rate at each stage
- [ ] Review user feedback
- [ ] Monitor server performance
- [ ] Check API error rates
- [ ] Monitor user retention
- [ ] Track feature usage

### Rollback Procedure
If critical issues detected:
- [ ] Pause rollout immediately
- [ ] Assess issue severity
- [ ] Decide on hotfix vs rollback
- [ ] If rolling back: Stop rollout in Play Console
- [ ] Communicate with affected users
- [ ] Prepare and test hotfix

---

## Documentation and Knowledge Transfer

### Internal Documentation
- [ ] Build process documented
- [ ] ProGuard configuration documented ✓
- [ ] Version management process documented ✓
- [ ] Release checklist created ✓
- [ ] Troubleshooting guide prepared
- [ ] Emergency procedures documented

### Team Knowledge
- [ ] Build process explained to team
- [ ] ProGuard rules explained
- [ ] Version numbering explained
- [ ] Crash reporting process explained
- [ ] Monitoring procedures explained
- [ ] Rollback procedures explained

### External Documentation
- [ ] Privacy policy published
- [ ] Terms of service available
- [ ] Support documentation prepared
- [ ] FAQ prepared
- [ ] Troubleshooting guide available

---

## Final Sign-Off

### Quality Assurance
- [ ] QA Lead: _________________ Date: _______
- [ ] Testing: _________________ Date: _______
- [ ] Security: _________________ Date: _______

### Authorization
- [ ] Product Owner: _________________ Date: _______
- [ ] Technical Lead: _________________ Date: _______
- [ ] Release Manager: _________________ Date: _______

---

## Quick Reference

### Critical File Locations
- App configuration: `/mcpandroid/app.json`
- Build configuration: `/mcpandroid/eas.json`
- ProGuard rules: `/mcpandroid/android/app/proguard-rules.pro`
- Build guide: `/mcpandroid/BUILD_CONFIGURATION.md`
- This checklist: `/mcpandroid/PRODUCTION_BUILD_CHECKLIST.md`

### Key Commands
```bash
# Development
npm run start
npm run android

# Testing
npm run build:android

# Production build
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android --id <BUILD_ID>

# Version increment
# Edit app.json: increment versionCode
# Edit package.json: update version
# Git commit and tag
# Then run: eas build --platform android --profile production
```

### Critical Settings
- minSdkVersion: 23
- targetSdkVersion: 34
- versionCode: Must increment
- usesCleartextTraffic: false
- debuggable: false (release)
- ProGuard: enabled (release)

### Support Contacts
- EAS Support: https://docs.expo.dev/
- ProGuard Support: https://www.guardsquare.com/
- Play Store Support: https://support.google.com/googleplay/
- Sentry Support: https://docs.sentry.io/

---

**Last Updated:** 2024
**Next Review:** Before each release
**Owner:** Development Team

