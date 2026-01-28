# Build Environment Plugin Guide - MCP Android Server Manager

## Overview

This guide explains how to create and use an Expo config plugin to manage environment-specific build configurations for development, preview, and production builds.

---

## Current Configuration Status

The app currently uses environment variables via `eas.json`:

```json
{
  "build": {
    "development": {
      "env": {
        "APP_ENV": "development"
      }
    },
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
}
```

This is sufficient for most use cases. This guide explains how to extend it with a custom plugin if needed.

---

## Environment Variables Approach (Current)

### Setup

Environment variables are already configured in `eas.json`:

```json
{
  "build": {
    "development": {
      "env": {
        "APP_ENV": "development"
      }
    },
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
}
```

### Usage in Code

Access environment in your code:

```typescript
// app.ts or App.tsx
const APP_ENV = process.env.APP_ENV || 'development';

const CONFIG = {
  development: {
    apiUrl: 'http://localhost:3000',
    enableLogging: true,
    sentryEnabled: false,
  },
  preview: {
    apiUrl: 'https://preview-api.example.com',
    enableLogging: true,
    sentryEnabled: true,
    sentryEnvironment: 'preview',
  },
  production: {
    apiUrl: 'https://api.example.com',
    enableLogging: false,
    sentryEnabled: true,
    sentryEnvironment: 'production',
  },
};

const currentConfig = CONFIG[APP_ENV as keyof typeof CONFIG] || CONFIG.development;

export default currentConfig;
```

### Building with Specific Environments

```bash
# Development (automatic with expo start)
npm run start

# Preview (with environment variables)
npm run build:android
# Automatically sets APP_ENV=preview via eas.json

# Production (with environment variables)
eas build --platform android --profile production
# Automatically sets APP_ENV=production via eas.json
```

---

## Advanced: Custom Config Plugin (Optional)

If you need more advanced environment-specific configuration, create a custom plugin.

### When to Use a Plugin

**Use a plugin if you need:**
- Modify AndroidManifest.xml based on environment
- Change build types (debug vs release)
- Different package names per environment
- Environment-specific resources
- Different signing keys per environment
- Custom Gradle properties

**You don't need a plugin if:**
- Just need environment variables ✓ (current setup)
- App configuration changes in code
- Different API endpoints
- Feature flags

### Creating a Custom Plugin

**File:** `plugins/withBuildEnvironment.js`

```javascript
const { withAppDelegate, withAndroidManifest } = require('expo/config-plugins');

const withBuildEnvironment = (config, { environment = 'development' } = {}) => {
  /**
   * Modify Android configuration based on build environment
   */
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;

    // Modify manifest based on environment
    if (environment === 'production') {
      // Disable debug logging in production
      const manifest = androidManifest.manifest[0];
      if (!manifest['meta-data']) {
        manifest['meta-data'] = [];
      }

      manifest['meta-data'].push({
        $: {
          'android:name': 'com.mcpserver.DEBUG_ENABLED',
          'android:value': 'false',
        },
      });
    }

    return config;
  });

  /**
   * Modify iOS configuration based on build environment
   */
  config = withAppDelegate(config, async (config) => {
    let appDelegate = config.modResults;

    // Modify app delegate based on environment
    if (environment === 'production') {
      // Disable debug features in production
      appDelegate = appDelegate.replace(
        '#define DEBUG_ENABLED 1',
        '#define DEBUG_ENABLED 0'
      );
    }

    return config;
  });

  return config;
};

module.exports = withBuildEnvironment;
```

### Using the Plugin

**File:** `app.json`

```json
{
  "expo": {
    "plugins": [
      ["expo-router"],
      ["expo-font"],
      [
        "./plugins/withBuildEnvironment",
        {
          "environment": "development"
        }
      ]
    ]
  }
}
```

### Dynamic Plugin Configuration

Create separate config files for each environment:

**File:** `app.json`
```json
{
  "expo": {
    "plugins": ["expo-router", "expo-font"]
  }
}
```

**File:** `app.development.json`
```json
{
  "expo": {
    "plugins": [
      [
        "./plugins/withBuildEnvironment",
        {
          "environment": "development"
        }
      ]
    ]
  }
}
```

**File:** `app.production.json`
```json
{
  "expo": {
    "plugins": [
      [
        "./plugins/withBuildEnvironment",
        {
          "environment": "production"
        }
      ]
    ]
  }
}
```

**File:** `eas.json`
```json
{
  "build": {
    "development": {
      "appBuildGradle": "app.development.json"
    },
    "production": {
      "appBuildGradle": "app.production.json"
    }
  }
}
```

