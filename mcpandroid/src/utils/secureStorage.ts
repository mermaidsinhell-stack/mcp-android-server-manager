/**
 * Secure Storage Utility
 *
 * Provides encrypted storage for sensitive data using expo-secure-store.
 * Includes backward compatibility migration from AsyncStorage.
 *
 * SECURITY CONSIDERATIONS:
 * - Uses device-level encryption (Keychain on iOS, Keystore on Android)
 * - Data is encrypted at rest
 * - Keys are protected by device authentication
 * - Maximum value size is 2048 bytes per item
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Secure storage options
 */
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/**
 * Migration status key (stored in SecureStore itself)
 */
const MIGRATION_STATUS_KEY = 'mcp_migration_completed';

/**
 * Keys that should be stored securely (sensitive data)
 */
export const SENSITIVE_KEYS = [
  'mcp-server-storage', // Main server storage with credentials
  'mcp-api-tokens',     // API tokens
  'mcp-credentials',    // User credentials
  'mcp-certificates',   // Certificate data
] as const;

export type SensitiveKey = typeof SENSITIVE_KEYS[number];

/**
 * Error types for secure storage operations
 */
export class SecureStorageError extends Error {
  constructor(
    message: string,
    public readonly code: 'ENCRYPTION_FAILED' | 'DECRYPTION_FAILED' | 'SIZE_EXCEEDED' | 'NOT_AVAILABLE' | 'MIGRATION_FAILED'
  ) {
    super(message);
    this.name = 'SecureStorageError';
  }
}

/**
 * Check if SecureStore is available on the current platform
 */
export async function isSecureStoreAvailable(): Promise<boolean> {
  try {
    // Test write/read/delete cycle
    const testKey = '__secure_store_test__';
    const testValue = 'test';
    await SecureStore.setItemAsync(testKey, testValue, SECURE_STORE_OPTIONS);
    const result = await SecureStore.getItemAsync(testKey, SECURE_STORE_OPTIONS);
    await SecureStore.deleteItemAsync(testKey, SECURE_STORE_OPTIONS);
    return result === testValue;
  } catch {
    return false;
  }
}

/**
 * Chunk large data for SecureStore (max 2048 bytes per item)
 * Uses a manifest approach to track chunks
 */
const MAX_CHUNK_SIZE = 2000; // Leave some room for overhead

interface ChunkManifest {
  version: 1;
  totalChunks: number;
  totalSize: number;
  checksum: string;
}

/**
 * Calculate a simple checksum for data integrity verification
 */
function calculateChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Store a value securely with chunking support for large data
 */
export async function setSecureItem(key: string, value: string): Promise<void> {
  if (!value) {
    // Delete the item if value is empty
    await deleteSecureItem(key);
    return;
  }

  const isAvailable = await isSecureStoreAvailable();
  if (!isAvailable) {
    throw new SecureStorageError(
      'SecureStore is not available on this device',
      'NOT_AVAILABLE'
    );
  }

  try {
    if (value.length <= MAX_CHUNK_SIZE) {
      // Small enough to store directly
      await SecureStore.setItemAsync(key, value, SECURE_STORE_OPTIONS);
      // Clean up any existing chunks
      await cleanupChunks(key);
    } else {
      // Need to chunk the data
      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += MAX_CHUNK_SIZE) {
        chunks.push(value.slice(i, i + MAX_CHUNK_SIZE));
      }

      // Create manifest
      const manifest: ChunkManifest = {
        version: 1,
        totalChunks: chunks.length,
        totalSize: value.length,
        checksum: calculateChecksum(value),
      };

      // Store manifest
      await SecureStore.setItemAsync(
        `${key}__manifest`,
        JSON.stringify(manifest),
        SECURE_STORE_OPTIONS
      );

      // Store chunks
      for (let i = 0; i < chunks.length; i++) {
        await SecureStore.setItemAsync(
          `${key}__chunk_${i}`,
          chunks[i],
          SECURE_STORE_OPTIONS
        );
      }

      // Store marker in main key for backward compatibility detection
      await SecureStore.setItemAsync(
        key,
        '__CHUNKED__',
        SECURE_STORE_OPTIONS
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new SecureStorageError(
      `Failed to store secure item: ${message}`,
      'ENCRYPTION_FAILED'
    );
  }
}

/**
 * Retrieve a value from secure storage with chunk reassembly
 */
export async function getSecureItem(key: string): Promise<string | null> {
  const isAvailable = await isSecureStoreAvailable();
  if (!isAvailable) {
    // Fallback to AsyncStorage if SecureStore not available
    console.warn('SecureStore not available, falling back to AsyncStorage');
    return AsyncStorage.getItem(key);
  }

  try {
    const value = await SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS);

    if (value === null) {
      return null;
    }

    if (value === '__CHUNKED__') {
      // Need to reassemble chunks
      const manifestStr = await SecureStore.getItemAsync(
        `${key}__manifest`,
        SECURE_STORE_OPTIONS
      );

      if (!manifestStr) {
        throw new SecureStorageError(
          'Chunked data manifest not found',
          'DECRYPTION_FAILED'
        );
      }

      const manifest: ChunkManifest = JSON.parse(manifestStr);

      // Reassemble chunks
      let reassembled = '';
      for (let i = 0; i < manifest.totalChunks; i++) {
        const chunk = await SecureStore.getItemAsync(
          `${key}__chunk_${i}`,
          SECURE_STORE_OPTIONS
        );

        if (chunk === null) {
          throw new SecureStorageError(
            `Missing chunk ${i} of ${manifest.totalChunks}`,
            'DECRYPTION_FAILED'
          );
        }

        reassembled += chunk;
      }

      // Verify checksum
      if (calculateChecksum(reassembled) !== manifest.checksum) {
        throw new SecureStorageError(
          'Data integrity check failed',
          'DECRYPTION_FAILED'
        );
      }

      return reassembled;
    }

    return value;
  } catch (error) {
    if (error instanceof SecureStorageError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new SecureStorageError(
      `Failed to retrieve secure item: ${message}`,
      'DECRYPTION_FAILED'
    );
  }
}

/**
 * Delete a secure item and all associated chunks
 */
export async function deleteSecureItem(key: string): Promise<void> {
  const isAvailable = await isSecureStoreAvailable();
  if (!isAvailable) {
    await AsyncStorage.removeItem(key);
    return;
  }

  try {
    // Delete main key
    await SecureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS);

    // Clean up any chunks
    await cleanupChunks(key);
  } catch (error) {
    // Ignore deletion errors
    console.warn('Error deleting secure item:', error);
  }
}

