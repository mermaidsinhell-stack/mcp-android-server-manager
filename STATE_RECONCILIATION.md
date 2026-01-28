# State Reconciliation and Monitoring System

## Overview

The MCP Android Server Manager now includes a production-grade state reconciliation system that prevents UI state drift from actual server status. This system provides automatic drift detection, correction, and comprehensive observability.

## Problem Statement

React Native state can drift from actual server status due to:
- Server crashes without notification
- External processes starting/stopping servers
- Network issues preventing status updates
- React Native bridge failures
- Node.js runtime crashes

**Result:** UI shows "running" but server is actually stopped (or vice versa)

## Solution

A comprehensive state reconciliation system with:
1. **Periodic Status Polling** - Every 30 seconds (configurable)
2. **Automatic Drift Correction** - Updates state when mismatches detected
3. **User Notifications** - Alerts for unexpected state changes
4. **Comprehensive Metrics** - Track drift events, reconciliation cycles, bridge health
5. **Lifecycle Awareness** - Pauses when app backgrounded to save battery
6. **Error Resilience** - Exponential backoff, concurrency limits, retry logic

---

## Architecture

### Components

#### 1. **Metrics Service** (`src/services/metrics.ts`)
Production-grade observability for tracking system health and reliability.

**Features:**
- State drift event tracking
- Reconciliation cycle metrics
- Bridge health monitoring
- Performance metrics
- Aggregated summaries and health checks
- External reporter integration (Sentry, DataDog, etc.)

**Key Metrics Tracked:**
```typescript
// Drift metrics
- totalDriftEvents: number
- driftEventsLast24h: number
- driftEventsByType: Record<string, number>
- averageDetectionLatency: number (ms)
- autoFixSuccessRate: number (%)

// Reconciliation metrics
- totalReconciliations: number
- successfulReconciliations: number
- failedReconciliations: number
- averageReconciliationDuration: number (ms)
- lastReconciliationTimestamp: number | null
- reconciliationSuccessRate: number (%)

// Bridge health metrics
- bridgeHealthyPercentage: number (%)
- averageQueueDepth: number
- averageQueueLatency: number | null (ms)
- bridgeRestartCount: number
```

#### 2. **State Reconciliation Service** (`src/services/stateReconciliation.ts`)
Core reconciliation engine with drift detection and automatic correction.

**Features:**
- Periodic polling with configurable interval (default: 30s)
- Concurrent server status checks with limits
- Automatic state correction
- User notifications for unexpected changes
- Lifecycle-aware (pause/resume)
- Exponential backoff on failures
- Manual reconciliation trigger

**Configuration:**
```typescript
{
  enabled: true,
  intervalMs: 30000,              // 30 seconds
  maxConcurrentChecks: 3,         // Check 3 servers at a time
  enableNotifications: true,      // Show user alerts
  pauseWhenBackgrounded: true,    // Pause when app backgrounded
  retryAttempts: 3,               // Retry on failure
  retryDelayMs: 1000,             // Initial retry delay
  maxRetryDelayMs: 30000,         // Max retry delay
  enableMetrics: true,            // Track metrics
  enableAutoFix: true,            // Auto-correct drift
  notifyOnAutoFix: true,          // Notify user of fixes
}
```

#### 3. **Application Lifecycle Integration** (`src/app/_layout.tsx`)
Manages reconciliation based on app state (foreground/background).

**Features:**
- Initialize reconciliation on app startup
- Pause when app backgrounds (saves battery)
- Resume when app foregrounds
- Periodic bridge health tracking
- Metrics summary logging

---

## How It Works

### 1. Initialization Flow

```
App Startup
    ↓
Fonts Loaded
    ↓
Initialize Reconciliation Service
    ↓
Start Periodic Polling (30s interval)
    ↓
Track Bridge Health (60s interval)
```

### 2. Reconciliation Cycle

```
Timer Triggers (every 30s)
    ↓
Check Node Bridge Health
    ↓
Get Current Servers from Store
    ↓
Check Each Server Status (max 3 concurrent)
    ↓
Compare Expected vs Actual Status
    ↓
Detect Drifts
    ↓
Auto-Fix State in Store
    ↓
Notify User (if configured)
    ↓
Track Metrics
    ↓
Schedule Next Cycle
```

### 3. Drift Detection Logic

```typescript
for each server {
  expectedStatus = server.status (from React Native state)
  actualStatus = await getServerStatus() (from Node.js runtime)

  if (expectedStatus !== actualStatus) {
    // DRIFT DETECTED!

    // 1. Update store with actual status
    storeUpdateCallback(serverId, actualStatus)

    // 2. Track drift event
    metricsService.trackDriftEvent({
      serverId,
      serverName,
      expectedStatus,
      actualStatus,
      timestamp,
      detectionLatency,
      autoFixed: true,
      userNotified: true
    })

    // 3. Notify user
    Alert.alert("Server Status Changed", message)
  }
}
```

### 4. Lifecycle Management

