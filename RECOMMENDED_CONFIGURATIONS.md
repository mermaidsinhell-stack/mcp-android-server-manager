# Recommended Configuration Files for Production Deployment

This document provides ready-to-use configuration files for deploying the MCP Server Manager to production.

---

## 1. Enhanced app.json

**Path:** `/mcpandroid/app.json`

```json
{
  "expo": {
    "name": "MCP Server Manager",
    "slug": "mcp-server-manager",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "mcpserver",
    "userInterfaceStyle": "light",
    "description": "Run any GitHub MCP server on your Android phone with an embedded Node.js runtime. Deploy servers directly from your device.",
    "privacy": "https://www.example.com/privacy",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#edd6d1"
    },
    "assetBundlePatterns": [
      "assets/**",
      "src/**/*.tsx",
      "src/**/*.ts",
      "nodejs-assets/nodejs-project/**"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.mcpserver.manager"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#edd6d1"
      },
      "package": "com.mcpserver.manager",
      "versionCode": 1,
      "minSdkVersion": 33,
      "targetSdkVersion": 34,
      "compileSdkVersion": 34,
      "buildToolsVersion": "34.0.0",
      "usesCleartextTraffic": false,
      "permissions": [
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE"
      ],
      "intentFilters": [
        {
          "action": "android.intent.action.VIEW",
          "data": [
            {
              "scheme": "mcpserver",
              "host": "*"
            }
          ],
          "category": ["android.intent.category.BROWSABLE", "android.intent.category.DEFAULT"]
        }
      ]
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-router",
      "expo-font"
    ],
    "experiments": {
      "typedRoutes": true
    },
    "extra": {
      "router": {
        "origin": false
      }
    },
    "owner": "mermaidsinhell-stack",
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_LOAD_FAILURE",
      "fallbackToCacheTimeout": 30000
    }
  }
}
```

---

## 2. Enhanced eas.json

**Path:** `/mcpandroid/eas.json`

```json
{
  "cli": {
    "version": "5.5.0",
    "appVersionSource": "local"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "credentialsSource": "local",
      "node": "18.18.0",
      "env": {
        "ENVIRONMENT": "development",
        "SENTRY_ENABLED": "false",
        "DEBUG_MODE": "true"
      }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "credentialsSource": "local",
      "node": "18.18.0",
      "android": {
        "buildType": "apk",
        "minifyEnabled": false
      },
      "env": {
        "ENVIRONMENT": "preview",
        "SENTRY_ENABLED": "false",
        "DEBUG_MODE": "false"
      }
    },
    "staging": {
      "distribution": "internal",
      "channel": "staging",
      "credentialsSource": "local",
      "node": "18.18.0",
      "android": {
        "buildType": "app-bundle",
        "minifyEnabled": true
      },
      "cache": {
        "disabled": false,
        "key": "mcp-staging-cache"
      },
      "env": {
        "ENVIRONMENT": "staging",
        "SENTRY_ENABLED": "true",
        "DEBUG_MODE": "false"
      },
      "secretEnv": ["SENTRY_DSN"]
    },
    "production": {
      "distribution": "store",
      "channel": "production",
      "credentialsSource": "local",
      "node": "18.18.0",
      "android": {
        "buildType": "app-bundle",
        "gradleCommand": ":app:bundleRelease",
        "minifyEnabled": true
      },
      "cache": {
        "disabled": false,
        "ttl": 2592000,
        "key": "mcp-prod-cache"
      },
      "env": {
        "ENVIRONMENT": "production",
        "SENTRY_ENABLED": "true",
        "DEBUG_MODE": "false"
      },
      "secretEnv": ["SENTRY_DSN", "SENTRY_AUTH_TOKEN"]
    },
    "apk": {
      "distribution": "internal",
      "channel": "apk-testing",
      "credentialsSource": "local",
      "node": "18.18.0",
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease",
        "minifyEnabled": true
      },
      "env": {
        "ENVIRONMENT": "staging",
        "SENTRY_ENABLED": "true"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccount": "./credentials.json",
        "track": "internal",
        "releaseStatus": "draft"
      }
    }
  }
}
```

