# Tailscale Integration Guide

## Overview

The MCP Server Manager now includes integrated Tailscale support for remote access to MCP servers. This document covers both the implementation details and user setup instructions.

## Implementation Status

✅ **Completed:** Deep link integration with automatic IP detection (Option 3)
- Tailscale app detection and installation prompts
- Automatic Tailscale IP detection (100.64.0.0/10 range)
- VPN connection status monitoring
- Remote URL display in server cards and detail screens
- Copy-to-clipboard functionality
- Setup wizard UI component

## Why Tailscale?

Tailscale creates a secure, private network (VPN) that allows devices to communicate as if they were on the same local network, even across the internet. This enables:

- **Secure remote access** to MCP servers running on your phone
- **Zero-configuration networking** - no port forwarding or firewall rules
- **End-to-end encryption** with WireGuard protocol
- **Cross-platform support** - works with desktop, mobile, servers

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                Android Phone (This App)              │
│  ┌────────────────────────────────────────────────┐  │
│  │  MCP Servers (localhost:3000, 3001, etc.)     │  │
│  └────────────────┬───────────────────────────────┘  │
│                   │                                   │
│  ┌────────────────▼───────────────────────────────┐  │
│  │  Tailscale VPN (100.x.x.x)                    │  │
│  └────────────────┬───────────────────────────────┘  │
└───────────────────┼──────────────────────────────────┘
                    │ Encrypted WireGuard Tunnel
                    │
┌───────────────────▼──────────────────────────────────┐
│         Tailscale Coordination Server                 │
│               (tailscale.com)                         │
└───────────────────┬──────────────────────────────────┘
                    │
┌───────────────────▼──────────────────────────────────┐
│              Desktop Computer                         │
│  ┌────────────────────────────────────────────────┐  │
│  │  LLM Client (Claude Desktop, etc.)            │  │
│  │  Connects to: http://100.x.x.x:3000           │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

## Implementation Details

### Architecture Overview

The implementation uses a deep link approach that:
1. Detects if Tailscale app is installed via deep linking
2. Opens Tailscale app or Play Store as needed
3. Monitors VPN connection status via Android Network APIs
4. Detects Tailscale IP address in the 100.64.0.0/10 CGNAT range
5. Displays remote URLs when servers are running and Tailscale is connected

### Core Components

#### 1. TailscaleService (`src/services/tailscaleService.ts`)

Main service handling all Tailscale integration:

```typescript
class TailscaleService {
  // Check if Tailscale app is installed
  async isInstalled(): Promise<boolean>
  
  // Open Tailscale app or Play Store
  async open(): Promise<void>
  
  // Detect if VPN is active
  async isVPNActive(): Promise<boolean>
  
  // Get Tailscale IP address (100.64.x.x)
  async getIPAddress(): Promise<string | null>
  
  // Validate IP is in Tailscale range
  private isTailscaleIP(ip: string): boolean
  
  // Get complete status
  async getStatus(): Promise<TailscaleStatus>
  
  // Generate server URL with Tailscale IP
  getServerURL(port: number, ipAddress?: string): string | null
  
  // Clear cached IP
  clearCache(): void
}
```

**Key Features:**
- 5-second IP address caching to reduce API calls
- Deep link detection using `tailscale://` URL scheme
- Fallback to web Play Store if market:// fails
- Sentry breadcrumb logging for debugging

**Implementation Notes:**
```typescript
// Tailscale IP detection using CGNAT range (100.64.0.0/10)
private isTailscaleIP(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  // First octet must be 100
  if (parts[0] !== 100) return false;
  // Second octet must be 64-127
  if (parts[1] < 64 || parts[1] > 127) return false;
  return true;
}
```

#### 2. TailscaleCard Component (`src/components/TailscaleCard.tsx`)

Setup wizard UI component with three states:

**State 1: Not Installed**
- Shows "INSTALL TAILSCALE" button
- Opens Play Store when clicked

**State 2: Installed but Not Connected**
- Shows "TAILSCALE INSTALLED" badge
- Shows "OPEN TAILSCALE" button
- Prompts user to connect

**State 3: Connected**
- Shows "✓ CONNECTED" badge
- Displays Tailscale IP address
- Copy-to-clipboard button
- Usage instructions with example URL

**Styling:**
- Matches Soft-Editorial Brutalism design system
- Uses theme constants: COLORS, TYPOGRAPHY, SPACING, BORDERS
- Zero border radius, 2px black borders, hard shadows
- All-caps labels with letter-spacing

