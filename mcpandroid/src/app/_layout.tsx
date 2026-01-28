/**
 * Root Layout
 *
 * App-wide layout with fonts, navigation, and lifecycle management
 */

import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ErrorBoundary } from 'react-error-boundary';
import { View, Text, StyleSheet, TouchableOpacity, AppState, AppStateStatus } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { initSentry, logError } from '../utils/sentry';
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_400Regular_Italic,
} from '@expo-google-fonts/playfair-display';
import {
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
  InterTight_700Bold,
} from '@expo-google-fonts/inter-tight';
import { COLORS } from '../theme';
import {
  initializeReconciliation,
  pauseReconciliation,
  resumeReconciliation,
} from '../stores/serverStore';
import { metricsService } from '../services/metrics';
import { nodeBridge } from '../services/nodeBridge';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Initialize Sentry for crash reporting
initSentry();

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <View style={errorStyles.container}>
      <Text style={errorStyles.title}>Something went wrong</Text>
      <Text style={errorStyles.message}>{error.message}</Text>
      <TouchableOpacity style={errorStyles.button} onPress={resetErrorBoundary}>
        <Text style={errorStyles.buttonText}>TRY AGAIN</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RootLayout() {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const reconciliationInitialized = useRef(false);

  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_400Regular_Italic,
    InterTight_400Regular,
    InterTight_500Medium,
    InterTight_600SemiBold,
    InterTight_700Bold,
  });

  // Initialize state reconciliation once
  useEffect(() => {
    if ((fontsLoaded || fontError) && !reconciliationInitialized.current) {
      reconciliationInitialized.current = true;

      try {
        // Initialize reconciliation service
        initializeReconciliation();
        console.log('[RootLayout] State reconciliation initialized');

        // Track bridge health periodically
        const healthCheckInterval = setInterval(() => {
          const healthStatus = nodeBridge.getHealthStatus();
          const queueStats = nodeBridge.getQueueStats();

          metricsService.trackBridgeHealth({
            timestamp: Date.now(),
            healthy: healthStatus.healthy,
            initialized: healthStatus.initialized,
            crashed: healthStatus.crashed,
            restarting: healthStatus.restarting,
            consecutiveFailures: healthStatus.consecutiveFailures,
            restartAttempts: healthStatus.restartAttempts,
            lastHealthCheck: healthStatus.lastHealthCheck,
            queueDepth: queueStats.totalQueued,
            pendingRequests: queueStats.totalProcessing,
            queueLatency: null, // Could calculate from queue stats if available
          });
        }, 60000); // Every minute

        // Cleanup on unmount
        return () => {
          clearInterval(healthCheckInterval);
        };
      } catch (error) {
        console.error('[RootLayout] Failed to initialize reconciliation:', error);
        logError(error instanceof Error ? error : new Error(String(error)), {
          context: 'reconciliation_init',
        });
      }
    }
  }, [fontsLoaded, fontError]);

  // Handle app lifecycle (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        console.log('[RootLayout] App foregrounded - resuming reconciliation');
        resumeReconciliation();

        // Log metrics summary on foreground
        const summary = metricsService.getSummary();
        console.log('[RootLayout] Metrics summary:', {
          driftsDetected: summary.totalDriftEvents,
          reconciliations: summary.totalReconciliations,
          successRate: summary.reconciliationSuccessRate.toFixed(1) + '%',
          bridgeHealth: summary.bridgeHealthyPercentage.toFixed(1) + '%',
        });
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App has gone to the background
        console.log('[RootLayout] App backgrounded - pausing reconciliation');
        pauseReconciliation();
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Hide splash screen when fonts are loaded
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, info) => {
        logError(error, { componentStack: info.componentStack });
      }}
    >
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: COLORS.background,
          },
          headerTintColor: COLORS.black,
          headerTitleStyle: {
            fontFamily: 'PlayfairDisplay_700Bold',
            fontSize: 20,
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: COLORS.background,
          },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'MCP SERVERS',
          }}
        />
        <Stack.Screen
          name="add-server"
          options={{
            title: 'ADD SERVER',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="server-detail"
          options={{
            title: 'SERVER DETAILS',
          }}
        />
      </Stack>
    </ErrorBoundary>
  );
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: COLORS.error,
    marginBottom: 16,
  },
  message: {
    fontSize: 14,
    fontFamily: 'InterTight_400Regular',
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: COLORS.black,
  },
  buttonText: {
    fontFamily: 'InterTight_600SemiBold',
    fontSize: 12,
    color: COLORS.white,
    letterSpacing: 1,
  },
});
