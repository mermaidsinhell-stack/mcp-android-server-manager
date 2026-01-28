# Quick Start Deployment Guide - MCP Android Server Manager

**TL;DR:** 5-minute overview for getting started with deployment.

---

## Current Status

- ✓ App architecture is solid
- ✗ NOT production ready (missing critical config)
- ✓ Can build APK for testing
- ✗ Cannot submit to Play Store yet

**Readiness Score: 5/10** → Target: 9/10 in 3-4 weeks

---

## What's Needed (Priority Order)

### Must Do First (This Week)
1. Update `app.json` - Add SDK versions, versionCode
2. Update `eas.json` - Add build profiles, caching
3. Set up GitHub Secrets - 7 secrets needed
4. Generate Android keystore - For app signing
5. Create `.env` files - For environment config

### Must Do Second (Week 2)
1. Enable code obfuscation - ProGuard/R8 rules
2. Test on real device - Android 13+
3. Verify Sentry - Error reporting
4. Set up Play Store account - Needed for submission
5. Configure app signing - Link keystore to build

### Must Do Third (Week 3)
1. Create store graphics - Icon, screenshots (5-8), feature graphic
2. Write app copy - Description, release notes
3. Upload to Play Console - Internal testing
4. Submit content rating - Required questionnaire
5. Set up privacy policy - Must be accessible online

### Nice to Have (Week 4+)
1. Automate testing - Jest tests
2. Performance profiling - Identify bottlenecks
3. Security scanning - Code vulnerabilities
4. OTA updates - Over-the-air patches

---

## Quick Setup (30 minutes)

### Step 1: Update Configuration Files

**app.json - Add to `android` section:**
```json
"versionCode": 1,
"minSdkVersion": 33,
"targetSdkVersion": 34,
"compileSdkVersion": 34
```

**eas.json - Add production profile:**
```json
"production": {
  "android": {
    "buildType": "app-bundle",
    "minifyEnabled": true
  }
}
```

### Step 2: Generate Keystore (5 minutes)

```bash
keytool -genkey -v \
  -keystore mcp-server-manager.keystore \
  -keyalg RSA -keysize 2048 \
  -validity 10000 \
  -alias upload-key

# Save password securely - do NOT commit keystore to git
```

### Step 3: Create .env File

```bash
# Create development environment
cat > .env.development << EOF
ENVIRONMENT=development
SENTRY_ENABLED=false
DEBUG_MODE=true
EOF

# Create production environment
cat > .env.production << EOF
ENVIRONMENT=production
SENTRY_ENABLED=true
SENTRY_DSN=https://your-sentry-dsn-here
EOF
```

### Step 4: Set GitHub Secrets (5 minutes)

```bash
# Install gh CLI if needed
brew install gh  # macOS
# or download from: https://cli.github.com

# Login to GitHub
gh auth login

# Set secrets
gh secret set EXPO_TOKEN --body "your_expo_token"
gh secret set SENTRY_DSN --body "your_sentry_dsn"
gh secret set KEYSTORE_PASSWORD --body "your_keystore_password"

# Verify
gh secret list
```

### Step 5: Test Build (10 minutes)

```bash
# Build preview APK
npm run build:android

# Download and install on device
adb install -r preview.apk

# Verify app works
```

---

## Build Commands Quick Reference

```bash
# Development (local, debug)
npx expo start --android

# Preview (APK for testing)
npm run build:android

# Staging (AAB pre-production test)
npm run build:staging

# Production (ready for Play Store)
npm run build:production

# Submit to Play Store
npm run submit:production

# Bump version
npm run version:patch   # 1.0.0 → 1.0.1
npm run version:minor   # 1.0.0 → 1.1.0
npm run version:major   # 1.0.0 → 2.0.0
```

---

## Common Issues & Quick Fixes

### Build Fails
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install

# Try local build
eas build --platform android --profile preview --local
```

### APK Won't Install
```bash
# Uninstall and reinstall
adb uninstall com.mcpserver.manager
adb install -r release.apk

# Grant permissions
adb install -r -g release.apk
```

### Sentry Not Working
- Check DSN is set in `.env`
- Verify `SENTRY_ENABLED=true`
- Check network connectivity
- Trigger test error manually

### Can't Build Production
- Verify Android keystore exists
- Check keystore password in GitHub Secrets
- Ensure versionCode is incremented
- Check internet connection to EAS

---

## Deployment Timeline

```
Week 1: Configuration (5 days)
├─ Day 1: app.json, eas.json updates
├─ Day 2: Keystore generation
├─ Day 3: GitHub Secrets setup
├─ Day 4: Environment configuration
└─ Day 5: First build test

Week 2: Build & Testing (5 days)
├─ Day 6: Code obfuscation setup
├─ Day 7-8: Device testing
├─ Day 9: Sentry verification
└─ Day 10: Security review

Week 3: Store Assets (5 days)
├─ Day 11-12: Create graphics
├─ Day 13: Write descriptions
├─ Day 14: Set up Play Console
└─ Day 15: Upload assets

Week 4: Final Testing (5 days)
├─ Day 16-17: Beta testing
├─ Day 18-19: Bug fixes
└─ Day 20: Ready for production