**Code Snippet:**
```typescript
export function TailscaleCard() {
  const [status, setStatus] = useState<TailscaleStatus>({
    installed: false,
    connected: false,
    ipAddress: null,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkStatus = async () => {
    const newStatus = await tailscaleService.getStatus();
    setStatus(newStatus);
  };

  const handleOpen = async () => {
    await tailscaleService.open();
    // Wait then refresh status
    setTimeout(() => checkStatus(), 2000);
  };

  // Renders different UI based on status.installed and status.connected
}
```

#### 3. ServerCard Updates (`src/components/ServerCard.tsx`)

Shows Tailscale remote URL when server is running:

```typescript
const [tailscaleIP, setTailscaleIP] = useState<string | null>(null);

useEffect(() => {
  const checkTailscale = async () => {
    const ip = await tailscaleService.getIPAddress();
    setTailscaleIP(ip);
  };
  checkTailscale();
}, []);

const tailscaleURL = tailscaleIP 
  ? tailscaleService.getServerURL(server.port, tailscaleIP) 
  : null;

// Displays in card when isRunning && tailscaleURL
{isRunning && tailscaleURL && (
  <View style={styles.urlContainer}>
    <Text style={styles.urlLabel}>REMOTE URL</Text>
    <Text style={styles.urlText}>{tailscaleURL}</Text>
  </View>
)}
```

#### 4. Home Screen Integration (`src/app/index.tsx`)

TailscaleCard added prominently after header:

```typescript
import { TailscaleCard } from '../components/TailscaleCard';

// In render tree:
<View style={styles.header}>...</View>
<TailscaleCard />
<View style={styles.serverList}>...</View>
```

#### 5. Server Detail Screen (`src/app/server-detail.tsx`)

Shows Tailscale URL with copy button:

```typescript
const [tailscaleIP, setTailscaleIP] = useState<string | null>(null);

const handleCopyURL = async (url: string) => {
  await Clipboard.setStringAsync(url);
  Alert.alert('Copied', `URL ${url} copied to clipboard`);
};

// Displays after server details when running
{isRunning && tailscaleURL && (
  <View style={styles.urlSection}>
    <Text style={styles.detailLabel}>REMOTE URL (TAILSCALE)</Text>
    <View style={styles.urlContainer}>
      <Text style={styles.urlText}>{tailscaleURL}</Text>
      <TouchableOpacity onPress={() => handleCopyURL(tailscaleURL)}>
        <Text>COPY</Text>
      </TouchableOpacity>
    </View>
    <Text style={styles.urlHint}>
      Use this URL to connect from any device on your Tailscale network
    </Text>
  </View>
)}
```

### Dependencies

Added to `package.json`:
```json
{
  "dependencies": {
    "expo-network": "~5.8.0",      // Network state detection
    "expo-clipboard": "~5.0.0",     // Copy-to-clipboard
    "react-error-boundary": "^4.0.13" // Error handling
  }
}
```

### Android Permissions

No additional permissions required beyond existing:
- `INTERNET` - Already included
- `ACCESS_NETWORK_STATE` - Already included

The implementation uses passive VPN detection (checking network type) rather than requesting VPN control permissions.

## Implementation Options (Archive)

### Option 1: Official Tailscale Android SDK (Recommended)

**Pros:**
- Official support and updates
- Native Android integration
- Best performance

**Cons:**
- Requires Tailscale account setup
- More complex integration

**Steps:**

1. **Add Tailscale dependency:**

```json
// package.json
{
  "dependencies": {
    "react-native-tailscale": "^1.0.0"  // Hypothetical - check for actual package
  }
}
```

2. **Create Tailscale service:**

```typescript
// src/services/tailscaleService.ts
import Tailscale from 'react-native-tailscale';

class TailscaleService {
  private connected = false;
  private ipAddress: string | null = null;

  async initialize(): Promise<void> {
    // Initialize Tailscale
    await Tailscale.initialize();
  }

  async connect(): Promise<string> {
    // Start Tailscale VPN
    await Tailscale.connect();
    
    // Get assigned IP address
    this.ipAddress = await Tailscale.getIPAddress();
    this.connected = true;
    
    return this.ipAddress;
  }

  async disconnect(): Promise<void> {
    await Tailscale.disconnect();
    this.connected = false;
    this.ipAddress = null;
  }

  getServerAddress(port: number): string | null {
    if (!this.ipAddress) return null;
    return `http://${this.ipAddress}:${port}`;
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export const tailscaleService = new TailscaleService();
```

3. **Add VPN permission:**

```json
// app.json
{
  "expo": {
    "android": {
      "permissions": [
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.BIND_VPN_SERVICE"  // Add this
      ]
    }
  }
}
```

4. **Update server cards to show Tailscale address:**

```typescript
// src/components/ServerCard.tsx
import { tailscaleService } from '../services/tailscaleService';

