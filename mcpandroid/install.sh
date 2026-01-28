#!/bin/bash
#
# MCP Server Manager - One-Click Install Script
#
# This script builds and installs the Android APK
#

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║       MCP Server Manager - One-Click Install              ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check dependencies
check_dependency() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first."
        exit 1
    fi
    echo "✓ $1 is installed"
}

echo "Checking dependencies..."
check_dependency node
check_dependency npm

# Check for Android tools (optional for local build)
if command -v adb &> /dev/null; then
    echo "✓ ADB is installed (can install directly to device)"
    HAS_ADB=true
else
    echo "○ ADB not found (will need to transfer APK manually)"
    HAS_ADB=false
fi

echo ""
echo "Installing npm dependencies..."
npm install

echo ""
echo "Choose build method:"
echo "  1) EAS Build (Cloud) - Recommended for first-time users"
echo "  2) Local Build - Requires Android SDK installed"
echo ""
read -p "Enter choice (1 or 2): " BUILD_CHOICE

case $BUILD_CHOICE in
    1)
        echo ""
        echo "Building APK with EAS (Cloud Build)..."
        echo ""

        # Check for EAS CLI
        if ! command -v eas &> /dev/null; then
            echo "Installing EAS CLI..."
            npm install -g eas-cli
        fi

        # Check if logged in
        if ! eas whoami &> /dev/null; then
            echo "Please log in to your Expo account:"
            eas login
        fi

        echo ""
        echo "Starting cloud build..."
        eas build --platform android --profile apk --non-interactive

        echo ""
        echo "✅ Build complete!"
        echo ""
        echo "Download your APK from the EAS dashboard or use:"
        echo "  eas build:list"
        echo ""
        ;;

    2)
        echo ""
        echo "Building APK locally..."
        echo ""

        # Check for Android SDK
        if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
            echo "❌ Android SDK not found. Please set ANDROID_HOME or ANDROID_SDK_ROOT"
            exit 1
        fi

        # Generate native project
        npx expo prebuild --platform android --clean

        # Build APK
        cd android
        ./gradlew assembleRelease
        cd ..

        APK_PATH="android/app/build/outputs/apk/release/app-release.apk"

        if [ -f "$APK_PATH" ]; then
            echo ""
            echo "✅ APK built successfully!"
            echo "   Location: $APK_PATH"

            # Install to device if ADB available
            if [ "$HAS_ADB" = true ]; then
                echo ""
                read -p "Install to connected device? (y/n): " INSTALL_CHOICE
                if [ "$INSTALL_CHOICE" = "y" ]; then
                    adb install -r "$APK_PATH"
                    echo "✅ Installed successfully!"
                fi
            fi
        else
            echo "❌ Build failed. Check the error messages above."
            exit 1
        fi
        ;;

    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                    Installation Complete                   ║"
echo "╠═══════════════════════════════════════════════════════════╣"
echo "║  Next steps:                                              ║"
echo "║  1. Transfer APK to your Android device                  ║"
echo "║  2. Open the APK to install                              ║"
echo "║  3. Launch MCP Server Manager                            ║"
echo "║  4. Add your first MCP server from GitHub!               ║"
echo "╚═══════════════════════════════════════════════════════════╝"
