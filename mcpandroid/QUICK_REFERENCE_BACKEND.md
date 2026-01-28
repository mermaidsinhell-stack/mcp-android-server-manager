# Backend Architecture Quick Reference

Quick reference for developers working with the improved backend architecture.

## File Locations

```
mcpandroid/
├── src/
│   ├── services/
│   │   ├── nodeBridge.ts           # Node.js IPC bridge (health checks, auto-restart, queue)
│   │   ├── messageQueue.ts         # Priority queue with concurrency control
│   │   └── serverManager.ts        # Server lifecycle management
│   ├── stores/
│   │   └── serverStore.ts          # Zustand store (MAX_SERVERS enforcement)
│   └── utils/
│       └── deviceInfo.ts           # Device RAM detection and capability analysis
└── nodejs-assets/
    └── nodejs-project/
        └── main.js                 # Node.js runtime (memory monitoring)
```

## Common Operations

### 1. Check Device Capabilities

```typescript
import { useServerStore } from '@/stores/serverStore';

const capabilities = useServerStore(state => state.deviceCapabilities);

if (capabilities) {
  console.log(`Max Servers: ${capabilities.maxServers}`);
  console.log(`Memory Tier: ${capabilities.memoryTier}`);
  console.log(`Concurrency: ${capabilities.recommendedConcurrency}`);
  console.log(`Total RAM: ${capabilities.totalMemoryMB}MB`);
}
```

### 2. Send Priority Message

```typescript
import { nodeBridge } from '@/services/nodeBridge';
import { Priority } from '@/services/messageQueue';

// High priority (user-initiated)
await nodeBridge.sendMessage({ type: 'start', serverId: 'abc' }, Priority.HIGH);

// Normal priority (background)
await nodeBridge.sendMessage({ type: 'status', serverId: 'abc' }, Priority.NORMAL);

// Low priority (deferred)
await nodeBridge.sendMessage({ type: 'clone', serverId: 'abc', payload: {...} }, Priority.LOW);
```

### 3. Check Bridge Health

```typescript
import { nodeBridge } from '@/services/nodeBridge';

const health = nodeBridge.getHealthStatus();

if (!health.healthy) {
  console.warn('Bridge unhealthy:', health);
}

// Check if initialized and not crashed
if (nodeBridge.isHealthy()) {
  // Safe to send messages
}
```

### 4. Monitor Queue

```typescript
import { nodeBridge } from '@/services/nodeBridge';

// Get overall stats
const stats = nodeBridge.getQueueStats();
console.log(`Pending: ${stats.pending}, Running: ${stats.running}`);

// Get breakdown by priority
const breakdown = nodeBridge.getQueueBreakdown();
console.log('High:', breakdown.highPriority);
console.log('Normal:', breakdown.normalPriority);
console.log('Low:', breakdown.lowPriority);
```

### 5. Query Memory Usage

```typescript
import { nodeBridge } from '@/services/nodeBridge';

const response = await nodeBridge.sendMessage({ type: 'memory-stats' });
const memoryStats = response.payload;

console.log('Total Memory:', memoryStats._total.memoryMB, 'MB');
console.log('Server Count:', memoryStats._total.serverCount);

// Per-server memory
Object.entries(memoryStats).forEach(([serverId, stats]) => {
  if (serverId !== '_total') {
    console.log(`${serverId}: ${stats.memoryMB}MB`);
  }
});
```

### 6. Handle Memory Warnings

```typescript
import { nodeBridge } from '@/services/nodeBridge';

// Listen for memory warnings
nodeBridge.addHandler('memory-warnings', (message) => {
  if (message.type === 'memory-warning') {
    const { serverId, payload } = message;
    const { memoryMB, level, threshold } = payload;

    if (level === 'critical') {
      alert(`Server ${serverId} using ${memoryMB}MB (critical: ${threshold}MB)`);
    }
  }

  if (message.type === 'memory-critical') {
    const { serverId, payload } = message;
    alert(`Server ${serverId} killed: ${payload.memoryMB}MB exceeded limit`);
  }
});
```

## Priority Guidelines

### Use HIGH Priority For:
- Start/Stop server (user clicked button)
- Delete server (user wants immediate action)
- User-facing status checks

### Use NORMAL Priority For:
- Background status polling
- Log retrieval
- Non-urgent queries

### Use LOW Priority For:
- Clone operations (long-running)
- Bulk operations
- Background maintenance

## Error Handling

### Queue Errors

```typescript
try {
  await nodeBridge.sendMessage(message, Priority.HIGH);
} catch (error) {
  if (error.message.includes('timeout')) {
    // Operation timed out
  } else if (error.message.includes('Bridge restarting')) {
    // Bridge is recovering, retry after delay
    await new Promise(resolve => setTimeout(resolve, 5000));
    // Retry...
  } else {
    // Other error
  }
}
```

### Server Limit Errors

```typescript
import { useServerStore } from '@/stores/serverStore';

try {
  await useServerStore.getState().addServer(repo);
} catch (error) {
  if (error.message.includes('Server limit reached')) {
    // Show user device capacity message
    const caps = useServerStore.getState().deviceCapabilities;
    alert(`Device supports max ${caps?.maxServers || 2} servers`);
  }
}
```

