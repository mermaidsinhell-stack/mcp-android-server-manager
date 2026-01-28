/**
 * Device Information Utility
 *
 * Detects device capabilities (RAM, CPU) to determine resource limits
 * for server spawning and operation.
 *
 * SECURITY: Uses platform APIs to safely detect hardware capabilities
 * RELIABILITY: Provides graceful fallback values if detection fails
 */

import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * Device memory tier classification
 */
export enum MemoryTier {
  LOW = 'low',          // < 2GB RAM
  MEDIUM = 'medium',    // 2-4GB RAM
  HIGH = 'high',        // 4-6GB RAM
  VERY_HIGH = 'very_high' // > 6GB RAM
}

/**
 * Device capability information
 */
export interface DeviceCapabilities {
  totalMemoryMB: number;
  memoryTier: MemoryTier;
  maxServers: number;
  recommendedConcurrency: number;
  isLowEndDevice: boolean;
}

/**
 * Configuration constants
 */
const CONFIG = {
  // Memory estimates per server (MB)
  SERVER_BASE_MEMORY: 512,     // Base memory per server
  SERVER_PEAK_MEMORY: 768,     // Peak memory during operation

  // System memory reserves (MB)
  SYSTEM_RESERVE: 1024,        // Reserve for Android system
  APP_OVERHEAD: 512,           // Reserve for app UI and overhead

  // Conservative safety factor
  SAFETY_FACTOR: 0.7,          // Use only 70% of available memory

  // Defaults for fallback
  DEFAULT_TOTAL_MEMORY: 2048,  // 2GB default if detection fails
  DEFAULT_MAX_SERVERS: 2,      // Conservative default
  DEFAULT_CONCURRENCY: 2,      // Conservative concurrency

  // Maximum limits (safety caps)
  ABSOLUTE_MAX_SERVERS: 8,     // Never exceed 8 servers
  MAX_CONCURRENCY: 4,          // Never exceed 4 concurrent operations
};

/**
 * Detect total device RAM in megabytes
 *
 * Uses multiple detection methods with fallback:
 * 1. expo-device API (if available)
 * 2. Platform-specific APIs
 * 3. Conservative fallback value
 */
async function detectTotalMemoryMB(): Promise<number> {
  try {
    // Method 1: expo-device totalMemory (returns bytes)
    if (Device.totalMemory) {
      const memoryBytes = Device.totalMemory;
      const memoryMB = Math.round(memoryBytes / (1024 * 1024));

      // Sanity check: memory should be between 512MB and 32GB
      if (memoryMB >= 512 && memoryMB <= 32768) {
        console.log(`[DeviceInfo] Detected ${memoryMB}MB RAM via expo-device`);
        return memoryMB;
      }
    }

    // Method 2: Platform-specific detection (future enhancement)
    // TODO: Could use native modules for more accurate detection

    // Method 3: Estimate based on device model/tier
    if (Device.modelName) {
      const estimatedMemory = estimateMemoryFromModel(Device.modelName);
      if (estimatedMemory) {
        console.log(`[DeviceInfo] Estimated ${estimatedMemory}MB RAM from model: ${Device.modelName}`);
        return estimatedMemory;
      }
    }

  } catch (error) {
    console.warn('[DeviceInfo] Memory detection failed:', error);
  }

  // Fallback: Use conservative default
  console.log(`[DeviceInfo] Using fallback memory: ${CONFIG.DEFAULT_TOTAL_MEMORY}MB`);
  return CONFIG.DEFAULT_TOTAL_MEMORY;
}

/**
 * Estimate memory from device model name (heuristic)
 * Returns null if unable to estimate
 */
function estimateMemoryFromModel(modelName: string): number | null {
  const model = modelName.toLowerCase();

  // High-end devices (typically 6GB+)
  if (model.includes('ultra') || model.includes('pro max') ||
      model.includes('fold') || model.includes('12gb')) {
    return 8192; // 8GB
  }

  // Upper mid-range (typically 4-6GB)
  if (model.includes('pro') || model.includes('plus') ||
      model.includes('6gb') || model.includes('8gb')) {
    return 6144; // 6GB
  }

  // Mid-range (typically 3-4GB)
  if (model.includes('4gb') || model.includes('lite')) {
    return 4096; // 4GB
  }

  // Low-end (typically 2-3GB)
  if (model.includes('2gb') || model.includes('3gb') ||
      model.includes('go') || model.includes('mini')) {
    return 2048; // 2GB
  }

  return null; // Unable to estimate
}

/**
 * Calculate maximum servers based on available memory
 */