---

## Environment-Specific Sentry Configuration

### Setup

**File:** `src/config/sentry.ts`

```typescript
import * as Sentry from 'sentry-expo';

const SENTRY_CONFIG = {
  development: {
    enabled: false,
    tracesSampleRate: 0.1,
  },
  preview: {
    enabled: true,
    tracesSampleRate: 0.5,
    environment: 'preview',
  },
  production: {
    enabled: true,
    tracesSampleRate: 0.1,
    environment: 'production',
  },
};

export function initSentry() {
  const env = process.env.APP_ENV || 'development';
  const config = SENTRY_CONFIG[env as keyof typeof SENTRY_CONFIG];

  if (config.enabled) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: config.environment,
      tracesSampleRate: config.tracesSampleRate,
      enableInExpoDevelopment: false,
    });
  }
}
```

### Usage

```typescript
// In App.tsx
import { initSentry } from './src/config/sentry';

initSentry();
```

---

## Environment-Specific API Configuration

### Setup

**File:** `src/config/api.ts`

```typescript
export const API_CONFIG = {
  development: {
    baseUrl: 'http://localhost:3000',
    timeout: 30000,
    retryAttempts: 3,
  },
  preview: {
    baseUrl: 'https://preview-api.mcpserver.com',
    timeout: 30000,
    retryAttempts: 3,
  },
  production: {
    baseUrl: 'https://api.mcpserver.com',
    timeout: 60000,
    retryAttempts: 5,
  },
};

export function getApiConfig() {
  const env = process.env.APP_ENV || 'development';
  return API_CONFIG[env as keyof typeof API_CONFIG];
}
```

### Usage

```typescript
import { getApiConfig } from './src/config/api';

const config = getApiConfig();
const apiClient = new APIClient(config.baseUrl, {
  timeout: config.timeout,
  retryAttempts: config.retryAttempts,
});
```

---

## Feature Flags by Environment

### Setup

**File:** `src/config/features.ts`

```typescript
export const FEATURE_FLAGS = {
  development: {
    enableDebugMenu: true,
    enableAnalytics: false,
    enableCrashReporting: false,
    enableBetaFeatures: true,
  },
  preview: {
    enableDebugMenu: true,
    enableAnalytics: true,
    enableCrashReporting: true,
    enableBetaFeatures: true,
  },
  production: {
    enableDebugMenu: false,
    enableAnalytics: true,
    enableCrashReporting: true,
    enableBetaFeatures: false,
  },
};

export function getFeatureFlags() {
  const env = process.env.APP_ENV || 'development';
  return FEATURE_FLAGS[env as keyof typeof FEATURE_FLAGS];
}

export function isFeatureEnabled(featureName: keyof typeof FEATURE_FLAGS.development) {
  const flags = getFeatureFlags();
  return flags[featureName] || false;
}
```

### Usage

```typescript
import { isFeatureEnabled } from './src/config/features';

if (isFeatureEnabled('enableDebugMenu')) {
  // Show debug menu
}

if (isFeatureEnabled('enableCrashReporting')) {
  // Initialize crash reporting
}
```

---

## Build Type Configuration

### Setup

**File:** `src/config/buildTypes.ts`

```typescript
export const BUILD_TYPE_CONFIG = {
  debug: {
    minifyEnabled: false,
    debuggable: true,
    proguardEnabled: false,
    logLevel: 'debug',
  },
  release: {
    minifyEnabled: true,
    debuggable: false,
    proguardEnabled: true,
    logLevel: 'warn',
  },
};

export function getBuildTypeConfig() {
  // This is set via gradle build configuration
  const buildType = __DEV__ ? 'debug' : 'release';
  return BUILD_TYPE_CONFIG[buildType];
}
```

### Usage

```typescript
import { getBuildTypeConfig } from './src/config/buildTypes';

const config = getBuildTypeConfig();

// Configure logging level
console.debug = config.logLevel === 'debug'
  ? console.debug
  : () => {};

// Configure analytics sampling
const analyticsSampleRate = config.logLevel === 'debug' ? 1.0 : 0.1;
```

---

## Logging Configuration by Environment

### Setup

**File:** `src/config/logging.ts`

