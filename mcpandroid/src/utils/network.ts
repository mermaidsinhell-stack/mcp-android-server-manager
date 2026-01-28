/**
 * Network utilities with rate limiting, error handling, and certificate pinning
 */

import * as Network from 'expo-network';
import {
  validatePinnedHost,
  pinnedGitHubFetch,
  CertificatePinningError,
  getCertificateExpirationWarnings,
} from './certificatePinning';

/**
 * Rate limiter for API requests
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private limits: Map<string, { maxRequests: number; windowMs: number }> = new Map();

  /**
   * Set rate limit for a specific endpoint
   */
  setLimit(key: string, maxRequests: number, windowMs: number): void {
    this.limits.set(key, { maxRequests, windowMs });
  }

  /**
   * Check if request is allowed
   */
  async checkLimit(key: string): Promise<{ allowed: boolean; retryAfter?: number }> {
    const limit = this.limits.get(key);
    if (!limit) {
      return { allowed: true };
    }

    const now = Date.now();
    const windowStart = now - limit.windowMs;

    // Get existing requests in window
    let requests = this.requests.get(key) || [];
    
    // Remove old requests outside window
    requests = requests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (requests.length >= limit.maxRequests) {
      const oldestRequest = Math.min(...requests);
      const retryAfter = Math.ceil((oldestRequest + limit.windowMs - now) / 1000);
      return { allowed: false, retryAfter };
    }

    // Add current request
    requests.push(now);
    this.requests.set(key, requests);

    return { allowed: true };
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.requests.delete(key);
  }
}

export const rateLimiter = new RateLimiter();

// Set GitHub API rate limit (60 requests per hour for unauthenticated)
rateLimiter.setLimit('github-api', 50, 60 * 60 * 1000); // Conservative limit

/**
 * Check network connectivity
 */
export async function checkNetworkConnectivity(): Promise<{
  isConnected: boolean;
  type?: string;
  error?: string;
}> {
  try {
    const networkState = await Network.getNetworkStateAsync();
    
    return {
      isConnected: networkState.isConnected ?? false,
      type: networkState.type,
    };
  } catch (error) {
    return {
      isConnected: false,
      error: error instanceof Error ? error.message : 'Network check failed',
    };
  }
}

/**
 * Fetch with timeout and retries
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  config: {
    timeout?: number;
    retries?: number;
    retryDelay?: number;
  } = {}
): Promise<Response> {
  const {
    timeout = 30000,
    retries = 3,
    retryDelay = 1000,
  } = config;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : retryDelay * Math.pow(2, attempt);
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      // Return response (even if error status, let caller handle)
      return response;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Fetch failed');

      // Don't retry on abort (timeout)
      if (lastError.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }

      // Wait before retry (exponential backoff)
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new Error('Fetch failed after retries');
}

/**
 * Fetch GitHub API with rate limiting and certificate pinning
 *
 * SECURITY: Uses certificate pinning to prevent MITM attacks.
 * See certificatePinning.ts for pin configuration.
 */
export async function fetchGitHubAPI(path: string): Promise<Response> {
  // Check rate limit
  const rateCheck = await rateLimiter.checkLimit('github-api');
  if (!rateCheck.allowed) {
    throw new Error(`Rate limit exceeded. Try again in ${rateCheck.retryAfter} seconds`);
  }

  // Check network
  const network = await checkNetworkConnectivity();
  if (!network.isConnected) {
    throw new Error('No internet connection. Please check your network settings');
  }

  // Build URL and validate certificate pinning
  const url = `https://api.github.com${path}`;

  // Validate pinned host before making request
  const pinValidation = validatePinnedHost(url);
  if (!pinValidation.valid) {
    throw pinValidation.error || new Error('Certificate pinning validation failed');
  }

  // Log certificate expiration warnings (for monitoring)
  const certWarnings = getCertificateExpirationWarnings();
  if (certWarnings.length > 0) {
    console.warn('Certificate expiration warnings:', certWarnings);
  }

  // Make request with pinned fetch and retry logic
  const response = await fetchWithRetryPinned(url, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'MCP-Server-Manager-Android',
    },
  }, {
    timeout: 15000,
    retries: 2,
    retryDelay: 2000,
  });

  return response;
}

/**
 * Fetch with timeout, retries, and certificate pinning for GitHub
 */
async function fetchWithRetryPinned(
  url: string,
  options: RequestInit = {},
  config: {
    timeout?: number;
    retries?: number;
    retryDelay?: number;
  } = {}
): Promise<Response> {
  const {
    timeout = 30000,
    retries = 3,
    retryDelay = 1000,
  } = config;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Use pinned fetch for GitHub API
      const response = await pinnedGitHubFetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : retryDelay * Math.pow(2, attempt);

        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      // Return response (even if error status, let caller handle)
      return response;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Fetch failed');

      // Don't retry on certificate pinning errors
      if (error instanceof CertificatePinningError) {
        throw new Error(`Security error: ${error.message}. This may indicate a man-in-the-middle attack.`);
      }

      // Don't retry on abort (timeout)
      if (lastError.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }

      // Wait before retry (exponential backoff)
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new Error('Fetch failed after retries');
}

/**
 * Validates response status and returns JSON
 */
export async function validateResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      const errorData = await response.json();
      if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // Ignore JSON parse errors
    }

    throw new Error(errorMessage);
  }

  return response.json();
}
