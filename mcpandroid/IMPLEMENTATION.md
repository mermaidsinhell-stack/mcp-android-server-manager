# Implementation Details

Technical documentation for MCP Server Manager architecture and implementation.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     React Native Layer                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Screens   │  │  Components │  │   State (Zustand)   │  │
│  │  - Home     │  │  - Server   │  │   - servers[]       │  │
│  │  - Add      │  │    Card     │  │   - selectedId      │  │
│  │  - Detail   │  │             │  │   - isLoading       │  │
│  └──────┬──────┘  └─────────────┘  └──────────┬──────────┘  │
│         │                                      │             │
│         └──────────────┬───────────────────────┘             │
│                        ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                   Services Layer                         ││
│  │  ┌─────────────────────┐  ┌───────────────────────────┐ ││
│  │  │   ServerManager     │  │      NodeBridge           │ ││
│  │  │   - cloneRepo()     │◄─┤   - sendMessage()         │ ││
│  │  │   - startServer()   │  │   - handleMessage()       │ ││
│  │  │   - stopServer()    │  │   - addHandler()          │ ││
│  │  └─────────────────────┘  └───────────┬───────────────┘ ││
│  └───────────────────────────────────────┼─────────────────┘│
└──────────────────────────────────────────┼──────────────────┘
                                           │ IPC (JSON)
┌──────────────────────────────────────────┼──────────────────┐
│                 Node.js Runtime Layer    │                  │
│  ┌───────────────────────────────────────▼─────────────────┐│
│  │                     main.js                              ││
│  │   - cloneRepo()     - Git operations                     ││
│  │   - startServer()   - Process spawning                   ││
│  │   - stopServer()    - Signal handling                    ││
│  │   - getServerLogs() - Log management                     ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                  MCP Servers                             ││
│  │   Process 1: filesystem-server (port 3000)               ││
│  │   Process 2: github-server (port 3001)                   ││
│  │   Process N: custom-server (port 300N)                   ││
│  └─────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

## Component Structure

### Screens (`src/app/`)

#### `_layout.tsx`
- Root layout component
- Loads custom fonts (Playfair Display, Inter Tight)
- Configures navigation stack
- Sets up splash screen handling

#### `index.tsx` (Home)
- Main server list view
- Pull-to-refresh functionality
- Empty state with call-to-action
- Floating action button for adding servers

#### `add-server.tsx`
- GitHub URL input and validation
- Repository preview card
- Popular servers suggestions
- Form validation and error handling

#### `server-detail.tsx`
- Detailed server information
- Start/stop controls
- Real-time log viewing
- Delete functionality with confirmation

### Components (`src/components/`)

#### `ServerCard.tsx`
- Displays server in list view
- Status indicator with color coding
- Quick start/stop actions
- Error message display

### Services (`src/services/`)

#### `serverManager.ts`
```typescript
class ServerManager {
  initialize(): Promise<void>
  cloneRepo(server: MCPServer): Promise<void>
  startServer(server: MCPServer): Promise<void>
  stopServer(server: MCPServer): Promise<void>
  getServerStatus(serverId: string): Promise<ServerStatus>
  deleteServer(serverId: string): Promise<void>
  getServerLogs(serverId: string): Promise<string[]>
}
```

#### `nodeBridge.ts`
```typescript
class NodeBridge {
  initialize(): Promise<void>
  sendMessage(message: NodeBridgeMessage): Promise<NodeBridgeMessage>
  addHandler(id: string, handler: MessageHandler): void
  removeHandler(id: string): void
}
```

### State Management (`src/stores/`)

#### `serverStore.ts`
Zustand store with persistence:
```typescript
interface ServerManagerState {
  servers: MCPServer[]
  selectedServerId: string | null
  isLoading: boolean
  error: string | null

  addServer(repo: GitHubRepo): Promise<MCPServer>
  removeServer(id: string): Promise<void>
  startServer(id: string): Promise<void>
  stopServer(id: string): Promise<void>
  updateServerStatus(id: string, status: ServerStatus): void
  selectServer(id: string | null): void
  loadServers(): Promise<void>
}
```

## Node.js Runtime

### IPC Protocol

