/**
 * MCP Server Manager - State Reconciliation Service
 *
 * Production-grade state drift detection and automatic correction
 *
 * RELIABILITY: Prevents UI state from drifting from actual server status
 * OBSERVABILITY: Comprehensive metrics and drift event tracking
 * PERFORMANCE: Battery-friendly background polling with lifecycle awareness
 * RESILIENCE: Exponential backoff, concurrency limits, error recovery
 */

import { Alert } from 'react-native';
import { ServerStatus, MCPServer } from '../types';
import { serverManager } from './serverManager';
import { nodeBridge } from './nodeBridge';
import { Priority } from './messageQueue';
import { metricsService, StateDriftEvent } from './metrics';

/**
 * Reconciliation configuration
 */
export interface ReconciliationConfig {
  enabled: boolean;
  intervalMs: number;                    // Polling interval (default: 30000ms = 30s)
  maxConcurrentChecks: number;           // Max parallel status checks
  enableNotifications: boolean;           // Show user notifications for drift
  pauseWhenBackgrounded: boolean;        // Pause polling when app backgrounded
  retryAttempts: number;                 // Retry attempts on failure
  retryDelayMs: number;                  // Initial retry delay
  maxRetryDelayMs: number;               // Max retry delay (exponential backoff)
  enableMetrics: boolean;                // Track metrics
  enableAutoFix: boolean;                // Automatically fix detected drift
  notifyOnAutoFix: boolean;              // Notify user when auto-fixing
}

/**
 * Drift detection result
 */
interface DriftDetectionResult {
  hasDrift: boolean;
  serverId: string;
  serverName: string;
  expectedStatus: ServerStatus;
  actualStatus: ServerStatus;
  timestamp: number;
}

/**
 * Reconciliation cycle result
 */
interface ReconciliationResult {
  success: boolean;
  serversChecked: number;
  driftsDetected: DriftDetectionResult[];
  errors: Error[];
  duration: number;
}

/**
 * Reconciliation state
 */
interface ReconciliationState {
  isRunning: boolean;
  isPaused: boolean;
  lastRunTimestamp: number | null;
  consecutiveFailures: number;
  totalCycles: number;
  totalDriftsDetected: number;
  totalDriftsFixed: number;
}

/**
 * Store update callback type
 */
export type StoreUpdateCallback = (serverId: string, status: ServerStatus, errorMessage?: string) => void;

/**
 * Server provider callback type
 */
export type ServerProviderCallback = () => MCPServer[];

/**
 * State reconciliation service
 */
class StateReconciliationService {
  private config: ReconciliationConfig = {
    enabled: true,
    intervalMs: 30000,                   // 30 seconds
    maxConcurrentChecks: 3,              // Check 3 servers at a time
    enableNotifications: true,
    pauseWhenBackgrounded: true,
    retryAttempts: 3,
    retryDelayMs: 1000,
    maxRetryDelayMs: 30000,
    enableMetrics: true,
    enableAutoFix: true,
    notifyOnAutoFix: true,
  };

  private state: ReconciliationState = {
    isRunning: false,
    isPaused: false,
    lastRunTimestamp: null,
    consecutiveFailures: 0,
    totalCycles: 0,
    totalDriftsDetected: 0,
    totalDriftsFixed: 0,
  };

  private reconciliationTimer: NodeJS.Timeout | null = null;
  private storeUpdateCallback: StoreUpdateCallback | null = null;
  private serverProviderCallback: ServerProviderCallback | null = null;

  /**
   * Initialize reconciliation service
   */
  initialize(
    storeUpdate: StoreUpdateCallback,
    serverProvider: ServerProviderCallback,
    config?: Partial<ReconciliationConfig>
  ): void {
    this.storeUpdateCallback = storeUpdate;
    this.serverProviderCallback = serverProvider;

    if (config) {
      this.config = { ...this.config, ...config };
    }

    console.log('[StateReconciliation] Initialized with config:', this.config);
  }

  /**
   * Start reconciliation polling
   */
  start(): void {
    if (!this.config.enabled) {
      console.log('[StateReconciliation] Service disabled by config');
      return;
    }

    if (this.state.isRunning) {
      console.log('[StateReconciliation] Already running');
      return;
    }

    if (!this.storeUpdateCallback || !this.serverProviderCallback) {
      console.error('[StateReconciliation] Not initialized - missing callbacks');
      return;
    }

    this.state.isRunning = true;
    this.state.isPaused = false;
    this.scheduleNextReconciliation();

    console.log('[StateReconciliation] Started (interval: ' + this.config.intervalMs + 'ms)');
  }

  /**
   * Stop reconciliation polling
   */
  stop(): void {
    if (this.reconciliationTimer) {
      clearTimeout(this.reconciliationTimer);
      this.reconciliationTimer = null;
    }

    this.state.isRunning = false;
    this.state.isPaused = false;

    console.log('[StateReconciliation] Stopped');
  }

