# Environment Configuration Guide

## Overview

The MCP Android Server Manager uses a centralized environment configuration system that supports multiple environments (development, preview, production) and provides type-safe access to all configuration values.

## Quick Start

### 1. Create Local Environment File

```bash
# Copy the template
cp .env.example .env

# Edit with your values
nano .env
```

### 2. Configure Sentry (Optional)

```bash
# Get your DSN from https://sentry.io
# Add to .env:
EXPO_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
```

### 3. Use Configuration in Code

```typescript
import { config } from './src/config/env';

// Access configuration values
console.log('Environment:', config.env);
console.log('Max Servers:', config.server.maxServers);
console.log('Sentry Enabled:', config.sentryEnabled);
```

---

## Configuration Structure

### Environment Configuration (`src/config/env.ts`)

The configuration system provides:

1. **Type-safe configuration** via TypeScript interfaces
2. **Environment-specific settings** (development, preview, production)
3. **Centralized defaults** with environment variable overrides
4. **Validation** on app start
5. **Helper functions** for common checks

### Configuration Categories

#### 1. Environment Info
```typescript
config.env                 // 'development' | 'preview' | 'production'
config.isDevelopment       // boolean
config.isProduction        // boolean
config.appVersion          // string
config.appBuildNumber      // string
```

#### 2. API Configuration
```typescript
config.githubApiUrl        // 'https://api.github.com'
config.githubApiTimeout    // number (ms)
```

#### 3. Sentry Configuration
```typescript
config.sentryDsn           // string | null
config.sentryEnabled       // boolean
config.sentryTracesSampleRate  // 0.0 - 1.0
```

#### 4. Feature Flags
```typescript
config.features.tailscaleEnabled
config.features.crashReportingEnabled
config.features.analyticsEnabled
config.features.debugLogsEnabled
```

#### 5. Server Configuration
```typescript
config.server.maxServers            // number | 'auto'
config.server.defaultPort           // number
config.server.baseMemoryMB          // number
config.server.reconciliationIntervalMs  // number
```

#### 6. Network Configuration
```typescript
config.network.requestTimeoutMs
config.network.retryAttempts
config.network.githubRateLimitPerHour
```

#### 7. Security Configuration
```typescript
config.security.useSecureStore
config.security.certificatePinningEnabled
config.security.ipcValidationEnabled
```

---

## Environment Variables

All environment variables are prefixed with `EXPO_PUBLIC_` to make them accessible in the app.

### Core Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `EXPO_PUBLIC_ENVIRONMENT` | string | 'development' | Environment name |
| `EXPO_PUBLIC_SENTRY_DSN` | string | null | Sentry DSN for crash reporting |

### Feature Flags

| Variable | Type | Default (Dev) | Description |
|----------|------|---------------|-------------|
| `EXPO_PUBLIC_TAILSCALE_ENABLED` | boolean | true | Enable Tailscale integration |
| `EXPO_PUBLIC_CRASH_REPORTING_ENABLED` | boolean | false | Enable Sentry crash reporting |
| `EXPO_PUBLIC_ANALYTICS_ENABLED` | boolean | false | Enable analytics tracking |
| `EXPO_PUBLIC_DEBUG_LOGS_ENABLED` | boolean | true | Enable debug console logs |

### Server Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `EXPO_PUBLIC_MAX_SERVERS` | string | 'auto' | Max concurrent servers |
| `EXPO_PUBLIC_DEFAULT_PORT` | number | 3000 | Starting port number |
| `EXPO_PUBLIC_SERVER_BASE_MEMORY_MB` | number | 512 | Memory per server (MB) |
| `EXPO_PUBLIC_RECONCILIATION_INTERVAL_MS` | number | 30000 | State check interval |

### Network Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `EXPO_PUBLIC_REQUEST_TIMEOUT_MS` | number | 30000 | HTTP timeout |
| `EXPO_PUBLIC_RETRY_ATTEMPTS` | number | 3 | Request retry count |
| `EXPO_PUBLIC_GITHUB_RATE_LIMIT_PER_HOUR` | number | 60 | GitHub API rate limit |

