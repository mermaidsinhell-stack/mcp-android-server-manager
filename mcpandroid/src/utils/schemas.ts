/**
 * JSON Schema validation for API responses
 */

import Ajv, { JSONSchemaType } from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

/**
 * GitHub Repository Response Schema
 */
export interface GitHubRepoResponse {
  name: string;
  full_name: string;
  description: string | null;
  clone_url: string;
  default_branch: string;
  stargazers_count: number;
  language: string | null;
  private: boolean;
  archived: boolean;
  disabled: boolean;
}

const githubRepoSchema: JSONSchemaType<GitHubRepoResponse> = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    full_name: { type: 'string', pattern: '^[a-zA-Z0-9-_]+/[a-zA-Z0-9-_.]+$' },
    description: { type: 'string', nullable: true },
    clone_url: { type: 'string', format: 'uri', pattern: '^https?://' },
    default_branch: { type: 'string', minLength: 1, maxLength: 255 },
    stargazers_count: { type: 'number', minimum: 0 },
    language: { type: 'string', nullable: true },
    private: { type: 'boolean' },
    archived: { type: 'boolean' },
    disabled: { type: 'boolean' },
  },
  required: [
    'name',
    'full_name',
    'clone_url',
    'default_branch',
    'stargazers_count',
    'private',
    'archived',
    'disabled',
  ],
  additionalProperties: true, // Allow extra fields
};

export const validateGitHubRepo = ajv.compile(githubRepoSchema);

/**
 * Package.json Schema for validating server entry points
 */
interface PackageJson {
  name?: string;
  main?: string;
  bin?: string | Record<string, string>;
  scripts?: Record<string, string>;
}

const packageJsonSchema: JSONSchemaType<PackageJson> = {
  type: 'object',
  properties: {
    name: { type: 'string', nullable: true },
    main: { type: 'string', nullable: true },
    bin: {
      anyOf: [
        { type: 'string' },
        { type: 'object', additionalProperties: { type: 'string' } },
      ],
      nullable: true,
    },
    scripts: {
      type: 'object',
      additionalProperties: { type: 'string' },
      nullable: true,
    },
  },
  additionalProperties: true,
};

export const validatePackageJson = ajv.compile(packageJsonSchema);

/**
 * Helper to get validation errors as string
 */
export function getValidationErrors(validator: typeof validateGitHubRepo): string {
  if (!validator.errors) {
    return 'Unknown validation error';
  }

  return validator.errors
    .map(err => `${err.instancePath} ${err.message}`)
    .join(', ');
}

/**
 * Validates that a repository is public and not archived
 */
export function validateRepoStatus(repo: GitHubRepoResponse): { valid: boolean; error?: string } {
  if (repo.private) {
    return { valid: false, error: 'Private repositories are not supported yet' };
  }

  if (repo.archived) {
    return { valid: false, error: 'Archived repositories cannot be used' };
  }

  if (repo.disabled) {
    return { valid: false, error: 'This repository has been disabled' };
  }

  return { valid: true };
}

// ============================================================================
// IPC Message Schemas for Node Bridge Communication
// ============================================================================

/**
 * Valid IPC message types for communication with the Node.js bridge
 */
export const IPC_MESSAGE_TYPES = [
  'start',
  'stop',
  'status',
  'clone',
  'log',
  'error',
  'ready',
  'install',
  'delete',
  'config',
  'health',
  'restart',
] as const;

export type IPCMessageType = typeof IPC_MESSAGE_TYPES[number];

/**
 * Base IPC Message structure
 */
export interface IPCMessage {
  type: IPCMessageType;
  requestId?: string;
  serverId?: string;
  payload?: unknown;
  timestamp?: number;
}

/**
 * IPC Message with request ID (for responses)
 */
export interface IPCRequestMessage extends IPCMessage {
  requestId: string;
}

/**
 * Server status payload
 */
export interface ServerStatusPayload {
  status: 'stopped' | 'starting' | 'running' | 'error';
  pid?: number;
  port?: number;
  uptime?: number;
  memory?: number;
  errorMessage?: string;
}

/**
 * Log message payload
 */
export interface LogPayload {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: number;
  source?: string;
}

/**
 * Clone request payload
 */