  /**
   * Pause reconciliation (e.g., when app backgrounded)
   */
  pause(): void {
    if (!this.state.isRunning) return;

    if (this.reconciliationTimer) {
      clearTimeout(this.reconciliationTimer);
      this.reconciliationTimer = null;
    }

    this.state.isPaused = true;
    console.log('[StateReconciliation] Paused');
  }

  /**
   * Resume reconciliation (e.g., when app foregrounded)
   */
  resume(): void {
    if (!this.state.isRunning) return;
    if (!this.state.isPaused) return;

    this.state.isPaused = false;
    this.scheduleNextReconciliation(0); // Run immediately
    console.log('[StateReconciliation] Resumed');
  }

  /**
   * Trigger immediate reconciliation (manual)
   */
  async reconcileNow(): Promise<ReconciliationResult> {
    console.log('[StateReconciliation] Manual reconciliation triggered');
    return await this.performReconciliation();
  }

  /**
   * Configure reconciliation service
   */
  configure(config: Partial<ReconciliationConfig>): void {
    const wasRunning = this.state.isRunning;

    if (wasRunning) {
      this.stop();
    }

    this.config = { ...this.config, ...config };
    console.log('[StateReconciliation] Configuration updated:', config);

    if (wasRunning && this.config.enabled) {
      this.start();
    }
  }

  /**
   * Get current state and statistics
   */
  getState(): ReconciliationState & { config: ReconciliationConfig } {
    return {
      ...this.state,
      config: this.config,
    };
  }

  // Private methods

  /**
   * Schedule next reconciliation cycle
   */
  private scheduleNextReconciliation(delayMs?: number): void {
    if (!this.state.isRunning || this.state.isPaused) return;

    const delay = delayMs ?? this.calculateNextDelay();

    this.reconciliationTimer = setTimeout(async () => {
      await this.performReconciliation();
      this.scheduleNextReconciliation();
    }, delay);
  }

  /**
   * Calculate next delay with exponential backoff on failures
   */
  private calculateNextDelay(): number {
    if (this.state.consecutiveFailures === 0) {
      return this.config.intervalMs;
    }

    // Exponential backoff on failures
    const backoffDelay = Math.min(
      this.config.retryDelayMs * Math.pow(2, this.state.consecutiveFailures - 1),
      this.config.maxRetryDelayMs
    );

    console.log(
      `[StateReconciliation] Backing off after ${this.state.consecutiveFailures} failures: ${backoffDelay}ms`
    );

    return backoffDelay;
  }

  /**
   * Perform a reconciliation cycle
   */
  private async performReconciliation(): Promise<ReconciliationResult> {
    const startTime = Date.now();
    const result: ReconciliationResult = {
      success: false,
      serversChecked: 0,
      driftsDetected: [],
      errors: [],
      duration: 0,
    };

    try {
      // Check if bridge is healthy before proceeding
      if (!nodeBridge.isHealthy()) {
        throw new Error('Node bridge is unhealthy - skipping reconciliation');
      }

      // Get current servers from store
      const servers = this.serverProviderCallback!();

      if (servers.length === 0) {
        result.success = true;
        result.duration = Date.now() - startTime;
        this.state.consecutiveFailures = 0;
        return result;
      }

      // Check servers with concurrency limit
      const drifts = await this.checkServersForDrift(servers);
      result.serversChecked = servers.length;
      result.driftsDetected = drifts;

      // Auto-fix detected drifts
      if (this.config.enableAutoFix && drifts.length > 0) {
        await this.fixDetectedDrifts(drifts);
      }

      result.success = true;
      this.state.consecutiveFailures = 0;
      this.state.totalDriftsDetected += drifts.length;

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error : new Error(String(error)));
      this.state.consecutiveFailures++;

      console.error('[StateReconciliation] Reconciliation cycle failed:', error);
    } finally {
      result.duration = Date.now() - startTime;
      this.state.lastRunTimestamp = Date.now();
      this.state.totalCycles++;

      // Track metrics
      if (this.config.enableMetrics) {
        metricsService.trackReconciliationCycle({
          timestamp: Date.now(),
          duration: result.duration,
          serversChecked: result.serversChecked,
          driftsDetected: result.driftsDetected.length,
          driftsFixed: result.driftsDetected.filter(d => this.config.enableAutoFix).length,
          errors: result.errors.length,
          success: result.success,
        });
      }
    }

