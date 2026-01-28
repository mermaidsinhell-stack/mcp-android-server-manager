/**
 * Server Detail Screen
 *
 * Detailed view and controls for a single MCP server
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useServerStore } from '../stores/serverStore';
import { serverManager } from '../services/serverManager';
import { tailscaleService } from '../services/tailscaleService';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS, SHADOWS, COMPONENTS } from '../theme';
import { ServerStatus } from '../types';
import * as Clipboard from 'expo-clipboard';

const STATUS_COLORS: Record<ServerStatus, string> = {
  running: COLORS.success,
  stopped: COLORS.gray,
  starting: COLORS.warning,
  error: COLORS.error,
};

export default function ServerDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { servers, startServer, stopServer, removeServer } = useServerStore();
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [tailscaleIP, setTailscaleIP] = useState<string | null>(null);

  const server = servers.find((s) => s.id === id);

  const loadLogs = useCallback(async () => {
    if (!id) return;
    setIsLoadingLogs(true);
    try {
      const serverLogs = await serverManager.getServerLogs(id);
      setLogs(serverLogs);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [id]);

  const handleStart = useCallback(async () => {
    if (!id) return;
    try {
      await startServer(id);
    } catch (error) {
      Alert.alert('Error', 'Failed to start server');
    }
  }, [id, startServer]);

  const handleStop = useCallback(async () => {
    if (!id) return;
    try {
      await stopServer(id);
    } catch (error) {
      Alert.alert('Error', 'Failed to stop server');
    }
  }, [id, stopServer]);

  const handleCopyURL = useCallback(async (url: string) => {
    await Clipboard.setStringAsync(url);
    Alert.alert('Copied', `URL ${url} copied to clipboard`);
  }, []);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Server',
      'Are you sure you want to delete this server? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            try {
              await removeServer(id);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete server');
            }
          },
        },
      ]
    );
  }, [id, removeServer, router]);

  useEffect(() => {
    let isMounted = true;

    const checkTailscale = async () => {
      const ip = await tailscaleService.getIPAddress();
      if (isMounted) {
        setTailscaleIP(ip);
      }
    };

    checkTailscale();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (server?.status === 'running') {
      loadLogs();
    }
  }, [server?.status, loadLogs]);

  if (!server) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text
            style={styles.errorText}
            accessibilityRole="alert"
          >
            Server not found
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back to server list"
            accessibilityHint="Returns to the main screen"
          >
            <Text style={styles.backButtonText} accessibilityElementsHidden={true}>GO BACK</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = STATUS_COLORS[server.status];
  const isRunning = server.status === 'running';
  const isStarting = server.status === 'starting';
  const tailscaleURL = tailscaleIP ? tailscaleService.getServerURL(server.port, tailscaleIP) : null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Server Info Card */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text
              style={styles.serverName}
              accessibilityRole="header"
            >
              {server.name}
            </Text>
            <View
              style={[styles.statusBadge, { backgroundColor: statusColor }]}
              accessible={true}
              accessibilityLabel={`Server status: ${server.status}`}
              accessibilityValue={{ text: server.status.toUpperCase() }}
              accessibilityLiveRegion="polite"
            >
              <Text style={styles.statusText} accessibilityElementsHidden={true}>
                {server.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.description}>{server.description}</Text>

          <View style={styles.divider} accessibilityElementsHidden={true} />

          {/* Server Details */}
          <View
            style={styles.detailsGrid}
            accessible={true}
            accessibilityLabel={`Server details: Port ${server.port}, Branch ${server.branch}, Created ${new Date(server.createdAt).toLocaleDateString()}${server.lastStarted ? `, Last started ${new Date(server.lastStarted).toLocaleString()}` : ''}`}
          >
            <View style={styles.detailItem} accessibilityElementsHidden={true}>
              <Text style={styles.detailLabel}>PORT</Text>
              <Text style={styles.detailValue}>{server.port}</Text>
            </View>
            <View style={styles.detailItem} accessibilityElementsHidden={true}>
              <Text style={styles.detailLabel}>BRANCH</Text>
              <Text style={styles.detailValue}>{server.branch}</Text>
            </View>
            <View style={styles.detailItem} accessibilityElementsHidden={true}>
              <Text style={styles.detailLabel}>CREATED</Text>
              <Text style={styles.detailValue}>
                {new Date(server.createdAt).toLocaleDateString()}
              </Text>
            </View>
            {server.lastStarted && (
              <View style={styles.detailItem} accessibilityElementsHidden={true}>
                <Text style={styles.detailLabel}>LAST STARTED</Text>
                <Text style={styles.detailValue}>
                  {new Date(server.lastStarted).toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          {/* Error Message */}
          {server.status === 'error' && server.errorMessage && (
            <View
              style={styles.errorBox}
              accessible={true}
              accessibilityRole="alert"
              accessibilityLabel={`Error: ${server.errorMessage}`}
              accessibilityLiveRegion="assertive"
            >
              <Text style={styles.errorLabel} accessibilityElementsHidden={true}>ERROR</Text>
              <Text style={styles.errorMessage} accessibilityElementsHidden={true}>{server.errorMessage}</Text>
            </View>
          )}

          {/* Tailscale Remote URL */}
          {isRunning && tailscaleURL && (
            <>
              <View style={styles.divider} accessibilityElementsHidden={true} />
              <View style={styles.urlSection}>
                <Text
                  style={styles.detailLabel}
                  accessibilityRole="header"
                >
                  REMOTE URL (TAILSCALE)
                </Text>
                <View
                  style={styles.urlContainer}
                  accessible={true}
                  accessibilityLabel={`Remote URL: ${tailscaleURL}`}
                >
                  <Text style={styles.urlText} numberOfLines={1} accessibilityElementsHidden={true}>
                    {tailscaleURL}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleCopyURL(tailscaleURL)}
                    style={styles.copyButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Copy URL ${tailscaleURL}`}
                    accessibilityHint="Copies the server URL to clipboard"
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Text style={styles.copyButtonText} accessibilityElementsHidden={true}>COPY</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.urlHint}>
                  Use this URL to connect from any device on your Tailscale network
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Actions Card */}
        <View style={styles.card}>
          <Text
            style={styles.sectionTitle}
            accessibilityRole="header"
          >
            ACTIONS
          </Text>

          <View style={styles.actionsRow}>
            {isStarting ? (
              <View
                style={[styles.actionButton, styles.buttonDisabled]}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Server is starting"
                accessibilityState={{ disabled: true, busy: true }}
                accessibilityLiveRegion="polite"
              >
                <ActivityIndicator color={COLORS.black} size="small" accessibilityElementsHidden={true} />
                <Text style={styles.actionButtonText} accessibilityElementsHidden={true}>STARTING...</Text>
              </View>
            ) : isRunning ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.buttonStop]}
                onPress={handleStop}
                accessibilityRole="button"
                accessibilityLabel={`Stop ${server.name} server`}
                accessibilityHint="Stops the currently running MCP server"
              >
                <Text style={styles.actionButtonText} accessibilityElementsHidden={true}>STOP SERVER</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.buttonStart]}
                onPress={handleStart}
                accessibilityRole="button"
                accessibilityLabel={`Start ${server.name} server`}
                accessibilityHint="Starts the MCP server and makes it available for connections"
              >
                <Text style={[styles.actionButtonText, styles.buttonTextLight]} accessibilityElementsHidden={true}>
                  START SERVER
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.actionButton, styles.buttonDelete]}
            onPress={handleDelete}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${server.name} server`}
            accessibilityHint="Permanently removes this server. This action cannot be undone."
          >
            <Text style={[styles.actionButtonText, styles.buttonTextLight]} accessibilityElementsHidden={true}>
              DELETE SERVER
            </Text>
          </TouchableOpacity>
        </View>

        {/* Logs Card */}
        {isRunning && (
          <View style={styles.card}>
            <View style={styles.logsHeader}>
              <Text
                style={styles.sectionTitle}
                accessibilityRole="header"
              >
                LOGS
              </Text>
              <TouchableOpacity
                onPress={loadLogs}
                disabled={isLoadingLogs}
                accessibilityRole="button"
                accessibilityLabel="Refresh server logs"
                accessibilityHint="Reloads the latest server log entries"
                accessibilityState={{ disabled: isLoadingLogs, busy: isLoadingLogs }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.refreshText} accessibilityElementsHidden={true}>
                  {isLoadingLogs ? 'LOADING...' : 'REFRESH'}
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={styles.logsContainer}
              accessible={true}
              accessibilityRole="text"
              accessibilityLabel={logs.length === 0 ? 'No logs available' : `Server logs: ${logs.length} entries`}
              accessibilityLiveRegion="polite"
            >
              {logs.length === 0 ? (
                <Text style={styles.noLogsText} accessibilityElementsHidden={true}>No logs available</Text>
              ) : (
                logs.map((log, index) => (
                  <Text key={`log-${index}-${log.substring(0, 20)}`} style={styles.logLine} accessibilityElementsHidden={true}>
                    {log}
                  </Text>
                ))
              )}
            </View>
          </View>
        )}

        {/* Repository Info */}
        <View style={styles.card}>
          <Text
            style={styles.sectionTitle}
            accessibilityRole="header"
          >
            REPOSITORY
          </Text>
          <Text
            style={styles.repoUrl}
            selectable
            accessibilityLabel={`Repository URL: ${server.repoUrl}`}
          >
            {server.repoUrl}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.md,
  },
  card: {
    ...COMPONENTS.card,
    marginBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  serverName: {
    ...TYPOGRAPHY.h2,
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
    ...TYPOGRAPHY.body,
    color: COLORS.gray,
  },
  divider: {
    height: BORDERS.width,
    backgroundColor: COLORS.black,
    marginVertical: SPACING.md,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailItem: {
    width: '50%',
    marginBottom: SPACING.md,
  },
  detailLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.gray,
    marginBottom: 2,
  },
  detailValue: {
    ...TYPOGRAPHY.body,
    color: COLORS.black,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: COLORS.error,
    padding: SPACING.md,
    borderWidth: BORDERS.width,
    borderColor: COLORS.black,
    marginTop: SPACING.sm,
  },
  errorLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  errorMessage: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.white,
  },
  sectionTitle: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.black,
    marginBottom: SPACING.md,
  },
  actionsRow: {
    marginBottom: SPACING.sm,
  },
  actionButton: {
    ...COMPONENTS.button,
    width: '100%',
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  buttonStart: {
    backgroundColor: COLORS.primary,
  },
  buttonStop: {
    backgroundColor: COLORS.white,
  },
  buttonDelete: {
    backgroundColor: COLORS.error,
  },
  buttonDisabled: {
    backgroundColor: COLORS.lightGray,
  },
  actionButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.black,
  },
  buttonTextLight: {
    color: COLORS.white,
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  refreshText: {
    ...TYPOGRAPHY.label,
    color: COLORS.primary,
  },
  logsContainer: {
    backgroundColor: COLORS.black,
    padding: SPACING.sm,
    borderWidth: BORDERS.width,
    borderColor: COLORS.black,
    maxHeight: 200,
  },
  noLogsText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  logLine: {
    ...TYPOGRAPHY.mono,
    color: COLORS.white,
    marginBottom: 2,
  },
  repoUrl: {
    ...TYPOGRAPHY.mono,
    color: COLORS.primary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.error,
    marginBottom: SPACING.lg,
  },
  backButton: {
    ...COMPONENTS.button,
    backgroundColor: COLORS.secondary,
  },
  backButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
  },
  urlSection: {
    marginTop: SPACING.sm,
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderWidth: BORDERS.width,
    borderColor: COLORS.black,
    padding: SPACING.sm,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  urlText: {
    ...TYPOGRAPHY.mono,
    color: COLORS.primary,
    fontSize: 12,
    flex: 1,
    marginRight: SPACING.xs,
  },
  copyButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderWidth: BORDERS.width,
    borderColor: COLORS.black,
  },
  copyButtonText: {
    ...TYPOGRAPHY.label,
    color: COLORS.white,
    fontSize: 10,
  },
  urlHint: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.gray,
    fontSize: 11,
    fontStyle: 'italic',
  },
});