### Security Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `EXPO_PUBLIC_USE_SECURE_STORE` | boolean | true | Use encrypted storage |
| `EXPO_PUBLIC_CERTIFICATE_PINNING_ENABLED` | boolean | true | Enable cert pinning |
| `EXPO_PUBLIC_IPC_VALIDATION_ENABLED` | boolean | true | Validate IPC messages |

---

## Environment-Specific Configurations

### Development Environment

```typescript
// Characteristics:
- Sentry disabled
- Debug logs enabled
- Analytics disabled
- All features enabled for testing

// Usage:
EXPO_PUBLIC_ENVIRONMENT=development npm start
```

### Preview Environment

```typescript
// Characteristics:
- Sentry enabled (if DSN provided)
- Debug logs enabled
- 50% trace sampling
- Internal testing configuration

// Usage:
EXPO_PUBLIC_ENVIRONMENT=preview eas build --profile preview
```

### Production Environment

```typescript
// Characteristics:
- Sentry enabled (if DSN provided)
- Debug logs disabled
- 20% trace sampling
- Optimized for performance

// Usage:
EXPO_PUBLIC_ENVIRONMENT=production eas build --profile production
```

---

## Usage Examples

### Example 1: Conditional Feature Rendering

```typescript
import { config } from '@/config/env';

export function DebugPanel() {
  // Only show in development
  if (!config.features.debugLogsEnabled) {
    return null;
  }
  
  return (
    <View>
      <Text>Environment: {config.env}</Text>
      <Text>Version: {config.appVersion}</Text>
    </View>
  );
}
```

### Example 2: Environment-Aware API Calls

```typescript
import { config } from '@/config/env';

async function fetchGitHubRepo(owner: string, repo: string) {
  const url = `${config.githubApiUrl}/repos/${owner}/${repo}`;
  
  const response = await fetch(url, {
    timeout: config.githubApiTimeout,
  });
  
  if (config.features.debugLogsEnabled) {
    console.log('GitHub API Response:', response.status);
  }
  
  return response.json();
}
```

### Example 3: Sentry Integration

```typescript
import { config } from '@/config/env';
import * as Sentry from 'sentry-expo';

export function initializeSentry() {
  if (!config.sentryEnabled || !config.sentryDsn) {
    console.log('Sentry disabled');
    return;
  }
  
  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.env,
    tracesSampleRate: config.sentryTracesSampleRate,
    debug: config.isDevelopment,
  });
}
```

### Example 4: Server Limit Enforcement

```typescript
import { config } from '@/config/env';
import { getDeviceRAM } from '@/utils/deviceInfo';

export function getMaxServers(): number {
  if (config.server.maxServers === 'auto') {
    const ramGB = getDeviceRAM();
    return Math.floor(ramGB / 0.5); // 1 server per 512MB
  }
  
  return config.server.maxServers;
}
```

### Example 5: Feature Flag Gating

```typescript
import { config } from '@/config/env';

export function TailscaleSection() {
  if (!config.features.tailscaleEnabled) {
    return <Text>Tailscale support coming soon!</Text>;
  }
  
  return <TailscaleCard />;
}
```

---

## Configuration Validation

The configuration system automatically validates on app start:

```typescript
import { validateConfig, logConfig } from '@/config/env';

// In app/_layout.tsx or App.tsx
useEffect(() => {
  // Validate configuration
  const isValid = validateConfig();
  if (!isValid) {
    Alert.alert('Configuration Error', 'Please check your environment settings');
  }
  
  // Log configuration in development
  if (__DEV__) {
    logConfig();
  }
}, []);
```

Validation checks:
- ✅ Sentry DSN present if crash reporting enabled in production
- ✅ Max servers is positive number
- ✅ Default port in valid range (1024-65535)
- ✅ Request timeout >= 1000ms
- ✅ Retry attempts >= 0

---

## Best Practices

### 1. Never Commit .env File

```bash
# Already in .gitignore
.env
.env.local
.env.*.local
```

### 2. Use Type-Safe Access

