/**
 * MCP Server Manager - Node.js Bridge Service
 *
 * Handles communication between React Native and the embedded Node.js runtime
 * using nodejs-mobile-react-native
 *
 * SECURITY: All IPC messages are validated using Ajv JSON Schema validation
 * to prevent injection attacks and ensure data integrity.
 *
 * RELIABILITY: Includes crash detection, auto-restart, and message queue
 * for resilient operation.
 */

import {
  IPCMessage,
  validateIPCMessageWithPayload,
  sanitizeIPCMessageForLogging,
} from '../utils/schemas';
import { messageQueue, Priority } from './messageQueue';

type MessageHandler = (message: IPCMessage) => void;

// Dynamic import type for nodejs-mobile
type NodeJSMobile = {
  start: (script: string) => void;
  channel: {
    addListener: (event: string, callback: (msg: string) => void) => void;
    send: (msg: string) => void;
  };
};

/**
 * Health check configuration
 */
const HEALTH_CHECK_CONFIG = {
  intervalMs: 10000,           // Check every 10 seconds
  timeoutMs: 5000,             // Health check timeout
  maxFailures: 3,              // Max consecutive failures before restart
  recoveryCheckMs: 30000,      // How often to check if recovery needed
};

/**
 * Auto-restart configuration
 */
const RESTART_CONFIG = {
  maxAttempts: 5,              // Max restart attempts
  resetWindowMs: 5 * 60 * 1000, // Reset attempt counter after 5 minutes
  initialDelayMs: 1000,        // Initial restart delay
  maxDelayMs: 30000,           // Max restart delay
};

/**
 * Bridge state for restart reconciliation
 */
interface BridgeState {
  initialized: boolean;
  lastHealthCheck: number;
  consecutiveFailures: number;
  restartAttempts: number;
  lastRestartTime: number;
  isCrashed: boolean;
  isRestarting: boolean;
}