Week 5: Rollout (5 days)
├─ Day 21: Internal testing
├─ Day 22: 10% rollout
├─ Day 23: 25% rollout
├─ Day 24: 50% rollout
└─ Day 25: 100% rollout
```

---

## Critical Checklist Before Launch

Before submitting to Play Store:

- [ ] versionCode is set and incremented
- [ ] minSdkVersion = 33, targetSdkVersion = 34
- [ ] SENTRY_DSN configured
- [ ] ProGuard/R8 enabled
- [ ] All GitHub Secrets set
- [ ] Android keystore configured
- [ ] Privacy policy URL working
- [ ] All store graphics uploaded
- [ ] Content rating submitted
- [ ] Internal testing passed (48 hours)

---

## Key Files Changed

| File | Change | Impact |
|------|--------|--------|
| `app.json` | Add SDK versions + versionCode | Production-ready Android config |
| `eas.json` | Add profiles + caching | Faster, configurable builds |
| `.env` files | Environment config | Secrets management |
| `android/app/proguard-rules.pro` | Code obfuscation | Smaller, secure APK |
| `.github/workflows/build.yml` | Enhanced CI/CD | Automated testing & building |

---

## Critical Paths to Success

### Path A: Fast Track (3 weeks)
- Experienced team
- Clear scope
- No feature changes
- Focus only on deployment

### Path B: Standard (4 weeks)
- Normal team capacity
- Some discovery needed
- Minor bug fixes allowed
- Staged testing approach

### Path C: Conservative (5+ weeks)
- Limited team capacity
- Thorough testing required
- Multiple refinement cycles
- Extra security review

---

## Monitoring After Launch

### Daily (First Week)
- Sentry: Any crash rate > 0.5% → PAUSE ROLLOUT
- Play Store: Any 1-star reviews → Read and respond
- Metrics: Install count trending up

### Weekly (Weeks 2-4)
- Sentry trends and patterns
- User ratings and reviews
- Error rate trends
- Performance metrics

### Monthly (After Month 1)
- Overall stability assessment
- Plan for next version
- User feedback analysis
- Future feature planning

---

## Support During Deployment

### If Critical Issue Found
1. Stop rollout in Play Console
2. Create hotfix branch
3. Fix issue
4. Bump patch version (1.0.0 → 1.0.1)
5. Build and test
6. Re-submit to internal track
7. Expand rollout again

### If Performance Issue Found
1. Profile with Android Profiler
2. Identify bottleneck
3. Optimize (usually Node.js bridge)
4. Re-test
5. Build optimized version
6. Submit as hotfix

### If Security Issue Found
1. Pause rollout immediately
2. Investigate scope
3. Fix vulnerability
4. Run security scan again
5. Bump patch version
6. Re-submit

---

## Emergency Contacts

- **Tech Lead:** [Name & number]
- **DevOps:** [Name & number]
- **QA Lead:** [Name & number]
- **Product Manager:** [Name & number]
- **On-Call:** [Rotation link]

---

## Useful Links

- **EAS Build Dashboard:** https://expo.dev
- **Google Play Console:** https://play.google.com/console
- **Sentry Dashboard:** https://sentry.io
- **GitHub Actions:** https://github.com/your-repo/actions
- **Expo Docs:** https://docs.expo.dev
- **Android Docs:** https://developer.android.com

---

## Success Metrics

✓ **Launch Successful When:**
- Crash rate < 0.1%
- ANR rate < 0.05%
- 4+ star rating
- 100+ downloads in first week
- Team confidence high

---

## Final Checklist

Before running first production build:

1. [ ] Team trained on deployment process
2. [ ] Monitoring setup and tested
3. [ ] Rollback procedure documented
4. [ ] Communication plan established
5. [ ] Support schedule confirmed
6. [ ] All configs verified
7. [ ] GitHub Secrets confirmed
8. [ ] Keystore backup created
9. [ ] Play Store account setup
10. [ ] Sentry project created

---

## Quick Decision Tree

```
Ready to build?
├─ NO → Complete Week 1 configuration
└─ YES
   └─ Have GitHub Secrets?
      ├─ NO → Run ./scripts/setup-secrets.sh
      └─ YES
         └─ Have Android keystore?
            ├─ NO → Run keytool command
            └─ YES
               └─ Ready to build!
                  ├─ npm run build:android (APK test)
                  └─ npm run build:production (AAB release)
```

---

## One-Liner Quick Starts

```bash
# Install and test locally
npm install && npx expo start --android

# Build preview APK
npm run build:android

# Build production AAB
npm run build:production

# Check all is good
npm run lint && npx tsc --noEmit

# Bump version and commit
npm run version:minor && git add . && git commit -m "Release v1.1.0"

# Submit to Play Store
npm run submit:production
```

---

## Remember

- ✓ App architecture is solid
- ✓ Core functionality works
- ✗ Configuration incomplete
- ✗ Not ready for Play Store
- → 3-4 weeks to production
- → Follow the checklist
- → Test thoroughly
- → Monitor closely
- → You've got this!

---

**Questions? Read the full deployment guide:**
- `DEPLOYMENT_ASSESSMENT.md` - Comprehensive analysis
- `RECOMMENDED_CONFIGURATIONS.md` - Ready-to-use configs
- `DEPLOYMENT_CHECKLIST.md` - Step-by-step tasks
- `DEPLOYMENT_EXECUTIVE_SUMMARY.md` - Management overview

**Ready to start?** Begin with **DEPLOYMENT_CHECKLIST.md** Week 1 section.