/**
 * Clean up chunk data for a key
 */
async function cleanupChunks(key: string): Promise<void> {
  try {
    const manifestStr = await SecureStore.getItemAsync(
      `${key}__manifest`,
      SECURE_STORE_OPTIONS
    );

    if (manifestStr) {
      const manifest: ChunkManifest = JSON.parse(manifestStr);

      // Delete all chunks
      for (let i = 0; i < manifest.totalChunks; i++) {
        await SecureStore.deleteItemAsync(
          `${key}__chunk_${i}`,
          SECURE_STORE_OPTIONS
        );
      }

      // Delete manifest
      await SecureStore.deleteItemAsync(
        `${key}__manifest`,
        SECURE_STORE_OPTIONS
      );
    }
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Migrate data from AsyncStorage to SecureStore
 * Returns true if migration was performed, false if already migrated
 */
export async function migrateFromAsyncStorage(): Promise<{
  migrated: boolean;
  itemsMigrated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let itemsMigrated = 0;

  try {
    // Check if migration already completed
    const migrationStatus = await SecureStore.getItemAsync(
      MIGRATION_STATUS_KEY,
      SECURE_STORE_OPTIONS
    );

    if (migrationStatus === 'completed') {
      return { migrated: false, itemsMigrated: 0, errors: [] };
    }

    // Check if SecureStore is available
    const isAvailable = await isSecureStoreAvailable();
    if (!isAvailable) {
      errors.push('SecureStore not available, skipping migration');
      return { migrated: false, itemsMigrated: 0, errors };
    }

    // Migrate each sensitive key
    for (const key of SENSITIVE_KEYS) {
      try {
        const value = await AsyncStorage.getItem(key);

        if (value !== null) {
          // Store in SecureStore
          await setSecureItem(key, value);

          // Verify migration
          const verified = await getSecureItem(key);
          if (verified === value) {
            // Successfully migrated, remove from AsyncStorage
            await AsyncStorage.removeItem(key);
            itemsMigrated++;
            console.log(`Migrated ${key} to SecureStore`);
          } else {
            errors.push(`Verification failed for ${key}`);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to migrate ${key}: ${message}`);
      }
    }

    // Mark migration as completed
    if (errors.length === 0) {
      await SecureStore.setItemAsync(
        MIGRATION_STATUS_KEY,
        'completed',
        SECURE_STORE_OPTIONS
      );
    }

    return { migrated: true, itemsMigrated, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Migration failed: ${message}`);
    return { migrated: false, itemsMigrated, errors };
  }
}

/**
 * Create a Zustand-compatible storage adapter using SecureStore
 */
export const secureStorageAdapter = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await getSecureItem(name);
    } catch (error) {
      console.error('SecureStore getItem error:', error);
      // Fallback to AsyncStorage on error
      return AsyncStorage.getItem(name);
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await setSecureItem(name, value);
    } catch (error) {
      console.error('SecureStore setItem error:', error);
      // Fallback to AsyncStorage on error
      await AsyncStorage.setItem(name, value);
    }
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      await deleteSecureItem(name);
    } catch (error) {
      console.error('SecureStore removeItem error:', error);
      // Also try to remove from AsyncStorage
      await AsyncStorage.removeItem(name);
    }
  },
};

export default {
  setItem: setSecureItem,
  getItem: getSecureItem,
  deleteItem: deleteSecureItem,
  migrateFromAsyncStorage,
  isAvailable: isSecureStoreAvailable,
  adapter: secureStorageAdapter,
};
