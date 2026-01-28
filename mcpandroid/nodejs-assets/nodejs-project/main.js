/**
 * MCP Server Manager - Node.js Runtime
 *
 * This runs inside nodejs-mobile on Android and handles:
 * - Git clone operations
 * - npm install
 * - Starting/stopping MCP servers
 * - Log streaming
 * - Memory monitoring and enforcement
 */

const rn_bridge = require('rn-bridge');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Store running server processes
const runningServers = new Map();

// Server logs buffer (keep last 100 lines per server)
const serverLogs = new Map();
const MAX_LOGS = 100;
const MAX_TOTAL_LOG_SIZE = 10000; // Prevent memory exhaustion

// Memory monitoring
const serverMemoryUsage = new Map();
const MEMORY_CHECK_INTERVAL = 30000; // Check every 30 seconds
const MEMORY_WARNING_THRESHOLD = 512 * 1024 * 1024; // 512MB in bytes
const MEMORY_CRITICAL_THRESHOLD = 768 * 1024 * 1024; // 768MB in bytes
const MEMORY_KILL_THRESHOLD = 1024 * 1024 * 1024; // 1GB in bytes (safety limit)

// Base directory for MCP servers
const SERVERS_DIR = path.join(rn_bridge.app.datadir(), 'mcp-servers');

// Ensure servers directory exists
if (!fs.existsSync(SERVERS_DIR)) {
  fs.mkdirSync(SERVERS_DIR, { recursive: true });
}

/**
 * Validate server ID to prevent path traversal
 */
function validateServerId(serverId) {
  if (!serverId || typeof serverId !== 'string') {
    throw new Error('Invalid server ID');
  }

  const sanitized = serverId.replace(/[^a-zA-Z0-9-]/g, '');
  if (sanitized !== serverId || sanitized.length === 0) {
    throw new Error('Server ID contains invalid characters');
  }

  if (sanitized.length > 64) {
    throw new Error('Server ID too long');
  }

  return sanitized;
}

/**
 * Validate Git URL
 */
function validateGitUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL');
  }

  // Check for dangerous patterns (shell metacharacters)
  if (/[;&|`$(){}[\]<>]/.test(url)) {
    throw new Error('URL contains invalid characters');
  }

  // Must be HTTPS
  if (!url.startsWith('https://')) {
    throw new Error('Only HTTPS URLs are allowed');
  }

  // Validate hostname
  const allowedHosts = ['github.com', 'gitlab.com', 'gitea.com', 'bitbucket.org'];
  try {
    const parsed = new URL(url);
    if (!allowedHosts.includes(parsed.hostname)) {
      throw new Error(`URL from untrusted host: ${parsed.hostname}`);
    }
  } catch (e) {
    throw new Error('Invalid URL format');
  }

  return url;
}

/**
 * Validate branch name
 */
function validateBranchName(branch) {
  if (!branch || typeof branch !== 'string') {
    return 'main'; // Default branch
  }

  // Check for invalid characters
  if (/[~^:?*[\]\\@{}<>\s]/.test(branch) || branch.includes('..') || branch.startsWith('-')) {
    throw new Error('Invalid branch name');
  }

  if (branch.length > 255) {
    throw new Error('Branch name too long');
  }

  return branch;
}

/**
 * Validate file path to prevent path traversal
 */
function validatePath(targetPath, baseDir) {
  const normalized = path.normalize(targetPath);
  const normalizedBase = path.normalize(baseDir);

  if (!normalized.startsWith(normalizedBase)) {
    throw new Error('Path traversal detected');
  }

  return normalized;
}

/**
 * Add log entry for a server
 */
function addLog(serverId, level, message) {
  if (!serverLogs.has(serverId)) {
    serverLogs.set(serverId, []);
  }

  const logs = serverLogs.get(serverId);

  // Truncate long messages
  const truncated = message.length > 500 ? message.substring(0, 500) + '...' : message;

  logs.push({
    timestamp: new Date().toISOString(),
    level,
    message: truncated
  });

  if (logs.length > MAX_LOGS) {
    logs.shift();
  }

  // Check total log size across all servers
  let totalSize = 0;
  serverLogs.forEach(serverLog => {
    totalSize += serverLog.length;
  });

  if (totalSize > MAX_TOTAL_LOG_SIZE) {
    // Clear oldest server's logs
    const oldestServer = serverLogs.keys().next().value;
    if (oldestServer) {
      serverLogs.delete(oldestServer);
    }
  }

  // Send log to React Native
  try {
    rn_bridge.channel.send(JSON.stringify({
      type: 'log',
      serverId,
      payload: { level, message: truncated }
    }));
  } catch (e) {
    console.error('Failed to send log:', e);
  }
}

/**
 * Get memory usage for a process (in bytes)
 * Returns null if unable to determine
 */
function getProcessMemory(pid) {
  try {
    // On Linux/Android, read from /proc/[pid]/status
    const statusPath = `/proc/${pid}/status`;
    if (fs.existsSync(statusPath)) {
      const status = fs.readFileSync(statusPath, 'utf8');

      // Look for VmRSS (Resident Set Size - actual memory used)
      const match = status.match(/VmRSS:\s+(\d+)\s+kB/);
      if (match) {
        return parseInt(match[1], 10) * 1024; // Convert kB to bytes
      }
    }

    // Fallback: try process.memoryUsage() if available (less accurate for child processes)
    return null;
  } catch (error) {
    console.error(`Failed to get memory for PID ${pid}:`, error);
    return null;
  }
}

/**
 * Monitor memory usage for all running servers
 */
function monitorMemory() {
  runningServers.forEach((serverProcess, serverId) => {
    if (!serverProcess || !serverProcess.pid) {
      return;
    }

    const memoryBytes = getProcessMemory(serverProcess.pid);
    if (memoryBytes === null) {
      return; // Unable to determine memory
    }

    const memoryMB = Math.round(memoryBytes / (1024 * 1024));

    // Update memory tracking
    serverMemoryUsage.set(serverId, {
      bytes: memoryBytes,
      mb: memoryMB,
      timestamp: Date.now(),
    });

    // Check thresholds and send warnings
    if (memoryBytes >= MEMORY_KILL_THRESHOLD) {
      // CRITICAL: Kill server to prevent OOM
      addLog(serverId, 'error', `CRITICAL: Memory limit exceeded (${memoryMB}MB). Killing server.`);

      try {
        serverProcess.kill('SIGKILL');
        addLog(serverId, 'error', 'Server killed due to excessive memory usage');
      } catch (e) {
        addLog(serverId, 'error', `Failed to kill server: ${e.message}`);
      }

      // Send memory alert to React Native
      try {
        rn_bridge.channel.send(JSON.stringify({
          type: 'memory-critical',
          serverId,
          payload: {
            memoryMB,
            action: 'killed',
            threshold: Math.round(MEMORY_KILL_THRESHOLD / (1024 * 1024)),
          }
        }));
      } catch (e) {
        console.error('Failed to send memory critical alert:', e);
      }

    } else if (memoryBytes >= MEMORY_CRITICAL_THRESHOLD) {
      // Send critical warning
      addLog(serverId, 'warn', `HIGH memory usage: ${memoryMB}MB (critical threshold)`);

      try {
        rn_bridge.channel.send(JSON.stringify({
          type: 'memory-warning',
          serverId,
          payload: {
            memoryMB,
            level: 'critical',
            threshold: Math.round(MEMORY_CRITICAL_THRESHOLD / (1024 * 1024)),
          }
        }));
      } catch (e) {
        console.error('Failed to send memory warning:', e);
      }

    } else if (memoryBytes >= MEMORY_WARNING_THRESHOLD) {
      // Send warning
      try {
        rn_bridge.channel.send(JSON.stringify({
          type: 'memory-warning',
          serverId,
          payload: {
            memoryMB,
            level: 'warning',
            threshold: Math.round(MEMORY_WARNING_THRESHOLD / (1024 * 1024)),
          }
        }));
      } catch (e) {
        console.error('Failed to send memory warning:', e);
      }
    }
  });
}

// Start memory monitoring
const memoryMonitorInterval = setInterval(monitorMemory, MEMORY_CHECK_INTERVAL);

/**
 * Get memory stats for all servers
 */
function getMemoryStats() {
  const stats = {};

  // Get memory for all running servers
  runningServers.forEach((serverProcess, serverId) => {
    const memoryData = serverMemoryUsage.get(serverId);
    if (memoryData) {
      stats[serverId] = {
        memoryMB: memoryData.mb,
        timestamp: memoryData.timestamp,
        status: 'running',
      };
    } else {
      stats[serverId] = {
        memoryMB: 0,
        timestamp: Date.now(),
        status: 'running',
      };
    }
  });

  // Add overall stats
  const totalMemoryBytes = Array.from(serverMemoryUsage.values())
    .reduce((sum, data) => sum + data.bytes, 0);

  stats._total = {
    memoryMB: Math.round(totalMemoryBytes / (1024 * 1024)),
    serverCount: runningServers.size,
  };

  return stats;
}

/**
 * Clone a repository with enhanced security
 */
async function cloneRepo(serverId, repoUrl, branch) {
  // Validate all inputs
  const safeServerId = validateServerId(serverId);
  const safeRepoUrl = validateGitUrl(repoUrl);
  const safeBranch = validateBranchName(branch);

  const serverDir = path.join(SERVERS_DIR, safeServerId);

  // Validate path is within SERVERS_DIR
  validatePath(serverDir, SERVERS_DIR);

  // Remove existing directory if exists
  if (fs.existsSync(serverDir)) {
    fs.rmSync(serverDir, { recursive: true, force: true });
  }

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      if (git && !git.killed) {
        git.kill('SIGKILL');
      }
      reject(new Error('Clone timeout after 5 minutes'));
    }, 5 * 60 * 1000); // 5 minute timeout

    addLog(safeServerId, 'info', `Cloning ${safeRepoUrl}...`);

    // Build args array - prevents shell injection
    const args = ['clone', '--depth', '1', '--single-branch'];
    if (safeBranch && safeBranch !== 'main' && safeBranch !== 'master') {
      args.push('-b', safeBranch);
    }
    // Use -- separator to prevent argument injection
    args.push('--', safeRepoUrl, serverDir);

    const git = spawn('git', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false, // CRITICAL: Never use shell
      timeout: 5 * 60 * 1000,
    });

    git.stdout.on('data', (data) => {
      addLog(safeServerId, 'info', data.toString().trim());
    });

    git.stderr.on('data', (data) => {
      addLog(safeServerId, 'info', data.toString().trim());
    });

    git.on('close', (code) => {
      clearTimeout(timeoutId);
      if (code === 0) {
        addLog(safeServerId, 'info', 'Clone completed successfully');
        resolve();
      } else {
        reject(new Error(`Git clone failed with code ${code}`));
      }
    });

    git.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });
  });
}

/**
 * Install npm dependencies with security
 */
async function npmInstall(serverId) {
  const safeServerId = validateServerId(serverId);
  const serverDir = path.join(SERVERS_DIR, safeServerId);

  validatePath(serverDir, SERVERS_DIR);

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      if (npm && !npm.killed) {
        npm.kill('SIGKILL');
      }
      reject(new Error('npm install timeout after 10 minutes'));
    }, 10 * 60 * 1000); // 10 minute timeout

    addLog(safeServerId, 'info', 'Installing dependencies...');

    const npm = spawn('npm', ['install', '--production', '--no-audit', '--no-fund'], {
      cwd: serverDir,
      env: { ...process.env, NODE_ENV: 'production' },
      shell: false,
      timeout: 10 * 60 * 1000,
    });

    npm.stdout.on('data', (data) => {
      addLog(safeServerId, 'info', data.toString().trim());
    });

    npm.stderr.on('data', (data) => {
      addLog(safeServerId, 'warn', data.toString().trim());
    });

    npm.on('close', (code) => {
      clearTimeout(timeoutId);
      if (code === 0) {
        addLog(safeServerId, 'info', 'Dependencies installed successfully');
        resolve();
      } else {
        reject(new Error(`npm install failed with code ${code}`));
      }
    });

    npm.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });
  });
}

/**
 * Find the entry point for an MCP server with validation
 */
function findEntryPoint(serverDir) {
  const packageJsonPath = path.join(serverDir, 'package.json');

  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkgContent = fs.readFileSync(packageJsonPath, 'utf8');
      // Limit package.json size
      if (pkgContent.length > 100000) {
        throw new Error('package.json too large');
      }

      const pkg = JSON.parse(pkgContent);

      // Validate entry point doesn't contain dangerous patterns
      const validateEntry = (entry) => {
        if (typeof entry !== 'string') return null;
        if (/[;&|`$()]/.test(entry)) return null; // Shell metacharacters
        if (entry.includes('..')) return null; // Path traversal
        if (entry.startsWith('/')) return null; // Absolute paths
        return entry;
      };

      if (pkg.main) {
        const validated = validateEntry(pkg.main);
        if (validated) return validated;
      }

      if (pkg.bin) {
        if (typeof pkg.bin === 'string') {
          const validated = validateEntry(pkg.bin);
          if (validated) return validated;
        } else if (typeof pkg.bin === 'object') {
          const bins = Object.values(pkg.bin);
          for (const bin of bins) {
            const validated = validateEntry(bin);
            if (validated) return validated;
          }
        }
      }
    } catch (e) {
      addLog('system', 'warn', `Failed to parse package.json: ${e.message}`);
    }
  }

  // Default entry points to try
  const defaults = ['index.js', 'src/index.js', 'dist/index.js', 'server.js'];
  for (const entry of defaults) {
    const fullPath = path.join(serverDir, entry);
    if (fs.existsSync(fullPath)) {
      return entry;
    }
  }

  throw new Error('No valid entry point found');
}

