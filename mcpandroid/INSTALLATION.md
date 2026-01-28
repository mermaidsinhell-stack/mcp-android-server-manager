# Installation & Setup Guide

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Android Studio (optional, for emulator)
- EAS CLI for building (`npm install -g eas-cli`)
- Git for version control

## Step 1: Install New Dependencies

The security fixes require several new packages. Install them with:

```bash
cd mcpandroid

# Install all new dependencies
npm install ajv-formats expo-crypto expo-network expo-task-manager sentry-expo react-error-boundary

# Verify installation
npm list ajv-formats expo-crypto expo-network sentry-expo react-error-boundary
```

Expected output:
```
mcp-server-manager@1.0.0
├── ajv-formats@2.1.1
├── expo-crypto@12.8.0
├── expo-network@5.8.0
├── react-error-boundary@4.0.13
└── sentry-expo@8.0.0
```

## Step 2: Configure Sentry (Required)

1. **Create Sentry Account** (if you don't have one):
   - Go to https://sentry.io
   - Sign up for free account
   - Create new project (React Native / Expo)

2. **Get Your DSN**:
   - In Sentry dashboard, go to Settings → Projects → Your Project
   - Copy the DSN (looks like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)

3. **Update Configuration**:
   ```typescript
   // src/utils/sentry.ts
   
   // Find this line (around line 18):
   dsn: 'YOUR_SENTRY_DSN_HERE',
   
   // Replace with your actual DSN:
   dsn: 'https://a1b2c3d4e5f6@o123456.ingest.sentry.io/7890123',
   ```

4. **Verify Configuration**:
   ```bash
   # Check the file was updated
   grep "dsn:" src/utils/sentry.ts
   # Should show your actual DSN, not 'YOUR_SENTRY_DSN_HERE'
   ```

## Step 3: Update App Configuration

1. **Set App Owner**:
   ```json
   // app.json
   {
     "expo": {
       "owner": "your-expo-username",  // Replace with your Expo username
       "name": "MCP Server Manager",
       // ... rest of config
     }
   }
   ```

2. **Verify Package.json**:
   ```bash
   cat package.json | grep -A 5 "ajv"
   # Should show all new dependencies
   ```

## Step 4: Type Check

Verify TypeScript compiles without errors:

```bash
npx tsc --noEmit
```

Expected: No errors (warnings are okay)

## Step 5: Test Development Build

```bash
# Start Expo dev server
npx expo start

# In another terminal, start Android
npx expo run:android
```

**Verify**:
- App launches without crashes
- Can add server from GitHub
- Error boundary appears if you force an error
- Sentry configured message in logs

## Step 6: Build APK

```bash
# First time: configure EAS
npx eas build:configure

# Build development APK
npx eas build --platform android --profile apk

# Wait for build to complete (10-20 minutes)
# Download and install APK on device
```

## Step 7: Test on Device

### Basic Functionality
- [ ] App installs successfully
- [ ] App launches without crashing
- [ ] Can add server from GitHub
- [ ] Server clones successfully
- [ ] npm install completes
- [ ] Server starts and stops
- [ ] Logs display correctly
- [ ] Server deletes successfully

### Security Tests
- [ ] Try invalid URL: `https://evil.com/repo`
  - Should show error: "URL from untrusted host"
  
- [ ] Try command injection: `https://github.com/foo/bar; ls`
  - Should show error: "URL contains invalid characters"
  
- [ ] Rapidly add multiple servers
  - Should hit rate limit after ~50 requests
  - Should show clear error message

### Error Handling
- [ ] Turn off WiFi, try to add server
  - Should show: "No internet connection"
  
- [ ] Try archived repo
  - Should show: "Archived repositories cannot be used"
  
- [ ] Try private repo (if you have one)
  - Should show: "Private repositories not supported yet"

## Step 8: Monitor Sentry

After testing:

1. Go to Sentry dashboard
2. Check "Issues" tab
3. Verify test errors appear
4. Review error details and stack traces

## Troubleshooting

### "Cannot find module 'ajv-formats'"

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### "Sentry DSN not configured"

Check `src/utils/sentry.ts` - DSN should be your actual Sentry DSN, not the placeholder.

### TypeScript Errors

```bash
# Regenerate types
npx expo customize tsconfig.json
npx tsc --noEmit
```

### Build Fails

```bash
# Clear cache
npx expo start --clear

# Reset EAS
npx eas build:configure --force
```

### App Crashes on Launch

1. Check Sentry for crash reports
2. Review device logs:
   ```bash
   adb logcat | grep -i error
   ```

3. Try development build:
   ```bash
   npx expo start --dev-client
   ```

## Common Issues

### Issue: "Error: spawn EACCES"
**Solution**: Check file permissions
```bash
chmod +x node_modules/.bin/*
```

### Issue: "Module not found: Can't resolve 'react-error-boundary'"
**Solution**: Install missing dependency
```bash
npm install react-error-boundary
```

### Issue: "Invariant Violation: Native module cannot be null"
**Solution**: Rebuild the app
```bash
npx expo prebuild --clean
npx expo run:android
```

## Verification Checklist

Before proceeding to production:

- [ ] All dependencies installed
- [ ] Sentry DSN configured
- [ ] TypeScript compiles without errors
- [ ] Development build runs
- [ ] APK builds successfully
- [ ] Tested on real device
- [ ] All security tests pass
- [ ] Error handling works
- [ ] Sentry receives errors

## Next Steps

Once installation is complete and tested:

1. Review [PRE_DEPLOYMENT_CHECKLIST.md](./PRE_DEPLOYMENT_CHECKLIST.md)
2. Complete remaining pre-deployment tasks
3. Build production APK
4. Submit to Play Store

## Support

**Installation Issues**: Open GitHub issue with:
- Node.js version (`node --version`)
- npm version (`npm --version`)
- Error messages (full output)
- Operating system

**Questions**: GitHub Discussions

## Quick Reference

```bash
# Install dependencies
npm install ajv-formats expo-crypto expo-network sentry-expo react-error-boundary

# Type check
npx tsc --noEmit

# Dev build
npx expo start

# Android APK
npx eas build --platform android --profile apk

# Production build
npx eas build --platform android --profile production
```

## Estimated Time

- Installation: 5-10 minutes
- Configuration: 10-15 minutes  
- Testing: 30-60 minutes
- Build: 10-20 minutes (EAS)

**Total: 1-2 hours**

---

Need help? Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) or open an issue.