---

## 3. Environment Configuration Files

### .env.development

**Path:** `/mcpandroid/.env.development`

```env
# Environment Configuration
ENVIRONMENT=development
NODE_ENV=development

# Debugging
DEBUG_MODE=true
DEBUG_LOGS=true

# Sentry
SENTRY_ENABLED=false
SENTRY_DSN=

# API Configuration
API_TIMEOUT=60000
API_RETRY_ATTEMPTS=3
API_RETRY_DELAY=1000

# Feature Flags
ENABLE_UPDATER=false
ENABLE_TELEMETRY=false

# Node.js Bridge
NODE_BRIDGE_TIMEOUT=60000
NODE_BRIDGE_LOG_LEVEL=debug
```

### .env.staging

**Path:** `/mcpandroid/.env.staging`

```env
# Environment Configuration
ENVIRONMENT=staging
NODE_ENV=production

# Debugging
DEBUG_MODE=false
DEBUG_LOGS=false

# Sentry
SENTRY_ENABLED=true
SENTRY_DSN=https://your-sentry-key@sentry.io/your-project-id
SENTRY_SAMPLE_RATE=0.1
SENTRY_TRACES_SAMPLE_RATE=0.1

# API Configuration
API_TIMEOUT=30000
API_RETRY_ATTEMPTS=3
API_RETRY_DELAY=1000

# Feature Flags
ENABLE_UPDATER=true
ENABLE_TELEMETRY=true

# Node.js Bridge
NODE_BRIDGE_TIMEOUT=60000
NODE_BRIDGE_LOG_LEVEL=info
```

### .env.production

**Path:** `/mcpandroid/.env.production`

```env
# Environment Configuration
ENVIRONMENT=production
NODE_ENV=production

# Debugging
DEBUG_MODE=false
DEBUG_LOGS=false

# Sentry
SENTRY_ENABLED=true
SENTRY_DSN=https://your-sentry-key@sentry.io/your-project-id
SENTRY_SAMPLE_RATE=1.0
SENTRY_TRACES_SAMPLE_RATE=0.5

# API Configuration
API_TIMEOUT=30000
API_RETRY_ATTEMPTS=5
API_RETRY_DELAY=2000

# Feature Flags
ENABLE_UPDATER=true
ENABLE_TELEMETRY=true

# Node.js Bridge
NODE_BRIDGE_TIMEOUT=30000
NODE_BRIDGE_LOG_LEVEL=error
```

---

## 4. Environment Configuration Module

**Path:** `/mcpandroid/src/config/environment.ts`

