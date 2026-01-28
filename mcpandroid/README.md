# MCP Server Manager 🚀

A secure, portable MCP (Model Context Protocol) server runtime for Android. Run any GitHub MCP server directly on your phone with a beautiful brutalist UI.

[![Security](https://img.shields.io/badge/security-audited-green.svg)](./SECURITY.md)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Android](https://img.shields.io/badge/android-6.0+-blue.svg)](https://developer.android.com/)

## ✨ Features

- **🔒 Security First**: Comprehensive input validation, sandboxed execution, no root required
- **📱 One-Click Install**: Add any MCP server from GitHub with a single tap
- **⚡ Embedded Node.js**: Full Node.js runtime running natively on Android
- **🎨 Beautiful UI**: Soft-Editorial Brutalism design with pastel colors and hard edges
- **📊 Server Management**: Start, stop, and monitor multiple MCP servers
- **📝 Real-time Logs**: View server output in real-time
- **🔄 Auto Dependencies**: Automatic npm install for each server
- **🌐 Tailscale Ready**: Instructions for remote access via VPN

## 🔐 Security

This app has been thoroughly audited and secured against:
- ✅ Command injection attacks
- ✅ Path traversal vulnerabilities
- ✅ Malicious input validation
- ✅ Process spawning exploits
- ✅ Memory leaks and race conditions

See [SECURITY.md](./SECURITY.md) for full details.

## 📸 Screenshots

The app features a unique **Soft-Editorial Brutalism** design:
- Pastel peach background (#edd6d1)
- Soft pink accents (#f27d9b)
- Hard black borders with zero border radius
- Playfair Display serif headings
- Inter Tight sans-serif body text
- All-caps labels and buttons

## 🚀 Quick Start

### Download & Install

1. Download the latest APK from [Releases](https://github.com/YOUR_USERNAME/mcp-server-manager/releases)
2. Install on your Android device (enable "Install from Unknown Sources" if prompted)
3. Open the app and add your first MCP server

### Build from Source

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/mcp-server-manager.git
cd mcp-server-manager/mcpandroid

# Install dependencies
npm install

# Install new security dependencies
npm install ajv-formats expo-crypto expo-network sentry-expo react-error-boundary

# Build APK
npx eas build --platform android --profile apk

# Or run in development
npx expo start
```

## 📖 Usage Guide

### Adding MCP Servers

1. Tap the **+** button or "ADD SERVER"
2. Enter a GitHub repository URL:
   - Full URL: `https://github.com/modelcontextprotocol/servers`
   - Or short format: `modelcontextprotocol/servers`
3. Tap **CHECK** to validate the repository
4. Review the repository details
5. Tap **ADD SERVER** to clone and install

### Managing Servers

- **Start**: Tap server card, then "START SERVER"
- **Stop**: Tap "STOP SERVER" when running
- **View Logs**: Available when server is running
- **Delete**: Tap server, then "DELETE SERVER"

### Connecting LLMs

#### Local Access
Servers run on `localhost` with ports starting at 3000:
- First server: `http://localhost:3000`
- Second server: `http://localhost:3001`
- etc.

#### Remote Access (via Tailscale)

For connecting from other devices, see [TAILSCALE_INTEGRATION.md](./TAILSCALE_INTEGRATION.md).

**Quick Setup:**
1. Install [Tailscale](https://tailscale.com/download/android) on your phone
2. Sign in and connect
3. Note your Tailscale IP (usually 100.x.x.x)
4. Configure your LLM to connect to `http://100.x.x.x:3000`

## 🎯 Supported Servers

Any MCP-compatible server from GitHub should work, including:

| Server | Description | Repository |
|--------|-------------|------------|
| **filesystem** | File system access | modelcontextprotocol/servers |
| **github** | GitHub API integration | modelcontextprotocol/servers |
| **sqlite** | SQLite database operations | modelcontextprotocol/servers |
| **memory** | In-memory data storage | modelcontextprotocol/servers |
| **Custom** | Your own MCP servers | your/repo |

## 🏗️ Architecture

```
src/
├── app/                  # Expo Router screens
│   ├── _layout.tsx       # Root layout with fonts + error boundary
│   ├── index.tsx         # Home screen (server list)
│   ├── add-server.tsx    # Add server screen
│   └── server-detail.tsx # Server details + logs
├── components/           # Reusable UI components
│   └── ServerCard.tsx    # Server card component
├── services/             # Business logic
│   ├── serverManager.ts  # Server lifecycle management
│   └── nodeBridge.ts     # Node.js runtime bridge
├── stores/               # State management
│   └── serverStore.ts    # Zustand store with persistence
├── types/                # TypeScript definitions
│   └── index.ts
├── utils/                # Utility modules
│   ├── security.ts       # Input validation & sanitization
│   ├── schemas.ts        # JSON schema validation
│   ├── network.ts        # Rate limiting & fetching
│   └── sentry.ts         # Crash reporting
└── theme.ts              # Design system constants

nodejs-assets/            # Embedded Node.js runtime
└── nodejs-project/
    ├── main.js           # Secure Node.js entry point
    └── package.json      # Node dependencies
```

## 🔧 Tech Stack

- **React Native** with Expo 50
- **Expo Router** for navigation
- **nodejs-mobile-react-native** for embedded Node.js
- **Zustand** for state management
- **Ajv** for schema validation
- **Sentry** for crash reporting
- **TypeScript** throughout

## 🎨 Design System

### Colors
| Name       | Hex       | Usage              |
|------------|-----------|-------------------|
| Peach      | `#edd6d1` | Background        |
| Pink       | `#f27d9b` | Primary actions   |
| Rose       | `#ba797d` | Secondary elements|
| Black      | `#1a1a1a` | Text, borders     |

### Typography
- **Headings**: Playfair Display (serif)
- **Body**: Inter Tight (sans-serif)
- **Labels**: Inter Tight, uppercase, letter-spacing

### Layout Principles
- Zero border radius (hard edges)
- 2px black borders
- Hard drop shadows (4px offset, no blur)
- 48px minimum touch targets

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Android Studio (for emulator)
- EAS CLI (`npm install -g eas-cli`)

### Development Server

```bash
# Start Expo development server
npx expo start

# Run on Android emulator
npx expo run:android

# Run on physical device (same network)
npx expo start --tunnel
```

### Building

```bash
# Development APK
npx eas build --platform android --profile apk

# Production App Bundle
npx eas build --platform android --profile production
```

### Testing

```bash
# Type checking
npx tsc --noEmit

# Linting
npx eslint . --ext .ts,.tsx

# Security audit
npm audit

# Run all checks
npm run lint && npx tsc --noEmit && npm audit
```

## 📋 Pre-Deployment

See [PRE_DEPLOYMENT_CHECKLIST.md](./PRE_DEPLOYMENT_CHECKLIST.md) for complete checklist.

**Key Steps:**
1. Configure Sentry DSN in `src/utils/sentry.ts`
2. Update `owner` in `app.json`
3. Install new dependencies
4. Run full test suite
5. Build and test on multiple devices

## 🐛 Troubleshooting

### Server won't start
- Check logs for errors
- Verify package.json exists in repo
- Try re-cloning the server
- Check available storage

### Clone fails
- Verify internet connection
- Check repository is public
- Try with full URL format
- Check for GitHub rate limits

### Can't connect from LLM
- Verify server is running (status: "RUNNING")
- Check Tailscale connection
- Verify IP address and port
- Test with curl first

### App crashes
- Crashes are automatically reported to Sentry
- Check GitHub issues for known problems
- Provide crash logs when reporting

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly (see [PRE_DEPLOYMENT_CHECKLIST.md](./PRE_DEPLOYMENT_CHECKLIST.md))
5. Commit with clear messages
6. Push to your fork
7. Submit a pull request

### Areas for Contribution
- 🌐 Tailscale SDK integration
- 🔐 HTTPS/TLS support for servers
- 📱 Background service implementation
- 🔑 Private repository support (OAuth)
- 🎨 UI improvements
- 📚 Documentation
- 🧪 Tests

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) for the MCP specification
- [nodejs-mobile](https://github.com/nodejs-mobile/nodejs-mobile) for embedded Node.js
- [Expo](https://expo.dev/) for the React Native framework
- All contributors and testers

## 📞 Support

- **Bug Reports**: [GitHub Issues](https://github.com/YOUR_USERNAME/mcp-server-manager/issues)
- **Questions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/mcp-server-manager/discussions)
- **Security**: See [SECURITY.md](./SECURITY.md) for reporting vulnerabilities
- **Email**: support@yourproject.com

## 🗺️ Roadmap

### v1.0 (Current)
- ✅ Core functionality
- ✅ Security hardening
- ✅ Crash reporting
- ⏳ Tailscale documentation

### v1.1 (Next)
- [ ] Tailscale SDK integration
- [ ] Background service
- [ ] Server resource monitoring
- [ ] Export/import configs

### v2.0 (Future)
- [ ] HTTPS support
- [ ] Private repo support
- [ ] Advanced server configuration
- [ ] Multi-device sync

## 📊 Status

**Current Version**: 1.0.0  
**Status**: ✅ Ready for production  
**Last Updated**: January 2026  
**Active Development**: Yes

## 🌟 Star History

If you find this project useful, please consider giving it a star! ⭐

---

**Made with ❤️ for the MCP community**

[Report Bug](https://github.com/YOUR_USERNAME/mcp-server-manager/issues) · [Request Feature](https://github.com/YOUR_USERNAME/mcp-server-manager/issues) · [Documentation](./IMPLEMENTATION.md)