/**
 * Start an MCP server with enhanced security
 */
async function startServer(serverId, port) {
  const safeServerId = validateServerId(serverId);
  const serverDir = path.join(SERVERS_DIR, safeServerId);

  validatePath(serverDir, SERVERS_DIR);

  if (!fs.existsSync(serverDir)) {
    throw new Error('Server not found. Clone it first.');
  }

  if (runningServers.has(safeServerId)) {
    throw new Error('Server is already running');
  }

  // Validate port
  const safePort = parseInt(port);
  if (!Number.isInteger(safePort) || safePort < 1024 || safePort > 65535) {
    throw new Error('Invalid port number');
  }

  const entryPoint = findEntryPoint(serverDir);
  addLog(safeServerId, 'info', `Starting server with entry: ${entryPoint}`);

  const serverProcess = spawn('node', [entryPoint], {
    cwd: serverDir,
    env: {
      PATH: process.env.PATH, // Only pass necessary env vars
      NODE_ENV: 'production',
      PORT: String(safePort),
    },
    shell: false, // CRITICAL: Never use shell
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  runningServers.set(safeServerId, serverProcess);

  serverProcess.stdout.on('data', (data) => {
    addLog(safeServerId, 'info', data.toString().trim());
  });

  serverProcess.stderr.on('data', (data) => {
    addLog(safeServerId, 'error', data.toString().trim());
  });

  serverProcess.on('close', (code) => {
    addLog(safeServerId, 'info', `Server exited with code ${code}`);
    runningServers.delete(safeServerId);
    serverMemoryUsage.delete(safeServerId);

    try {
      rn_bridge.channel.send(JSON.stringify({
        type: 'status',
        serverId: safeServerId,
        payload: 'stopped'
      }));
    } catch (e) {
      console.error('Failed to send status:', e);
    }
  });

  serverProcess.on('error', (err) => {
    addLog(safeServerId, 'error', `Server error: ${err.message}`);
    runningServers.delete(safeServerId);
    serverMemoryUsage.delete(safeServerId);

    try {
      rn_bridge.channel.send(JSON.stringify({
        type: 'error',
        serverId: safeServerId,
        payload: err.message
      }));
    } catch (e) {
      console.error('Failed to send error:', e);
    }
  });

  // Give it a moment to start
  await new Promise(resolve => setTimeout(resolve, 1000));

  return { status: 'running' };
}

/**
 * Stop an MCP server
 */
function stopServer(serverId) {
  const safeServerId = validateServerId(serverId);
  const serverProcess = runningServers.get(safeServerId);

  if (!serverProcess) {
    return { status: 'stopped' };
  }

  addLog(safeServerId, 'info', 'Stopping server...');

  // Try graceful shutdown first
  try {
    serverProcess.kill('SIGTERM');
  } catch (e) {
    addLog(safeServerId, 'warn', `Error sending SIGTERM: ${e.message}`);
  }

  // Force kill after 5 seconds if still running
  setTimeout(() => {
    if (runningServers.has(safeServerId)) {
      try {
        serverProcess.kill('SIGKILL');
      } catch (e) {
        addLog(safeServerId, 'error', `Error sending SIGKILL: ${e.message}`);
      }
      runningServers.delete(safeServerId);
      serverMemoryUsage.delete(safeServerId);
    }
  }, 5000);

  return { status: 'stopping' };
}

/**
 * Get server status
 */
function getServerStatus(serverId) {
  const safeServerId = validateServerId(serverId);
  return {
    status: runningServers.has(safeServerId) ? 'running' : 'stopped'
  };
}

/**
 * Get server logs
 */
function getServerLogs(serverId) {
  const safeServerId = validateServerId(serverId);
  return serverLogs.get(safeServerId) || [];
}

/**
 * Delete a server
 */
function deleteServer(serverId) {
  const safeServerId = validateServerId(serverId);

  // Stop if running
  if (runningServers.has(safeServerId)) {
    stopServer(safeServerId);
  }

  // Remove directory
  const serverDir = path.join(SERVERS_DIR, safeServerId);
  validatePath(serverDir, SERVERS_DIR);

  if (fs.existsSync(serverDir)) {
    fs.rmSync(serverDir, { recursive: true, force: true });
  }

  // Clear logs and memory tracking
  serverLogs.delete(safeServerId);
  serverMemoryUsage.delete(safeServerId);

  return { success: true };
}

// Handle messages from React Native
rn_bridge.channel.on('message', async (msg) => {
  let message;
  try {
    message = JSON.parse(msg);
  } catch (e) {
    console.error('Invalid message:', msg);
    return;
  }

  const { type, serverId, payload, requestId } = message;

  const sendResponse = (response) => {
    try {
      rn_bridge.channel.send(JSON.stringify({
        ...response,
        requestId
      }));
    } catch (e) {
      console.error('Failed to send response:', e);
    }
  };

  try {
    switch (type) {
      case 'ping':
        // Health check response
        sendResponse({ type: 'pong', payload: { timestamp: Date.now() } });
        break;

      case 'clone':
        await cloneRepo(serverId, payload.repoUrl, payload.branch);
        await npmInstall(serverId);
        sendResponse({ type: 'status', serverId, payload: 'ready' });
        break;

      case 'start':
        await startServer(serverId, payload?.port || 3000);
        sendResponse({ type: 'status', serverId, payload: 'running' });
        break;

      case 'stop':
        stopServer(serverId);
        sendResponse({ type: 'status', serverId, payload: 'stopped' });
        break;

      case 'status':
        const status = getServerStatus(serverId);
        sendResponse({ type: 'status', serverId, payload: status.status });
        break;

      case 'logs':
        const logs = getServerLogs(serverId);
        sendResponse({ type: 'logs', serverId, payload: logs });
        break;

      case 'delete':
        deleteServer(serverId);
        sendResponse({ type: 'status', serverId, payload: 'deleted' });
        break;

      case 'memory-stats':
        const memoryStats = getMemoryStats();
        sendResponse({ type: 'memory-stats', payload: memoryStats });
        break;

      default:
        sendResponse({ type: 'error', payload: `Unknown message type: ${type}` });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    sendResponse({ type: 'error', serverId, payload: errorMessage });
  }
});

// Cleanup on exit
process.on('SIGTERM', () => {
  clearInterval(memoryMonitorInterval);
  runningServers.forEach((proc, id) => {
    try {
      proc.kill('SIGTERM');
    } catch (e) {
      console.error(`Failed to kill server ${id}:`, e);
    }
  });
});

// Signal ready to React Native
rn_bridge.channel.send(JSON.stringify({ type: 'ready' }));
console.log('MCP Server Manager Node.js runtime ready with memory monitoring');