```typescript
import Constants from 'expo-constants';

export type EnvironmentType = 'development' | 'staging' | 'production';

export interface EnvironmentConfig {
  // Environment
  ENVIRONMENT: EnvironmentType;
  NODE_ENV: string;

  // Debugging
  DEBUG_MODE: boolean;
  DEBUG_LOGS: boolean;

  // Sentry
  SENTRY_ENABLED: boolean;
  SENTRY_DSN: string;
  SENTRY_SAMPLE_RATE: number;
  SENTRY_TRACES_SAMPLE_RATE: number;

  // API Configuration
  API_TIMEOUT: number;
  API_RETRY_ATTEMPTS: number;
  API_RETRY_DELAY: number;

  // Feature Flags
  ENABLE_UPDATER: boolean;
  ENABLE_TELEMETRY: boolean;

  // Node.js Bridge
  NODE_BRIDGE_TIMEOUT: number;
  NODE_BRIDGE_LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';

  // App Version
  APP_VERSION: string;
  BUILD_NUMBER: number;
}

function parseBoolean(value: string | boolean | undefined, defaultValue: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

function parseNumber(value: string | number | undefined, defaultValue: number): number {
  if (typeof value === 'number') return value;
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function getEnvironment(): EnvironmentConfig {
  const isDevelopment = __DEV__;
  const expoConfig = Constants.expoConfig || {};
  const extra = expoConfig.extra || {};

  // Determine environment
  const environmentVar = process.env.ENVIRONMENT || 'development';
  const environment = (environmentVar as EnvironmentType) || 'development';

  return {
    // Environment
    ENVIRONMENT: environment,
    NODE_ENV: process.env.NODE_ENV || (isDevelopment ? 'development' : 'production'),

    // Debugging
    DEBUG_MODE: parseBoolean(process.env.DEBUG_MODE, isDevelopment),
    DEBUG_LOGS: parseBoolean(process.env.DEBUG_LOGS, isDevelopment),

    // Sentry
    SENTRY_ENABLED: parseBoolean(process.env.SENTRY_ENABLED, !isDevelopment),
    SENTRY_DSN: process.env.SENTRY_DSN || '',
    SENTRY_SAMPLE_RATE: parseNumber(process.env.SENTRY_SAMPLE_RATE, isDevelopment ? 0 : 1),
    SENTRY_TRACES_SAMPLE_RATE: parseNumber(process.env.SENTRY_TRACES_SAMPLE_RATE, 0.1),

    // API Configuration
    API_TIMEOUT: parseNumber(process.env.API_TIMEOUT, 30000),
    API_RETRY_ATTEMPTS: parseNumber(process.env.API_RETRY_ATTEMPTS, 3),
    API_RETRY_DELAY: parseNumber(process.env.API_RETRY_DELAY, 1000),

    // Feature Flags
    ENABLE_UPDATER: parseBoolean(process.env.ENABLE_UPDATER, !isDevelopment),
    ENABLE_TELEMETRY: parseBoolean(process.env.ENABLE_TELEMETRY, !isDevelopment),

    // Node.js Bridge
    NODE_BRIDGE_TIMEOUT: parseNumber(process.env.NODE_BRIDGE_TIMEOUT, 60000),
    NODE_BRIDGE_LOG_LEVEL: (process.env.NODE_BRIDGE_LOG_LEVEL as any) || (isDevelopment ? 'debug' : 'error'),

    // App Version
    APP_VERSION: expoConfig.version || '1.0.0',
    BUILD_NUMBER: expoConfig.android?.versionCode || 1,
  };
}

// Export singleton instance
export const ENV = getEnvironment();

export default ENV;
```

---

## 5. Enhanced Sentry Configuration

**Path:** `/mcpandroid/src/utils/sentry.ts` (Updated)

