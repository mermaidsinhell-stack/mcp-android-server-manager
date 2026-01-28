# Security Documentation

## Security Fixes Implemented

This document outlines all security measures implemented in the MCP Server Manager app.

## Critical Security Fixes

### 1. Command Injection Prevention

**Location:** `nodejs-assets/nodejs-project/main.js`, `src/utils/security.ts`

**Issue:** User-provided URLs and parameters were passed directly to shell commands.

**Fix:**
- All Git URLs are validated against allowlist of trusted hosts (github.com, gitlab.com, etc.)
- Shell metacharacters (`; & | \` $ ( )`) are rejected
- `spawn()` is used with `shell: false` to prevent shell interpretation
- Arguments are passed as array elements, not concatenated strings
- `--` separator prevents argument injection

**Validation:**
```typescript
// Before
spawn('git', ['clone', userUrl, dir]); // ❌ Vulnerable

// After  
const safeUrl = validateGitUrl(userUrl); // Throws if invalid
spawn('git', ['clone', '--', safeUrl, dir], { shell: false }); // ✅ Safe
```

### 2. Path Traversal Prevention

**Location:** `src/utils/security.ts`, `src/services/serverManager.ts`, `nodejs-assets/nodejs-project/main.js`

**Issue:** Server IDs were used directly in file paths without validation.

**Fix:**
- Server IDs sanitized to alphanumeric characters only (+ hyphens)
- All file paths validated to ensure they're within `SERVERS_DIR`
- Path normalization prevents `../` traversal
- Maximum length limits (64 chars for IDs)

**Validation:**
```typescript
// Before
const serverDir = `${SERVERS_DIR}${serverId}/`; // ❌ serverId could be "../../../etc"

// After
const safeId = sanitizeServerId(serverId); // Strips non-alphanumeric
const serverDir = `${SERVERS_DIR}${safeId}/`;
validateFilePath(serverDir, SERVERS_DIR); // Throws if outside base dir
```

### 3. Input Validation with JSON Schema

**Location:** `src/utils/schemas.ts`, `src/app/add-server.tsx`

**Issue:** GitHub API responses were trusted without validation.

**Fix:**
- Ajv schema validation for all API responses
- Validates data types, formats, and required fields
- Rejects private/archived/disabled repositories
- URL format validation with regex patterns

**Example:**
```typescript
const response = await fetchGitHubAPI(`/repos/${owner}/${repo}`);
const data = await validateResponse(response);

if (!validateGitHubRepo(data)) {
  throw new Error(getValidationErrors(validateGitHubRepo));
}
```

### 4. Process Spawning Security

**Location:** `nodejs-assets/nodejs-project/main.js`

**Issue:** Entry points from package.json executed without validation.

**Fix:**
- Entry points validated for dangerous patterns
- Relative paths only (no absolute paths)
- No shell metacharacters allowed
- Limited environment variables passed to processes
- `stdio` set to `['ignore', 'pipe', 'pipe']` to prevent stdin exploitation

