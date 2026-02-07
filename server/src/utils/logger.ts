/**
 * Structured logging utility
 *
 * Provides consistent log formatting with:
 * - Log levels (debug, info, warn, error)
 * - Structured context data
 * - Environment-aware behavior (pretty in dev, JSON in prod)
 * - Performance optimizations (lazy evaluation)
 *
 * Usage:
 * ```ts
 * import { logger } from './utils/logger.js';
 *
 * logger.info('User logged in', { userId: '123' });
 * logger.error('Database error', { error, query: 'SELECT...' });
 * ```
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Get minimum log level from environment
 * Defaults to 'debug' in development, 'info' in production
 */
function getMinLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
  if (envLevel && envLevel in LOG_LEVELS) {
    return envLevel;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

const minLevel = getMinLevel();
const isPretty = process.env.NODE_ENV !== 'production';

/**
 * Format log entry for output
 */
function formatEntry(entry: LogEntry): string {
  if (isPretty) {
    // Development: human-readable format
    const levelColors: Record<LogLevel, string> = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m', // red
    };
    const reset = '\x1b[0m';
    const color = levelColors[entry.level];
    const time = new Date(entry.timestamp).toLocaleTimeString();
    const contextStr = entry.context
      ? ` ${JSON.stringify(entry.context)}`
      : '';
    return `${color}[${entry.level.toUpperCase()}]${reset} ${time} ${entry.message}${contextStr}`;
  }

  // Production: JSON format for log aggregation
  return JSON.stringify(entry);
}

/**
 * Core logging function
 */
function log(level: LogLevel, message: string, context?: LogContext): void {
  // Skip if below minimum level
  if (LOG_LEVELS[level] < LOG_LEVELS[minLevel]) {
    return;
  }

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
  };

  if (context && Object.keys(context).length > 0) {
    // Serialize errors specially
    const serializedContext: LogContext = {};
    for (const [key, value] of Object.entries(context)) {
      if (value instanceof Error) {
        serializedContext[key] = {
          name: value.name,
          message: value.message,
          stack: value.stack,
        };
      } else {
        serializedContext[key] = value;
      }
    }
    entry.context = serializedContext;
  }

  const output = formatEntry(entry);

  // Use appropriate console method
  switch (level) {
    case 'debug':
      console.debug(output);
      break;
    case 'info':
      console.info(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    case 'error':
      console.error(output);
      break;
  }
}

/**
 * Logger interface with methods for each log level
 */
export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext) => log('error', message, context),

  /**
   * Create a child logger with default context
   * Useful for adding request ID or component name to all logs
   */
  child: (defaultContext: LogContext) => ({
    debug: (message: string, context?: LogContext) =>
      log('debug', message, { ...defaultContext, ...context }),
    info: (message: string, context?: LogContext) =>
      log('info', message, { ...defaultContext, ...context }),
    warn: (message: string, context?: LogContext) =>
      log('warn', message, { ...defaultContext, ...context }),
    error: (message: string, context?: LogContext) =>
      log('error', message, { ...defaultContext, ...context }),
  }),
};

export type Logger = typeof logger;