```typescript
/**
 * Sentry crash reporting configuration
 */

import * as Sentry from 'sentry-expo';
import Constants from 'expo-constants';
import ENV from '../config/environment';

/**
 * Initialize Sentry for crash reporting
 */
export function initSentry(): void {
  // Skip initialization if disabled or in development
  if (!ENV.SENTRY_ENABLED || ENV.DEBUG_MODE) {
    console.log('Sentry disabled - environment:', ENV.ENVIRONMENT);
    return;
  }

  // Validate DSN is configured
  if (!ENV.SENTRY_DSN) {
    console.error('Sentry enabled but DSN not configured');
    return;
  }

  try {
    Sentry.init({
      dsn: ENV.SENTRY_DSN,
      enableInExpoDevelopment: false,
      debug: false,
      environment: ENV.ENVIRONMENT,
      release: `mcp-server-manager@${ENV.APP_VERSION}+${ENV.BUILD_NUMBER}`,

      // Set sample rates
      tracesSampleRate: ENV.SENTRY_TRACES_SAMPLE_RATE,
      sampleRate: ENV.SENTRY_SAMPLE_RATE,

      // Filter out sensitive information
      beforeSend(event, hint) {
        // Remove sensitive data from event
        if (event.request) {
          delete event.request.cookies;
          delete event.request.headers;
        }

        // Filter out noisy errors
        const error = hint.originalException;
        if (error instanceof Error) {
          // Ignore network timeout errors (user may have poor connection)
          if (error.message.includes('timeout') || error.message.includes('Network request failed')) {
            return null;
          }

          // Ignore expected errors
          if (error.message.includes('User cancelled')) {
            return null;
          }

          // Ignore Node.js bridge timeout during clone
          if (error.message.includes('clone') && error.message.includes('timeout')) {
            return null;
          }
        }

        return event;
      },

      // Add custom integrations
      integrations: [
        new Sentry.Native.ReactNativeTracing({
          tracingOrigins: ['localhost', 'api.github.com', /^\//],
          routingInstrumentation: new Sentry.ReactNavigationInstrumentation(),
        }),
      ],

      // Attach stack traces
      attachStacktrace: true,
      maxBreadcrumbs: 100,

      // Include context
      sendDefaultPii: false,
    });

    // Set initial context
    Sentry.setTag('app_version', ENV.APP_VERSION);
    Sentry.setTag('build_number', String(ENV.BUILD_NUMBER));
    Sentry.setTag('environment', ENV.ENVIRONMENT);
    Sentry.setContext('app', {
      version: ENV.APP_VERSION,
      build: ENV.BUILD_NUMBER,
      environment: ENV.ENVIRONMENT,
    });

    console.log('Sentry initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Sentry:', error);
  }
}

/**
 * Log an error to Sentry
 */
export function logError(error: Error, context?: Record<string, unknown>): void {
  if (ENV.DEBUG_MODE) {
    console.error('Error:', error, context);
    return;
  }

  if (!ENV.SENTRY_ENABLED) return;

  Sentry.Native.captureException(error, {
    contexts: context ? { custom: context } : undefined,
  });
}

/**
 * Log a message to Sentry
 */
export function logMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  if (ENV.DEBUG_MODE) {
    console.log(`[${level}]`, message);
    return;
  }

  if (!ENV.SENTRY_ENABLED) return;

  Sentry.Native.captureMessage(message, level);
}

/**
 * Set user context for Sentry
 */
export function setUserContext(userId: string, email?: string): void {
  if (ENV.DEBUG_MODE || !ENV.SENTRY_ENABLED) return;

  Sentry.Native.setUser({
    id: userId,
    email,
  });
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, unknown>): void {
  if (ENV.DEBUG_MODE) {
    console.log(`[Breadcrumb] ${category}: ${message}`, data);
    return;
  }

  if (!ENV.SENTRY_ENABLED) return;

  Sentry.Native.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
    timestamp: Date.now() / 1000,
  });
}

/**
 * Set tag for filtering in Sentry
 */
export function setTag(key: string, value: string): void {
  if (ENV.DEBUG_MODE || !ENV.SENTRY_ENABLED) return;

  Sentry.Native.setTag(key, value);
}

/**
 * Performance monitoring transaction
 */
export function startTransaction(name: string, op: string): Sentry.Transaction | null {
  if (ENV.DEBUG_MODE || !ENV.SENTRY_ENABLED) return null;

  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * Track server operation performance
 */
export function trackServerOperation(
  serverId: string,
  operation: string,
  duration: number,
  success: boolean,
  error?: string
): void {
  if (!ENV.SENTRY_ENABLED && ENV.DEBUG_MODE) {
    console.log(`[Performance] ${operation} took ${duration}ms (${success ? 'success' : 'failed'})`);
    return;
  }

  if (!ENV.SENTRY_ENABLED) return;

  const context = {
    duration_ms: duration,
    server_id: serverId,
    operation,
    success,
    error,
  };

  const level = success ? 'info' : 'warning';
  logMessage(`Server ${operation}: ${success ? 'success' : 'failed'} (${duration}ms)`, level);

  addBreadcrumb(
    `${operation} completed`,
    'server_operation',
    context
  );
}
```

---

## 6. GitHub Actions Build Workflow

**Path:** `/mcpandroid/.github/workflows/build-and-deploy.yml`

