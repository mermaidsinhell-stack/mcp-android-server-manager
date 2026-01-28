/**
 * Message Queue Service
 *
 * Implements priority-based message queue with concurrency control to prevent
 * overwhelming the Node.js bridge with concurrent operations.
 *
 * FEATURES:
 * - Priority queue (high/normal/low priority operations)
 * - Concurrency limit enforcement
 * - Per-operation timeout handling
 * - Queue statistics and monitoring
 * - Automatic retry with exponential backoff
 * - Dead letter queue for failed operations
 *
 * USAGE:
 * - Clone operations: LOW priority (long-running, can be deferred)
 * - Status checks: NORMAL priority (standard operations)
 * - Start/Stop: HIGH priority (user-initiated, immediate response needed)
 */

import { IPCMessage } from '../utils/schemas';

/**
 * Priority levels for queue operations
 */
export enum Priority {
  HIGH = 0,    // Start/Stop/Delete operations
  NORMAL = 1,  // Status checks, logs
  LOW = 2,     // Clone operations, background tasks
}

/**
 * Operation timeout configurations (milliseconds)
 */
const OPERATION_TIMEOUTS: Record<string, number> = {
  clone: 10 * 60 * 1000,     // 10 minutes for clone + npm install
  start: 60 * 1000,          // 60 seconds to start server
  stop: 30 * 1000,           // 30 seconds to stop server
  status: 10 * 1000,         // 10 seconds for status check
  logs: 15 * 1000,           // 15 seconds for log retrieval
  delete: 30 * 1000,         // 30 seconds to delete server
  default: 60 * 1000,        // 60 seconds default
};

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,         // Start with 1 second
  maxDelayMs: 30 * 1000,     // Cap at 30 seconds
  retryableErrors: [
    'timeout',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
  ],
};

/**
 * Queued operation
 */
interface QueuedOperation<T = unknown> {
  id: string;
  message: IPCMessage;
  priority: Priority;
  timeout: number;
  retryCount: number;
  maxRetries: number;
  enqueuedAt: number;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

/**
 * Queue statistics
 */
export interface QueueStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  deadLetterQueue: number;
  avgWaitTimeMs: number;
  avgExecutionTimeMs: number;
}

/**
 * Queue event listeners
 */
type QueueEventType = 'operation-started' | 'operation-completed' | 'operation-failed' | 'queue-drained';
type QueueEventListener = (data: unknown) => void;

/**
 * Message Queue with priority and concurrency control
 */
export class MessageQueue {
  private queues: Map<Priority, QueuedOperation[]>;
  private runningOperations: Set<string>;
  private maxConcurrency: number;
  private stats: {
    completed: number;
    failed: number;
    totalWaitTime: number;
    totalExecutionTime: number;
  };
  private deadLetterQueue: Array<{ operation: QueuedOperation; error: Error; timestamp: number }>;
  private eventListeners: Map<QueueEventType, Set<QueueEventListener>>;
  private executor: ((message: IPCMessage, timeoutMs?: number) => Promise<IPCMessage>) | null;

  constructor(maxConcurrency = 3) {
    this.queues = new Map([
      [Priority.HIGH, []],
      [Priority.NORMAL, []],
      [Priority.LOW, []],
    ]);
    this.runningOperations = new Set();
    this.maxConcurrency = maxConcurrency;
    this.stats = {
      completed: 0,
      failed: 0,
      totalWaitTime: 0,
      totalExecutionTime: 0,
    };
    this.deadLetterQueue = [];
    this.eventListeners = new Map([
      ['operation-started', new Set()],
      ['operation-completed', new Set()],
      ['operation-failed', new Set()],
      ['queue-drained', new Set()],
    ]);
    this.executor = null;

    console.log(`[MessageQueue] Initialized with max concurrency: ${maxConcurrency}`);
  }

  /**
   * Set the executor function (bridge sendMessage)
   */
  setExecutor(executor: (message: IPCMessage, timeoutMs?: number) => Promise<IPCMessage>): void {
    this.executor = executor;
  }

  /**
   * Update max concurrency dynamically
   */
  setMaxConcurrency(maxConcurrency: number): void {
    const oldMax = this.maxConcurrency;
    this.maxConcurrency = Math.max(1, Math.min(maxConcurrency, 10)); // Clamp 1-10
    console.log(`[MessageQueue] Concurrency updated: ${oldMax} -> ${this.maxConcurrency}`);

    // Process queue in case new slots opened up
    this.processQueue();
  }