    return result;
  }

  /**
   * Check all servers for drift with concurrency limit
   */
  private async checkServersForDrift(servers: MCPServer[]): Promise<DriftDetectionResult[]> {
    const drifts: DriftDetectionResult[] = [];
    const concurrencyLimit = this.config.maxConcurrentChecks;

    // Process servers in batches
    for (let i = 0; i < servers.length; i += concurrencyLimit) {
      const batch = servers.slice(i, i + concurrencyLimit);

      const batchResults = await Promise.allSettled(
        batch.map(server => this.checkServerForDrift(server))
      );

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.hasDrift) {
          drifts.push(result.value);
        } else if (result.status === 'rejected') {
          console.warn(
            `[StateReconciliation] Failed to check server ${batch[index].name}:`,
            result.reason
          );
        }
      });
    }

    return drifts;
  }

  /**
   * Check single server for drift
   */
  private async checkServerForDrift(server: MCPServer): Promise<DriftDetectionResult> {
    const expectedStatus = server.status;
    const checkStartTime = Date.now();

    try {
      // Get actual status from Node.js runtime
      const actualStatus = await serverManager.getServerStatus(server.id, Priority.LOW);

      const hasDrift = expectedStatus !== actualStatus;

      if (hasDrift) {
        console.warn(
          `[StateReconciliation] Drift detected: ${server.name}`,
          `Expected: ${expectedStatus}, Actual: ${actualStatus}`
        );
      }

      return {
        hasDrift,
        serverId: server.id,
        serverName: server.name,
        expectedStatus,
        actualStatus,
        timestamp: Date.now(),
      };

    } catch (error) {
      console.error(`[StateReconciliation] Error checking server ${server.name}:`, error);

      // If we can't check status, assume no drift
      return {
        hasDrift: false,
        serverId: server.id,
        serverName: server.name,
        expectedStatus,
        actualStatus: expectedStatus,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Fix detected drifts by updating store
   */
  private async fixDetectedDrifts(drifts: DriftDetectionResult[]): Promise<void> {
    for (const drift of drifts) {
      try {
        // Update store with actual status
        this.storeUpdateCallback!(drift.serverId, drift.actualStatus);
        this.state.totalDriftsFixed++;

        // Track drift event in metrics
        if (this.config.enableMetrics) {
          const driftEvent: StateDriftEvent = {
            serverId: drift.serverId,
            serverName: drift.serverName,
            expectedStatus: drift.expectedStatus,
            actualStatus: drift.actualStatus,
            timestamp: drift.timestamp,
            detectionLatency: Date.now() - drift.timestamp,
            autoFixed: true,
            userNotified: this.config.enableNotifications && this.config.notifyOnAutoFix,
          };

          metricsService.trackDriftEvent(driftEvent);
        }

        // Notify user if configured
        if (this.config.enableNotifications && this.config.notifyOnAutoFix) {
          this.notifyUserOfDrift(drift);
        }

        console.log(
          `[StateReconciliation] Fixed drift: ${drift.serverName}`,
          `(${drift.expectedStatus} → ${drift.actualStatus})`
        );

      } catch (error) {
        console.error(`[StateReconciliation] Failed to fix drift for ${drift.serverName}:`, error);
      }
    }
  }

  /**
   * Notify user of detected drift
   */
  private notifyUserOfDrift(drift: DriftDetectionResult): void {
    const title = this.getDriftNotificationTitle(drift);
    const message = this.getDriftNotificationMessage(drift);

    // Use Alert for simple notifications
    // In production, you might want to use expo-notifications for better UX
    Alert.alert(
      title,
      message,
      [{ text: 'OK', style: 'default' }],
      { cancelable: true }
    );
  }

  /**
   * Get notification title for drift event
   */
  private getDriftNotificationTitle(drift: DriftDetectionResult): string {
    if (drift.expectedStatus === 'running' && drift.actualStatus === 'stopped') {
      return 'Server Stopped Unexpectedly';
    }
    if (drift.expectedStatus === 'running' && drift.actualStatus === 'error') {
      return 'Server Crashed';
    }
    if (drift.expectedStatus === 'stopped' && drift.actualStatus === 'running') {
      return 'Server Started Externally';
    }
    return 'Server Status Changed';
  }

  /**
   * Get notification message for drift event
   */
  private getDriftNotificationMessage(drift: DriftDetectionResult): string {
    const serverName = drift.serverName;
    const from = drift.expectedStatus;
    const to = drift.actualStatus;

    if (from === 'running' && to === 'stopped') {
      return `${serverName} has stopped unexpectedly. The server may have crashed or been stopped externally.`;
    }
    if (from === 'running' && to === 'error') {
      return `${serverName} encountered an error and has stopped. Check the logs for details.`;
    }
    if (from === 'stopped' && to === 'running') {
      return `${serverName} was started outside the app. The UI has been updated to reflect this.`;
    }
    return `${serverName} status changed from ${from} to ${to}.`;
  }
}

// Singleton instance
export const stateReconciliationService = new StateReconciliationService();
export default stateReconciliationService;
