/**
 * MCP Server Manager - Metrics Tracking Service
 *
 * Production-grade observability for state reconciliation and system health
 *
 * OBSERVABILITY: Tracks comprehensive metrics for monitoring system reliability
 * PERFORMANCE: Lightweight metric collection with minimal overhead
 * INTEGRATION: Ready for Sentry, DataDog, or custom analytics platforms
 */

/**
 * Metric types for categorization
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  TIMER = 'timer',
}

/**
 * Metric severity levels
 */
export enum MetricSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * State drift event details
 */
export interface StateDriftEvent {
  serverId: string;
  serverName: string;
  expectedStatus: string;
  actualStatus: string;
  timestamp: number;
  detectionLatency: number; // ms since status actually changed
  autoFixed: boolean;
  userNotified: boolean;
}

/**
 * Reconciliation cycle metrics
 */
export interface ReconciliationCycleMetric {
  timestamp: number;
  duration: number; // ms
  serversChecked: number;
  driftsDetected: number;
  driftsFixed: number;
  errors: number;
  success: boolean;
}

/**
 * Bridge health metrics
 */
export interface BridgeHealthMetric {
  timestamp: number;
  healthy: boolean;
  initialized: boolean;
  crashed: boolean;
  restarting: boolean;
  consecutiveFailures: number;
  restartAttempts: number;
  pendingRequests: number;
  queueDepth: number;
  queueLatency: number | null; // ms
}

/**
 * Performance metrics
 */
export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Aggregated metrics for reporting
 */
export interface MetricsSummary {
  // State reconciliation metrics
  totalDriftEvents: number;
  driftEventsLast24h: number;
  driftEventsByType: Record<string, number>;
  averageDetectionLatency: number;
  autoFixSuccessRate: number;

  // Reconciliation cycle metrics
  totalReconciliations: number;
  successfulReconciliations: number;
  failedReconciliations: number;
  averageReconciliationDuration: number;
  lastReconciliationTimestamp: number | null;
  reconciliationSuccessRate: number;

  // Bridge health metrics
  bridgeHealthyPercentage: number;
  averageQueueDepth: number;
  averageQueueLatency: number | null;
  bridgeRestartCount: number;

  // Performance metrics
  averageOperationDuration: Record<string, number>;
  slowestOperations: PerformanceMetric[];
}

/**
 * Metrics configuration
 */
interface MetricsConfig {
  maxHistorySize: number;
  retentionPeriodMs: number;
  enableConsoleLogging: boolean;
  enableExternalReporting: boolean;
  reportingInterval: number;
}

/**
 * External metrics reporter interface
 */
export interface MetricsReporter {
  reportDrift: (event: StateDriftEvent) => void | Promise<void>;
  reportReconciliation: (cycle: ReconciliationCycleMetric) => void | Promise<void>;
  reportBridgeHealth: (health: BridgeHealthMetric) => void | Promise<void>;
  reportPerformance: (metric: PerformanceMetric) => void | Promise<void>;
}

/**
 * Metrics service for comprehensive observability
 */
class MetricsService {
  private config: MetricsConfig = {
    maxHistorySize: 1000,
    retentionPeriodMs: 24 * 60 * 60 * 1000, // 24 hours
    enableConsoleLogging: __DEV__,
    enableExternalReporting: false,
    reportingInterval: 60000, // 1 minute
  };

  private driftEvents: StateDriftEvent[] = [];
  private reconciliationCycles: ReconciliationCycleMetric[] = [];
  private bridgeHealthSnapshots: BridgeHealthMetric[] = [];
  private performanceMetrics: PerformanceMetric[] = [];

  private externalReporters: MetricsReporter[] = [];
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Configure metrics service
   */
  configure(config: Partial<MetricsConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[Metrics] Configuration updated:', this.config);
  }

  /**
   * Register external metrics reporter (e.g., Sentry, DataDog)
   */
  registerReporter(reporter: MetricsReporter): void {
    this.externalReporters.push(reporter);
    console.log('[Metrics] External reporter registered');
  }

