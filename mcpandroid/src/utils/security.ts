/**
 * Security utilities for input validation and sanitization
 */

import * as Crypto from 'expo-crypto';

/**
 * Allowed Git repository hosts
 */
const ALLOWED_GIT_HOSTS = [
  'github.com',
  'gitlab.com',
  'gitea.com',
  'bitbucket.org',
];

/**
 * Validates a Git repository URL
 * Prevents command injection and ensures URL is from trusted source
 */
export function validateGitUrl(url: string): { valid: boolean; error?: string; sanitized?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  // Remove whitespace and dangerous characters
  const trimmed = url.trim();
  
  // Check for command injection patterns
  const dangerousPatterns = [
    /[;&|`$(){}[\]<>]/,  // Shell metacharacters
    /\.\./,               // Path traversal
    /--.*/,               // Git arguments
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmed)) {
      return { valid: false, error: 'URL contains invalid characters' };
    }
  }

  // Parse URL
  let parsedUrl: URL;
  try {
    // Handle short format (owner/repo)
    if (!trimmed.includes('://')) {
      parsedUrl = new URL(`https://github.com/${trimmed}`);
    } else {
      parsedUrl = new URL(trimmed);
    }
  } catch (e) {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Validate protocol
  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    return { valid: false, error: 'Only HTTP(S) URLs are allowed' };
  }

  // Validate host
  if (!ALLOWED_GIT_HOSTS.includes(parsedUrl.hostname)) {
    return { valid: false, error: `Only repositories from ${ALLOWED_GIT_HOSTS.join(', ')} are allowed` };
  }

  // Ensure .git suffix
  let sanitizedUrl = parsedUrl.toString();
  if (!sanitizedUrl.endsWith('.git')) {
    sanitizedUrl += '.git';
  }

  return { valid: true, sanitized: sanitizedUrl };
}

/**
 * Sanitizes a server ID to prevent path traversal
 * Only allows alphanumeric characters and hyphens
 */
export function sanitizeServerId(id: string): string {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid server ID');
  }

  const sanitized = id.replace(/[^a-zA-Z0-9-]/g, '');
  
  if (sanitized.length === 0) {
    throw new Error('Server ID must contain alphanumeric characters');
  }

  if (sanitized.length > 64) {
    throw new Error('Server ID too long');
  }

  return sanitized;
}

/**
 * Validates a Git branch name
 */
export function validateBranchName(branch: string): { valid: boolean; error?: string } {
  if (!branch || typeof branch !== 'string') {
    return { valid: false, error: 'Branch name is required' };
  }

  const trimmed = branch.trim();

  // Check length
  if (trimmed.length === 0 || trimmed.length > 255) {
    return { valid: false, error: 'Branch name must be 1-255 characters' };
  }

  // Check for invalid characters
  const invalidChars = /[~^:?*[\]\\@{}<>\s]/;
  if (invalidChars.test(trimmed)) {
    return { valid: false, error: 'Branch name contains invalid characters' };
  }

  // Check for dangerous patterns
  if (trimmed.includes('..') || trimmed.startsWith('-')) {
    return { valid: false, error: 'Invalid branch name format' };
  }

  return { valid: true };
}

/**
 * Generates a cryptographically secure random ID
 */
export async function generateSecureId(): Promise<string> {
  const randomBytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Validates port number
 */
export function validatePort(port: number): boolean {
  return Number.isInteger(port) && port >= 1024 && port <= 65535;
}

/**
 * Sanitizes environment variable names and values
 */
export function sanitizeEnvVar(name: string, value: string): { name: string; value: string } | null {
  // Validate name
  if (!/^[A-Z_][A-Z0-9_]*$/i.test(name)) {
    return null;
  }

  // Prevent overriding critical env vars
  const protectedVars = ['PATH', 'HOME', 'USER', 'SHELL', 'PWD'];
  if (protectedVars.includes(name.toUpperCase())) {
    return null;
  }

  // Remove dangerous characters from value
  const sanitizedValue = value.replace(/[;&|`$()]/g, '');

  return { name, value: sanitizedValue };
}

/**
 * Validates file path to prevent directory traversal
 */
export function validateFilePath(path: string, baseDir: string): boolean {
  if (!path || !baseDir) {
    return false;
  }

  // Normalize paths
  const normalizedPath = path.replace(/\\/g, '/');
  const normalizedBase = baseDir.replace(/\\/g, '/');

  // Check for traversal patterns
  if (normalizedPath.includes('../') || normalizedPath.includes('..\\')) {
    return false;
  }

  // Ensure path starts with base directory
  return normalizedPath.startsWith(normalizedBase);
}
