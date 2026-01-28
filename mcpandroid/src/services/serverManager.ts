/**
 * MCP Server Manager - Server Management Service
 *
 * Handles cloning, starting, stopping, and managing MCP servers
 * with priority-based operation queuing
 */

import * as FileSystem from 'expo-file-system';
import { MCPServer, ServerStatus } from '../types';
import { nodeBridge } from './nodeBridge';
import { sanitizeServerId, validateFilePath, validateGitUrl, validateBranchName } from '../utils/security';
import { Priority } from './messageQueue';

const SERVERS_DIR = `${FileSystem.documentDirectory}mcp-servers/`;

class ServerManager {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure servers directory exists
    const dirInfo = await FileSystem.getInfoAsync(SERVERS_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(SERVERS_DIR, { intermediates: true });
    }

    // Initialize node bridge
    await nodeBridge.initialize();

    this.initialized = true;
  }

  async cloneRepo(server: MCPServer, priority: Priority = Priority.LOW): Promise<void> {
    await this.initialize();

    // Sanitize server ID to prevent path traversal
    const safeServerId = sanitizeServerId(server.id);
    const serverDir = `${SERVERS_DIR}${safeServerId}/`;

    // Validate the path is within SERVERS_DIR
    if (!validateFilePath(serverDir, SERVERS_DIR)) {
      throw new Error('Invalid server directory path');
    }

    // Validate repository URL
    const urlValidation = validateGitUrl(server.repoUrl);
    if (!urlValidation.valid) {
      throw new Error(urlValidation.error || 'Invalid repository URL');
    }

    // Validate branch name
    const branchValidation = validateBranchName(server.branch);
    if (!branchValidation.valid) {
      throw new Error(branchValidation.error || 'Invalid branch name');
    }

    // Create server directory
    await FileSystem.makeDirectoryAsync(serverDir, { intermediates: true });

    // Clone via node bridge (which handles git operations)
    // Clone operations are typically LOW priority as they're long-running
    await nodeBridge.sendMessage(
      {
        type: 'clone',
        serverId: safeServerId,
        payload: {
          repoUrl: urlValidation.sanitized || server.repoUrl,
          branch: server.branch,
          targetDir: serverDir,
        },
      },
      priority
    );
  }

  async startServer(server: MCPServer, priority: Priority = Priority.HIGH): Promise<void> {
    await this.initialize();

    const safeServerId = sanitizeServerId(server.id);
    const serverDir = `${SERVERS_DIR}${safeServerId}/`;

    if (!validateFilePath(serverDir, SERVERS_DIR)) {
      throw new Error('Invalid server directory path');
    }

    // Start server via node bridge
    // Start operations are typically HIGH priority (user-initiated)
    await nodeBridge.sendMessage(
      {
        type: 'start',
        serverId: safeServerId,
        payload: {
          serverDir,
          port: server.port,
          env: server.config?.env || {},
          args: server.config?.args || [],
        },
      },
      priority
    );
  }

  async stopServer(server: MCPServer, priority: Priority = Priority.HIGH): Promise<void> {
    const safeServerId = sanitizeServerId(server.id);

    // Stop operations are typically HIGH priority (user-initiated)
    await nodeBridge.sendMessage(
      {
        type: 'stop',
        serverId: safeServerId,
      },
      priority
    );
  }

  async getServerStatus(serverId: string, priority: Priority = Priority.NORMAL): Promise<ServerStatus> {
    const safeServerId = sanitizeServerId(serverId);

    // Status checks are typically NORMAL priority
    const response = await nodeBridge.sendMessage(
      {
        type: 'status',
        serverId: safeServerId,
      },
      priority
    );

    return (response?.payload as ServerStatus) || 'stopped';
  }

  async deleteServer(serverId: string, priority: Priority = Priority.NORMAL): Promise<void> {
    const safeServerId = sanitizeServerId(serverId);
    const serverDir = `${SERVERS_DIR}${safeServerId}/`;

    if (!validateFilePath(serverDir, SERVERS_DIR)) {
      throw new Error('Invalid server directory path');
    }

    // Stop if running (HIGH priority for stop)
    await nodeBridge.sendMessage(
      {
        type: 'stop',
        serverId: safeServerId,
      },
      Priority.HIGH
    );

    // Delete server directory
    const dirInfo = await FileSystem.getInfoAsync(serverDir);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(serverDir, { idempotent: true });
    }
  }

  async getServerLogs(serverId: string, priority: Priority = Priority.NORMAL): Promise<string[]> {
    const safeServerId = sanitizeServerId(serverId);

    // Log retrieval is typically NORMAL priority
    const response = await nodeBridge.sendMessage(
      {
        type: 'logs',
        serverId: safeServerId,
      },
      priority
    );

    return (response?.payload as string[]) || [];
  }

  getServersDirectory(): string {
    return SERVERS_DIR;
  }
}

export const serverManager = new ServerManager();
export default serverManager;
