/**
 * Metrics Module
 *
 * Emits structured metrics for monitoring and alerting.
 */

export interface MetricLabels {
  [key: string]: string | number | boolean
}

export interface MetricData {
  name: string
  value: number
  timestamp: number
  labels?: MetricLabels
}

export interface RouteMetrics {
  totalRequests: number
  cacheHits: number
  cacheMisses: number
  errors: number
  latencies: number[]
}

export interface RateLimitMetrics {
  allowedRequests: number
  limitedRequests: number
  currentUtilization: number
}

export class MetricsCollector {
  private metrics: MetricData[] = []
  private readonly maxBufferSize: number

  constructor(options: { maxBufferSize?: number } = {}) {
    this.maxBufferSize = options.maxBufferSize ?? 1000
  }

  /**
   * Record a counter metric
   */
  counter(name: string, value: number = 1, labels?: MetricLabels): void {
    this.record({
      name,
      value,
      timestamp: Date.now(),
      labels,
    })
  }

  /**
   * Record a gauge metric
   */
  gauge(name: string, value: number, labels?: MetricLabels): void {
    this.record({
      name,
      value,
      timestamp: Date.now(),
      labels,
    })
  }

  /**
   * Record a histogram metric (latency)
   */
  histogram(name: string, value: number, labels?: MetricLabels): void {
    this.record({
      name,
      value,
      timestamp: Date.now(),
      labels,
    })
  }

  /**
   * Record route request metric
   */
  recordRouteRequest(options: {
    cacheHit: boolean
    durationMs: number
    error?: boolean
    region?: string
  }): void {
    const labels = {
      cache: options.cacheHit ? 'hit' : 'miss',
      region: options.region ?? 'unknown',
      status: options.error ? 'error' : 'success',
    }

    this.counter('route_requests_total', 1, labels)
    this.histogram('route_duration_ms', options.durationMs, labels)

    if (options.cacheHit) {
      this.counter('route_cache_hits', 1, labels)
    } else {
      this.counter('route_cache_misses', 1, labels)
    }

    if (options.error) {
      this.counter('route_errors_total', 1, labels)
    }
  }

  /**
   * Record station query metric
   */
  recordStationQuery(options: {
    cacheHit: boolean
    durationMs: number
    totalResults: number
    region?: string
  }): void {
    const labels = {
      cache: options.cacheHit ? 'hit' : 'miss',
      region: options.region ?? 'unknown',
    }

    this.counter('station_queries_total', 1, labels)
    this.histogram('station_query_duration_ms', options.durationMs, labels)
    this.gauge('station_query_results', options.totalResults, labels)

    if (options.cacheHit) {
      this.counter('station_cache_hits', 1, labels)
    } else {
      this.counter('station_cache_misses', 1, labels)
    }
  }

  /**
   * Record rate limiting metric
   */
  recordRateLimit(options: {
    allowed: boolean
    clientKey: string
    endpointType: string
    limit: number
    remaining: number
  }): void {
    const labels = {
      endpoint: options.endpointType,
      result: options.allowed ? 'allowed' : 'limited',
    }

    this.counter('rate_limit_checks_total', 1, labels)

    if (!options.allowed) {
      this.counter('rate_limit_violations_total', 1, {
        endpoint: options.endpointType,
      })
    }

    const utilization = (options.limit - options.remaining) / options.limit
    this.gauge('rate_limit_utilization', utilization, {
      endpoint: options.endpointType,
      client: this.hashClientKey(options.clientKey),
    })
  }

  /**
   * Record ingestion job metric
   */
  recordIngestionJob(options: {
    jobId: string
    status: 'started' | 'completed' | 'failed' | 'partial'
    recordsProcessed: number
    recordsCreated: number
    recordsUpdated: number
    durationMs: number
    errorMessage?: string
  }): void {
    const labels = {
      status: options.status,
    }

    this.counter('ingestion_jobs_total', 1, labels)
    this.gauge('ingestion_records_processed', options.recordsProcessed, labels)
    this.gauge('ingestion_records_created', options.recordsCreated, labels)
    this.gauge('ingestion_records_updated', options.recordsUpdated, labels)
    this.histogram('ingestion_duration_ms', options.durationMs, labels)

    if (options.status === 'failed' || options.status === 'partial') {
      this.counter('ingestion_failures_total', 1, {
        status: options.status,
        error: options.errorMessage ? 'true' : 'false',
      })
    }
  }

  /**
   * Get all buffered metrics
   */
  getMetrics(): MetricData[] {
    return [...this.metrics]
  }

  /**
   * Flush metrics to external system (placeholder for future integration)
   */
  async flush(): Promise<void> {
    // TODO: Send to external metrics system (e.g., Cloudflare Analytics, Datadog)
    // For now, just log to console in production
    if (this.metrics.length > 0) {
      console.log('Metrics flush:', JSON.stringify(this.metrics))
      this.metrics = []
    }
  }

  private record(metric: MetricData): void {
    this.metrics.push(metric)

    // Prevent unbounded growth
    if (this.metrics.length > this.maxBufferSize) {
      this.metrics = this.metrics.slice(-this.maxBufferSize)
    }
  }

  private hashClientKey(key: string): string {
    // Simple hash for privacy - not cryptographically secure but sufficient for metrics
    let hash = 0
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i)
      hash = ((hash << 5) - hash + char) | 0
    }
    return `client_${Math.abs(hash).toString(16).substring(0, 8)}`
  }
}

// Singleton instance for the application
let globalCollector: MetricsCollector | null = null

export function getMetricsCollector(): MetricsCollector {
  if (!globalCollector) {
    globalCollector = new MetricsCollector()
  }
  return globalCollector
}