```typescript
// ✅ Good
import { config } from '@/config/env';
const port = config.server.defaultPort;

// ❌ Bad
const port = process.env.EXPO_PUBLIC_DEFAULT_PORT;
```

### 3. Provide Fallback Values

```typescript
// ✅ Good
const dsn = config.sentryDsn || null;

// ❌ Bad (might crash)
const dsn = config.sentryDsn;
```

### 4. Document Environment Changes

When adding new environment variables:
1. Update `.env.example` with description
2. Add to `AppConfig` interface
3. Add default value in environment configs
4. Update this documentation
5. Add validation if needed

### 5. Test All Environments

```bash
# Development
EXPO_PUBLIC_ENVIRONMENT=development npm start

# Preview
EXPO_PUBLIC_ENVIRONMENT=preview npm start

# Production (build only)
EXPO_PUBLIC_ENVIRONMENT=production eas build
```

---

## Troubleshooting

### Configuration Not Loading

**Problem:** Environment variables not accessible

**Solutions:**
1. Restart Expo dev server: `expo start --clear`
2. Verify variable has `EXPO_PUBLIC_` prefix
3. Check `.env` file exists and is not in `.gitignore`

### Sentry Not Working

**Problem:** Crashes not reported to Sentry

**Solutions:**
1. Verify DSN is set: `echo $EXPO_PUBLIC_SENTRY_DSN`
2. Check `config.sentryEnabled` is `true`
3. Ensure not in development mode (Sentry disabled by default)
4. Test with: `throw new Error('Test error')`

### Wrong Environment Detected

**Problem:** App thinks it's in wrong environment

**Solutions:**
1. Check `EXPO_PUBLIC_ENVIRONMENT` variable
2. Verify spelling (case-sensitive)
3. Clear cache: `expo start --clear`
4. Check `app.json` extra.environment field

### Variables Not Updating

**Problem:** Changed .env but values don't update

**Solutions:**
1. Always restart dev server after .env changes
2. Use `--clear` flag: `expo start --clear`
3. Rebuild app if using custom native code

---

## Migration from Hardcoded Values

If you have hardcoded values, migrate them to the config system:

### Before:
```typescript
// ❌ Hardcoded
const SENTRY_DSN = 'https://...';
const MAX_SERVERS = 8;
const DEFAULT_PORT = 3000;
```

### After:
```typescript
// ✅ Config-based
import { config } from '@/config/env';

const dsn = config.sentryDsn;
const maxServers = config.server.maxServers;
const port = config.server.defaultPort;
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/build.yml
env:
  EXPO_PUBLIC_ENVIRONMENT: production
  EXPO_PUBLIC_SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
  EXPO_PUBLIC_CRASH_REPORTING_ENABLED: true
  EXPO_PUBLIC_DEBUG_LOGS_ENABLED: false
```

### EAS Build Secrets

```bash
# Store secrets in EAS
eas secret:create --scope project --name SENTRY_DSN --value "https://..."

# Reference in eas.json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_SENTRY_DSN": "@SENTRY_DSN"
      }
    }
  }
}
```

---

## Security Considerations

### ✅ Safe to Expose (EXPO_PUBLIC_)
- Feature flags
- API endpoints (public)
- Timeout values
- Port numbers
- Environment names

### ❌ Never Expose
- API keys
- Private tokens
- Passwords
- Encryption keys
- Database credentials

**Note:** All `EXPO_PUBLIC_` variables are included in the app bundle and can be extracted. Never use them for secrets.

---

## Future Enhancements

Potential additions:
1. Remote config (Firebase Remote Config)
2. A/B testing integration
3. Dynamic feature flags
4. Environment-specific analytics
5. Runtime config updates

---

## References

- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [EAS Build Configuration](https://docs.expo.dev/build/eas-json/)
- [Sentry Configuration](https://docs.sentry.io/platforms/react-native/)

---

## Support

For configuration issues:
1. Check this documentation
2. Review `.env.example` for all available options
3. Run `validateConfig()` to identify issues
4. Check console for validation errors

---

**Last Updated:** January 2026  
**Version:** 1.0.0
