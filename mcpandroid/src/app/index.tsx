/**
 * Home Screen
 *
 * Main screen displaying list of MCP servers
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ListRenderItem,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ServerCard } from '../components/ServerCard';
import { TailscaleCard } from '../components/TailscaleCard';
import { useServerStore } from '../stores/serverStore';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS, SHADOWS, COMPONENTS } from '../theme';

export default function HomeScreen() {
  const router = useRouter();
  const {
    servers,
    isLoading,
    loadServers,
    startServer,
    stopServer,
    selectServer,
  } = useServerStore();

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  const handleAddServer = useCallback(() => {
    router.push('/add-server');
  }, [router]);

  const handleServerPress = useCallback((id: string) => {
    selectServer(id);
    router.push(`/server-detail?id=${id}`);
  }, [router, selectServer]);

  const handleStartServer = useCallback(async (id: string) => {
    try {
      await startServer(id);
    } catch (error) {
      console.error('Failed to start server:', error);
    }
  }, [startServer]);

  const handleStopServer = useCallback(async (id: string) => {
    try {
      await stopServer(id);
    } catch (error) {
      console.error('Failed to stop server:', error);
    }
  }, [stopServer]);

  const renderServerItem: ListRenderItem<typeof servers[number]> = useCallback(({ item }) => (
    <ServerCard
      server={item}
      onPress={() => handleServerPress(item.id)}
      onStart={() => handleStartServer(item.id)}
      onStop={() => handleStopServer(item.id)}
    />
  ), [handleServerPress, handleStartServer, handleStopServer]);

  const renderListHeader = useCallback(() => (
    <>
      {/* Header Section */}
      <View style={styles.header} accessibilityRole="header">
        <Text
          style={styles.title}
          accessibilityRole="header"
          accessibilityLabel="MCP Server Manager"
        >
          MCP Server Manager
        </Text>
        <Text style={styles.subtitle}>
          Run any GitHub MCP server on your phone
        </Text>
      </View>

      {/* Tailscale Network Card */}
      <TailscaleCard />
    </>
  ), []);

  const renderListEmpty = useCallback(() => (
    <View style={styles.emptyState}>
      <View style={styles.emptyCard}>
        <Text
          style={styles.emptyTitle}
          accessibilityRole="header"
        >
          NO SERVERS YET
        </Text>
        <Text style={styles.emptyText}>
          Add your first MCP server from GitHub to get started.
        </Text>
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={handleAddServer}
          accessibilityRole="button"
          accessibilityLabel="Add your first server"
          accessibilityHint="Opens the add server screen to add your first MCP server"
        >
          <Text style={styles.buttonTextLight} accessibilityElementsHidden={true}>ADD SERVER</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [handleAddServer]);

  const keyExtractor = useCallback((item: typeof servers[number]) => item.id, []);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={servers}
        renderItem={renderServerItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderListEmpty}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadServers}
            tintColor={COLORS.primary}
            accessibilityLabel="Refresh server list"
          />
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={21}
        accessible={false}
      />

      {/* Floating Add Button */}
      {servers.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddServer}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Add new MCP server"
          accessibilityHint="Opens the add server screen to configure a new MCP server from GitHub"
        >
          <Text style={styles.fabText} accessibilityElementsHidden={true}>+</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.md,
  },
  header: {
    marginBottom: SPACING.xl,
    paddingTop: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: COLORS.black,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.gray,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyCard: {
    ...COMPONENTS.card,
    alignItems: 'center',
    padding: SPACING.xl,
    maxWidth: 320,
  },
  emptyTitle: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.black,
    marginBottom: SPACING.md,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  button: {
    ...COMPONENTS.button,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
  buttonTextLight: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
  },
  fab: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.md,
    width: 56,
    height: 56,
    backgroundColor: COLORS.primary,
    borderWidth: BORDERS.widthThick,
    borderColor: COLORS.black,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.hard,
  },
  fabText: {
    fontSize: 28,
    color: COLORS.white,
    fontWeight: 'bold',
    marginTop: -2,
  },
});
