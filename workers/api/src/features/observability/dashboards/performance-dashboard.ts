import type { Env } from '@/types'

/**
 * Simple HTML Dashboard for Performance Metrics
 *
 * Serves at: /admin/dashboard/performance
 * Displays Web Vitals, response times, cache hit rates
 */

export async function servePerformanceDashboard(env: Env): Promise<Response> {
  // Fetch aggregated performance data from KV
  const today = new Date().toISOString().split('T')[0]
  const webVitalsKey = `analytics:webvitals:${today}`
  const cacheKey = `analytics:cache:${today}`

  interface WebVitalsData {
    lcp?: number[]
    fid?: number[]
    cls?: number[]
    fcp?: number[]
    ttfb?: number[]
    inp?: number[]
  }

  interface CacheStatsData {
    routeHits: number
    routeMisses: number
    stationHits: number
    stationMisses: number
    hourlyResponseTimes: number[]
  }

  let webVitals: WebVitalsData | null = null
  let cacheStats: CacheStatsData | null = null

  try {
    webVitals = await env.ROUTE_CACHE.get(webVitalsKey, 'json') as WebVitalsData | null
  } catch {
    webVitals = null
  }

  try {
    cacheStats = await env.ROUTE_CACHE.get(cacheKey, 'json') as CacheStatsData | null
  } catch {
    cacheStats = null
  }

  // Calculate Web Vitals percentiles
  const calculateP75 = (values: number[]) => {
    if (!values || values.length === 0) return null
    const sorted = [...values].sort((a, b) => a - b)
    const index = Math.floor(sorted.length * 0.75)
    return sorted[index]
  }

  const calculateP95 = (values: number[]) => {
    if (!values || values.length === 0) return null
    const sorted = [...values].sort((a, b) => a - b)
    const index = Math.floor(sorted.length * 0.95)
    return sorted[index]
  }

  const formatMs = (value: number | null) => {
    if (value === null) return 'N/A'
    if (value < 1000) return `${Math.round(value)}ms`
    return `${(value / 1000).toFixed(2)}s`
  }

  const getScoreClass = (value: number | null, good: number, poor: number) => {
    if (value === null) return ''
    if (value <= good) return 'success'
    if (value <= poor) return 'warning'
    return 'danger'
  }

  const getScoreLabel = (value: number | null, good: number, poor: number) => {
    if (value === null) return '—'
    if (value <= good) return 'Good'
    if (value <= poor) return 'Needs Improvement'
    return 'Poor'
  }

  const lcpP75 = webVitals?.lcp ? calculateP75(webVitals.lcp) : null
  const fidP75 = webVitals?.fid ? calculateP75(webVitals.fid) : null
  const clsP75 = webVitals?.cls ? calculateP75(webVitals.cls) : null
  const fcpP75 = webVitals?.fcp ? calculateP75(webVitals.fcp) : null
  const ttfbP75 = webVitals?.ttfb ? calculateP75(webVitals.ttfb) : null
  const inpP75 = webVitals?.inp ? calculateP75(webVitals.inp) : null

  const routeCacheHitRate = cacheStats
    ? (cacheStats.routeHits / (cacheStats.routeHits + cacheStats.routeMisses) * 100).toFixed(1)
    : '0.0'

  const stationCacheHitRate = cacheStats
    ? (cacheStats.stationHits / (cacheStats.stationHits + cacheStats.stationMisses) * 100).toFixed(1)
    : '0.0'

  const avgResponseTime = cacheStats?.hourlyResponseTimes && cacheStats.hourlyResponseTimes.length > 0
    ? cacheStats.hourlyResponseTimes.reduce((a, b) => a + b, 0) / cacheStats.hourlyResponseTimes.length
    : null

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Performance Dashboard - EV Overlay</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    header {
      border-bottom: 1px solid #334155;
      padding-bottom: 1rem;
      margin-bottom: 2rem;
    }
    h1 { font-size: 1.875rem; font-weight: 700; color: #f8fafc; }
    .subtitle { color: #94a3b8; margin-top: 0.25rem; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .card {
      background: #1e293b;
      border-radius: 0.75rem;
      padding: 1.5rem;
      border: 1px solid #334155;
    }
    .card h2 {
      font-size: 0.875rem;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1rem;
    }
    .metric-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid #334155;
    }
    .metric-row:last-child { border-bottom: none; }
    .metric-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: #cbd5e1;
    }
    .metric-value {
      font-size: 0.875rem;
      font-weight: 600;
    }
    .score-indicator {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-left: 0.5rem;
    }
    .score-indicator.success { background: #22c55e; }
    .score-indicator.warning { background: #f59e0b; }
    .score-indicator.danger { background: #ef4444; }
    .cvw-metric {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1rem;
      background: #0f172a;
      border-radius: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .cvw-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .cvw-name {
      font-weight: 600;
      font-size: 0.875rem;
    }
    .cvw-value {
      font-size: 1.25rem;
      font-weight: 700;
    }
    .cvw-bar {
      height: 4px;
      background: #334155;
      border-radius: 2px;
      overflow: hidden;
    }
    .cvw-bar-fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.3s ease;
    }
    .cvw-bar-fill.success { background: #22c55e; }
    .cvw-bar-fill.warning { background: #f59e0b; }
    .cvw-bar-fill.danger { background: #ef4444; }
    .cvw-thresholds {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: #64748b;
    }
    .cache-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .cache-stat {
      text-align: center;
      padding: 1rem;
      background: #0f172a;
      border-radius: 0.5rem;
    }
    .cache-stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #3b82f6;
    }
    .cache-stat-label {
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 0.25rem;
    }
    .refresh {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      background: #3b82f6;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    }
    .refresh:hover { background: #2563eb; }
    .empty-state {
      text-align: center;
      padding: 3rem;
      color: #64748b;
    }
    .legend {
      display: flex;
      gap: 1.5rem;
      justify-content: center;
      margin-top: 1rem;
      font-size: 0.75rem;
      color: #94a3b8;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .legend-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Performance Dashboard</h1>
      <p class="subtitle">Web Vitals, cache performance, and response times</p>
    </header>

    <div class="grid">
      <!-- Core Web Vitals -->
      <div class="card" style="grid-column: span 2;">
        <h2>Core Web Vitals (P75)</h2>

        <div class="cvw-metric">
          <div class="cvw-header">
            <span class="cvw-name">Largest Contentful Paint (LCP)</span>
            <span class="cvw-value ${getScoreClass(lcpP75, 2500, 4000)}">${formatMs(lcpP75)}</span>
          </div>
          <div class="cvw-bar">
            <div class="cvw-bar-fill ${getScoreClass(lcpP75, 2500, 4000)}" style="width: ${Math.min((lcpP75 || 0) / 4000 * 100, 100)}%"></div>
          </div>
          <div class="cvw-thresholds">
            <span>0</span>
            <span>Good: ≤2.5s</span>
            <span>Poor: >4s</span>
          </div>
        </div>

        <div class="cvw-metric">
          <div class="cvw-header">
            <span class="cvw-name">First Input Delay (FID)</span>
            <span class="cvw-value ${getScoreClass(fidP75, 100, 300)}">${formatMs(fidP75)}</span>
          </div>
          <div class="cvw-bar">
            <div class="cvw-bar-fill ${getScoreClass(fidP75, 100, 300)}" style="width: ${Math.min((fidP75 || 0) / 300 * 100, 100)}%"></div>
          </div>
          <div class="cvw-thresholds">
            <span>0</span>
            <span>Good: ≤100ms</span>
            <span>Poor: >300ms</span>
          </div>
        </div>

        <div class="cvw-metric">
          <div class="cvw-header">
            <span class="cvw-name">Cumulative Layout Shift (CLS)</span>
            <span class="cvw-value ${getScoreClass(clsP75, 0.1, 0.25)}">${clsP75 !== null ? clsP75.toFixed(3) : 'N/A'}</span>
          </div>
          <div class="cvv-bar">
            <div class="cvw-bar-fill ${getScoreClass(clsP75, 0.1, 0.25)}" style="width: ${Math.min((clsP75 || 0) / 0.25 * 100, 100)}%"></div>
          </div>
          <div class="cvw-thresholds">
            <span>0</span>
            <span>Good: ≤0.1</span>
            <span>Poor: >0.25</span>
          </div>
        </div>

        <div class="cvw-metric">
          <div class="cvw-header">
            <span class="cvw-name">Interaction to Next Paint (INP)</span>
            <span class="cvw-value ${getScoreClass(inpP75, 200, 500)}">${formatMs(inpP75)}</span>
          </div>
          <div class="cvw-bar">
            <div class="cvw-bar-fill ${getScoreClass(inpP75, 200, 500)}" style="width: ${Math.min((inpP75 || 0) / 500 * 100, 100)}%"></div>
          </div>
          <div class="cvw-thresholds">
            <span>0</span>
            <span>Good: ≤200ms</span>
            <span>Poor: >500ms</span>
          </div>
        </div>
      </div>

      <!-- Cache Performance -->
      <div class="card">
        <h2>Cache Performance</h2>
        <div class="cache-stats">
          <div class="cache-stat">
            <div class="cache-stat-value">${routeCacheHitRate}%</div>
            <div class="cache-stat-label">Route Cache Hit Rate</div>
          </div>
          <div class="cache-stat">
            <div class="cache-stat-value">${stationCacheHitRate}%</div>
            <div class="cache-stat-label">Station Cache Hit Rate</div>
          </div>
        </div>
        <div class="legend">
          <div class="legend-item">
            <div class="legend-dot" style="background: #22c55e;"></div>
            <span>Excellent: >95%</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #f59e0b;"></div>
            <span>Good: 80-95%</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #ef4444;"></div>
            <span>Needs Work: &lt;80%</span>
          </div>
        </div>
      </div>

      <!-- Response Times -->
      <div class="card">
        <h2>API Response Times</h2>
        ${cacheStats?.hourlyResponseTimes && cacheStats.hourlyResponseTimes.length > 0 ? `
        <div class="metric-row">
          <span class="metric-label">Average Response Time</span>
          <span class="metric-value">${formatMs(avgResponseTime)}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">P95 Response Time</span>
          <span class="metric-value ${getScoreClass(calculateP95(cacheStats.hourlyResponseTimes), 3000, 5000)}">${formatMs(calculateP95(cacheStats.hourlyResponseTimes))}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Total API Requests</span>
          <span class="metric-value">${(cacheStats.routeHits + cacheStats.routeMisses + cacheStats.stationHits + cacheStats.stationMisses).toLocaleString()}</span>
        </div>
        ` : '<div class="empty-state">No API metrics available yet</div>'}
      </div>

      <!-- Additional Metrics -->
      <div class="card">
        <h2>Additional Metrics</h2>
        <div class="metric-row">
          <span class="metric-label">First Contentful Paint (FCP)</span>
          <span class="metric-value ${getScoreClass(fcpP75, 1800, 3000)}">${formatMs(fcpP75)}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Time to First Byte (TTFB)</span>
          <span class="metric-value ${getScoreClass(ttfbP75, 800, 1800)}">${formatMs(ttfbP75)}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Date Range</span>
          <span class="metric-value">${today}</span>
        </div>
      </div>
    </div>
  </div>

  <button class="refresh" onclick="location.reload()">Refresh</button>

  <script>
    // Auto-refresh every 60 seconds
    setTimeout(() => location.reload(), 60000);
  </script>
</body>
</html>`

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-store'
    }
  })
}

/**
 * Record cache metrics for dashboard
 */
export async function recordCacheMetric(
  env: Env,
  cacheType: 'route' | 'station',
  hit: boolean,
  responseTimeMs: number
): Promise<void> {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const metricsKey = `analytics:cache:${today}`

  try {
    const existing = await env.ROUTE_CACHE.get(metricsKey, 'json') as {
      routeHits: number
      routeMisses: number
      stationHits: number
      stationMisses: number
      hourlyResponseTimes: number[]
    } | null

    const metrics = existing || {
      routeHits: 0,
      routeMisses: 0,
      stationHits: 0,
      stationMisses: 0,
      hourlyResponseTimes: []
    }

    // Update cache hit/miss
    if (cacheType === 'route') {
      if (hit) metrics.routeHits++
      else metrics.routeMisses++
    } else {
      if (hit) metrics.stationHits++
      else metrics.stationMisses++
    }

    // Keep last 1000 response times
    metrics.hourlyResponseTimes.push(responseTimeMs)
    if (metrics.hourlyResponseTimes.length > 1000) {
      metrics.hourlyResponseTimes = metrics.hourlyResponseTimes.slice(-1000)
    }

    // Store with 7-day TTL
    await env.ROUTE_CACHE.put(metricsKey, JSON.stringify(metrics), {
      expirationTtl: 7 * 24 * 60 * 60
    })
  } catch (error) {
    console.error('Failed to record cache metric:', error)
  }
}