```typescript
const LOG_LEVELS = {
  development: 'debug',
  preview: 'info',
  production: 'warn',
};

function createLogger(name: string) {
  const env = process.env.APP_ENV || 'development';
  const logLevel = LOG_LEVELS[env as keyof typeof LOG_LEVELS];

  return {
    debug: (message: string, ...args: any[]) => {
      if (logLevel === 'debug') {
        console.log(`[DEBUG] ${name}:`, message, ...args);
      }
    },
    info: (message: string, ...args: any[]) => {
      if (logLevel === 'debug' || logLevel === 'info') {
        console.log(`[INFO] ${name}:`, message, ...args);
      }
    },
    warn: (message: string, ...args: any[]) => {
      console.warn(`[WARN] ${name}:`, message, ...args);
    },
    error: (message: string, ...args: any[]) => {
      console.error(`[ERROR] ${name}:`, message, ...args);
    },
  };
}

export default createLogger;
```

### Usage

```typescript
import createLogger from './src/config/logging';

const logger = createLogger('MyComponent');

logger.debug('This only appears in development');
logger.info('This appears in development and preview');
logger.warn('This appears in all environments');
logger.error('This appears in all environments');
```

---

## Testing Environment-Specific Code

### Unit Tests

**File:** `src/__tests__/config.test.ts`

```typescript
import { getApiConfig } from '../src/config/api';
import { getFeatureFlags } from '../src/config/features';

describe('Environment Configuration', () => {
  const originalEnv = process.env.APP_ENV;

  afterEach(() => {
    process.env.APP_ENV = originalEnv;
  });

  describe('API Config', () => {
    test('development should use localhost', () => {
      process.env.APP_ENV = 'development';
      const config = getApiConfig();
      expect(config.baseUrl).toBe('http://localhost:3000');
    });

    test('production should use production URL', () => {
      process.env.APP_ENV = 'production';
      const config = getApiConfig();
      expect(config.baseUrl).toBe('https://api.mcpserver.com');
    });
  });

  describe('Feature Flags', () => {
    test('development should enable debug menu', () => {
      process.env.APP_ENV = 'development';
      const flags = getFeatureFlags();
      expect(flags.enableDebugMenu).toBe(true);
    });

    test('production should disable debug menu', () => {
      process.env.APP_ENV = 'production';
      const flags = getFeatureFlags();
      expect(flags.enableDebugMenu).toBe(false);
    });
  });
});
```

---

## Build Command Summary

### Development Build

```bash
npm run start
# Uses development environment automatically
# Full logging, debug menu enabled
# Connect to local server (if running)
```

### Preview Build

```bash
npm run build:android
# Sets APP_ENV=preview via eas.json
# Reduced logging, beta features enabled
# Connects to preview server
```

### Production Build

```bash
eas build --platform android --profile production
# Sets APP_ENV=production via eas.json
# Minimal logging, beta features disabled
# Connects to production server
# Full code obfuscation
```

---

## Troubleshooting

### Environment Variable Not Set

**Problem:** `process.env.APP_ENV` is undefined

**Solution:**
```bash
# Clear cache
npm cache clean --force

# Verify eas.json has correct environment
cat eas.json | grep -A5 APP_ENV

# Rebuild
eas build --platform android --profile production --no-cache
```

### Wrong Configuration Loaded

**Problem:** App using production config when it should use development

**Solution:**
```typescript
// Add debug logging
console.log('Current environment:', process.env.APP_ENV);

// Check in device logs
adb logcat | grep "Current environment"
```

### ProGuard Removing Environment Code

**Problem:** Environment checks compiled away

**Solution:**
```proguard
# Add to proguard-rules.pro
-keepclassmembers class * {
    public static final *** *_CONFIG;
}
```

---

## Best Practices

✓ Define all environments (development, preview, production)
✓ Use type-safe configuration objects
✓ Log current environment on app start
✓ Test each environment before release
✓ Keep sensitive data in EAS Secrets, not environment variables
✓ Use feature flags for gradual rollout
✓ Monitor which environment reports crashes via Sentry

---

## Next Steps

1. **Current State:** Environment variables configured in eas.json ✓
2. **Optional:** Create custom config files for each environment
3. **Optional:** Add config plugin for advanced customization
4. **Recommended:** Implement feature flags system
5. **Recommended:** Add environment-specific logging

---

## References

- [Expo Config Plugins](https://docs.expo.dev/config-plugins/introduction/)
- [EAS Build Environment Variables](https://docs.expo.dev/build/environment-variables/)
- [React Native Environment Variables](https://reactnative.dev/docs/environment-setup)

---

**Last Updated:** 2024
**Status:** Current environment configuration is sufficient for most use cases
**Owner:** Development Team

