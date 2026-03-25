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
   * Flush metrics to external system (T106: External metrics integration)
   *
   * Supports: Cloudflare Analytics, Datadog, Grafana (via environment config)
   * Graceful degradation: Logs to console if external system unavailable
   */
  async flush(): Promise<void> {
    if (this.metrics.length === 0) {
      return
    }

    const metricsToSend = [...this.metrics]
    const provider = this.getMetricsProvider()

    try {
      switch (provider) {
        case 'cloudflare-analytics':
          await this.sendToCloudflareAnalytics(metricsToSend)
          break
        case 'datadog':
          await this.sendToDatadog(metricsToSend)
          break
        case 'grafana':
          await this.sendToGrafana(metricsToSend)
          break
        case 'console':
        default:
          console.log('Metrics flush:', JSON.stringify(metricsToSend))
      }
    } catch (error) {
      // Graceful degradation: Log to console if external system fails
      console.error('Failed to flush metrics to external system:', error)
      console.log('Metrics fallback:', JSON.stringify(metricsToSend))
    }

    this.metrics = []
  }

  /**
   * Determine which metrics provider to use
   * Note: Uses global bindings for Cloudflare Workers compatibility
   */
  private getMetricsProvider(): string {
    // Cloudflare Workers use global bindings (set in wrangler.toml)
    const globalProvider = (globalThis as Record<string, unknown>).METRICS_PROVIDER
    if (typeof globalProvider === 'string') {
      return globalProvider
    }

    // Default to console logging
    return 'console'
  }

  /**
   * Send metrics to Cloudflare Analytics
   * Requires: METRICS_ENDPOINT and METRICS_API_TOKEN env vars
   */
  private async sendToCloudflareAnalytics(metrics: MetricData[]): Promise<void> {
    const endpoint = this.getEnvVar('METRICS_ENDPOINT')
    if (!endpoint) {
      throw new Error('METRICS_ENDPOINT not configured for Cloudflare Analytics')
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getEnvVar('METRICS_API_TOKEN') ?? ''}`,
      },
      body: JSON.stringify({
        metrics: metrics.map(m => ({
          name: m.name,
          value: m.value,
          timestamp: m.timestamp,
          tags: m.labels,
        })),
      }),
    })

    if (!response.ok) {
      throw new Error(`Cloudflare Analytics error: ${response.status}`)
    }
  }

  /**
   * Send metrics to Datadog
   * Requires: DATADOG_API_KEY and DATADOG_SITE env vars
   */
  private async sendToDatadog(metrics: MetricData[]): Promise<void> {
    const apiKey = this.getEnvVar('DATADOG_API_KEY')
    if (!apiKey) {
      throw new Error('DATADOG_API_KEY not configured')
    }

    const site = this.getEnvVar('DATADOG_SITE') ?? 'datadoghq.com'
    const endpoint = `https://api.${site}/api/v1/series`

    const now = Math.floor(Date.now() / 1000)
    const series = metrics.map(m => ({
      metric: m.name,
      points: [[now, m.value]],
      tags: Object.entries(m.labels ?? {}).map(([k, v]) => `${k}:${v}`),
      type: 'gauge',
    }))

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': apiKey,
      },
      body: JSON.stringify({ series }),
    })

    if (!response.ok) {
      throw new Error(`Datadog error: ${response.status}`)
    }
  }

  /**
   * Send metrics to Grafana Cloud
   * Requires: GRAFANA_URL and GRAFANA_API_KEY env vars
   */
  private async sendToGrafana(metrics: MetricData[]): Promise<void> {
    const url = this.getEnvVar('GRAFANA_URL')
    if (!url) {
      throw new Error('GRAFANA_URL not configured')
    }

    // Convert to Prometheus remote write format
    const payload = {
      timeseries: metrics.map(m => ({
        labels: [
          { name: '__name__', value: m.name },
          ...Object.entries(m.labels ?? {}).map(([k, v]) => ({ name: k, value: String(v) })),
        ],
        samples: [{ value: m.value, timestamp: m.timestamp }],
      })),
    }

    const response = await fetch(`${url}/api/v1/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getEnvVar('GRAFANA_API_KEY') ?? ''}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Grafana error: ${response.status}`)
    }
  }

  /**
   * Get environment variable from Cloudflare Workers global bindings
   */
  private getEnvVar(name: string): string | undefined {
    // Cloudflare Workers use global environment bindings
    const value = (globalThis as Record<string, unknown>)[name]
    if (value !== undefined && value !== null) {
      return String(value)
    }

    return undefined
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