```yaml
name: Build and Deploy Android

on:
  push:
    branches: [main, master]
    tags: ['v*']
  workflow_dispatch:
    inputs:
      profile:
        description: 'Build profile'
        required: true
        default: 'preview'
        type: choice
        options:
          - development
          - preview
          - staging
          - production

env:
  NODE_VERSION: '18'
  JAVA_VERSION: '17'
  REGISTRY: ghcr.io

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Run linter
        run: npm run lint
        continue-on-error: true

      - name: Type check
        run: npx tsc --noEmit
        continue-on-error: true

  build:
    needs: lint-and-test
    runs-on: ubuntu-latest
    permissions:
      contents: write
      packages: write
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: ${{ env.JAVA_VERSION }}

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Install global tools
        run: npm install -g expo-cli eas-cli

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Determine build profile
        id: profile
        run: |
          if [[ "${{ github.event_name }}" == "workflow_dispatch" ]]; then
            PROFILE="${{ inputs.profile }}"
          elif [[ "${{ github.ref }}" == refs/tags/* ]]; then
            PROFILE="production"
          else
            PROFILE="preview"
          fi
          echo "profile=$PROFILE" >> $GITHUB_OUTPUT
          echo "Building with profile: $PROFILE"

      - name: Create .env file
        run: |
          cp .env.${{ steps.profile.outputs.profile }} .env || true
          cat .env 2>/dev/null || echo "No .env file created"

      - name: Authenticate with Expo
        run: echo "${{ secrets.EXPO_TOKEN }}" | npx eas-cli whoami
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

      - name: Build APK/AAB
        run: |
          npx eas-cli build \
            --platform android \
            --profile ${{ steps.profile.outputs.profile }} \
            --wait \
            --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

      - name: Create Release
        if: startsWith(github.ref, 'refs/tags/')
        uses: softprops/action-gh-release@v1
        with:
          tag_name: ${{ github.ref }}
          name: MCP Server Manager ${{ github.ref }}
          draft: false
          prerelease: ${{ contains(github.ref, 'alpha') || contains(github.ref, 'beta') }}
          body: |
            ## Build Information
            - **Build Profile:** ${{ steps.profile.outputs.profile }}
            - **Commit:** ${{ github.sha }}
            - **Ref:** ${{ github.ref }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  notify:
    needs: [lint-and-test, build]
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Determine status
        id: status
        run: |
          if [[ "${{ needs.build.result }}" == "success" ]]; then
            echo "status=✓ Build succeeded"
          else
            echo "status=✗ Build failed"
          fi

      - name: Post to Slack
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Build failed for MCP Server Manager'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
          fields: repo,message,commit,author
```

---

## 7. ProGuard Rules for Code Obfuscation

**Path:** `/mcpandroid/android/app/proguard-rules.pro`

```proguard
# MCP Server Manager ProGuard Configuration

# Keep all classes in our app
-keep class com.mcpserver.** { *; }

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.hermes.** { *; }

# Expo modules
-keep class expo.** { *; }
-keep class org.unimodules.** { *; }

# Node.js Mobile
-keep class nodejs.** { *; }
-keep class rn.** { *; }
-keep class com.google.android.gms.** { *; }

# Zustand (state management)
-keep class ** extends com.zustand.** { *; }

# AJV (JSON validation)
-keep class com.ajv.** { *; }

# Sentry
-keep class io.sentry.** { *; }
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Preserve line numbers for debugging
-keepattributes SourceFile,LineNumberTable,InnerClasses,EnclosingMethod

# Remove logging in production
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}

# Keep names of Parcelable classes
-keep interface android.os.Parcelable { *; }
-keep class * implements android.os.Parcelable { *; }

# Keep Serializable
-keep interface java.io.Serializable { *; }
-keep class * implements java.io.Serializable { *; }

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep class members referenced by reflection
-keepclassmembers class * {
    <init>(...);
}

# Optimization settings
-optimizationpasses 5
-dontusemixedcaseclassnames
-verbose
```