  /**
   * Track a state drift event
   */
  trackDriftEvent(event: StateDriftEvent): void {
    this.driftEvents.push(event);
    this.enforceHistoryLimit(this.driftEvents);

    if (this.config.enableConsoleLogging) {
      const severity = this.getDriftSeverity(event);
      console.log(
        `[Metrics] State drift detected [${severity}]:`,
        `${event.serverName} (${event.expectedStatus} → ${event.actualStatus})`,
        `Detection latency: ${event.detectionLatency}ms`,
        `Auto-fixed: ${event.autoFixed}`
      );
    }

    // Report to external systems
    this.reportToExternal('drift', event);
  }

  /**
   * Track a reconciliation cycle
   */
  trackReconciliationCycle(cycle: ReconciliationCycleMetric): void {
    this.reconciliationCycles.push(cycle);
    this.enforceHistoryLimit(this.reconciliationCycles);

    if (this.config.enableConsoleLogging) {
      console.log(
        `[Metrics] Reconciliation cycle completed:`,
        `Duration: ${cycle.duration}ms`,
        `Servers: ${cycle.serversChecked}`,
        `Drifts: ${cycle.driftsDetected} detected, ${cycle.driftsFixed} fixed`,
        `Errors: ${cycle.errors}`,
        `Success: ${cycle.success}`
      );
    }

    // Report to external systems
    this.reportToExternal('reconciliation', cycle);
  }

  /**
   * Track bridge health snapshot
   */
  trackBridgeHealth(health: BridgeHealthMetric): void {
    this.bridgeHealthSnapshots.push(health);
    this.enforceHistoryLimit(this.bridgeHealthSnapshots);

    if (this.config.enableConsoleLogging && !health.healthy) {
      console.warn(
        `[Metrics] Bridge unhealthy:`,
        `Crashed: ${health.crashed}`,
        `Restarting: ${health.restarting}`,
        `Failures: ${health.consecutiveFailures}`,
        `Queue: ${health.queueDepth} items`
      );
    }

    // Report to external systems
    this.reportToExternal('bridgeHealth', health);
  }

  /**
   * Track performance metric
   */
  trackPerformance(metric: PerformanceMetric): void {
    this.performanceMetrics.push(metric);
    this.enforceHistoryLimit(this.performanceMetrics);

    if (this.config.enableConsoleLogging && metric.duration > 5000) {
      console.warn(
        `[Metrics] Slow operation detected:`,
        `${metric.operation} took ${metric.duration}ms`
      );
    }

    // Report to external systems
    this.reportToExternal('performance', metric);
  }

  /**
   * Start a performance timer
   */
  startTimer(operation: string): () => void {
    const startTime = Date.now();
    return (success = true, metadata?: Record<string, unknown>) => {
      const duration = Date.now() - startTime;
      this.trackPerformance({
        operation,
        duration,
        timestamp: Date.now(),
        success,
        metadata,
      });
    };
  }