```typescript
// App foregrounded
AppState: 'active'
    ↓
Resume Reconciliation
    ↓
Log Metrics Summary

// App backgrounded
AppState: 'background'
    ↓
Pause Reconciliation (saves battery)
```

---

## User Notifications

### Notification Scenarios

1. **Server Crashed Unexpectedly**
   - **Trigger:** `running` → `stopped`
   - **Title:** "Server Stopped Unexpectedly"
   - **Message:** "{ServerName} has stopped unexpectedly. The server may have crashed or been stopped externally."

2. **Server Error State**
   - **Trigger:** `running` → `error`
   - **Title:** "Server Crashed"
   - **Message:** "{ServerName} encountered an error and has stopped. Check the logs for details."

3. **External Server Start**
   - **Trigger:** `stopped` → `running`
   - **Title:** "Server Started Externally"
   - **Message:** "{ServerName} was started outside the app. The UI has been updated to reflect this."

---

## Observability & Monitoring

### Accessing Metrics

```typescript
import { metricsService } from './services/metrics';

// Get comprehensive summary
const summary = metricsService.getSummary();
console.log('Drift events:', summary.totalDriftEvents);
console.log('Reconciliation success rate:', summary.reconciliationSuccessRate);
console.log('Bridge health:', summary.bridgeHealthyPercentage);

// Get recent drift events
const recentDrifts = metricsService.getRecentDriftEvents(10);

// Get recent reconciliation cycles
const recentReconciliations = metricsService.getRecentReconciliations(10);

// Check system health
const { healthy, issues } = metricsService.isSystemHealthy();
if (!healthy) {
  console.warn('System health issues:', issues);
}
```

### Integrating External Monitoring

```typescript
import { metricsService, MetricsReporter } from './services/metrics';
import * as Sentry from '@sentry/react-native';

// Create custom reporter
const sentryReporter: MetricsReporter = {
  reportDrift: (event) => {
    Sentry.captureMessage('State drift detected', {
      level: 'warning',
      extra: event,
    });
  },

  reportReconciliation: (cycle) => {
    if (!cycle.success) {
      Sentry.captureMessage('Reconciliation failed', {
        level: 'error',
        extra: cycle,
      });
    }
  },

  reportBridgeHealth: (health) => {
    if (!health.healthy) {
      Sentry.captureMessage('Bridge unhealthy', {
        level: 'error',
        extra: health,
      });
    }
  },

  reportPerformance: (metric) => {
    if (metric.duration > 5000) {
      Sentry.captureMessage('Slow operation', {
        level: 'warning',
        extra: metric,
      });
    }
  },
};

// Register reporter
metricsService.registerReporter(sentryReporter);

// Enable external reporting
metricsService.configure({ enableExternalReporting: true });
```

---

## Configuration

### Reconciliation Configuration

```typescript
import { stateReconciliationService } from './services/stateReconciliation';

// Update configuration
stateReconciliationService.configure({
  intervalMs: 60000,           // Change to 60 seconds
  maxConcurrentChecks: 5,      // Check 5 servers at once
  enableNotifications: false,   // Disable user notifications
  enableAutoFix: true,         // Keep auto-fix enabled
});
```

### Metrics Configuration

```typescript
import { metricsService } from './services/metrics';

// Update configuration
metricsService.configure({
  maxHistorySize: 2000,                    // Keep 2000 events
  retentionPeriodMs: 48 * 60 * 60 * 1000,  // 48 hours retention
  enableConsoleLogging: true,              // Enable logging
  enableExternalReporting: true,           // Enable external reporters
});
```

---

## API Reference

### State Reconciliation Service

```typescript
// Initialize
stateReconciliationService.initialize(
  storeUpdateCallback: (serverId, status, errorMessage?) => void,
  serverProviderCallback: () => MCPServer[],
  config?: Partial<ReconciliationConfig>
);

// Control
stateReconciliationService.start();
stateReconciliationService.stop();
stateReconciliationService.pause();
stateReconciliationService.resume();

// Manual trigger
const result = await stateReconciliationService.reconcileNow();

// Get state
const state = stateReconciliationService.getState();

// Configure
stateReconciliationService.configure({ intervalMs: 60000 });
```

### Metrics Service

```typescript
// Track events
metricsService.trackDriftEvent(event: StateDriftEvent);
metricsService.trackReconciliationCycle(cycle: ReconciliationCycleMetric);
metricsService.trackBridgeHealth(health: BridgeHealthMetric);
metricsService.trackPerformance(metric: PerformanceMetric);

// Timer helper
const endTimer = metricsService.startTimer('operation_name');
// ... do work ...
endTimer(success = true, metadata);

// Get metrics
const summary = metricsService.getSummary();
const recentDrifts = metricsService.getRecentDriftEvents(limit);
const recentReconciliations = metricsService.getRecentReconciliations(limit);
const recentHealth = metricsService.getRecentBridgeHealth(limit);

// Health check
const { healthy, issues } = metricsService.isSystemHealthy();

// External reporting
metricsService.registerReporter(reporter: MetricsReporter);

// Configuration
metricsService.configure(config: Partial<MetricsConfig>);

// Cleanup
metricsService.clear();
metricsService.cleanup();
```