  /**
   * Enqueue an operation with priority
   */
  async enqueue<T = IPCMessage>(
    message: IPCMessage,
    priority: Priority = Priority.NORMAL,
    maxRetries = RETRY_CONFIG.maxRetries
  ): Promise<T> {
    if (!this.executor) {
      throw new Error('MessageQueue: Executor not set. Call setExecutor() first.');
    }

    const operationId = `${message.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timeout = this.getTimeoutForOperation(message.type);

    return new Promise<T>((resolve, reject) => {
      const operation: QueuedOperation<T> = {
        id: operationId,
        message,
        priority,
        timeout,
        retryCount: 0,
        maxRetries,
        enqueuedAt: Date.now(),
        resolve: resolve as (value: unknown) => void,
        reject,
      };

      // Add to appropriate priority queue
      const queue = this.queues.get(priority);
      if (queue) {
        queue.push(operation);
        console.log(
          `[MessageQueue] Enqueued: ${message.type} (${Priority[priority]} priority, ` +
          `queue: ${queue.length}, running: ${this.runningOperations.size})`
        );
      }

      // Try to process queue
      this.processQueue();
    });
  }

  /**
   * Process queued operations respecting concurrency limit
   */
  private async processQueue(): Promise<void> {
    // Check if we can run more operations
    while (this.runningOperations.size < this.maxConcurrency) {
      const operation = this.getNextOperation();
      if (!operation) {
        // Queue is empty
        if (this.runningOperations.size === 0) {
          this.emit('queue-drained', { timestamp: Date.now() });
        }
        break;
      }

      // Mark as running
      this.runningOperations.add(operation.id);

      // Execute operation (don't await - run concurrently)
      this.executeOperation(operation).catch((error) => {
        console.error(`[MessageQueue] Unexpected error in executeOperation:`, error);
      });
    }
  }

  /**
   * Get next operation from highest priority queue
   */
  private getNextOperation(): QueuedOperation | null {
    // Check queues in priority order
    for (const priority of [Priority.HIGH, Priority.NORMAL, Priority.LOW]) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0) {
        return queue.shift()!;
      }
    }
    return null;
  }

  /**
   * Execute a single operation with timeout and retry logic
   */
  private async executeOperation(operation: QueuedOperation): Promise<void> {
    const startTime = Date.now();
    const waitTime = startTime - operation.enqueuedAt;
    this.stats.totalWaitTime += waitTime;

    console.log(
      `[MessageQueue] Executing: ${operation.message.type} ` +
      `(waited ${waitTime}ms, attempt ${operation.retryCount + 1}/${operation.maxRetries + 1})`
    );

    this.emit('operation-started', {
      operationId: operation.id,
      type: operation.message.type,
      priority: Priority[operation.priority],
    });

    try {
      if (!this.executor) {
        throw new Error('Executor not set');
      }

      // Execute with timeout
      const result = await this.executor(operation.message, operation.timeout);

      // Success
      const executionTime = Date.now() - startTime;
      this.stats.completed++;
      this.stats.totalExecutionTime += executionTime;

      console.log(
        `[MessageQueue] Completed: ${operation.message.type} ` +
        `(${executionTime}ms execution, ${waitTime}ms wait)`
      );

      this.emit('operation-completed', {
        operationId: operation.id,
        type: operation.message.type,
        executionTimeMs: executionTime,
        waitTimeMs: waitTime,
      });

      operation.resolve(result as never);

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const isRetryable = this.isRetryableError(error);
      const canRetry = operation.retryCount < operation.maxRetries && isRetryable;

      console.error(
        `[MessageQueue] Failed: ${operation.message.type} ` +
        `(attempt ${operation.retryCount + 1}/${operation.maxRetries + 1}, ` +
        `retryable: ${isRetryable}, will retry: ${canRetry})`,
        error instanceof Error ? error.message : String(error)
      );

      if (canRetry) {
        // Retry with exponential backoff
        operation.retryCount++;
        const delay = this.calculateRetryDelay(operation.retryCount);

        console.log(`[MessageQueue] Retrying ${operation.message.type} in ${delay}ms...`);

        setTimeout(() => {
          // Re-enqueue at same priority
          const queue = this.queues.get(operation.priority);
          if (queue) {
            // Insert at front of queue for priority
            queue.unshift(operation);
            this.processQueue();
          }
        }, delay);

      } else {
        // Final failure - move to dead letter queue
        this.stats.failed++;

        const errorObj = error instanceof Error ? error : new Error(String(error));
        this.deadLetterQueue.push({
          operation,
          error: errorObj,
          timestamp: Date.now(),
        });

        // Limit dead letter queue size
        if (this.deadLetterQueue.length > 100) {
          this.deadLetterQueue.shift();
        }

        this.emit('operation-failed', {
          operationId: operation.id,
          type: operation.message.type,
          error: errorObj.message,
          attempts: operation.retryCount + 1,
        });

        operation.reject(errorObj);
      }
    } finally {
      // Mark as no longer running
      this.runningOperations.delete(operation.id);

      // Process next operation in queue
      this.processQueue();
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (!error) return false;

    const errorMessage = error instanceof Error ? error.message : String(error);

    return RETRY_CONFIG.retryableErrors.some(pattern =>
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Calculate retry delay with exponential backoff + jitter
   */
  private calculateRetryDelay(retryCount: number): number {
    const exponentialDelay = RETRY_CONFIG.baseDelayMs * Math.pow(2, retryCount - 1);
    const cappedDelay = Math.min(exponentialDelay, RETRY_CONFIG.maxDelayMs);

    // Add jitter (±25%)
    const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);

    return Math.round(cappedDelay + jitter);
  }

  /**
   * Get timeout for operation type
   */
  private getTimeoutForOperation(operationType: string): number {
    return OPERATION_TIMEOUTS[operationType] || OPERATION_TIMEOUTS.default;
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const pending = Array.from(this.queues.values()).reduce(
      (sum, queue) => sum + queue.length,
      0
    );

    const avgWaitTimeMs =
      this.stats.completed > 0
        ? Math.round(this.stats.totalWaitTime / this.stats.completed)
        : 0;

    const avgExecutionTimeMs =
      this.stats.completed > 0
        ? Math.round(this.stats.totalExecutionTime / this.stats.completed)
        : 0;

    return {
      pending,
      running: this.runningOperations.size,
      completed: this.stats.completed,
      failed: this.stats.failed,
      deadLetterQueue: this.deadLetterQueue.length,
      avgWaitTimeMs,
      avgExecutionTimeMs,
    };
  }

  /**
   * Get detailed queue breakdown by priority
   */
  getQueueBreakdown(): Record<string, number> {
    return {
      highPriority: this.queues.get(Priority.HIGH)?.length || 0,
      normalPriority: this.queues.get(Priority.NORMAL)?.length || 0,
      lowPriority: this.queues.get(Priority.LOW)?.length || 0,
      running: this.runningOperations.size,
    };
  }

  /**
   * Get dead letter queue entries
   */
  getDeadLetterQueue(): Array<{ type: string; error: string; timestamp: number }> {
    return this.deadLetterQueue.map(entry => ({
      type: entry.operation.message.type,
      error: entry.error.message,
      timestamp: entry.timestamp,
    }));
  }

  /**
   * Clear dead letter queue
   */
  clearDeadLetterQueue(): void {
    this.deadLetterQueue = [];
    console.log('[MessageQueue] Dead letter queue cleared');
  }

  /**
   * Event emitter
   */
  private emit(event: QueueEventType, data: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`[MessageQueue] Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Add event listener
   */
  on(event: QueueEventType, listener: QueueEventListener): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.add(listener);
    }
  }

  /**
   * Remove event listener
   */
  off(event: QueueEventType, listener: QueueEventListener): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Clear all pending operations (emergency cleanup)
   */
  clear(): void {
    let totalCleared = 0;

    this.queues.forEach((queue, priority) => {
      const count = queue.length;
      queue.forEach(op => {
        op.reject(new Error('Queue cleared'));
      });
      queue.length = 0;
      totalCleared += count;
    });

    console.log(`[MessageQueue] Cleared ${totalCleared} pending operations`);
  }

  /**
   * Shutdown queue (reject all pending, wait for running to complete)
   */
  async shutdown(timeoutMs = 30000): Promise<void> {
    console.log('[MessageQueue] Shutting down...');

    // Clear all pending
    this.clear();

    // Wait for running operations to complete (with timeout)
    const startTime = Date.now();
    while (this.runningOperations.size > 0) {
      if (Date.now() - startTime > timeoutMs) {
        console.warn(
          `[MessageQueue] Shutdown timeout: ${this.runningOperations.size} operations still running`
        );
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('[MessageQueue] Shutdown complete');
  }
}

/**
 * Singleton instance
 */
export const messageQueue = new MessageQueue(3); // Default: 3 concurrent operations

export default messageQueue;