class NodeBridge {
  private nodejs: NodeJSMobile | null = null;
  private initialized = false;
  private messageHandlers: Map<string, MessageHandler> = new Map();
  private pendingRequests: Map<string, {
    resolve: (value: IPCMessage) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  private requestId = 0;
  private readonly MAX_HANDLERS = 100;
  private readonly MAX_MESSAGE_SIZE = 1024 * 1024; // 1MB max message size
  private validationErrorCount = 0;
  private readonly MAX_VALIDATION_ERRORS = 100; // Circuit breaker threshold

  // Health check and recovery
  private state: BridgeState = {
    initialized: false,
    lastHealthCheck: 0,
    consecutiveFailures: 0,
    restartAttempts: 0,
    lastRestartTime: 0,
    isCrashed: false,
    isRestarting: false,
  };
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private recoveryTimer: NodeJS.Timeout | null = null;

  // State reconciliation
  private stateSnapshot: {
    handlers: string[];
    pendingRequestTypes: string[];
  } = {
    handlers: [],
    pendingRequestTypes: [],
  };

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Dynamic import to handle cases where nodejs-mobile isn't available
      this.nodejs = require('nodejs-mobile-react-native');

      // Start the Node.js engine
      this.nodejs.start('main.js');

      // Set up message listener with validation
      this.nodejs.channel.addListener('message', this.handleMessage.bind(this));

      // Wait for ready signal
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.removeHandler('init-ready');
          reject(new Error('Node.js bridge initialization timeout after 15s'));
        }, 15000);

        const readyHandler = (message: IPCMessage) => {
          if (message.type === 'ready') {
            clearTimeout(timeout);
            this.removeHandler('init-ready');
            resolve();
          }
        };

        this.addHandler('init-ready', readyHandler);
      });

      this.initialized = true;
      this.state.initialized = true;
      this.state.isCrashed = false;

      // Initialize message queue with executor
      messageQueue.setExecutor(this.sendMessageDirect.bind(this));

      // Start health checks
      this.startHealthChecks();

      // Start recovery monitoring
      this.startRecoveryMonitoring();

      console.log('[NodeBridge] Initialized successfully');
    } catch (error) {
      console.error('[NodeBridge] Initialization failed:', error);
      this.state.isCrashed = true;
      throw error;
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck().catch(error => {
        console.error('[NodeBridge] Health check error:', error);
      });
    }, HEALTH_CHECK_CONFIG.intervalMs);

    console.log('[NodeBridge] Health checks started');
  }

  /**
   * Perform a health check by sending a ping message
   */
  private async performHealthCheck(): Promise<void> {
    if (!this.initialized || this.state.isRestarting) {
      return; // Skip health check during restart
    }

    try {
      const startTime = Date.now();

      // Send a simple ping message with timeout
      await Promise.race([
        this.sendMessageDirect({
          type: 'ping',
          payload: { timestamp: startTime },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), HEALTH_CHECK_CONFIG.timeoutMs)
        ),
      ]);

      // Health check passed
      this.state.lastHealthCheck = Date.now();
      this.state.consecutiveFailures = 0;

    } catch (error) {
      // Health check failed
      this.state.consecutiveFailures++;
      console.warn(
        `[NodeBridge] Health check failed (${this.state.consecutiveFailures}/${HEALTH_CHECK_CONFIG.maxFailures})`,
        error instanceof Error ? error.message : String(error)
      );

      // Trigger restart if max failures reached
      if (this.state.consecutiveFailures >= HEALTH_CHECK_CONFIG.maxFailures) {
        console.error('[NodeBridge] Max health check failures reached - triggering restart');
        this.state.isCrashed = true;
        await this.attemptRestart();
      }
    }
  }

  /**
   * Start recovery monitoring (checks periodically if bridge needs recovery)
   */
  private startRecoveryMonitoring(): void {
    if (this.recoveryTimer) {
      clearInterval(this.recoveryTimer);
    }

    this.recoveryTimer = setInterval(() => {
      // Check if bridge is in crashed state and not already restarting
      if (this.state.isCrashed && !this.state.isRestarting) {
        console.log('[NodeBridge] Crashed state detected - attempting recovery');
        this.attemptRestart().catch(error => {
          console.error('[NodeBridge] Recovery attempt failed:', error);
        });
      }

      // Reset restart attempts counter if enough time has passed
      const timeSinceLastRestart = Date.now() - this.state.lastRestartTime;
      if (
        this.state.restartAttempts > 0 &&
        timeSinceLastRestart > RESTART_CONFIG.resetWindowMs
      ) {
        console.log('[NodeBridge] Resetting restart attempt counter');
        this.state.restartAttempts = 0;
      }
    }, HEALTH_CHECK_CONFIG.recoveryCheckMs);

    console.log('[NodeBridge] Recovery monitoring started');
  }

  /**
   * Attempt to restart the Node.js bridge
   */
  private async attemptRestart(): Promise<void> {
    if (this.state.isRestarting) {
      console.log('[NodeBridge] Restart already in progress');
      return;
    }

    // Check restart attempts
    if (this.state.restartAttempts >= RESTART_CONFIG.maxAttempts) {
      const timeSinceLastRestart = Date.now() - this.state.lastRestartTime;
      if (timeSinceLastRestart < RESTART_CONFIG.resetWindowMs) {
        console.error(
          `[NodeBridge] Max restart attempts (${RESTART_CONFIG.maxAttempts}) reached. ` +
          'Manual intervention required.'
        );
        return;
      }
    }

    this.state.isRestarting = true;
    this.state.restartAttempts++;
    this.state.lastRestartTime = Date.now();

    console.log(
      `[NodeBridge] Attempting restart (attempt ${this.state.restartAttempts}/${RESTART_CONFIG.maxAttempts})`
    );

    try {
      // 1. Save current state for reconciliation
      this.captureStateSnapshot();

      // 2. Clean up current instance
      this.cleanupBeforeRestart();

      // 3. Calculate restart delay with exponential backoff
      const delay = Math.min(
        RESTART_CONFIG.initialDelayMs * Math.pow(2, this.state.restartAttempts - 1),
        RESTART_CONFIG.maxDelayMs
      );

      console.log(`[NodeBridge] Waiting ${delay}ms before restart...`);
      await new Promise(resolve => setTimeout(resolve, delay));

      // 4. Reinitialize
      this.initialized = false;
      this.state.initialized = false;
      await this.initialize();

      // 5. Reconcile state
      await this.reconcileState();

      console.log('[NodeBridge] Restart successful');
      this.state.isCrashed = false;

    } catch (error) {
      console.error('[NodeBridge] Restart failed:', error);
      this.state.isCrashed = true;
    } finally {
      this.state.isRestarting = false;
    }
  }

  /**
   * Capture state snapshot before restart
   */
  private captureStateSnapshot(): void {
    this.stateSnapshot = {
      handlers: Array.from(this.messageHandlers.keys()),
      pendingRequestTypes: Array.from(this.pendingRequests.values()).map(
        req => 'unknown' // We don't store original message types
      ),
    };

    console.log('[NodeBridge] State snapshot captured:', {
      handlers: this.stateSnapshot.handlers.length,
      pendingRequests: this.stateSnapshot.pendingRequestTypes.length,
    });
  }

  /**
   * Clean up before restart
   */
  private cleanupBeforeRestart(): void {
    // Stop health checks temporarily
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // Cancel all pending requests
    this.pendingRequests.forEach(({ timeout, reject }) => {
      clearTimeout(timeout);
      reject(new Error('Bridge restarting - request cancelled'));
    });
    this.pendingRequests.clear();

    // Don't clear handlers - we'll restore them after restart
    // Reset validation error count
    this.validationErrorCount = 0;

    console.log('[NodeBridge] Cleanup before restart complete');
  }

  /**
   * Reconcile state after restart
   */
  private async reconcileState(): Promise<void> {
    console.log('[NodeBridge] Reconciling state after restart...');

    // Handlers are preserved in this.messageHandlers, no action needed

    // Clear snapshot
    this.stateSnapshot = {
      handlers: [],
      pendingRequestTypes: [],
    };

    console.log('[NodeBridge] State reconciliation complete');
  }

  /**
   * Handle incoming messages from Node.js bridge with schema validation
   *
   * SECURITY: All messages are validated against JSON schemas before processing
   * to prevent injection attacks and ensure data integrity.
   */
  private handleMessage(rawMessage: string): void {
    // Check message size limit
    if (rawMessage.length > this.MAX_MESSAGE_SIZE) {
      console.error(`Message size exceeds limit: ${rawMessage.length} bytes`);
      this.incrementValidationError();
      return;
    }

    // Parse JSON safely
    let parsedData: unknown;
    try {
      parsedData = JSON.parse(rawMessage);
    } catch (error) {
      console.error('Failed to parse Node.js message as JSON:', error);
      this.incrementValidationError();
      return;
    }

    // Validate message structure and payload using Ajv schemas
    const validationResult = validateIPCMessageWithPayload(parsedData);

    if (!validationResult.valid) {
      console.error(
        'IPC message validation failed:',
        validationResult.error.message,
        '\nValidation errors:',
        validationResult.error.validationErrors,
        '\nSanitized message:',
        sanitizeIPCMessageForLogging(parsedData as IPCMessage)
      );
      this.incrementValidationError();
      return;
    }

    // Reset validation error count on successful validation
    this.validationErrorCount = 0;

    const message = validationResult.message;
    const messageWithRequestId = message as IPCMessage & { requestId?: string };

    // Handle response to pending request
    if (messageWithRequestId.requestId && this.pendingRequests.has(messageWithRequestId.requestId)) {
      const request = this.pendingRequests.get(messageWithRequestId.requestId)!;
      clearTimeout(request.timeout); // Clear the timeout
      this.pendingRequests.delete(messageWithRequestId.requestId);

      if (message.type === 'error') {
        const errorPayload = message.payload as { message?: string } | string | undefined;
        const errorMessage = typeof errorPayload === 'string'
          ? errorPayload
          : (errorPayload?.message || 'Unknown error from Node.js bridge');
        request.reject(new Error(errorMessage));
      } else {
        request.resolve(message);
      }
      return;
    }

    // Broadcast to all handlers
    this.messageHandlers.forEach((handler, handlerId) => {
      try {
        handler(message);
      } catch (e) {
        console.error(`Error in message handler '${handlerId}':`, e);
      }
    });
  }

  /**
   * Track validation errors for circuit breaker pattern
   */
  private incrementValidationError(): void {
    this.validationErrorCount++;
    if (this.validationErrorCount >= this.MAX_VALIDATION_ERRORS) {
      console.error(
        `Too many validation errors (${this.validationErrorCount}). ` +
        'This may indicate an attack or misconfigured Node.js bridge.'
      );
      // In production, this could trigger alerts or cleanup
    }
  }

  /**
   * Send a message through the queue (public API)
   *
   * SECURITY: Outgoing messages are validated to ensure consistency
   * and prevent accidental injection of malformed data.
   */
  async sendMessage(
    message: IPCMessage,
    priority: Priority = Priority.NORMAL,
    timeoutMs?: number
  ): Promise<IPCMessage> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Check if bridge is crashed
    if (this.state.isCrashed && !this.state.isRestarting) {
      throw new Error('Node.js bridge is crashed. Auto-restart in progress.');
    }

    // Enqueue message with priority
    return await messageQueue.enqueue(message, priority);
  }

  /**
   * Send a message directly to Node.js bridge (used by queue executor)
   *
   * INTERNAL: Called by messageQueue, not for direct use
   */
  private async sendMessageDirect(message: IPCMessage, timeoutMs?: number): Promise<IPCMessage> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Validate outgoing message
    const validationResult = validateIPCMessageWithPayload(message);
    if (!validationResult.valid) {
      throw new Error(`Invalid outgoing IPC message: ${validationResult.error.message}`);
    }

    const requestId = `req-${++this.requestId}`;

    // Determine timeout based on operation type (handled by queue, but provide default)
    const timeout = timeoutMs || 60000;

    return new Promise((resolve, reject) => {
      // Create timeout
      const timeoutId = setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error(`Request timeout after ${timeout}ms (${message.type})`));
        }
      }, timeout);

      // Store request with timeout
      this.pendingRequests.set(requestId, { resolve, reject, timeout: timeoutId });

      if (this.nodejs) {
        try {
          const outgoingMessage = { ...message, requestId, timestamp: Date.now() };
          const serialized = JSON.stringify(outgoingMessage);

          // Check outgoing message size
          if (serialized.length > this.MAX_MESSAGE_SIZE) {
            clearTimeout(timeoutId);
            this.pendingRequests.delete(requestId);
            reject(new Error(`Outgoing message too large: ${serialized.length} bytes`));
            return;
          }

          this.nodejs.channel.send(serialized);
        } catch (error) {
          clearTimeout(timeoutId);
          this.pendingRequests.delete(requestId);
          reject(new Error('Failed to send message to Node.js bridge'));
        }
      } else {
        clearTimeout(timeoutId);
        this.pendingRequests.delete(requestId);
        reject(new Error('Node.js bridge not initialized'));
      }
    });
  }

  addHandler(id: string, handler: MessageHandler): void {
    // Prevent memory leak by limiting number of handlers
    if (this.messageHandlers.size >= this.MAX_HANDLERS) {
      console.warn('Maximum number of message handlers reached. Removing oldest handler.');
      const firstKey = this.messageHandlers.keys().next().value;
      if (firstKey) {
        this.messageHandlers.delete(firstKey);
      }
    }

    this.messageHandlers.set(id, handler);
  }

  removeHandler(id: string): void {
    this.messageHandlers.delete(id);
  }

  isInitialized(): boolean {
    return this.initialized && !this.state.isCrashed;
  }

  /**
   * Check if bridge is healthy
   */
  isHealthy(): boolean {
    return (
      this.initialized &&
      !this.state.isCrashed &&
      !this.state.isRestarting &&
      this.state.consecutiveFailures < HEALTH_CHECK_CONFIG.maxFailures
    );
  }

  /**
   * Get bridge health status
   */
  getHealthStatus() {
    return {
      initialized: this.initialized,
      healthy: this.isHealthy(),
      crashed: this.state.isCrashed,
      restarting: this.state.isRestarting,
      consecutiveFailures: this.state.consecutiveFailures,
      restartAttempts: this.state.restartAttempts,
      lastHealthCheck: this.state.lastHealthCheck,
      timeSinceLastHealthCheck: this.state.lastHealthCheck
        ? Date.now() - this.state.lastHealthCheck
        : null,
    };
  }

  /**
   * Clean up any pending requests
   */
  cleanup(): void {
    // Stop timers
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    if (this.recoveryTimer) {
      clearInterval(this.recoveryTimer);
      this.recoveryTimer = null;
    }

    // Cancel all pending requests
    this.pendingRequests.forEach(({ timeout, reject }) => {
      clearTimeout(timeout);
      reject(new Error('Bridge cleanup - request cancelled'));
    });
    this.pendingRequests.clear();

    // Clear all handlers
    this.messageHandlers.clear();

    // Reset validation error count
    this.validationErrorCount = 0;

    // Clear message queue
    messageQueue.clear();

    this.initialized = false;
    this.state.initialized = false;
  }

  /**
   * Get statistics about the bridge
   */
  getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
      handlers: this.messageHandlers.size,
      initialized: this.initialized,
      validationErrorCount: this.validationErrorCount,
      health: this.getHealthStatus(),
      queue: messageQueue.getStats(),
    };
  }

  /**
   * Update queue concurrency dynamically
   */
  setQueueConcurrency(maxConcurrency: number): void {
    messageQueue.setMaxConcurrency(maxConcurrency);
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    return messageQueue.getStats();
  }

  /**
   * Get queue breakdown by priority
   */
  getQueueBreakdown() {
    return messageQueue.getQueueBreakdown();
  }
}

export const nodeBridge = new NodeBridge();
export default nodeBridge;
