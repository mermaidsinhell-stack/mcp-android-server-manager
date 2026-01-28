/**
 * Environment Configuration
 * 
 * Centralized configuration management for different environments
 * Supports development, preview, and production environments
 */

import Constants from 'expo-constants';

/**
 * Environment types
 */
export type Environment = 'development' | 'preview' | 'production';

/**
 * Configuration interface
 */
export interface AppConfig {
  // Environment
  env: Environment;
  isDevelopment: boolean;
  isProduction: boolean;
  
  // App Info
  appVersion: string;
  appBuildNumber: string;
  
  // API Configuration
  githubApiUrl: string;
  githubApiTimeout: number;
  
  // Sentry
  sentryDsn: string | null;
  sentryEnabled: boolean;
  sentryTracesSampleRate: number;
  
  // Feature Flags
  features: {
    tailscaleEnabled: boolean;
    crashReportingEnabled: boolean;
    analyticsEnabled: boolean;
    debugLogsEnabled: boolean;
  };
  
  // Server Configuration
  server: {
    maxServers: number | 'auto'; // 'auto' = based on device RAM
    defaultPort: number;
    baseMemoryMB: number; // Per server
    reconciliationIntervalMs: number;
  };
  
  // Network Configuration
  network: {
    requestTimeoutMs: number;
    retryAttempts: number;
    githubRateLimitPerHour: number;
  };
  
  // Security
  security: {
    useSecureStore: boolean;
    certificatePinningEnabled: boolean;
    ipcValidationEnabled: boolean;
  };
}

/**
 * Get current environment
 */
function getCurrentEnvironment(): Environment {
  // Check Expo config first
  const expoEnv = Constants.expoConfig?.extra?.environment;
  if (expoEnv && ['development', 'preview', 'production'].includes(expoEnv)) {
    return expoEnv as Environment;
  }
  
  // Fallback to __DEV__ flag
  return __DEV__ ? 'development' : 'production';
}

/**
 * Development environment configuration
 */
const developmentConfig: AppConfig = {
  env: 'development',
  isDevelopment: true,
  isProduction: false,
  
  appVersion: Constants.expoConfig?.version || '1.0.0',
  appBuildNumber: '1',
  
  githubApiUrl: 'https://api.github.com',
  githubApiTimeout: 30000,
  
  sentryDsn: null, // Disabled in development
  sentryEnabled: false,
  sentryTracesSampleRate: 0,
  
  features: {
    tailscaleEnabled: true,
    crashReportingEnabled: false,
    analyticsEnabled: false,
    debugLogsEnabled: true,
  },
  
  server: {
    maxServers: 'auto',
    defaultPort: 3000,
    baseMemoryMB: 512,
    reconciliationIntervalMs: 30000, // 30 seconds
  },
  
  network: {
    requestTimeoutMs: 30000,
    retryAttempts: 3,
    githubRateLimitPerHour: 60, // GitHub allows 60/hour for unauthenticated
  },
  
  security: {
    useSecureStore: true,
    certificatePinningEnabled: true, // Enable even in dev for testing
    ipcValidationEnabled: true,
  },
};

/**
 * Preview environment configuration (for internal testing)
 */
const previewConfig: AppConfig = {
  ...developmentConfig,
  env: 'preview',
  isDevelopment: false,
  isProduction: false,
  
  // Sentry enabled for preview builds to catch issues before production
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || null,
  sentryEnabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
  sentryTracesSampleRate: 0.5, // 50% sampling
  
  features: {
    ...developmentConfig.features,
    crashReportingEnabled: true,
    debugLogsEnabled: true, // Keep debug logs for internal testing
  },
};

/**
 * Production environment configuration
 */
const productionConfig: AppConfig = {
  ...developmentConfig,
  env: 'production',
  isDevelopment: false,
  isProduction: true,
  
  // Sentry configuration for production
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || null,
  sentryEnabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
  sentryTracesSampleRate: 0.2, // 20% sampling to reduce overhead
  
  features: {
    tailscaleEnabled: true,
    crashReportingEnabled: true,
    analyticsEnabled: true, // Enable if you add analytics
    debugLogsEnabled: false, // Disable debug logs in production
  },
  
  server: {
    ...developmentConfig.server,
    reconciliationIntervalMs: 30000, // 30 seconds
  },
  
  network: {
    ...developmentConfig.network,
    requestTimeoutMs: 30000,
    retryAttempts: 3,
  },
  
  security: {
    useSecureStore: true,
    certificatePinningEnabled: true,
    ipcValidationEnabled: true,
  },
};

/**
 * Get configuration for current environment
 */
export function getConfig(): AppConfig {
  const env = getCurrentEnvironment();
  
  switch (env) {
    case 'development':
      return developmentConfig;
    case 'preview':
      return previewConfig;
    case 'production':
      return productionConfig;
    default:
      console.warn(`Unknown environment: ${env}, falling back to development`);
      return developmentConfig;
  }
}

/**
 * Current app configuration
 */
export const config = getConfig();

/**
 * Helper functions for common checks
 */
export const isDevelopment = config.isDevelopment;
export const isProduction = config.isProduction;
export const isPreview = config.env === 'preview';

/**
 * Log current configuration (useful for debugging)
 */
export function logConfig(): void {
  console.log('=== App Configuration ===');
  console.log('Environment:', config.env);
  console.log('Version:', config.appVersion);
  console.log('Build:', config.appBuildNumber);
  console.log('Sentry:', config.sentryEnabled ? 'Enabled' : 'Disabled');
  console.log('Debug Logs:', config.features.debugLogsEnabled ? 'Enabled' : 'Disabled');
  console.log('Max Servers:', config.server.maxServers);
  console.log('========================');
}

/**
 * Validate configuration on app start
 */
export function validateConfig(): boolean {
  const errors: string[] = [];
  
  // Validate Sentry configuration
  if (config.isProduction && config.features.crashReportingEnabled && !config.sentryDsn) {
    errors.push('Sentry DSN is required in production when crash reporting is enabled');
  }
  
  // Validate server configuration
  if (typeof config.server.maxServers === 'number' && config.server.maxServers < 1) {
    errors.push('Max servers must be at least 1');
  }
  
  if (config.server.defaultPort < 1024 || config.server.defaultPort > 65535) {
    errors.push('Default port must be between 1024 and 65535');
  }
  
  // Validate network configuration
  if (config.network.requestTimeoutMs < 1000) {
    errors.push('Request timeout must be at least 1000ms');
  }
  
  if (config.network.retryAttempts < 0) {
    errors.push('Retry attempts cannot be negative');
  }
  
  // Log errors
  if (errors.length > 0) {
    console.error('Configuration validation errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    return false;
  }
  
  return true;
}

export default config;
