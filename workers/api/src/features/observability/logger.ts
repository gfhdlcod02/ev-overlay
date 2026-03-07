/**
 * Structured Logger
 *
 * Provides consistent logging with request IDs and structured context.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  [key: string]: string | number | boolean | undefined
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  requestId?: string
  context?: LogContext
  error?: {
    message: string
    stack?: string
    code?: string
  }
}

export interface LoggerOptions {
  requestId?: string
  context?: LogContext
}

export class Logger {
  private requestId?: string
  private context: LogContext

  constructor(options: LoggerOptions = {}) {
    this.requestId = options.requestId
    this.context = { ...options.context }
  }

  /**
   * Create child logger with additional context
   */
  child(context: LogContext): Logger {
    return new Logger({
      requestId: this.requestId,
      context: { ...this.context, ...context },
    })
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context)
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context)
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context)
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: LogContext): void {
    this.log('error', message, context, error)
  }

  /**
   * Log route request
   */
  logRouteRequest(options: {
    method: string
    path: string
    cacheHit: boolean
    durationMs: number
    statusCode: number
  }): void {
    this.info('Route request completed', {
      method: options.method,
      path: options.path,
      cache: options.cacheHit ? 'hit' : 'miss',
      duration: options.durationMs,
      status: options.statusCode,
    })
  }

  /**
   * Log rate limit event
   */
  logRateLimit(options: {
    clientKey: string
    endpoint: string
    allowed: boolean
    limit: number
    remaining: number
  }): void {
    const level = options.allowed ? 'debug' : 'warn'
    this.log(level, 'Rate limit check', {
      client: this.hashClientKey(options.clientKey),
      endpoint: options.endpoint,
      allowed: options.allowed,
      limit: options.limit,
      remaining: options.remaining,
    })
  }

  /**
   * Log ingestion job status
   */
  logIngestionJob(options: {
    jobId: string
    type: string
    status: 'started' | 'completed' | 'failed'
    durationMs?: number
    recordsProcessed?: number
    error?: string
  }): void {
    const level = options.status === 'failed' ? 'error' : 'info'
    this.log(level, `Ingestion job ${options.status}`, {
      jobId: options.jobId,
      type: options.type,
      status: options.status,
      duration: options.durationMs,
      records: options.recordsProcessed,
      error: options.error,
    })
  }

  /**
   * Log external API call
   */
  logExternalApi(options: {
    provider: string
    operation: string
    durationMs: number
    success: boolean
    error?: string
  }): void {
    const level = options.success ? 'debug' : 'warn'
    this.log(level, `External API call`, {
      provider: options.provider,
      operation: options.operation,
      duration: options.durationMs,
      success: options.success,
      error: options.error,
    })
  }

  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      requestId: this.requestId,
      context: { ...this.context, ...context },
    }

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        code: (error as { code?: string }).code,
      }
    }

    // In production, send to structured logging service
    // For now, use console with JSON format
    const output = JSON.stringify(entry)

    switch (level) {
      case 'debug':
        console.debug(output)
        break
      case 'info':
        console.info(output)
        break
      case 'warn':
        console.warn(output)
        break
      case 'error':
        console.error(output)
        break
    }
  }

  private hashClientKey(key: string): string {
    // Simple hash for privacy
    let hash = 0
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i)
      hash = ((hash << 5) - hash + char) | 0
    }
    return `client_${Math.abs(hash).toString(16).substring(0, 8)}`
  }
}

/**
 * Create request-scoped logger
 */
export function createLogger(requestId?: string, context?: LogContext): Logger {
  return new Logger({ requestId, context })
}