## Configuration Constants

### Message Queue

```typescript
// In messageQueue.ts
OPERATION_TIMEOUTS = {
  clone: 10 * 60 * 1000,    // 10 minutes
  start: 60 * 1000,         // 60 seconds
  stop: 30 * 1000,          // 30 seconds
  status: 10 * 1000,        // 10 seconds
  logs: 15 * 1000,          // 15 seconds
  delete: 30 * 1000,        // 30 seconds
}

RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
}
```

### Health Checks

```typescript
// In nodeBridge.ts
HEALTH_CHECK_CONFIG = {
  intervalMs: 10000,        // Check every 10s
  timeoutMs: 5000,          // 5s timeout
  maxFailures: 3,           // Restart after 3 failures
  recoveryCheckMs: 30000,   // Check recovery every 30s
}

RESTART_CONFIG = {
  maxAttempts: 5,           // Max 5 restart attempts
  resetWindowMs: 300000,    // Reset after 5 minutes
  initialDelayMs: 1000,     // Start with 1s delay
  maxDelayMs: 30000,        // Max 30s delay
}
```

### Memory Limits

```typescript
// In deviceInfo.ts
CONFIG = {
  SERVER_BASE_MEMORY: 512,      // 512MB base
  SERVER_PEAK_MEMORY: 768,      // 768MB peak
  SYSTEM_RESERVE: 1024,         // 1GB for system
  APP_OVERHEAD: 512,            // 512MB for app
  SAFETY_FACTOR: 0.7,           // Use 70% of available
  ABSOLUTE_MAX_SERVERS: 8,      // Never exceed 8
}
```

```javascript
// In main.js (Node.js)
MEMORY_WARNING_THRESHOLD = 512 * 1024 * 1024;    // 512MB
MEMORY_CRITICAL_THRESHOLD = 768 * 1024 * 1024;   // 768MB
MEMORY_KILL_THRESHOLD = 1024 * 1024 * 1024;      // 1GB
MEMORY_CHECK_INTERVAL = 30000;                   // 30s
```

## Debugging Tips

### Enable Verbose Logging

```typescript
// Check all bridge operations
const stats = nodeBridge.getStats();
console.log('Bridge Stats:', stats);

// Check queue details
const queueStats = nodeBridge.getQueueStats();
console.log('Queue Stats:', queueStats);

// Check device capabilities
const store = useServerStore.getState();
console.log('Device Capabilities:', store.deviceCapabilities);
```

### Monitor Health Continuously

```typescript
// Log health every minute
setInterval(() => {
  const health = nodeBridge.getHealthStatus();
  if (!health.healthy) {
    console.warn('Bridge Health Issue:', health);
  }
}, 60000);
```

### Track Memory Trends

```typescript
// Query memory every 30s
setInterval(async () => {
  try {
    const response = await nodeBridge.sendMessage({ type: 'memory-stats' });
    const total = response.payload._total;
    console.log(`Memory: ${total.memoryMB}MB (${total.serverCount} servers)`);
  } catch (error) {
    console.error('Failed to get memory stats:', error);
  }
}, 30000);
```

## Testing Checklist

### Device Capability Tests
- [ ] Test on 2GB RAM device (should limit to 1-2 servers)
- [ ] Test on 4GB RAM device (should limit to 3-4 servers)
- [ ] Test on 6GB+ RAM device (should limit to 5-8 servers)
- [ ] Test fallback when expo-device unavailable

### Queue Tests
- [ ] Start 5 servers simultaneously (should queue properly)
- [ ] Mix high/normal/low priority operations
- [ ] Test timeout handling (simulate slow operation)
- [ ] Test retry mechanism (simulate network error)

### Crash Recovery Tests
- [ ] Kill Node.js process (should auto-restart)
- [ ] Check state preservation after restart
- [ ] Verify max restart attempts (should stop after 5)
- [ ] Test boot loop prevention

### Memory Monitoring Tests
- [ ] Start memory-heavy server (should send warnings)
- [ ] Exceed 1GB limit (should auto-kill server)
- [ ] Check memory stats API accuracy
- [ ] Verify memory tracking cleanup on server stop

## Common Pitfalls

### ❌ Don't Do This

```typescript
// DON'T bypass the queue
await nodeBridge.sendMessageDirect(message); // Private method!

// DON'T ignore device capabilities
// Always check before adding servers

// DON'T use very long timeouts
await nodeBridge.sendMessage(message, Priority.HIGH, 99999999);
```

### ✅ Do This Instead

```typescript
// DO use the queue with appropriate priority
await nodeBridge.sendMessage(message, Priority.HIGH);

// DO check device limits
const caps = store.deviceCapabilities;
if (caps && serverCount >= caps.maxServers) {
  throw new Error('Server limit reached');
}

// DO use default timeouts (or reasonable overrides)
await nodeBridge.sendMessage(message, Priority.NORMAL);
```

## Additional Resources

- **Full Documentation**: See `BACKEND_IMPROVEMENTS_SUMMARY.md`
- **API Reference**: Check individual file JSDoc comments
- **Architecture Diagram**: (TODO: Add Mermaid diagram)

---

**Last Updated**: 2026-01-28