export interface ClonePayload {
  repoUrl: string;
  branch: string;
  targetDir: string;
}

/**
 * Error payload
 */
export interface ErrorPayload {
  code: string;
  message: string;
  stack?: string;
}

/**
 * Config payload for server configuration
 */
export interface ConfigPayload {
  env?: Record<string, string>;
  args?: string[];
  port?: number;
  autoStart?: boolean;
  restartOnCrash?: boolean;
  maxRestarts?: number;
}

// Schema for base IPC message
const ipcMessageSchema = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: IPC_MESSAGE_TYPES,
    },
    requestId: {
      type: 'string',
      pattern: '^req-[0-9]+$',
      nullable: true,
    },
    serverId: {
      type: 'string',
      pattern: '^[a-zA-Z0-9-]+$',
      maxLength: 64,
      nullable: true,
    },
    payload: {
      nullable: true,
    },
    timestamp: {
      type: 'number',
      minimum: 0,
      nullable: true,
    },
  },
  required: ['type'],
  additionalProperties: false,
} as const;

// Schema for server status payload
const serverStatusPayloadSchema = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: ['stopped', 'starting', 'running', 'error'],
    },
    pid: {
      type: 'number',
      minimum: 0,
      nullable: true,
    },
    port: {
      type: 'number',
      minimum: 1024,
      maximum: 65535,
      nullable: true,
    },
    uptime: {
      type: 'number',
      minimum: 0,
      nullable: true,
    },
    memory: {
      type: 'number',
      minimum: 0,
      nullable: true,
    },
    errorMessage: {
      type: 'string',
      maxLength: 1000,
      nullable: true,
    },
  },
  required: ['status'],
  additionalProperties: false,
} as const;

// Schema for log payload
const logPayloadSchema = {
  type: 'object',
  properties: {
    level: {
      type: 'string',
      enum: ['info', 'warn', 'error', 'debug'],
    },
    message: {
      type: 'string',
      maxLength: 10000,
    },
    timestamp: {
      type: 'number',
      minimum: 0,
    },
    source: {
      type: 'string',
      maxLength: 100,
      nullable: true,
    },
  },
  required: ['level', 'message', 'timestamp'],
  additionalProperties: false,
} as const;

// Schema for clone payload
const clonePayloadSchema = {
  type: 'object',
  properties: {
    repoUrl: {
      type: 'string',
      format: 'uri',
      pattern: '^https://',
    },
    branch: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
    },
    targetDir: {
      type: 'string',
      minLength: 1,
      maxLength: 500,
    },
  },
  required: ['repoUrl', 'branch', 'targetDir'],
  additionalProperties: false,
} as const;

// Schema for error payload
const errorPayloadSchema = {
  type: 'object',
  properties: {
    code: {
      type: 'string',
      maxLength: 50,
    },
    message: {
      type: 'string',
      maxLength: 1000,
    },
    stack: {
      type: 'string',
      maxLength: 5000,
      nullable: true,
    },
  },
  required: ['code', 'message'],
  additionalProperties: false,
} as const;

// Schema for config payload
const configPayloadSchema = {
  type: 'object',
  properties: {
    env: {
      type: 'object',
      additionalProperties: { type: 'string', maxLength: 1000 },
      nullable: true,
    },
    args: {
      type: 'array',
      items: { type: 'string', maxLength: 500 },
      maxItems: 50,
      nullable: true,
    },
    port: {
      type: 'number',
      minimum: 1024,
      maximum: 65535,
      nullable: true,
    },
    autoStart: {
      type: 'boolean',
      nullable: true,
    },
    restartOnCrash: {
      type: 'boolean',
      nullable: true,
    },
    maxRestarts: {
      type: 'number',
      minimum: 0,
      maximum: 100,
      nullable: true,
    },
  },
  additionalProperties: false,
} as const;

// Compile validators
export const validateIPCMessage = ajv.compile(ipcMessageSchema);
export const validateServerStatusPayload = ajv.compile(serverStatusPayloadSchema);
export const validateLogPayload = ajv.compile(logPayloadSchema);
export const validateClonePayload = ajv.compile(clonePayloadSchema);
export const validateErrorPayload = ajv.compile(errorPayloadSchema);
export const validateConfigPayload = ajv.compile(configPayloadSchema);