function ServerCard({ server }: { server: MCPServer }) {
  const tailscaleAddress = tailscaleService.getServerAddress(server.port);
  
  return (
    <View>
      {/* ... existing UI ... */}
      {tailscaleAddress && (
        <Text>Tailscale: {tailscaleAddress}</Text>
      )}
    </View>
  );
}
```

### Option 2: Use Android VPN Service API

**Pros:**
- More control over VPN implementation
- No third-party dependencies

**Cons:**
- Complex implementation
- Need to handle all WireGuard protocol details
- More maintenance burden

**This is NOT recommended** unless you have specific requirements.

### Option 3: Launch Tailscale App (Quick Solution)

**Pros:**
- No code integration needed
- Uses existing Tailscale app
- Quick to implement

**Cons:**
- Requires users to install separate app
- Less integrated experience
- No programmatic control

**Steps:**

1. **Check if Tailscale is installed:**

```typescript
// src/utils/tailscale.ts
import { Linking } from 'react-native';

export async function isTailscaleInstalled(): Promise<boolean> {
  try {
    const canOpen = await Linking.canOpenURL('tailscale://');
    return canOpen;
  } catch {
    return false;
  }
}

export async function openTailscale(): Promise<void> {
  const installed = await isTailscaleInstalled();
  
  if (installed) {
    await Linking.openURL('tailscale://');
  } else {
    await Linking.openURL('market://details?id=com.tailscale.ipn');
  }
}
```

2. **Add button to open Tailscale:**

```typescript
// src/app/index.tsx
<TouchableOpacity onPress={openTailscale}>
  <Text>Setup Tailscale</Text>
</TouchableOpacity>
```

## Recommended Implementation Plan

### Phase 1: Manual Setup Instructions (Now)

1. Add documentation for users:
   - Install Tailscale app from Play Store
   - Connect to Tailscale network
   - Find phone's Tailscale IP
   - Configure LLM to connect to that IP

2. Update app UI to display:
   - Connection instructions
   - Server URLs with localhost and Tailscale formats
   - Copy-to-clipboard buttons

### Phase 2: Deep Integration (Later)

1. Research and evaluate:
   - Official Tailscale Android SDK availability
   - React Native Tailscale packages
   - Community solutions

2. Implement:
   - In-app Tailscale connection
   - Automatic IP detection
   - Connection status indicators
   - One-click setup

## User Instructions (Interim Solution)

### Setup Tailscale

1. **Install Tailscale:**
   - Download from [Google Play Store](https://play.google.com/store/apps/details?id=com.tailscale.ipn)
   - Or visit: https://tailscale.com/download/android

2. **Sign in to Tailscale:**
   - Open the Tailscale app
   - Sign in with Google, Microsoft, or GitHub
   - Approve the device

3. **Find your phone's Tailscale IP:**
   - Open Tailscale app
   - Look for "My IP" (usually 100.x.x.x)
   - Write this down

4. **Connect LLM to MCP Server:**
   - On your computer, open your LLM client
   - Configure MCP server connection
   - Use: `http://100.x.x.x:3000` (replace with your Tailscale IP and port)

### Example: Claude Desktop Configuration

```json
{
  "mcpServers": {
    "my-android-server": {
      "url": "http://100.64.0.5:3000",
      "description": "MCP server running on Android"
    }
  }
}
```

## Security Considerations

### Authentication

- Tailscale uses OAuth for user authentication
- Devices are authenticated via Tailscale control plane
- No passwords or API keys needed

### Encryption

- All traffic encrypted with WireGuard (ChaCha20-Poly1305)
- End-to-end encryption between devices
- Keys negotiated automatically

### Access Control

- Use Tailscale ACLs to restrict access
- Can limit which devices can connect
- Can require MFA for sensitive connections

Example ACL:
```json
{
  "acls": [
    {
      "action": "accept",
      "src": ["tag:llm-client"],
      "dst": ["tag:android-phone:3000-3010"]
    }
  ]
}
```

### Firewall Rules

- MCP servers still bound to localhost
- Tailscale provides secure tunnel
- No need to expose ports publicly
- Consider adding auth to MCP servers for defense-in-depth

## Testing

### Test Connectivity

1. **On Android phone:**
   ```bash
   # In MCP Server Manager app
   # Start a server on port 3000
   ```

2. **On desktop:**
   ```bash
   # Find your phone's Tailscale IP
   tailscale ip -4 android-phone-name
   
   # Test connection
   curl http://100.x.x.x:3000
   ```

3. **Test with LLM:**
   - Configure LLM client with Tailscale URL
   - Send test request
   - Verify server receives and responds

