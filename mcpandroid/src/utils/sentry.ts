/**
 * Sentry crash reporting configuration
 */

import * as Sentry from 'sentry-expo';
import Constants from 'expo-constants';
import { config } from '../config/env';

/**
 * Initialize Sentry for crash reporting
 */
export function initSentry(): void {
  // Check if Sentry is enabled via configuration
  if (!config.sentryEnabled || !config.sentryDsn) {
    console.log('Sentry disabled (no DSN configured or disabled in environment)');
    return;
  }

  Sentry.init({
    dsn: config.sentryDsn,
    enableInExpoDevelopment: false,
    debug: config.isDevelopment, // Enable debug in development
    environment: config.env,
    release: `mcp-server-manager@${config.appVersion}`,
    
    // Set sample rate for performance monitoring from config
    tracesSampleRate: config.sentryTracesSampleRate,

    // Filter out sensitive information
    beforeSend(event, hint) {
      // Remove sensitive data from event
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
      }

      // Filter out noisy errors
      const error = hint.originalException;
      if (error instanceof Error) {
        // Ignore network timeout errors (user may have poor connection)
        if (error.message.includes('timeout') || error.message.includes('Network request failed')) {
          return null;
        }

        // Ignore expected errors
        if (error.message.includes('User cancelled')) {
          return null;
        }
      }

      return event;
    },

    // Add custom integrations
    integrations: [
      new Sentry.Native.ReactNativeTracing({
        tracingOrigins: ['localhost', 'api.github.com', /^\//],
        routingInstrumentation: new Sentry.ReactNavigationInstrumentation(),
      }),
    ],
  });
}

/**
 * Log an error to Sentry
 */
export function logError(error: Error, context?: Record<string, unknown>): void {
  if (!config.sentryEnabled) {
    console.error('Error:', error, context);
    return;
  }

  Sentry.Native.captureException(error, {
    contexts: context ? { custom: context } : undefined,
  });
}

/**
 * Log a message to Sentry
 */
export function logMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  if (!config.sentryEnabled) {
    console.log(`[${level}]`, message);
    return;
  }

  Sentry.Native.captureMessage(message, level);
}

/**
 * Set user context for Sentry
 */
export function setUserContext(userId: string, email?: string): void {
  if (!config.sentryEnabled) return;

  Sentry.Native.setUser({
    id: userId,
    email,
  });
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, unknown>): void {
  if (!config.sentryEnabled) {
    console.log(`[Breadcrumb] ${category}: ${message}`, data);
    return;
  }

  Sentry.Native.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
    timestamp: Date.now() / 1000,
  });
}

/**
 * Set tag for filtering in Sentry
 */
export function setTag(key: string, value: string): void {
  if (!config.sentryEnabled) return;
  
  Sentry.Native.setTag(key, value);
}

/**
 * Performance monitoring transaction
 */
export function startTransaction(name: string, op: string): Sentry.Transaction | null {
  if (!config.sentryEnabled) return null;

  return Sentry.startTransaction({
    name,
    op,
  });
}