Messages between React Native and Node.js use JSON:

```typescript
interface NodeBridgeMessage {
  type: 'start' | 'stop' | 'status' | 'log' | 'error' | 'ready' | 'clone'
  serverId?: string
  payload?: unknown
  requestId?: string
}
```

### Server Lifecycle

1. **Clone**: `git clone --depth 1` with branch
2. **Install**: `npm install` in server directory
3. **Start**: `node <entry-point>` with environment
4. **Monitor**: Capture stdout/stderr for logs
5. **Stop**: SIGTERM with SIGKILL fallback

### Process Management

```javascript
// Tracking running servers
const runningServers = new Map<string, ChildProcess>();

// Starting a server
const process = spawn('node', [entryPoint], {
  cwd: serverDir,
  env: { ...process.env, PORT: port },
});
runningServers.set(serverId, process);

// Stopping a server
const process = runningServers.get(serverId);
process.kill('SIGTERM');
setTimeout(() => process.kill('SIGKILL'), 5000);
```

## Design System Implementation

### Theme Constants (`src/theme.ts`)

```typescript
export const COLORS = {
  primary: '#f27d9b',
  secondary: '#ba797d',
  background: '#edd6d1',
  black: '#1a1a1a',
  // ...
};

export const TYPOGRAPHY = {
  h1: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 32 },
  body: { fontFamily: 'InterTight_400Regular', fontSize: 16 },
  label: { fontFamily: 'InterTight_600SemiBold', textTransform: 'uppercase' },
  // ...
};

export const COMPONENTS = {
  card: { borderWidth: 2, borderRadius: 0, ...SHADOWS.hard },
  button: { height: 48, borderWidth: 2, borderRadius: 0 },
  // ...
};
```

### Brutalist Principles

1. **No Border Radius**: `borderRadius: 0` everywhere
2. **Hard Shadows**: `shadowOffset: { width: 4, height: 4 }`, `shadowRadius: 0`
3. **Visible Borders**: `borderWidth: 2`, `borderColor: COLORS.black`
4. **All-Caps Labels**: `textTransform: 'uppercase'`
5. **Large Touch Targets**: Minimum 48px height

## Data Persistence

### AsyncStorage Schema

```typescript
{
  "mcp-server-storage": {
    "state": {
      "servers": [
        {
          "id": "abc123",
          "name": "filesystem",
          "repoUrl": "https://github.com/...",
          "status": "stopped",
          "port": 3000,
          "createdAt": "2024-01-01T00:00:00Z"
        }
      ]
    },
    "version": 0
  }
}
```

### File System Layout

```
/data/data/com.mcpserver.manager/
├── files/
│   └── mcp-servers/
│       ├── abc123/          # Server ID
│       │   ├── package.json
│       │   ├── node_modules/
│       │   └── src/
│       └── def456/
└── databases/
    └── RNAsyncStorage  # Persisted state
```

## Build Configuration

### EAS Build Profiles (`eas.json`)

```json
{
  "build": {
    "preview": {
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

### Android Permissions (`app.json`)

```json
{
  "android": {
    "permissions": [
      "INTERNET",
      "ACCESS_NETWORK_STATE",
      "FOREGROUND_SERVICE"
    ]
  }
}
```

## Testing Strategy

### Unit Tests
- Store actions and reducers
- Service methods
- Utility functions

### Integration Tests
- Node bridge communication
- Server lifecycle
- Persistence

### E2E Tests
- Add server flow
- Start/stop operations
- Error handling

## Performance Considerations

1. **Lazy Loading**: Servers loaded from storage on-demand
2. **Log Buffering**: Keep only last 100 log entries
3. **Process Isolation**: Each server runs in separate process
4. **Shallow Clones**: `--depth 1` for faster cloning

## Security Notes

1. Servers run with app-level permissions only
2. No root access required
3. Network access limited to specified ports
4. Repositories must be public (or provide auth)

## Future Enhancements

- [ ] Private repository support (OAuth)
- [ ] Server auto-start on boot
- [ ] MCP client integration
- [ ] Server configuration UI
- [ ] Log export/sharing
- [ ] Multiple Node.js versions