**Validation:**
```typescript
function validateEntry(entry) {
  if (/[;&|`$()]/.test(entry)) return null; // Shell metacharacters
  if (entry.includes('..')) return null; // Path traversal
  if (entry.startsWith('/')) return null; // Absolute paths
  return entry;
}
```

## High Priority Security Improvements

### 5. Rate Limiting

**Location:** `src/utils/network.ts`

**Implementation:**
- GitHub API rate limit: 50 requests/hour (conservative)
- Exponential backoff for 429 responses
- Per-endpoint rate limiting support
- Memory-efficient request tracking

### 6. Cryptographically Secure IDs

**Location:** `src/utils/security.ts`, `src/stores/serverStore.ts`

**Implementation:**
- Replaced `Math.random()` with `expo-crypto.getRandomBytesAsync()`
- 128-bit random IDs (16 bytes)
- No collision risk up to millions of servers

### 7. Network Error Handling

**Location:** `src/utils/network.ts`

**Implementation:**
- Network connectivity checks before operations
- Retry logic with exponential backoff
- Configurable timeouts per operation type
- Detailed error messages for users

### 8. Memory Management

**Location:** `src/services/nodeBridge.ts`, `nodejs-assets/nodejs-project/main.js`

**Implementation:**
- Limited message handlers (max 100)
- Log buffer limits (100 lines per server, 10k total)
- Automatic cleanup of old handlers/logs
- Timeout tracking to prevent leaks

### 9. Race Condition Prevention

**Location:** `src/stores/serverStore.ts`

**Implementation:**
- Status checks before state changes
- Conditional updates based on current state
- Prevents double-start/double-stop
- Clear error messages for invalid operations

## Security Best Practices

### Input Validation

1. **Always validate at multiple layers:**
   - React Native UI layer
   - Service layer (serverManager)
   - Node.js runtime layer

2. **Use allowlists, not denylists:**
   - Allowed Git hosts defined explicitly
   - Only alphanumeric + hyphen for IDs
   - Specific port ranges (1024-65535)

3. **Fail securely:**
   - Reject invalid input with clear errors
   - Don't expose internal paths in errors
   - Log security events for monitoring

### Process Security

1. **Never use shell:**
   ```javascript
   spawn('command', args, { shell: false }) // Always
   ```

2. **Limit environment variables:**
   ```javascript
   env: {
     PATH: process.env.PATH,  // Only what's needed
     NODE_ENV: 'production',
     PORT: String(safePort),
   }
   ```

3. **Set timeouts:**
   - Clone: 5 minutes
   - npm install: 10 minutes
   - Other operations: 60 seconds

### File System Security

1. **Validate all paths:**
   ```typescript
   validateFilePath(targetPath, baseDir)
   ```

2. **Use path.join() consistently:**
   ```javascript
   path.join(SERVERS_DIR, safeId) // Not concatenation
   ```

3. **Check permissions:**
   - App runs with user-level permissions only
   - No root access required
   - Files isolated in app directory

## Remaining Security Considerations

### Tailscale Integration (TODO)

When implementing Tailscale:
1. Use official Tailscale SDK or VPN APIs
2. Validate all network configuration
3. Implement certificate pinning for Tailscale connections
4. Add network policy enforcement
5. Log all network state changes

### TLS/HTTPS (TODO)

For MCP server communication:
1. Generate self-signed certificates per server
2. Implement certificate validation
3. Use mTLS for authentication
4. Store certificates securely (Android Keystore)
5. Implement certificate rotation

### Additional Recommendations

1. **Add Content Security Policy:**
   - Restrict WebView loading (if added)
   - Whitelist allowed domains

2. **Implement Certificate Pinning:**
   - Pin GitHub API certificates
   - Pin Tailscale certificates

3. **Add Integrity Checks:**
   - Verify npm package checksums
   - Validate package-lock.json integrity

4. **Audit Logging:**
   - Log all security-relevant events
   - Server start/stop
   - File operations
   - Network requests

5. **Secure Storage:**
   - Use Android Keystore for sensitive data
   - Encrypt stored server configurations
   - Implement secure credential storage

## Security Testing

### Manual Testing Checklist

- [ ] Attempt to inject shell commands in repo URL
- [ ] Try path traversal in server IDs
- [ ] Submit malformed GitHub API responses
- [ ] Test with malicious package.json files
- [ ] Verify rate limiting behavior
- [ ] Test timeout handling with slow networks
- [ ] Verify memory limits with many servers
- [ ] Test race conditions with rapid start/stop

### Automated Security Scanning

Run these before each release:

```bash
# Dependency vulnerabilities
npm audit

# Static analysis
npx eslint . --ext .ts,.tsx

# Type checking
npx tsc --noEmit

# Bundle analysis
npx expo export --platform android
```

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do NOT open a public issue**
2. Email security@yourcompany.com with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

3. We will respond within 48 hours
4. Fix will be prioritized based on severity
5. Credit will be given in release notes (if desired)

## Security Update Policy

- **Critical:** Patch within 24 hours
- **High:** Patch within 7 days
- **Medium:** Patch within 30 days
- **Low:** Patch in next minor release

## References

- [OWASP Mobile Security Project](https://owasp.org/www-project-mobile-security/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Android Security Best Practices](https://developer.android.com/topic/security/best-practices)
- [React Native Security](https://reactnative.dev/docs/security)
