/**
 * ServerCard Component
 *
 * Displays an MCP server in a brutalist card style
 */

import React, { useEffect, useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { MCPServer, ServerStatus } from '../types';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS, SHADOWS, COMPONENTS } from '../theme';
import { tailscaleService } from '../services/tailscaleService';

interface ServerCardProps {
  server: MCPServer;
  onPress: () => void;
  onStart: () => void;
  onStop: () => void;
}

const STATUS_COLORS: Record<ServerStatus, string> = {
  running: COLORS.success,
  stopped: COLORS.gray,
  starting: COLORS.warning,
  error: COLORS.error,
};

const STATUS_LABELS: Record<ServerStatus, string> = {
  running: 'RUNNING',
  stopped: 'STOPPED',
  starting: 'STARTING',
  error: 'ERROR',
};

const ServerCardComponent: React.FC<ServerCardProps> = ({
  server,
  onPress,
  onStart,
  onStop,
}) => {
  const [tailscaleIP, setTailscaleIP] = useState<string | null>(null);

  const checkTailscale = useCallback(async () => {
    const ip = await tailscaleService.getIPAddress();
    setTailscaleIP(ip);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadTailscaleIP = async () => {
      const ip = await tailscaleService.getIPAddress();
      if (isMounted) {
        setTailscaleIP(ip);
      }
    };

    loadTailscaleIP();

    return () => {
      isMounted = false;
    };
  }, []);

  const statusColor = STATUS_COLORS[server.status];
  const isRunning = server.status === 'running';
  const isStarting = server.status === 'starting';
  const tailscaleURL = tailscaleIP ? tailscaleService.getServerURL(server.port, tailscaleIP) : null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`${server.name}, ${STATUS_LABELS[server.status]}`}
      accessibilityHint="Double tap to view server details and logs"
      accessibilityState={{ disabled: isStarting }}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text
            style={styles.name}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {server.name}
          </Text>
          <View
            style={[styles.statusBadge, { backgroundColor: statusColor }]}
            accessibilityLabel={`Status: ${STATUS_LABELS[server.status]}`}
            accessibilityValue={{ text: STATUS_LABELS[server.status] }}
            accessible={true}
          >
            <Text style={styles.statusText} accessibilityElementsHidden={true}>
              {STATUS_LABELS[server.status]}
            </Text>
          </View>
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {server.description}
        </Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Info Row */}
      <View style={styles.infoRow} accessible={true} accessibilityLabel={`Port ${server.port}, Branch ${server.branch}`}>
        <View style={styles.infoItem} accessibilityElementsHidden={true}>
          <Text style={styles.infoLabel}>PORT</Text>
          <Text style={styles.infoValue}>{server.port}</Text>
        </View>
        <View style={styles.infoItem} accessibilityElementsHidden={true}>
          <Text style={styles.infoLabel}>BRANCH</Text>
          <Text style={styles.infoValue}>{server.branch}</Text>
        </View>
      </View>

      {/* Tailscale URL */}
      {isRunning && tailscaleURL && (
        <View
          style={styles.urlContainer}
          accessible={true}
          accessibilityLabel={`Remote URL: ${tailscaleURL}`}
          accessibilityHint="Available via Tailscale network"
        >
          <Text style={styles.urlLabel} accessibilityElementsHidden={true}>REMOTE URL</Text>
          <Text style={styles.urlText} numberOfLines={1} accessibilityElementsHidden={true}>{tailscaleURL}</Text>
        </View>
      )}

      {/* Error Message */}
      {server.status === 'error' && server.errorMessage && (
        <View
          style={styles.errorContainer}
          accessible={true}
          accessibilityRole="alert"
          accessibilityLabel={`Error: ${server.errorMessage}`}
          accessibilityLiveRegion="assertive"
        >
          <Text style={styles.errorText} accessibilityElementsHidden={true}>{server.errorMessage}</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {isStarting ? (
          <View
            style={[styles.button, styles.buttonDisabled]}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Server is starting"
            accessibilityState={{ disabled: true, busy: true }}
            accessibilityLiveRegion="polite"
          >
            <ActivityIndicator color={COLORS.black} size="small" accessibilityElementsHidden={true} />
            <Text style={styles.buttonText} accessibilityElementsHidden={true}>STARTING</Text>
          </View>
        ) : isRunning ? (
          <TouchableOpacity
            style={[styles.button, styles.buttonStop]}
            onPress={onStop}
            accessibilityRole="button"
            accessibilityLabel={`Stop ${server.name}`}
            accessibilityHint="Stops the running MCP server"
          >
            <Text style={styles.buttonText} accessibilityElementsHidden={true}>STOP</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.buttonStart]}
            onPress={onStart}
            accessibilityRole="button"
            accessibilityLabel={`Start ${server.name}`}
            accessibilityHint="Starts the MCP server and makes it available"
          >
            <Text style={[styles.buttonText, styles.buttonTextLight]} accessibilityElementsHidden={true}>START</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

// Memoize the component with custom equality check
export const ServerCard = memo(ServerCardComponent, (prevProps, nextProps) => {
  // Only re-render if server data or callback references changed
  return (
    prevProps.server.id === nextProps.server.id &&
    prevProps.server.status === nextProps.server.status &&
    prevProps.server.name === nextProps.server.name &&
    prevProps.server.description === nextProps.server.description &&
    prevProps.server.port === nextProps.server.port &&
    prevProps.server.branch === nextProps.server.branch &&
    prevProps.server.errorMessage === nextProps.server.errorMessage &&
    prevProps.onPress === nextProps.onPress &&
    prevProps.onStart === nextProps.onStart &&
    prevProps.onStop === nextProps.onStop
  );
});

const styles = StyleSheet.create({
  card: {
    ...COMPONENTS.card,
    marginBottom: SPACING.md,
  },
  header: {
    marginBottom: SPACING.sm,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  name: {
    ...TYPOGRAPHY.h3,
    color: COLORS.black,
    flex: 1,
    marginRight: SPACING.sm,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderWidth: BORDERS.width,
    borderColor: COLORS.black,
  },
  statusText: {
    ...TYPOGRAPHY.label,
    color: COLORS.white,
  },
  description: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.gray,
  },
  divider: {
    height: BORDERS.width,
    backgroundColor: COLORS.black,
    marginVertical: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  infoItem: {
    marginRight: SPACING.xl,
  },
  infoLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.gray,
    marginBottom: 2,
  },
  infoValue: {
    ...TYPOGRAPHY.body,
    color: COLORS.black,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: COLORS.error,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: BORDERS.width,
    borderColor: COLORS.black,
  },
  errorText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.white,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    ...COMPONENTS.button,
    flexDirection: 'row',
    minWidth: 100,
    gap: SPACING.xs,
  },
  buttonStart: {
    backgroundColor: COLORS.primary,
  },
  buttonStop: {
    backgroundColor: COLORS.white,
  },
  buttonDisabled: {
    backgroundColor: COLORS.lightGray,
  },
  buttonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.black,
  },
  buttonTextLight: {
    color: COLORS.white,
  },
  urlContainer: {
    backgroundColor: COLORS.lightGray,
    padding: SPACING.sm,
    borderWidth: BORDERS.width,
    borderColor: COLORS.black,
    marginBottom: SPACING.sm,
  },
  urlLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.gray,
    marginBottom: 2,
    fontSize: 10,
  },
  urlText: {
    ...TYPOGRAPHY.mono,
    color: COLORS.primary,
    fontSize: 11,
  },
});

export default ServerCard;