### Store Integration

```typescript
import {
  initializeReconciliation,
  getReconciliationState,
  triggerReconciliation,
  pauseReconciliation,
  resumeReconciliation,
} from './stores/serverStore';

// Initialize (called in _layout.tsx)
initializeReconciliation();

// Get state for UI
const state = getReconciliationState();

// Manual trigger
const result = await triggerReconciliation();

// Control
pauseReconciliation();
resumeReconciliation();
```

---

## Performance Considerations

### Battery Optimization
- **Pause when backgrounded:** Reconciliation pauses when app is not active
- **Configurable interval:** Adjust polling frequency based on needs
- **Concurrency limits:** Prevents overwhelming the system with status checks

### Network Efficiency
- **Batched checks:** Servers checked in parallel batches
- **Low priority:** Status checks use LOW priority in message queue
- **Exponential backoff:** Reduces load during failures

### Memory Management
- **Bounded history:** Metrics limited to configurable size (default: 1000 events)
- **Automatic cleanup:** Old metrics removed after retention period (default: 24h)
- **Efficient storage:** Lightweight event structures

---

## Troubleshooting

### High Drift Detection Rate

**Possible Causes:**
- Node.js runtime instability
- Servers crashing frequently
- External processes interfering with servers

**Solutions:**
1. Check Node.js logs for crashes
2. Review server error messages
3. Increase restart attempts in server config
4. Check device memory constraints

### Reconciliation Failures

**Possible Causes:**
- Node bridge unhealthy
- Network issues
- Message queue overload

**Solutions:**
1. Check bridge health: `nodeBridge.getHealthStatus()`
2. Check queue stats: `nodeBridge.getQueueStats()`
3. Review console logs for errors
4. Increase retry attempts in reconciliation config

### Missing Notifications

**Possible Causes:**
- Notifications disabled in config
- Alert permissions not granted
- App in background

**Solutions:**
1. Verify config: `enableNotifications: true`
2. Check app permissions
3. Test in foreground first

---

## Best Practices

### 1. Monitor Metrics Regularly
```typescript
// Log summary on app foreground
const summary = metricsService.getSummary();
if (summary.totalDriftEvents > 10) {
  console.warn('High drift detection rate!');
}
```

### 2. Adjust Intervals Based on Workload
```typescript
// High-traffic apps: increase interval
stateReconciliationService.configure({ intervalMs: 60000 });

// Low-traffic apps: keep default (30s) or decrease
stateReconciliationService.configure({ intervalMs: 20000 });
```

### 3. Integrate with External Monitoring
```typescript
// Always integrate with production monitoring
metricsService.registerReporter(sentryReporter);
metricsService.configure({ enableExternalReporting: true });
```

### 4. Test Drift Scenarios
```typescript
// Manually trigger reconciliation to test
const result = await triggerReconciliation();
console.log('Drifts detected:', result.driftsDetected.length);
```

### 5. Review Metrics Before Releases
```typescript
// Pre-release health check
const { healthy, issues } = metricsService.isSystemHealthy();
if (!healthy) {
  console.error('System not healthy:', issues);
  // Fix issues before release
}
```

---

## Future Enhancements

### Planned Features
1. **Predictive drift detection** using ML-based anomaly detection
2. **Smart notifications** with user preference learning
3. **Drift pattern analysis** to identify root causes
4. **Auto-recovery suggestions** based on drift history
5. **Dashboard UI** for real-time metrics visualization
6. **Export metrics** to CSV/JSON for analysis
7. **Configurable notification channels** (push, email, etc.)

### Integration Opportunities
- **Grafana dashboards** for real-time monitoring
- **Prometheus metrics export** for enterprise observability
- **Slack/Discord webhooks** for team notifications
- **Custom analytics platforms** via MetricsReporter interface

---

## Testing

### Unit Tests
```typescript
// Test drift detection
describe('State Reconciliation', () => {
  it('should detect drift', async () => {
    // Mock server status returning different value
    const result = await stateReconciliationService.reconcileNow();
    expect(result.driftsDetected.length).toBeGreaterThan(0);
  });

  it('should auto-fix drift', async () => {
    // Verify store updated after drift detection
    const result = await stateReconciliationService.reconcileNow();
    const updatedServer = getServer(serverId);
    expect(updatedServer.status).toBe('stopped');
  });
});
```

### Integration Tests
```typescript
// Test with real Node.js runtime
describe('End-to-End Reconciliation', () => {
  it('should detect server crash', async () => {
    // Start server
    await startServer(serverId);

    // Kill server externally
    await killServerProcess(serverId);

    // Wait for reconciliation
    await sleep(35000);

    // Verify state updated
    const server = getServer(serverId);
    expect(server.status).toBe('stopped');
  });
});
```

---

## Support

For issues, questions, or feature requests:
1. Check console logs for detailed error messages
2. Review metrics summary for system health
3. Consult this documentation for configuration options
4. File an issue in the project repository

---

## License

Copyright 2025 MCP Android Server Manager
Licensed under the same terms as the main project.
