/**
 * MCP Server Manager - Type Definitions
 */

export type ServerStatus = 'stopped' | 'starting' | 'running' | 'error';

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  repoUrl: string;
  branch: string;
  status: ServerStatus;
  port: number;
  createdAt: Date;
  lastStarted?: Date;
  errorMessage?: string;
  config?: ServerConfig;
}

export interface ServerConfig {
  env?: Record<string, string>;
  args?: string[];
  autoStart?: boolean;
  restartOnCrash?: boolean;
  maxRestarts?: number;
}

export interface GitHubRepo {
  name: string;
  fullName: string;
  description: string;
  url: string;
  defaultBranch: string;
  stars: number;
  language: string;
}

export interface ServerLog {
  id: string;
  serverId: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

/**
 * Node Bridge Message type
 * @deprecated Use IPCMessage from utils/schemas.ts instead
 * This type is kept for backward compatibility
 */
export interface NodeBridgeMessage {
  type: 'start' | 'stop' | 'status' | 'log' | 'error' | 'ready' | 'clone' | 'install' | 'delete' | 'config' | 'health' | 'restart';
  serverId?: string;
  payload?: unknown;
  requestId?: string;
  timestamp?: number;
}

export interface ServerManagerState {
  servers: MCPServer[];
  selectedServerId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  addServer: (repo: GitHubRepo) => Promise<MCPServer>;
  removeServer: (id: string) => Promise<void>;
  startServer: (id: string) => Promise<void>;
  stopServer: (id: string) => Promise<void>;
  updateServerStatus: (id: string, status: ServerStatus, error?: string) => void;
  selectServer: (id: string | null) => void;
  loadServers: () => Promise<void>;
}

export interface AppTheme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    error: string;
    warning: string;
  };
}

// Navigation types
export type RootStackParamList = {
  index: undefined;
  'add-server': undefined;
  'server-detail': { id: string };
};

/**
 * State Reconciliation Types
 */

export interface ReconciliationMetrics {
  totalCycles: number;
  totalDriftsDetected: number;
  totalDriftsFixed: number;
  lastRunTimestamp: number | null;
  consecutiveFailures: number;
  isRunning: boolean;
  isPaused: boolean;
}

export interface DriftDetectionEvent {
  serverId: string;
  serverName: string;
  expectedStatus: ServerStatus;
  actualStatus: ServerStatus;
  timestamp: number;
  autoFixed: boolean;
}

export interface BridgeHealthStatus {
  healthy: boolean;
  initialized: boolean;
  crashed: boolean;
  restarting: boolean;
  consecutiveFailures: number;
  restartAttempts: number;
  lastHealthCheck: number | null;
  queueDepth: number;
  pendingRequests: number;
}