## Troubleshooting

### Server not accessible

1. Check Tailscale connection:
   ```bash
   tailscale status
   ```

2. Verify server is running:
   - Check app shows "running" status
   - Check logs for errors

3. Test localhost first:
   ```bash
   # On phone (using Termux or similar)
   curl http://localhost:3000
   ```

4. Check Android firewall:
   - Some Android ROMs have additional firewalls
   - May need to allowlist Tailscale app

### Connection drops

- Enable "Stay Connected" in Tailscale settings
- Disable battery optimization for Tailscale app
- Use Foreground Service for MCP servers (prevents Android from killing them)

### Slow performance

- Check network quality indicators in Tailscale
- Consider using DERP relay if direct connection fails
- Monitor battery usage (VPN uses extra power)

## Future Enhancements

1. **Auto-discovery:**
   - Broadcast MCP servers on Tailscale network
   - LLM clients can discover servers automatically

2. **Load balancing:**
   - Run multiple MCP servers
   - Distribute load across servers

3. **High availability:**
   - Failover to backup devices
   - Health checks and automatic routing

4. **Monitoring:**
   - Connection quality metrics
   - Usage statistics
   - Performance monitoring

## Resources

- [Tailscale Documentation](https://tailscale.com/kb/)
- [Android VPN Service](https://developer.android.com/reference/android/net/VpnService)
- [WireGuard Protocol](https://www.wireguard.com/)
- [MCP Specification](https://modelcontextprotocol.io/)

## Testing Checklist

### Automated Tests Needed
- [ ] TailscaleService.isTailscaleIP() validates IP ranges correctly
- [ ] TailscaleService.getIPAddress() handles network errors
- [ ] TailscaleCard renders all three states correctly
- [ ] ServerCard shows/hides Tailscale URL based on status
- [ ] Copy-to-clipboard functionality works

### Manual Testing
1. **Without Tailscale installed:**
   - [ ] App shows "INSTALL TAILSCALE" button
   - [ ] Button opens Play Store
   - [ ] After installation, status updates correctly

2. **With Tailscale installed but not connected:**
   - [ ] App shows "TAILSCALE INSTALLED" badge
   - [ ] "OPEN TAILSCALE" button works
   - [ ] Status updates after connecting in Tailscale app

3. **With Tailscale connected:**
   - [ ] App detects Tailscale IP (100.64.x.x)
   - [ ] Shows "✓ CONNECTED" badge
   - [ ] Displays correct IP address
   - [ ] Copy button copies IP to clipboard
   - [ ] Server cards show remote URLs
   - [ ] Server detail shows remote URL with copy button

4. **Edge cases:**
   - [ ] Network disconnection handling
   - [ ] VPN connection drops
   - [ ] Multiple network interfaces
   - [ ] Non-Tailscale VPN active
   - [ ] Cache expiration works correctly

### Integration Testing
1. **End-to-end flow:**
   - [ ] Start MCP server on Android
   - [ ] Connect to Tailscale
   - [ ] Copy remote URL from app
   - [ ] Configure LLM client on desktop with URL
   - [ ] Verify LLM can connect to server
   - [ ] Send test request through MCP
   - [ ] Verify response received

## Known Limitations

1. **VPN Detection:**
   - Detects ANY VPN, not specifically Tailscale
   - Relies on IP address validation to confirm Tailscale
   - May show false positive if another VPN uses 100.64.x.x range (unlikely)

2. **IP Address Caching:**
   - 5-second cache to reduce API calls
   - Network changes may take up to 5 seconds to reflect
   - Manual refresh available in UI

3. **Deep Link Limitations:**
   - Can only detect if Tailscale is installed, not connection status
   - Cannot programmatically connect/disconnect
   - User must manually connect in Tailscale app

4. **Android Variations:**
   - Some ROMs may report network type differently
   - Battery optimization may affect background detection
   - Custom firewall apps may interfere

## Status

✅ **Completed:** Deep link integration with automatic IP detection
- Core service implementation
- UI components with brutalist styling
- Home screen and detail screen integration
- Documentation and usage instructions

🔜 **Next Steps:**
- End-to-end testing with real devices
- User feedback and iteration
- Performance monitoring and optimization

🔮 **Future Enhancements:**
- Native Tailscale SDK integration (if available)
- Programmatic VPN control
- Auto-discovery of servers on Tailscale network
- Connection quality monitoring

## Contributing

If you implement Tailscale integration:

1. Test thoroughly on multiple Android versions
2. Document setup process
3. Add error handling for edge cases
4. Consider battery impact
5. Submit PR with clear documentation

---

**Need help?** Open an issue with the `tailscale` label.
