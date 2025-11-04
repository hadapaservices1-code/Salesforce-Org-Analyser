// Simple console-based logger to avoid pino worker thread issues
// Pino's pretty transport uses worker threads which can cause issues in Next.js

interface LogContext {
  [key: string]: any;
}

const formatLog = (level: string, context: LogContext | string, message?: string) => {
  const timestamp = new Date().toISOString();
  if (typeof context === 'string') {
    return `[${timestamp}] ${level.toUpperCase()}: ${context}${message ? ` - ${message}` : ''}`;
  }
  const contextStr = JSON.stringify(context, null, 0);
  return `[${timestamp}] ${level.toUpperCase()}: ${message || ''} ${contextStr}`;
};

const safeLogger = {
  error: (context: LogContext | string, message?: string) => {
    try {
      console.error(formatLog('error', context, message));
    } catch (e) {
      console.error('Logger error:', e);
    }
  },
  warn: (context: LogContext | string, message?: string) => {
    try {
      console.warn(formatLog('warn', context, message));
    } catch (e) {
      console.warn('Logger warning:', e);
    }
  },
  info: (context: LogContext | string, message?: string) => {
    try {
      console.log(formatLog('info', context, message));
    } catch (e) {
      console.log('Logger info:', e);
    }
  },
  debug: (context: LogContext | string, message?: string) => {
    try {
      if (process.env.LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
        console.debug(formatLog('debug', context, message));
      }
    } catch (e) {
      console.debug('Logger debug:', e);
    }
  },
};

export const logger = safeLogger;