function calculateMaxServers(totalMemoryMB: number): number {
  // Calculate available memory for servers
  const systemAndAppReserve = CONFIG.SYSTEM_RESERVE + CONFIG.APP_OVERHEAD;
  const availableMemory = totalMemoryMB - systemAndAppReserve;

  // Apply safety factor
  const safeAvailableMemory = availableMemory * CONFIG.SAFETY_FACTOR;

  // Calculate max servers (use peak memory for conservative estimate)
  const maxServers = Math.floor(safeAvailableMemory / CONFIG.SERVER_PEAK_MEMORY);

  // Clamp between 1 and ABSOLUTE_MAX_SERVERS
  const clampedMax = Math.max(1, Math.min(maxServers, CONFIG.ABSOLUTE_MAX_SERVERS));

  console.log(
    `[DeviceInfo] Memory calculation: Total=${totalMemoryMB}MB, ` +
    `Available=${availableMemory}MB, Safe=${Math.round(safeAvailableMemory)}MB, ` +
    `MaxServers=${clampedMax}`
  );

  return clampedMax;
}

/**
 * Determine memory tier classification
 */
function classifyMemoryTier(totalMemoryMB: number): MemoryTier {
  if (totalMemoryMB < 2048) {
    return MemoryTier.LOW;
  } else if (totalMemoryMB < 4096) {
    return MemoryTier.MEDIUM;
  } else if (totalMemoryMB < 6144) {
    return MemoryTier.HIGH;
  } else {
    return MemoryTier.VERY_HIGH;
  }
}

/**
 * Calculate recommended concurrency based on device capabilities
 */
function calculateRecommendedConcurrency(memoryTier: MemoryTier, maxServers: number): number {
  let concurrency: number;

  switch (memoryTier) {
    case MemoryTier.LOW:
      concurrency = 1; // Very conservative
      break;
    case MemoryTier.MEDIUM:
      concurrency = 2;
      break;
    case MemoryTier.HIGH:
      concurrency = 3;
      break;
    case MemoryTier.VERY_HIGH:
      concurrency = 4;
      break;
    default:
      concurrency = CONFIG.DEFAULT_CONCURRENCY;
  }

  // Never exceed max concurrency or available servers
  return Math.min(concurrency, CONFIG.MAX_CONCURRENCY, Math.max(1, maxServers));
}

/**
 * Detect comprehensive device capabilities
 *
 * This is the main entry point for device capability detection.
 * Call this once at app startup and cache the result.
 */
export async function detectDeviceCapabilities(): Promise<DeviceCapabilities> {
  console.log('[DeviceInfo] Detecting device capabilities...');

  // Detect total memory
  const totalMemoryMB = await detectTotalMemoryMB();

  // Calculate derived values
  const memoryTier = classifyMemoryTier(totalMemoryMB);
  const maxServers = calculateMaxServers(totalMemoryMB);
  const recommendedConcurrency = calculateRecommendedConcurrency(memoryTier, maxServers);
  const isLowEndDevice = memoryTier === MemoryTier.LOW || totalMemoryMB < 3072;

  const capabilities: DeviceCapabilities = {
    totalMemoryMB,
    memoryTier,
    maxServers,
    recommendedConcurrency,
    isLowEndDevice,
  };

  console.log('[DeviceInfo] Device capabilities:', {
    ...capabilities,
    deviceModel: Device.modelName,
    platform: Platform.OS,
  });

  return capabilities;
}

/**
 * Get memory estimate per server for UI display
 */
export function getServerMemoryEstimate(): { base: number; peak: number } {
  return {
    base: CONFIG.SERVER_BASE_MEMORY,
    peak: CONFIG.SERVER_PEAK_MEMORY,
  };
}

/**
 * Check if device has enough memory for additional server
 */
export function canAddServer(
  currentServerCount: number,
  capabilities: DeviceCapabilities
): { allowed: boolean; reason?: string } {
  if (currentServerCount >= capabilities.maxServers) {
    return {
      allowed: false,
      reason: `Device memory limit reached. Maximum ${capabilities.maxServers} servers supported on this device (${capabilities.totalMemoryMB}MB RAM).`,
    };
  }

  if (currentServerCount >= CONFIG.ABSOLUTE_MAX_SERVERS) {
    return {
      allowed: false,
      reason: `Absolute server limit reached (${CONFIG.ABSOLUTE_MAX_SERVERS} servers maximum).`,
    };
  }

  return { allowed: true };
}

/**
 * Get user-friendly memory tier description
 */
export function getMemoryTierDescription(tier: MemoryTier): string {
  switch (tier) {
    case MemoryTier.LOW:
      return 'Low memory device - Limited server capacity';
    case MemoryTier.MEDIUM:
      return 'Medium memory device - Moderate server capacity';
    case MemoryTier.HIGH:
      return 'High memory device - Good server capacity';
    case MemoryTier.VERY_HIGH:
      return 'Very high memory device - Excellent server capacity';
    default:
      return 'Unknown memory tier';
  }
}
