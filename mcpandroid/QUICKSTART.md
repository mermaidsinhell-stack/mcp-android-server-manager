# Quick Start Guide

Get MCP Server Manager running on your Android device in minutes.

## Installation

### Download APK (Easiest)

1. Go to the [Releases page](https://github.com/YOUR_USERNAME/mcp-server-manager/releases)
2. Download the latest `mcp-server-manager.apk`
3. On your Android device, enable "Install from Unknown Sources" if prompted
4. Open the APK to install

### Build from Source

```bash
# Prerequisites: Node.js 18+, npm, Android SDK

# Clone and install
git clone https://github.com/YOUR_USERNAME/mcp-server-manager.git
cd mcp-server-manager
npm install

# Build APK
npx eas login
npx eas build --platform android --profile apk

# Download the APK from the EAS dashboard
```

## First Launch

1. **Open the app** - You'll see the empty state with "NO SERVERS YET"
2. **Tap "ADD SERVER"** - Opens the add server screen

## Adding Your First Server

1. **Enter a repository URL**
   - Full URL: `https://github.com/modelcontextprotocol/servers`
   - Or shorthand: `modelcontextprotocol/servers`

2. **Tap "CHECK"** to validate
   - The app fetches repository info from GitHub
   - You'll see the repo name, description, stars, and language

3. **Tap "ADD SERVER"**
   - The repository is cloned to your device
   - Dependencies are installed automatically
   - The server appears in your list

## Starting a Server

1. Find your server in the list
2. Tap the **START** button
3. The status changes to "STARTING" then "RUNNING"
4. The server is now accessible on the configured port

## Viewing Server Details

Tap on a server card to see:
- Full server information
- Port and branch details
- Start/Stop controls
- Real-time logs (when running)
- Delete option

## Managing Servers

### Start a Server
- Tap **START** on the server card
- Or tap the card and use the detail screen controls

### Stop a Server
- Tap **STOP** on a running server
- The server gracefully shuts down

### Delete a Server
1. Tap the server card to open details
2. Scroll down and tap **DELETE SERVER**
3. Confirm the deletion

## Popular MCP Servers to Try

| Server | Repository | Description |
|--------|------------|-------------|
| Filesystem | `modelcontextprotocol/servers` | Read/write local files |
| GitHub | `modelcontextprotocol/servers` | GitHub API integration |
| SQLite | `modelcontextprotocol/servers` | Database operations |

## Troubleshooting

### Server Won't Start
- Check the error message in the detail view
- Ensure the server has a valid `package.json`
- Try deleting and re-adding the server

### Clone Failed
- Check your internet connection
- Verify the repository URL is correct
- Ensure the repository is public

### App Crashes
- Restart the app
- Clear app data in Android settings
- Reinstall the app

## Tips

1. **Ports**: Each server gets a unique port starting from 3000
2. **Logs**: View real-time logs when a server is running
3. **Pull to Refresh**: Swipe down on the home screen to refresh server status
4. **Background**: Servers continue running when the app is in the background

## Next Steps

- Explore the [full documentation](README.md)
- Check out [implementation details](IMPLEMENTATION.md)
- Learn about the [design system](README.md#design-system)

---

Need help? Open an issue on GitHub!