---

## 8. GitHub Secrets Setup Script

**Path:** `/scripts/setup-secrets.sh`

```bash
#!/bin/bash

set -e

echo "MCP Server Manager - GitHub Secrets Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed${NC}"
    echo "Install from: https://cli.github.com"
    exit 1
fi

# Repository validation
read -p "Enter repository (user/repo): " REPO
if ! gh repo view "$REPO" &> /dev/null; then
    echo -e "${RED}Error: Repository not found or not accessible${NC}"
    exit 1
fi

echo -e "${GREEN}Using repository: $REPO${NC}"

# Collect secrets
echo ""
echo -e "${YELLOW}Enter secrets when prompted (leave blank to skip):${NC}"

# EXPO_TOKEN
read -p "EXPO_TOKEN: " EXPO_TOKEN
if [ -n "$EXPO_TOKEN" ]; then
    gh secret set EXPO_TOKEN --body "$EXPO_TOKEN" -R "$REPO"
    echo -e "${GREEN}✓ EXPO_TOKEN set${NC}"
fi

# SENTRY_DSN
read -p "SENTRY_DSN: " SENTRY_DSN
if [ -n "$SENTRY_DSN" ]; then
    gh secret set SENTRY_DSN --body "$SENTRY_DSN" -R "$REPO"
    echo -e "${GREEN}✓ SENTRY_DSN set${NC}"
fi

# SENTRY_AUTH_TOKEN
read -p "SENTRY_AUTH_TOKEN: " SENTRY_AUTH_TOKEN
if [ -n "$SENTRY_AUTH_TOKEN" ]; then
    gh secret set SENTRY_AUTH_TOKEN --body "$SENTRY_AUTH_TOKEN" -R "$REPO"
    echo -e "${GREEN}✓ SENTRY_AUTH_TOKEN set${NC}"
fi

# PLAY_STORE_CREDENTIALS
read -p "Path to credentials.json: " CREDS_PATH
if [ -n "$CREDS_PATH" ] && [ -f "$CREDS_PATH" ]; then
    CREDS_B64=$(cat "$CREDS_PATH" | base64 -w0)
    gh secret set PLAY_STORE_CREDENTIALS --body "$CREDS_B64" -R "$REPO"
    echo -e "${GREEN}✓ PLAY_STORE_CREDENTIALS set${NC}"
fi

# KEYSTORE_B64
read -p "Path to .keystore file: " KEYSTORE_PATH
if [ -n "$KEYSTORE_PATH" ] && [ -f "$KEYSTORE_PATH" ]; then
    KEYSTORE_B64=$(cat "$KEYSTORE_PATH" | base64 -w0)
    gh secret set KEYSTORE_B64 --body "$KEYSTORE_B64" -R "$REPO"
    echo -e "${GREEN}✓ KEYSTORE_B64 set${NC}"
fi

# KEYSTORE_PASSWORD
read -s -p "KEYSTORE_PASSWORD: " KEYSTORE_PASSWORD
echo ""
if [ -n "$KEYSTORE_PASSWORD" ]; then
    gh secret set KEYSTORE_PASSWORD --body "$KEYSTORE_PASSWORD" -R "$REPO"
    echo -e "${GREEN}✓ KEYSTORE_PASSWORD set${NC}"
fi

# KEY_ALIAS_PASSWORD
read -s -p "KEY_ALIAS_PASSWORD: " KEY_ALIAS_PASSWORD
echo ""
if [ -n "$KEY_ALIAS_PASSWORD" ]; then
    gh secret set KEY_ALIAS_PASSWORD --body "$KEY_ALIAS_PASSWORD" -R "$REPO"
    echo -e "${GREEN}✓ KEY_ALIAS_PASSWORD set${NC}"
fi

echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo "Verify secrets were set:"
echo "  gh secret list -R $REPO"
```

---

## 9. Version Management Script

