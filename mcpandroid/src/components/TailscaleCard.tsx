/**
 * Tailscale Setup Card Component
 *
 * Guides users through Tailscale installation and connection
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { tailscaleService, TailscaleStatus } from '../services/tailscaleService';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS, SHADOWS, COMPONENTS } from '../theme';
import * as Clipboard from 'expo-clipboard';

export function TailscaleCard() {
  const [status, setStatus] = useState<TailscaleStatus>({
    installed: false,
    connected: false,
    ipAddress: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const newStatus = await tailscaleService.getStatus();
      setStatus(newStatus);
    } catch (error) {
      console.error('Error checking Tailscale status:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleOpen = useCallback(async () => {
    try {
      await tailscaleService.open();
      // Wait a bit then refresh status
      const timeoutId = setTimeout(() => {
        setIsRefreshing(true);
        checkStatus();
      }, 2000);
      // Store timeout ID for cleanup if needed
      return () => clearTimeout(timeoutId);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to open Tailscale');
    }
  }, [checkStatus]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    checkStatus();
  }, [checkStatus]);

  const handleCopyIP = useCallback(async () => {
    if (status.ipAddress) {
      await Clipboard.setStringAsync(status.ipAddress);
      Alert.alert('Copied', `IP address ${status.ipAddress} copied to clipboard`);
    }
  }, [status.ipAddress]);

  useEffect(() => {
    let isMounted = true;

    const loadStatus = async () => {
      try {
        const newStatus = await tailscaleService.getStatus();
        if (isMounted) {
          setStatus(newStatus);
        }
      } catch (error) {
        console.error('Error checking Tailscale status:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <View
        style={styles.card}
        accessible={true}
        accessibilityRole="progressbar"
        accessibilityLabel="Checking Tailscale status"
        accessibilityState={{ busy: true }}
      >
        <ActivityIndicator color={COLORS.primary} size="large" accessibilityElementsHidden={true} />
        <Text style={styles.loadingText} accessibilityElementsHidden={true}>Checking Tailscale status...</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={styles.title}
          accessibilityRole="header"
        >
          TAILSCALE NETWORK
        </Text>
        <TouchableOpacity
          onPress={handleRefresh}
          disabled={isRefreshing}
          accessibilityRole="button"
          accessibilityLabel="Refresh Tailscale status"
          accessibilityHint="Updates the current Tailscale connection status"
          accessibilityState={{ disabled: isRefreshing, busy: isRefreshing }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.refreshText} accessibilityElementsHidden={true}>
            {isRefreshing ? 'REFRESHING...' : 'REFRESH'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} accessibilityElementsHidden={true} />

      {/* Status Display */}
      {!status.installed && (
        <View style={styles.section}>
          <Text
            style={styles.label}
            accessibilityRole="header"
          >
            STEP 1: INSTALL TAILSCALE
          </Text>
          <Text style={styles.description}>
            Tailscale creates a secure network to access your MCP servers from anywhere.
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={handleOpen}
            accessibilityRole="button"
            accessibilityLabel="Install Tailscale"
            accessibilityHint="Opens the app store to install Tailscale app"
          >
            <Text style={styles.buttonText} accessibilityElementsHidden={true}>INSTALL TAILSCALE</Text>
          </TouchableOpacity>
        </View>
      )}

      {status.installed && !status.connected && (
        <View style={styles.section}>
          <View
            style={styles.statusBadge}
            accessible={true}
            accessibilityLabel="Status: Tailscale installed"
            accessibilityValue={{ text: "Installed" }}
          >
            <Text style={styles.statusText} accessibilityElementsHidden={true}>TAILSCALE INSTALLED</Text>
          </View>

          <Text
            style={styles.label}
            accessibilityRole="header"
          >
            STEP 2: CONNECT TO TAILSCALE
          </Text>
          <Text style={styles.description}>
            Open Tailscale and sign in to connect to your network.
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={handleOpen}
            accessibilityRole="button"
            accessibilityLabel="Open Tailscale app"
            accessibilityHint="Launches Tailscale to sign in and connect"
          >
            <Text style={styles.buttonText} accessibilityElementsHidden={true}>OPEN TAILSCALE</Text>
          </TouchableOpacity>
        </View>
      )}

      {status.installed && status.connected && status.ipAddress && (
        <View style={styles.section}>
          <View
            style={[styles.statusBadge, styles.statusConnected]}
            accessible={true}
            accessibilityLabel="Status: Connected to Tailscale"
            accessibilityValue={{ text: "Connected" }}
            accessibilityLiveRegion="polite"
          >
            <Text style={styles.statusText} accessibilityElementsHidden={true}>✓ CONNECTED</Text>
          </View>

          <Text
            style={styles.label}
            accessibilityRole="header"
          >
            YOUR TAILSCALE IP
          </Text>
          <View
            style={styles.ipContainer}
            accessible={true}
            accessibilityLabel={`Your Tailscale IP address is ${status.ipAddress}`}
          >
            <Text style={styles.ipAddress} accessibilityElementsHidden={true}>{status.ipAddress}</Text>
            <TouchableOpacity
              onPress={handleCopyIP}
              style={styles.copyButton}
              accessibilityRole="button"
              accessibilityLabel={`Copy IP address ${status.ipAddress}`}
              accessibilityHint="Copies the IP address to clipboard"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.copyText} accessibilityElementsHidden={true}>COPY</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} accessibilityElementsHidden={true} />

          <Text
            style={styles.infoLabel}
            accessibilityRole="header"
          >
            USAGE INSTRUCTIONS
          </Text>
          <Text style={styles.infoText}>
            Your MCP servers are now accessible remotely! Configure your LLM client with:
          </Text>
          <Text
            style={styles.codeText}
            accessible={true}
            accessibilityLabel={`Example URL: http://${status.ipAddress}:3000`}
          >
            http://{status.ipAddress}:3000
          </Text>
          <Text style={styles.infoTextSmall}>
            (Replace 3000 with your server's port number)
          </Text>
        </View>
      )}

      {status.error && (
        <View
          style={styles.errorBox}
          accessible={true}
          accessibilityRole="alert"
          accessibilityLabel={`Error: ${status.error}`}
          accessibilityLiveRegion="assertive"
        >
          <Text style={styles.errorText} accessibilityElementsHidden={true}>{status.error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...COMPONENTS.card,
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.black,
  },
  refreshText: {
    ...TYPOGRAPHY.label,
    color: COLORS.primary,
  },
  divider: {
    height: BORDERS.width,
    backgroundColor: COLORS.black,
    marginVertical: SPACING.md,
  },
  section: {
    marginTop: SPACING.sm,
  },
  label: {
    ...TYPOGRAPHY.label,
    color: COLORS.black,
    marginBottom: SPACING.sm,
  },
  description: {
    ...TYPOGRAPHY.body,
    color: COLORS.gray,
    marginBottom: SPACING.md,
  },
  button: {
    ...COMPONENTS.button,
    width: '100%',
    marginBottom: SPACING.sm,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
  },
  statusBadge: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderWidth: BORDERS.width,
    borderColor: COLORS.black,
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
  },
  statusConnected: {
    backgroundColor: COLORS.success,
  },
  statusText: {
    ...TYPOGRAPHY.label,
    color: COLORS.white,
  },
  ipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: BORDERS.width,
    borderColor: COLORS.black,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  ipAddress: {
    ...TYPOGRAPHY.mono,
    color: COLORS.primary,
    flex: 1,
    fontSize: 16,
  },
  copyButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderWidth: BORDERS.width,
    borderColor: COLORS.black,
  },
  copyText: {
    ...TYPOGRAPHY.label,
    color: COLORS.white,
    fontSize: 10,
  },
  infoLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.black,
    marginBottom: SPACING.xs,
  },
  infoText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.gray,
    marginBottom: SPACING.sm,
  },
  infoTextSmall: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.gray,
    fontSize: 11,
    fontStyle: 'italic',
  },
  codeText: {
    ...TYPOGRAPHY.mono,
    color: COLORS.primary,
    backgroundColor: COLORS.lightGray,
    padding: SPACING.sm,
    borderWidth: BORDERS.width,
    borderColor: COLORS.black,
    marginVertical: SPACING.xs,
  },
  errorBox: {
    backgroundColor: COLORS.error,
    padding: SPACING.md,
    borderWidth: BORDERS.width,
    borderColor: COLORS.black,
    marginTop: SPACING.sm,
  },
  errorText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.white,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.gray,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});
