/**
 * MCP Server Manager - Zustand Store
 *
 * Centralized state management for MCP servers with device-aware limits
 *
 * RELIABILITY: Enforces MAX_SERVERS based on device RAM to prevent OOM crashes
 * MONITORING: Tracks per-server memory usage and provides warnings
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MCPServer, ServerStatus, GitHubRepo, ServerManagerState } from '../types';
import { serverManager } from '../services/serverManager';
import { generateSecureId, sanitizeServerId } from '../utils/security';
import { secureStorageAdapter, migrateFromAsyncStorage } from '../utils/secureStorage';
import {
  detectDeviceCapabilities,
  canAddServer,
  DeviceCapabilities,
  getServerMemoryEstimate,
} from '../utils/deviceInfo';
import { Priority } from '../services/messageQueue';
import { nodeBridge } from '../services/nodeBridge';

/**
 * Extended state with device capabilities
 */
interface ExtendedServerManagerState extends ServerManagerState {
  deviceCapabilities: DeviceCapabilities | null;
  memoryWarnings: Map<string, string>;
  initializeDeviceCapabilities: () => Promise<void>;
  getMemoryWarning: (serverId: string) => string | undefined;
  clearMemoryWarning: (serverId: string) => void;
}

export const useServerStore = create<ExtendedServerManagerState>()(
  persist(
    (set, get) => ({
      servers: [],
      selectedServerId: null,
      isLoading: false,
      error: null,
      deviceCapabilities: null,
      memoryWarnings: new Map(),

      /**
       * Initialize device capabilities (call once at app startup)
       */
      initializeDeviceCapabilities: async (): Promise<void> => {
        try {
          console.log('[ServerStore] Detecting device capabilities...');
          const capabilities = await detectDeviceCapabilities();

          set({ deviceCapabilities: capabilities });

          // Update queue concurrency based on device capabilities
          nodeBridge.setQueueConcurrency(capabilities.recommendedConcurrency);

          console.log('[ServerStore] Device capabilities initialized:', {
            maxServers: capabilities.maxServers,
            concurrency: capabilities.recommendedConcurrency,
            memoryTier: capabilities.memoryTier,
          });
        } catch (error) {
          console.error('[ServerStore] Failed to detect device capabilities:', error);
          // Continue with null capabilities - will use defaults
        }
      },

      /**
       * Add a new server with RAM-based limit enforcement
       */
      addServer: async (repo: GitHubRepo): Promise<MCPServer> => {
        set({ isLoading: true, error: null });

        try {
          const state = get();
          const currentServerCount = state.servers.length;
          const capabilities = state.deviceCapabilities;

          // Check if device capabilities are initialized
          if (!capabilities) {
            console.warn('[ServerStore] Device capabilities not initialized - enforcing default limit');
            // Use conservative default limit
            if (currentServerCount >= 2) {
              throw new Error(
                'Server limit reached. Device capabilities not detected - using conservative limit of 2 servers.'
              );
            }
          } else {
            // Enforce MAX_SERVERS based on device RAM
            const canAdd = canAddServer(currentServerCount, capabilities);
            if (!canAdd.allowed) {
              throw new Error(canAdd.reason || 'Cannot add more servers');
            }
          }

          // Generate cryptographically secure ID
          const rawId = await generateSecureId();
          const serverId = sanitizeServerId(rawId);

          const newServer: MCPServer = {
            id: serverId,
            name: repo.name,
            description: repo.description || 'No description provided',
            repoUrl: repo.url,
            branch: repo.defaultBranch,
            status: 'stopped',
            port: 3000 + currentServerCount,
            createdAt: new Date(),
            config: {
              autoStart: false,
              restartOnCrash: true,
              maxRestarts: 3,
            },
          };

          // Clone the repository (LOW priority - long-running operation)
          await serverManager.cloneRepo(newServer, Priority.LOW);

          set((state) => ({
            servers: [...state.servers, newServer],
            isLoading: false,
          }));

          // Log memory info
          const memoryEstimate = getServerMemoryEstimate();
          console.log(
            `[ServerStore] Server added (${currentServerCount + 1}/${capabilities?.maxServers || '?'}). ` +
            `Estimated memory: ${memoryEstimate.base}-${memoryEstimate.peak}MB`
          );

          return newServer;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to add server';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      removeServer: async (id: string): Promise<void> => {
        set({ isLoading: true, error: null });

        try {
          const server = get().servers.find((s) => s.id === id);
          if (server && server.status === 'running') {
            // Stop with HIGH priority (user-initiated)
            await serverManager.stopServer(server, Priority.HIGH);
          }

          // Delete with NORMAL priority
          await serverManager.deleteServer(id, Priority.NORMAL);

          set((state) => ({
            servers: state.servers.filter((s) => s.id !== id),
            selectedServerId: state.selectedServerId === id ? null : state.selectedServerId,
            isLoading: false,
          }));

          // Clear any memory warnings for this server
          get().clearMemoryWarning(id);

          console.log('[ServerStore] Server removed:', id);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to remove server';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      startServer: async (id: string): Promise<void> => {
        const server = get().servers.find((s) => s.id === id);
        if (!server) throw new Error('Server not found');

        // Prevent starting if already running or starting
        if (server.status === 'running' || server.status === 'starting') {
          throw new Error('Server is already running or starting');
        }

        // Set to starting status
        set((state) => ({
          servers: state.servers.map((s) =>
            s.id === id ? { ...s, status: 'starting' as ServerStatus, errorMessage: undefined } : s
          ),
        }));

        try {
          // Start with HIGH priority (user-initiated)
          await serverManager.startServer(server, Priority.HIGH);

          // Only update status if still in starting state (prevent race condition)
          set((state) => ({
            servers: state.servers.map((s) => {
              if (s.id === id && s.status === 'starting') {
                return { ...s, status: 'running' as ServerStatus, lastStarted: new Date(), errorMessage: undefined };
              }
              return s;
            }),
          }));

          console.log('[ServerStore] Server started:', id);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to start server';

          // Only update to error state if still in starting state
          set((state) => ({
            servers: state.servers.map((s) => {
              if (s.id === id && (s.status === 'starting' || s.status === 'running')) {
                return { ...s, status: 'error' as ServerStatus, errorMessage: message };
              }
              return s;
            }),
          }));
          throw error;
        }
      },

      stopServer: async (id: string): Promise<void> => {
        const server = get().servers.find((s) => s.id === id);
        if (!server) throw new Error('Server not found');

        // Prevent stopping if already stopped
        if (server.status === 'stopped') {
          return; // Already stopped, nothing to do
        }

        try {
          // Stop with HIGH priority (user-initiated)
          await serverManager.stopServer(server, Priority.HIGH);

          set((state) => ({
            servers: state.servers.map((s) =>
              s.id === id ? { ...s, status: 'stopped' as ServerStatus, errorMessage: undefined } : s
            ),
          }));

          // Clear memory warning when server stops
          get().clearMemoryWarning(id);

          console.log('[ServerStore] Server stopped:', id);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to stop server';
          set((state) => ({
            servers: state.servers.map((s) =>
              s.id === id ? { ...s, errorMessage: message } : s
            ),
            error: message,
          }));
          throw error;
        }
      },

      updateServerStatus: (id: string, status: ServerStatus, error?: string) => {
        set((state) => ({
          servers: state.servers.map((s) =>
            s.id === id ? { ...s, status, errorMessage: error } : s
          ),
        }));
      },

      selectServer: (id: string | null) => {
        set({ selectedServerId: id });
      },

      loadServers: async (): Promise<void> => {
        set({ isLoading: true });
        try {
          // Servers are persisted, so they load automatically
          // This method is for refreshing status from the node bridge
          const servers = get().servers;
          for (const server of servers) {
            try {
              // Status check with NORMAL priority
              const status = await serverManager.getServerStatus(server.id, Priority.NORMAL);
              if (status !== server.status) {
                get().updateServerStatus(server.id, status);
              }
            } catch (error) {
              console.warn(`[ServerStore] Failed to get status for ${server.id}:`, error);
            }
          }
          set({ isLoading: false });
        } catch (error) {
          set({ isLoading: false });
        }
      },

      /**
       * Get memory warning for a server
       */
      getMemoryWarning: (serverId: string): string | undefined => {
        return get().memoryWarnings.get(serverId);
      },

      /**
       * Clear memory warning for a server
       */
      clearMemoryWarning: (serverId: string): void => {
        const warnings = new Map(get().memoryWarnings);
        warnings.delete(serverId);
        set({ memoryWarnings: warnings });
      },
    }),
    {
      name: 'mcp-server-storage',
      storage: createJSONStorage(() => secureStorageAdapter),
      partialize: (state) => ({
        servers: state.servers.map((s) => ({
          ...s,
          status: 'stopped' as ServerStatus, // Reset status on reload
          createdAt: s.createdAt,
          lastStarted: s.lastStarted,
        })),
        // Don't persist device capabilities - detect fresh on each launch
        // Don't persist memory warnings - they're runtime state
      }),
      // Handle migration on rehydration
      onRehydrateStorage: () => {
        // Trigger migration on first load
        migrateFromAsyncStorage()
          .then(({ migrated, itemsMigrated, errors }) => {
            if (migrated) {
              console.log(`SecureStore migration: ${itemsMigrated} items migrated`);
              if (errors.length > 0) {
                console.warn('Migration errors:', errors);
              }
            }
          })
          .catch((error) => {
            console.error('Migration failed:', error);
          });

        return (state, error) => {
          if (error) {
            console.error('Error rehydrating store:', error);
          } else {
            // Initialize device capabilities after rehydration
            if (state) {
              (state as ExtendedServerManagerState).initializeDeviceCapabilities()
                .catch(err => {
                  console.error('Failed to initialize device capabilities:', err);
                });
            }
          }
        };
      },
    }
  )
);

export default useServerStore;

/**
 * State Reconciliation Integration
 */
import { stateReconciliationService } from '../services/stateReconciliation';

// Initialize reconciliation service after store creation
// This should be called from the app root after the store is ready
export const initializeReconciliation = () => {
  const store = useServerStore.getState();

  // Initialize reconciliation with callbacks
  stateReconciliationService.initialize(
    // Update callback
    (serverId: string, status: ServerStatus, errorMessage?: string) => {
      store.updateServerStatus(serverId, status, errorMessage);
    },
    // Server provider callback
    () => store.servers,
    // Optional config
    {
      enabled: true,
      intervalMs: 30000, // 30 seconds
      maxConcurrentChecks: 3,
      enableNotifications: true,
      pauseWhenBackgrounded: true,
      enableMetrics: true,
      enableAutoFix: true,
      notifyOnAutoFix: true,
    }
  );

  // Start reconciliation
  stateReconciliationService.start();

  console.log('[ServerStore] State reconciliation initialized and started');
};

// Get reconciliation state for UI
export const getReconciliationState = () => {
  return stateReconciliationService.getState();
};

// Manual reconciliation trigger
export const triggerReconciliation = async () => {
  return await stateReconciliationService.reconcileNow();
};

// Pause/resume reconciliation
export const pauseReconciliation = () => {
  stateReconciliationService.pause();
};

export const resumeReconciliation = () => {
  stateReconciliationService.resume();
};