/**
 * Error class for IPC validation failures
 */
export class IPCValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: string[],
    public readonly rawMessage: unknown
  ) {
    super(message);
    this.name = 'IPCValidationError';
  }
}

/**
 * Validate an IPC message and its payload based on message type
 *
 * SECURITY: This function validates all incoming IPC messages to prevent
 * injection attacks and ensure data integrity.
 */
export function validateIPCMessageWithPayload(
  data: unknown
): { valid: true; message: IPCMessage } | { valid: false; error: IPCValidationError } {
  // First, validate base message structure
  if (!validateIPCMessage(data)) {
    const errors = getValidationErrors(validateIPCMessage);
    return {
      valid: false,
      error: new IPCValidationError(
        `Invalid IPC message structure: ${errors}`,
        errors.split(', '),
        data
      ),
    };
  }

  const message = data as IPCMessage;

  // Validate payload based on message type
  if (message.payload !== undefined && message.payload !== null) {
    const payloadValidation = validatePayloadForType(message.type, message.payload);
    if (!payloadValidation.valid) {
      return {
        valid: false,
        error: new IPCValidationError(
          `Invalid payload for message type '${message.type}': ${payloadValidation.errors.join(', ')}`,
          payloadValidation.errors,
          data
        ),
      };
    }
  }

  return { valid: true, message };
}

/**
 * Validate payload based on message type
 */
function validatePayloadForType(
  type: IPCMessageType,
  payload: unknown
): { valid: boolean; errors: string[] } {
  switch (type) {
    case 'status':
      if (!validateServerStatusPayload(payload)) {
        return {
          valid: false,
          errors: getValidationErrors(validateServerStatusPayload).split(', '),
        };
      }
      break;

    case 'log':
      if (!validateLogPayload(payload)) {
        return {
          valid: false,
          errors: getValidationErrors(validateLogPayload).split(', '),
        };
      }
      break;

    case 'clone':
      if (!validateClonePayload(payload)) {
        return {
          valid: false,
          errors: getValidationErrors(validateClonePayload).split(', '),
        };
      }
      break;

    case 'error':
      if (!validateErrorPayload(payload)) {
        return {
          valid: false,
          errors: getValidationErrors(validateErrorPayload).split(', '),
        };
      }
      break;

    case 'config':
      if (!validateConfigPayload(payload)) {
        return {
          valid: false,
          errors: getValidationErrors(validateConfigPayload).split(', '),
        };
      }
      break;

    // Types that don't require payload validation
    case 'start':
    case 'stop':
    case 'ready':
    case 'install':
    case 'delete':
    case 'health':
    case 'restart':
      // These types may have various payload structures or no payload
      break;
  }

  return { valid: true, errors: [] };
}

/**
 * Sanitize an IPC message for logging (remove sensitive data)
 */
export function sanitizeIPCMessageForLogging(message: IPCMessage): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {
    type: message.type,
    requestId: message.requestId,
    serverId: message.serverId,
    timestamp: message.timestamp,
  };

  // Sanitize payload to remove sensitive information
  if (message.payload && typeof message.payload === 'object') {
    const payload = message.payload as Record<string, unknown>;
    sanitized.payload = { ...payload };

    // Remove potentially sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'credential', 'auth'];
    for (const field of sensitiveFields) {
      if (field in (sanitized.payload as Record<string, unknown>)) {
        (sanitized.payload as Record<string, unknown>)[field] = '[REDACTED]';
      }
    }

    // Redact environment variables that might contain secrets
    if ('env' in payload && typeof payload.env === 'object' && payload.env !== null) {
      const sanitizedEnv: Record<string, string> = {};
      for (const [key, value] of Object.entries(payload.env as Record<string, string>)) {
        if (sensitiveFields.some(s => key.toLowerCase().includes(s))) {
          sanitizedEnv[key] = '[REDACTED]';
        } else {
          sanitizedEnv[key] = value;
        }
      }
      (sanitized.payload as Record<string, unknown>).env = sanitizedEnv;
    }
  } else {
    sanitized.payload = message.payload;
  }

  return sanitized;
}