**Path:** `/scripts/bump-version.js`

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const bumpType = args[0] || 'patch'; // patch, minor, major

// Read package.json
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

// Read app.json
const appJsonPath = path.join(__dirname, '../app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));

// Parse current version
const version = packageJson.version;
const [major, minor, patch] = version.split('.').map(Number);

let newMajor = major;
let newMinor = minor;
let newPatch = patch;

// Calculate new version
switch (bumpType) {
  case 'major':
    newMajor++;
    newMinor = 0;
    newPatch = 0;
    break;
  case 'minor':
    newMinor++;
    newPatch = 0;
    break;
  case 'patch':
  default:
    newPatch++;
}

const newVersion = `${newMajor}.${newMinor}.${newPatch}`;

// Calculate new versionCode
const currentVersionCode = appJson.expo.android?.versionCode || 1;
const newVersionCode = currentVersionCode + 1;

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

// Update app.json
appJson.expo.version = newVersion;
if (!appJson.expo.android) {
  appJson.expo.android = {};
}
appJson.expo.android.versionCode = newVersionCode;
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');

console.log(`✓ Bumped version from ${version} to ${newVersion}`);
console.log(`✓ Updated versionCode from ${currentVersionCode} to ${newVersionCode}`);
console.log('');
console.log('Next steps:');
console.log(`  git add package.json app.json`);
console.log(`  git commit -m "Bump version to ${newVersion} (versionCode ${newVersionCode})"`);
console.log(`  git tag v${newVersion}`);
console.log(`  git push origin main v${newVersion}`);
```

---

## 10. Installation & Setup Instructions

### Step 1: Replace Configuration Files

```bash
cd /path/to/mcpandroid

# Backup current files
cp app.json app.json.backup
cp eas.json eas.json.backup

# Copy recommended configurations
# Use the configurations from this document
```

### Step 2: Update package.json Scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "build:android": "eas build --platform android --profile preview",
    "build:staging": "eas build --platform android --profile staging",
    "build:production": "eas build --platform android --profile production",
    "submit:production": "eas submit --platform android --profile production",
    "version:patch": "node scripts/bump-version.js patch",
    "version:minor": "node scripts/bump-version.js minor",
    "version:major": "node scripts/bump-version.js major"
  }
}
```

### Step 3: Create Environment Files

```bash
# Create environment-specific files
cp .env.development .env
# Update .env with your values
```

### Step 4: Setup GitHub Secrets

```bash
chmod +x scripts/setup-secrets.sh
./scripts/setup-secrets.sh
```

### Step 5: Generate Android Keystore

```bash
keytool -genkey -v \
  -keystore mcp-server-manager.keystore \
  -keyalg RSA -keysize 2048 \
  -validity 10000 \
  -alias upload-key

# This creates a keystore file - save it securely
# DO NOT commit to git
```

### Step 6: Test Build

```bash
# Test preview build
npm run build:android

# Test staging build
npm run build:staging
```

---

## Summary of Changes

| File | Change | Impact |
|------|--------|--------|
| app.json | Added SDK versions, versionCode, storage permissions | Production-ready Android config |
| eas.json | Added profiles, caching, environment vars | Complete build configuration |
| .env files | Created development/staging/production | Environment management |
| environment.ts | New configuration module | Type-safe environment access |
| sentry.ts | Enhanced with environment config | Production crash reporting |
| build-and-deploy.yml | New GitHub Actions workflow | Automated CI/CD |
| proguard-rules.pro | New code obfuscation | Smaller, secure APK |
| setup-secrets.sh | New secrets setup script | Secure credential management |
| bump-version.js | New version script | Automated versioning |

---

## Next Steps

1. Review each configuration file
2. Update placeholder values (Sentry DSN, privacy policy URL, etc.)
3. Test with preview build first
4. Gradually roll out to production
5. Monitor metrics and crashes
6. Iterate based on feedback

All configurations are ready for production deployment once placeholder values are filled in.