  /**
   * Get comprehensive metrics summary
   */
  getSummary(): MetricsSummary {
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;

    // Drift metrics
    const driftsLast24h = this.driftEvents.filter(e => e.timestamp > last24h);
    const driftsByType: Record<string, number> = {};
    this.driftEvents.forEach(e => {
      const key = `${e.expectedStatus}→${e.actualStatus}`;
      driftsByType[key] = (driftsByType[key] || 0) + 1;
    });

    const avgDetectionLatency = this.driftEvents.length > 0
      ? this.driftEvents.reduce((sum, e) => sum + e.detectionLatency, 0) / this.driftEvents.length
      : 0;

    const autoFixedCount = this.driftEvents.filter(e => e.autoFixed).length;
    const autoFixSuccessRate = this.driftEvents.length > 0
      ? (autoFixedCount / this.driftEvents.length) * 100
      : 100;

    // Reconciliation metrics
    const successfulRecons = this.reconciliationCycles.filter(c => c.success).length;
    const avgReconDuration = this.reconciliationCycles.length > 0
      ? this.reconciliationCycles.reduce((sum, c) => sum + c.duration, 0) / this.reconciliationCycles.length
      : 0;

    const lastRecon = this.reconciliationCycles.length > 0
      ? this.reconciliationCycles[this.reconciliationCycles.length - 1].timestamp
      : null;

    const reconSuccessRate = this.reconciliationCycles.length > 0
      ? (successfulRecons / this.reconciliationCycles.length) * 100
      : 100;

    // Bridge health metrics
    const healthySnapshots = this.bridgeHealthSnapshots.filter(h => h.healthy).length;
    const bridgeHealthyPercentage = this.bridgeHealthSnapshots.length > 0
      ? (healthySnapshots / this.bridgeHealthSnapshots.length) * 100
      : 100;

    const avgQueueDepth = this.bridgeHealthSnapshots.length > 0
      ? this.bridgeHealthSnapshots.reduce((sum, h) => sum + h.queueDepth, 0) / this.bridgeHealthSnapshots.length
      : 0;

    const validLatencies = this.bridgeHealthSnapshots
      .map(h => h.queueLatency)
      .filter((l): l is number => l !== null);
    const avgQueueLatency = validLatencies.length > 0
      ? validLatencies.reduce((sum, l) => sum + l, 0) / validLatencies.length
      : null;

    const bridgeRestartCount = this.bridgeHealthSnapshots.filter(h => h.restarting).length;

    // Performance metrics
    const operationDurations: Record<string, number[]> = {};
    this.performanceMetrics.forEach(m => {
      if (!operationDurations[m.operation]) {
        operationDurations[m.operation] = [];
      }
      operationDurations[m.operation].push(m.duration);
    });

    const avgOperationDuration: Record<string, number> = {};
    Object.entries(operationDurations).forEach(([op, durations]) => {
      avgOperationDuration[op] = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    });

    const slowestOperations = [...this.performanceMetrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    return {
      // Drift metrics
      totalDriftEvents: this.driftEvents.length,
      driftEventsLast24h: driftsLast24h.length,
      driftEventsByType: driftsByType,
      averageDetectionLatency: avgDetectionLatency,
      autoFixSuccessRate,

      // Reconciliation metrics
      totalReconciliations: this.reconciliationCycles.length,
      successfulReconciliations: successfulRecons,
      failedReconciliations: this.reconciliationCycles.length - successfulRecons,
      averageReconciliationDuration: avgReconDuration,
      lastReconciliationTimestamp: lastRecon,
      reconciliationSuccessRate: reconSuccessRate,

      // Bridge health metrics
      bridgeHealthyPercentage,
      averageQueueDepth: avgQueueDepth,
      averageQueueLatency: avgQueueLatency,
      bridgeRestartCount,

      // Performance metrics
      averageOperationDuration,
      slowestOperations,
    };
  }

  /**
   * Get recent drift events
   */
  getRecentDriftEvents(limit = 10): StateDriftEvent[] {
    return this.driftEvents.slice(-limit).reverse();
  }

  /**
   * Get recent reconciliation cycles
   */
  getRecentReconciliations(limit = 10): ReconciliationCycleMetric[] {
    return this.reconciliationCycles.slice(-limit).reverse();
  }

  /**
   * Get recent bridge health snapshots
   */
  getRecentBridgeHealth(limit = 10): BridgeHealthMetric[] {
    return this.bridgeHealthSnapshots.slice(-limit).reverse();
  }

  /**
   * Check if system is healthy based on metrics
   */
  isSystemHealthy(): { healthy: boolean; issues: string[] } {
    const issues: string[] = [];
    const summary = this.getSummary();

    // Check reconciliation health
    if (summary.reconciliationSuccessRate < 90) {
      issues.push(`Low reconciliation success rate: ${summary.reconciliationSuccessRate.toFixed(1)}%`);
    }

    // Check bridge health
    if (summary.bridgeHealthyPercentage < 95) {
      issues.push(`Low bridge health: ${summary.bridgeHealthyPercentage.toFixed(1)}%`);
    }

    // Check for excessive drift
    if (summary.driftEventsLast24h > 50) {
      issues.push(`High drift events in last 24h: ${summary.driftEventsLast24h}`);
    }

    // Check auto-fix success
    if (summary.autoFixSuccessRate < 80 && summary.totalDriftEvents > 5) {
      issues.push(`Low auto-fix success rate: ${summary.autoFixSuccessRate.toFixed(1)}%`);
    }

    // Check last reconciliation
    if (summary.lastReconciliationTimestamp) {
      const timeSinceLastRecon = Date.now() - summary.lastReconciliationTimestamp;
      if (timeSinceLastRecon > 120000) { // 2 minutes
        issues.push(`No recent reconciliation: ${Math.round(timeSinceLastRecon / 1000)}s ago`);
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }

  /**
   * Clear all metrics (for testing or reset)
   */
  clear(): void {
    this.driftEvents = [];
    this.reconciliationCycles = [];
    this.bridgeHealthSnapshots = [];
    this.performanceMetrics = [];
    console.log('[Metrics] All metrics cleared');
  }

  /**
   * Cleanup old metrics
   */
  cleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  // Private methods

  private getDriftSeverity(event: StateDriftEvent): MetricSeverity {
    // Unexpected crash is critical
    if (event.expectedStatus === 'running' && event.actualStatus === 'stopped') {
      return MetricSeverity.CRITICAL;
    }
    // Unexpected start is a warning
    if (event.expectedStatus === 'stopped' && event.actualStatus === 'running') {
      return MetricSeverity.WARNING;
    }
    // Error state is error severity
    if (event.actualStatus === 'error') {
      return MetricSeverity.ERROR;
    }
    return MetricSeverity.INFO;
  }

  private enforceHistoryLimit<T>(array: T[]): void {
    if (array.length > this.config.maxHistorySize) {
      array.splice(0, array.length - this.config.maxHistorySize);
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldMetrics();
    }, 60000); // Clean up every minute
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - this.config.retentionPeriodMs;

    const before = {
      drifts: this.driftEvents.length,
      reconciliations: this.reconciliationCycles.length,
      health: this.bridgeHealthSnapshots.length,
      performance: this.performanceMetrics.length,
    };

    this.driftEvents = this.driftEvents.filter(e => e.timestamp > cutoff);
    this.reconciliationCycles = this.reconciliationCycles.filter(c => c.timestamp > cutoff);
    this.bridgeHealthSnapshots = this.bridgeHealthSnapshots.filter(h => h.timestamp > cutoff);
    this.performanceMetrics = this.performanceMetrics.filter(m => m.timestamp > cutoff);

    const after = {
      drifts: this.driftEvents.length,
      reconciliations: this.reconciliationCycles.length,
      health: this.bridgeHealthSnapshots.length,
      performance: this.performanceMetrics.length,
    };

    const removed = {
      drifts: before.drifts - after.drifts,
      reconciliations: before.reconciliations - after.reconciliations,
      health: before.health - after.health,
      performance: before.performance - after.performance,
    };

    const totalRemoved = Object.values(removed).reduce((sum, n) => sum + n, 0);
    if (totalRemoved > 0) {
      console.log(`[Metrics] Cleaned up ${totalRemoved} old metrics`);
    }
  }

  private reportToExternal(
    type: 'drift' | 'reconciliation' | 'bridgeHealth' | 'performance',
    data: unknown
  ): void {
    if (!this.config.enableExternalReporting || this.externalReporters.length === 0) {
      return;
    }

    this.externalReporters.forEach(reporter => {
      try {
        switch (type) {
          case 'drift':
            reporter.reportDrift(data as StateDriftEvent);
            break;
          case 'reconciliation':
            reporter.reportReconciliation(data as ReconciliationCycleMetric);
            break;
          case 'bridgeHealth':
            reporter.reportBridgeHealth(data as BridgeHealthMetric);
            break;
          case 'performance':
            reporter.reportPerformance(data as PerformanceMetric);
            break;
        }
      } catch (error) {
        console.error('[Metrics] External reporter error:', error);
      }
    });
  }
}

// Singleton instance
export const metricsService = new MetricsService();
export default metricsService;
